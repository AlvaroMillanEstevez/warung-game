import { CUSTOMERS, DEMAND, PLAYER, STAFF, UPGRADES } from '../config.ts';
import { CLEANING_WAIT_POINTS, CUSTOMER_ENTRIES, CUSTOMER_LAYOUT, EXTRA_TABLES, INTERACTION_ZONES, QUEUE_POINTS, STAFF_POSITIONS, STATIONS, TABLE_POSITIONS, tableZone } from '../world/layout.ts';
import type { InteractionZone, Point, Rect } from '../world/layout.ts';
import { canStandCustomer, findCustomerPath } from '../world/customerNavigation.ts';
import { CustomerComments } from './CustomerComments.ts';
import { Production } from './Production.ts';
import { Staff } from './Staff.ts';
import type { UpgradeId } from '../config.ts';
import type { Inventory } from './Inventory.ts';
import { canStand } from '../world/collision.ts';
import { findPath } from '../world/navigation.ts';
import type { ProductionAction } from './Production.ts';

export type Intent = 'dine-in' | 'takeaway';
export type CustomerPhase = 'entering' | 'walking-to-queue' | 'queueing' | 'walking-to-table' |
  'walking-to-cleaning-wait' | 'waiting-cleaning' | 'eating' | 'leaving';
export interface Customer {
  readonly id: string;
  readonly number: number;
  readonly intent: Intent;
  phase: CustomerPhase;
  position: Point;
  route: Point[];
  waitingSince: number | null;
  queueIndex: number;
  orderId: string | null;
  eatingElapsedMs: number;
  carryingMeal: boolean;
}
export interface TableState { readonly id: string; cleanliness: 'clean' | 'dirty'; customerId: string | null; dirtySince: number | null }
export interface Order {
  readonly id: string;
  readonly customerId: string;
  readonly number: number;
  readonly tableId: string | null;
  readonly paidAt: number;
  status: 'carried' | 'eating' | 'consumed' | 'takeaway';
}
export type RestaurantAction =
  | { kind: 'production'; action: ProductionAction; slotIndex?: number | undefined }
  | { kind: 'checkout'; customerId: string; tableId: string | null }
  | { kind: 'clean'; tableId: string };
export type Offer = { command: RestaurantAction; label: string } | { command: null; reason: string };
export interface RestaurantOptions {
  arrivalMs: number; dineInChance: number; maxCustomers: number; queueLimits: Record<Intent, number>;
  speed: number; eatingMs: number; price: number;
}

const TRANSITIONS: Record<CustomerPhase, readonly CustomerPhase[]> = {
  entering: ['walking-to-queue'],
  'walking-to-queue': ['walking-to-queue', 'queueing'],
  queueing: ['walking-to-queue', 'walking-to-table', 'walking-to-cleaning-wait', 'leaving'],
  'walking-to-cleaning-wait': ['waiting-cleaning', 'walking-to-table'],
  'walking-to-table': ['eating'],
  'waiting-cleaning': ['walking-to-table'],
  eating: ['leaving'],
  leaving: [],
};

export function actionKey(action: RestaurantAction): string { return JSON.stringify(action); }

// This model owns the restaurant state. Graphics only read it; transfers happen here synchronously.
export class Restaurant {
  readonly production = new Production();
  readonly options: Readonly<RestaurantOptions>;
  private readonly people = new Map<string, Customer>();
  private readonly tickets = new Map<string, Order>();
  private readonly seats = new Map<string, TableState>();
  private readonly lines: Record<Intent, string[]> = { 'dine-in': [], takeaway: [] };
  readonly staff = new Staff();
  readonly comments = new CustomerComments();
  private spent = 0;
  private demandRaised = false;
  private demandNotice = false;
  private readonly locks = new Map<string, string>();
  private levels: Record<UpgradeId, number> = { cook: 0, cleaner: 0, transport: 0, actionSpeed: 0, stoveSpeed: 0, 'table-3': 0, 'table-4': 0 };
  private readonly random: () => number;
  private clockMs = 0;
  private arrivalElapsedMs = 0;
  private coins = 0;
  private epoch = 0;
  private sequence = 0;

  constructor(options: Partial<RestaurantOptions> = {}, random: () => number = Math.random) {
    this.options = { ...CUSTOMERS, ...options };
    this.random = random;
    this.reset();
  }


  get stations() { return [...STATIONS, ...EXTRA_TABLES.filter(t => this.levels[t.id as UpgradeId] > 0)]; }
  get routingObstacles(): Rect[] { return [...STATIONS, ...EXTRA_TABLES].map(s => s.footprint); }
  get obstacles(): Rect[] { return this.stations.map(s => s.footprint); }
  get interactionZones(): readonly InteractionZone[] {
    return [...INTERACTION_ZONES, ...EXTRA_TABLES.filter(t => this.levels[t.id as UpgradeId] > 0).map(tableZone)];
  }
  get teamCapacity(): number { return UPGRADES.transport.capacities[this.levels.transport]!; }
  get totalSpent(): number { return this.spent; }
  get increasedDemand(): boolean { return this.demandRaised; }
  get arrivalIntervalMs(): number { return this.options.arrivalMs / (this.demandRaised ? DEMAND.frequencyMultiplier : 1); }
  takeDemandNotice(): boolean { const value = this.demandNotice; this.demandNotice = false; return value; }
  get teamActionMs(): number { return UPGRADES.actionSpeed.durationsMs[this.levels.actionSpeed]!; }
  upgradeLevel(id: UpgradeId): number { return this.levels[id]; }
  get activeReservations(): ReadonlyMap<string, string> { return new Map(this.locks); }
  resourceAvailable(resource: string, actorId: string): boolean { return !this.locks.has(resource) || this.locks.get(resource) === actorId; }
  private actorInventory(actorId: string): Inventory | undefined {
    return actorId === 'player' ? this.production.playerInventory : this.staff.get(actorId)?.inventory;
  }
  private resourceKey(command: RestaurantAction): string | null {
    return command.kind === 'clean' ? 'table:' + command.tableId :
      command.kind === 'production' && command.slotIndex !== undefined ? 'slot:' + command.slotIndex : null;
  }
  beginAction(command: RestaurantAction, actorId = 'player'): boolean {
    this.cancelAction(actorId);
    if (this.validate(command, actorId)) return false;
    const key = this.resourceKey(command);
    if (key) this.locks.set(key, actorId);
    return true;
  }
  cancelAction(actorId = 'player'): void {
    for (const [resource, owner] of this.locks) if (owner === actorId) this.locks.delete(resource);
  }
  perform(command: RestaurantAction, actorId = 'player'): string | null {
    try { return this.apply(command, actorId); }
    finally { this.cancelAction(actorId); }
  }
  purchaseState(id: UpgradeId, player: Point = PLAYER.spawn): { level: number; price: number | null; problem: string | null } {
    const level = this.levels[id], price = UPGRADES[id].prices[level] ?? null;
    const problem = price === null ? 'Máximo alcanzado' : this.coins < price ? 'Fondos insuficientes' :
      id.startsWith('table-') ? this.tablePlacementProblem(id, player) : null;
    return { level, price, problem };
  }
  purchase(id: UpgradeId, expectedLevel: number, player: Point = PLAYER.spawn): boolean {
    if (!(id in UPGRADES) || this.levels[id] !== expectedLevel) return false;
    const offer = this.purchaseState(id, player);
    if (offer.problem || offer.price === null) return false;
    const routes: { actor: { route: Point[] }; path: Point[] }[] = [];
    if (id.startsWith('table-')) {
      for (const actor of this.people.values()) {
        if (!actor.route.length) continue;
        const path = findCustomerPath(actor.position, actor.route.at(-1)!, this.routingObstacles);
        if (!path) return false;
        routes.push({ actor, path });
      }
      for (const actor of this.staff.employees) {
        if (!actor.route.length) continue;
        const path = findPath(actor.position, actor.route.at(-1)!, this.routingObstacles);
        if (!path) return false;
        routes.push({ actor, path });
      }
    }
    // No asynchronous work between the validation, debit and effect.
    this.coins -= offer.price; this.levels[id]++;
    this.spent += offer.price;
    if (!this.demandRaised && this.spent >= DEMAND.spendingThreshold) {
      this.demandRaised = true; this.demandNotice = true; this.arrivalElapsedMs = 0;
    }
    if (id === 'cook' || id === 'cleaner') this.staff.hire(id, this.teamCapacity);
    if (id === 'transport') {
      const capacity = UPGRADES.transport.capacities[this.levels.transport]!;
      this.production.playerInventory.setLimits({ ingredients: capacity, meals: capacity, waste: capacity });
      this.staff.upgradeCapacity(capacity);
    }
    if (id === 'stoveSpeed') this.production.cookingMs = UPGRADES.stoveSpeed.durationsMs[this.levels.stoveSpeed]!;
    if (id.startsWith('table-')) {
      this.seats.set(id, { id, cleanliness: 'clean', customerId: null, dirtySince: null });
      // Replan from current positions without changing tasks, reservations or elapsed actions.
      for (const { actor, path } of routes) actor.route = path;
    }
    return true;
  }
  private tablePlacementProblem(id: string, player: Point): string | null {
    const extra = EXTRA_TABLES.find(t => t.id === id)!;
    const obstacles = [...this.obstacles, extra.footprint];
    const actors = [...this.people.values(), ...this.staff.employees];
    if (!canStand(player, obstacles) || this.staff.employees.some(a => !canStand(a.position, obstacles)) ||
        [...this.people.values()].some(a => !canStandCustomer(a.position, obstacles)))
      return 'Zona ocupada: cierra el panel y deja libre el espacio.';
    const tableIds = [...this.seats.keys(), id];
    const destinations = [...Object.values(CUSTOMER_LAYOUT), ...Object.values(QUEUE_POINTS).flat(),
      ...Object.values(STAFF_POSITIONS), ...this.interactionZones.map(z => z.position), extra.interaction,
      ...tableIds.flatMap(key => [TABLE_POSITIONS[key]!.seat, CLEANING_WAIT_POINTS[key]!])];
    if (destinations.some(p => !findCustomerPath(PLAYER.spawn, p, this.routingObstacles)) ||
        actors.some(actor => actor.route.length > 0 && !findCustomerPath(actor.position, actor.route.at(-1)!, this.routingObstacles)))
      return 'Espera a que haya un recorrido libre para todos.';
    return null;
  }

  get customers(): readonly Readonly<Customer>[] { return [...this.people.values()]; }
  get orders(): readonly Readonly<Order>[] { return [...this.tickets.values()]; }
  get tables(): readonly Readonly<TableState>[] { return [...this.seats.values()]; }
  get money(): number { return this.coins; }
  get elapsedMs(): number { return this.clockMs; }
  queue(intent: Intent): readonly string[] { return this.lines[intent]; }
  table(id: string): Readonly<TableState> | undefined { return this.seats.get(id); }
  order(id: string): Readonly<Order> | undefined { return this.tickets.get(id); }
  customer(id: string): Readonly<Customer> | undefined { return this.people.get(id); }

  // One attempted arrival, fixed intention. A full chosen queue drops it, without fallback or debt.
  admitCustomer(intent: Intent): string | null {
    if (this.people.size >= this.options.maxCustomers ||
        this.lines[intent].length >= Math.min(this.options.queueLimits[intent], QUEUE_POINTS[intent].length)) return null;
    const id = this.epoch + '-c' + (++this.sequence);
    const customer: Customer = {
      id, number: this.sequence, intent, phase: 'entering', position: { ...CUSTOMER_ENTRIES[intent] },
      route: [], waitingSince: null, queueIndex: this.lines[intent].length, orderId: null, eatingElapsedMs: 0, carryingMeal: false,
    };
    const route = findCustomerPath(customer.position, QUEUE_POINTS[intent][customer.queueIndex]!, this.routingObstacles);
    if (!route) return null;
    customer.route = route;
    this.people.set(id, customer);
    this.comments.admit(id);
    this.lines[intent].push(id);
    return id;
  }

  update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
    this.clockMs += deltaMs;
    this.production.update(deltaMs);
    for (const customer of [...this.people.values()]) {
      if (customer.phase === 'eating') {
        customer.eatingElapsedMs += deltaMs;
        if (customer.eatingElapsedMs >= this.options.eatingMs) this.finishMeal(customer);
      } else if (customer.route.length > 0) {
        this.walk(customer, deltaMs);
      }
    }
    this.staff.update(this, deltaMs);
    this.arrivalElapsedMs += deltaMs;
    if (this.arrivalElapsedMs >= this.arrivalIntervalMs) {
      this.arrivalElapsedMs = 0;
      this.admitCustomer(this.random() < this.options.dineInChance ? 'dine-in' : 'takeaway');
    }
  }

  offer(zone: InteractionZone, actorId = 'player'): Offer {
    const inventory = this.actorInventory(actorId);
    if (!inventory) return { command: null, reason: 'Actor no disponible.' };
    if (zone.role === 'checkout') {
      if (actorId !== 'player') return { command: null, reason: 'La caja la atiende el jugador.' };
      const eligible = (['dine-in', 'takeaway'] as const).map(intent => {
        const id = this.lines[intent][0];
        const customer = id ? this.people.get(id) : undefined;
        if (!customer || customer.phase !== 'queueing' || this.production.availablePortions < 1) return null;
        const table = customer.intent === 'dine-in' ? this.chooseTable() : null;
        if (customer.intent === 'dine-in' && !table) return null;
        return { customer, table };
      }).filter(item => item !== null).sort((a, b) =>
        (a.customer.waitingSince! - b.customer.waitingSince!) || a.customer.number - b.customer.number);
      const next = eligible[0];
      if (!next) return { command: null, reason: this.production.availablePortions < 1 ? 'Faltan platos.' :
        this.lines['dine-in'].length + this.lines.takeaway.length === 0 ? 'Esperando clientes…' :
        !this.chooseTable() && this.lines['dine-in'].length > 0 ? 'Sin mesas libres.' : 'El próximo cliente está llegando.' };
      return { command: { kind: 'checkout', customerId: next.customer.id, tableId: next.table?.id ?? null },
        label: 'Cobrar #' + next.customer.number + (next.customer.intent === 'takeaway' ? ' · llevar' : ' · comer aquí') };
    }
    if (zone.role === 'table') {
      const table = this.seats.get(zone.stationId);
      if (!table) return { command: null, reason: 'Mesa no disponible.' };
      if (!this.resourceAvailable('table:' + table.id, actorId)) return { command: null, reason: 'Ya están limpiando esta mesa.' };
      if (table.cleanliness === 'dirty') return inventory.canAdd('waste') ?
        { command: { kind: 'clean', tableId: table.id }, label: 'Recoger residuos de ' + this.tableName(table.id) } :
        { command: null, reason: 'Carga de residuos completa.' };
      return { command: null, reason: table.customerId ? 'Mesa reservada.' : 'Mesa limpia.' };
    }
    const kind = this.stations.find(s => s.id === zone.stationId)!.kind;
    const available = this.production.availableAt(kind, inventory, index => this.resourceAvailable('slot:' + index, actorId));
    return available.action ? { command: { kind: 'production', action: available.action, slotIndex: available.slotIndex }, label: available.label } : { command: null, reason: available.reason };
  }

  validate(command: RestaurantAction, actorId = 'player'): string | null {
    const inventory = this.actorInventory(actorId);
    if (!inventory) return 'Actor no disponible.';
    const resource = this.resourceKey(command);
    if (resource && !this.resourceAvailable(resource, actorId)) return 'Recurso ocupado por otra acción.';
    if (command.kind === 'production' && (command.action === 'start-cooking' || command.action === 'take-meal') && command.slotIndex === undefined) return 'Falta la posición del hornillo.';
    if (actorId === 'cleaner' && !(command.kind === 'clean' || (command.kind === 'production' && command.action === 'discard'))) return 'Limpieza solo recoge y tira residuos.';
    if (actorId === 'cook' && command.kind !== 'production') return 'El cocinero solo produce.';
    if (actorId === 'cook' && command.kind === 'production' &&
        (command.action === 'start-cooking' || command.action === 'take-ingredients') &&
        this.production.availablePortions >= STAFF.cookStockTarget) return 'Stock objetivo alcanzado.';
    if (command.kind === 'production') return this.production.canPerform(command.action, command.slotIndex, inventory) ? null : 'La acción de producción ya no está disponible.';
    if (command.kind === 'clean') {
      const table = this.seats.get(command.tableId);
      return !inventory.canAdd('waste') ? 'Carga de residuos completa.' : table?.cleanliness !== 'dirty' ? 'La mesa ya está limpia.' : null;
    }
    if (command.kind === 'checkout') {
      if (actorId !== 'player') return 'La caja la atiende el jugador.';
      const customer = this.people.get(command.customerId);
      if (!customer || customer.phase !== 'queueing' || customer.orderId || this.lines[customer.intent][0] !== customer.id) return 'Ese cliente ya no está listo en la caja.';
      if (this.production.availablePortions < 1) return 'Ya no queda una ración disponible.';
      if (customer.intent === 'dine-in') {
        const table = command.tableId ? this.seats.get(command.tableId) : undefined;
        if (!table || table.customerId !== null) return 'La mesa seleccionada ya no está disponible.';
      } else if (command.tableId !== null) return 'Un pedido para llevar no reserva mesa.';
      return null;
    }
    return 'Acción no disponible.';
  }

  private apply(command: RestaurantAction, actorId: string): string | null {
    if (this.validate(command, actorId)) return null;
    const inventory = this.actorInventory(actorId)!;
    if (command.kind === 'production') return this.production.perform(command.action, command.slotIndex, inventory);
    if (command.kind === 'checkout') {
      if (actorId !== 'player') return 'La caja la atiende el jugador.';
      const customer = this.people.get(command.customerId)!;
      const table = command.tableId ? this.seats.get(command.tableId)! : null;
      const destination = table ? (table.cleanliness === 'clean' ? TABLE_POSITIONS[table.id]!.seat : CLEANING_WAIT_POINTS[table.id]!) : CUSTOMER_LAYOUT.exit;
      const route = findCustomerPath(customer.position, destination, this.routingObstacles);
      if (!route) return null; // Validate the physical route before stock, money or reservations change.
      const id = 'order-' + customer.id;
      if (!this.production.sellAvailable()) return null;
      const order: Order = { id, customerId: customer.id, number: customer.number, tableId: table?.id ?? null,
        paidAt: this.clockMs, status: table ? 'carried' : 'takeaway' };
      this.tickets.set(id, order);
      customer.orderId = id;
      this.comments.remove(customer.id);
      customer.carryingMeal = table !== null;
      if (table) table.customerId = customer.id;
      this.coins += this.options.price;
      this.lines[customer.intent].shift();
      this.transition(customer, table ? (table.cleanliness === 'clean' ? 'walking-to-table' : 'walking-to-cleaning-wait') : 'leaving');
      customer.route = route;
      this.advanceQueue(customer.intent);
      return '+' + this.options.price + ' monedas · #' + customer.number + (table ? ' recoge su plato para ' + this.tableName(table.id) + '.' : ' se lleva su nasi goreng.');
    }
    const table = this.seats.get(command.tableId)!;
    if (!this.production.collectWaste(inventory)) return null;
    table.dirtySince = null;
    table.cleanliness = 'clean'; // Assignment is deliberately independent and retained.
    const customer = table.customerId ? this.people.get(table.customerId) : undefined;
    if (customer && (customer.phase === 'waiting-cleaning' || customer.phase === 'walking-to-cleaning-wait')) this.sendToTable(customer, table.id);
    return 'Mesa limpia. Lleva los residuos a la papelera.';
  }

  reset(): void {
    this.staff.reset(); this.locks.clear(); this.comments.reset();
    this.spent = 0; this.demandRaised = false; this.demandNotice = false;
    for (const id of Object.keys(this.levels) as UpgradeId[]) this.levels[id] = 0;
    this.production.reset();
    this.people.clear(); this.tickets.clear(); this.seats.clear();
    this.lines['dine-in'].length = 0; this.lines.takeaway.length = 0;
    for (const station of STATIONS.filter(s => s.kind === 'table')) this.seats.set(station.id, { id: station.id, cleanliness: 'clean', customerId: null, dirtySince: null });
    this.clockMs = 0; this.arrivalElapsedMs = 0; this.coins = 0; this.sequence = 0;
    this.epoch++; // Old prepared actions can never refer to a new customer after resetting.
  }

  private chooseTable(): TableState | undefined {
    const free = [...this.seats.values()].filter(table => table.customerId === null);
    return free.find(table => table.cleanliness === 'clean') ?? free[0];
  }
  private tableName(id: string): string { return this.stations.find(s => s.id === id)!.name; }
  private transition(customer: Customer, phase: CustomerPhase): void {
    if (!TRANSITIONS[customer.phase].includes(phase)) throw new Error('Transición inválida: ' + customer.phase + ' → ' + phase);
    customer.phase = phase;
  }
  private advanceQueue(intent: Intent): void {
    this.lines[intent].forEach((id, index) => {
      const customer = this.people.get(id)!;
      if (customer.queueIndex === index) return;
      customer.queueIndex = index;
      if (customer.phase !== 'entering') this.sendToQueue(customer);
    });
  }
  private sendToQueue(customer: Customer): void {
    const destination = QUEUE_POINTS[customer.intent][customer.queueIndex]!;
    customer.route = this.requireRoute(customer.position, destination);
    this.transition(customer, 'walking-to-queue');
    if (customer.route.length === 0) this.arrived(customer);
  }
  private sendToTable(customer: Customer, tableId: string): void {
    customer.route = this.requireRoute(customer.position, TABLE_POSITIONS[tableId]!.seat);
    this.transition(customer, 'walking-to-table');
    if (customer.route.length === 0) this.arrived(customer);
  }
  private requireRoute(from: Point, to: Point): Point[] {
    const route = findCustomerPath(from, to, this.routingObstacles);
    if (!route) throw new Error('El itinerario del cliente no tiene un camino accesible.');
    return route;
  }
  private walk(customer: Customer, deltaMs: number): void {
    let distance = this.options.speed * deltaMs / 1000;
    while (distance > 0 && customer.route.length > 0) {
      const target = customer.route[0]!;
      const dx = target.x - customer.position.x, dy = target.y - customer.position.y;
      const length = Math.hypot(dx, dy);
      if (length <= distance) {
        customer.position = { ...target };
        customer.route.shift(); distance -= length;
      } else {
        customer.position.x += dx / length * distance;
        customer.position.y += dy / length * distance;
        distance = 0;
      }
    }
    if (customer.route.length === 0) this.arrived(customer);
  }
  private arrived(customer: Customer): void {
    switch (customer.phase) {
      case 'entering': this.sendToQueue(customer); break;
      case 'walking-to-queue':
        this.transition(customer, 'queueing');
        customer.waitingSince ??= this.clockMs;
        break;
      case 'walking-to-cleaning-wait': {
        const table = this.seats.get(this.tickets.get(customer.orderId!)!.tableId!)!;
        if (table.cleanliness === 'dirty') this.transition(customer, 'waiting-cleaning');
        else this.sendToTable(customer, table.id);
        break;
      }
      case 'walking-to-table': {
        const order = this.tickets.get(customer.orderId!)!;
        this.transition(customer, 'eating');
        customer.carryingMeal = false;
        customer.eatingElapsedMs = 0;
        order.status = 'eating';
        break;
      }
      case 'leaving':
        if (customer.orderId) this.tickets.delete(customer.orderId);
        this.people.delete(customer.id); this.comments.remove(customer.id);
        break;
    }
  }
  private finishMeal(customer: Customer): void {
    const order = this.tickets.get(customer.orderId!)!;
    const table = this.seats.get(order.tableId!)!;
    const route = findCustomerPath(customer.position, CUSTOMER_LAYOUT.exit, this.routingObstacles);
    if (!route) return;
    order.status = 'consumed';
    table.cleanliness = 'dirty'; table.customerId = null; table.dirtySince = this.clockMs;
    this.transition(customer, 'leaving');
    customer.route = route;
  }
}

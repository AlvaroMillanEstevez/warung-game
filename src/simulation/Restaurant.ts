import { CUSTOMERS, DEMAND, PLAYER, STAFF, UPGRADES } from '../config.ts';
import { CLEANING_WAIT_POINTS, CUSTOMER_ENTRIES, CUSTOMER_LAYOUT, EXTRA_TABLES, EXTRA_STOVE, INTERACTION_ZONES, QUEUE_POINTS, STAFF_POSITIONS, STATIONS, TABLE_POSITIONS, stationZone } from '../world/layout.ts';
import type { InteractionZone, Point, Rect, StationData } from '../world/layout.ts';
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
  | { kind: 'production'; action: ProductionAction; stoveId?: string | undefined; slotIndex?: number | undefined }
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
  private tier = 0;
  private demandNotice = false;
  private readonly locks = new Map<string, string>();
  private readonly loadReservations = new Map<string, string>();
  private levels: Record<UpgradeId, number> = { cook: 0, cleaner: 0, transport: 0, actionSpeed: 0, stoveSpeed: 0, tables: 0, stove: 0 };
  private readonly random: () => number;
  private clockMs = 0;
  private arrivalElapsedMs = 0;
  private arrivalsActive = false;
  private firstArrival = true;
  private coins = 0;
  private epoch = 0;
  private sequence = 0;

  constructor(options: Partial<RestaurantOptions> = {}, random: () => number = Math.random) {
    this.options = { ...CUSTOMERS, ...options };
    this.random = random;
    this.reset();
  }


  private get boughtFurniture(): readonly StationData[] {
    return [...EXTRA_TABLES.slice(0, this.levels.tables), ...(this.levels.stove ? [EXTRA_STOVE] : [])];
  }
  get stations() { return [...STATIONS, ...this.boughtFurniture]; }
  get routingObstacles(): Rect[] { return [...STATIONS, ...EXTRA_TABLES, EXTRA_STOVE].map(s => s.footprint); }
  get obstacles(): Rect[] { return this.stations.map(s => s.footprint); }
  get interactionZones(): readonly InteractionZone[] {
    return [...INTERACTION_ZONES, ...this.boughtFurniture.map(stationZone)];
  }
  get teamCapacity(): number { return UPGRADES.transport.capacities[this.levels.transport]!; }
  get totalSpent(): number { return this.spent; }
  get demandTier(): number { return this.tier; }
  get demandFrequency(): number { return DEMAND.tiers[this.tier]!.frequency; }
  get increasedDemand(): boolean { return this.tier > 0; }
  get arrivalIntervalMs(): number { return this.options.arrivalMs / this.demandFrequency; }
  get arrivalsStarted(): boolean { return this.arrivalsActive; }
  get awaitingFirstArrival(): boolean { return this.arrivalsActive && this.firstArrival; }
  takeDemandNotice(): boolean { const value = this.demandNotice; this.demandNotice = false; return value; }
  get teamActionMs(): number { return UPGRADES.actionSpeed.durationsMs[this.levels.actionSpeed]!; }
  upgradeLevel(id: UpgradeId): number { return this.levels[id]; }
  get activeReservations(): ReadonlyMap<string, string> { return new Map(this.locks); }
  get reservedProduction(): number { return this.loadReservations.size; }
  get committedProduction(): number {
    const stove = this.production.stoveSummary;
    return this.production.availablePortions + stove.cooking + stove.ready +
      this.staff.employees.filter(w => w.role === 'cook').reduce((sum, w) => sum + w.inventory.count('meals'), 0) +
      this.reservedProduction;
  }
  resourceAvailable(resource: string, actorId: string): boolean { return !this.locks.has(resource) || this.locks.get(resource) === actorId; }
  private actorInventory(actorId: string): Inventory | undefined {
    return actorId === 'player' ? this.production.playerInventory : this.staff.get(actorId)?.inventory;
  }
  private resourceKey(command: RestaurantAction): string | null {
    return command.kind === 'clean' ? 'table:' + command.tableId :
      command.kind === 'production' && command.slotIndex !== undefined ? 'slot:' + command.stoveId + ':' + command.slotIndex : null;
  }
  beginAction(command: RestaurantAction, actorId = 'player'): boolean {
    this.cancelAction(actorId);
    if (this.validate(command, actorId)) return false;
    const key = this.resourceKey(command);
    if (key) this.locks.set(key, actorId);
    if (this.staff.get(actorId)?.role === 'cook' && command.kind === 'production' && command.action === 'start-cooking')
      this.loadReservations.set(actorId, actionKey(command));
    return true;
  }
  cancelAction(actorId = 'player'): void {
    this.loadReservations.delete(actorId);
    for (const [resource, owner] of this.locks) if (owner === actorId) this.locks.delete(resource);
  }
  perform(command: RestaurantAction, actorId = 'player'): string | null {
    try { return this.apply(command, actorId); }
    finally { this.cancelAction(actorId); }
  }
  purchaseState(id: UpgradeId, player: Point = PLAYER.spawn): { level: number; price: number | null; problem: string | null } {
    const level = this.levels[id], price = UPGRADES[id].prices[level] ?? null;
    const secondCookReady = this.staff.get('cook') && this.levels.stove > 0 && this.production.slotsFor(EXTRA_STOVE.id).length > 0;
    const problem = price === null ? (id === 'tables' ? 'Espacio completo' : id === 'cook' ? 'Equipo completo' : 'Máximo alcanzado') :
      id === 'cook' && level === 1 && !secondCookReady ? 'Requiere el primer cocinero y el segundo hornillo instalado.' :
      this.coins < price ? 'Fondos insuficientes' :
      this.furnitureToBuy(id) ? this.placementProblem(this.furnitureToBuy(id)!, player) : null;
    return { level, price, problem };
  }
  purchase(id: UpgradeId, expectedLevel: number, player: Point = PLAYER.spawn): boolean {
    if (!(id in UPGRADES) || this.levels[id] !== expectedLevel) return false;
    const offer = this.purchaseState(id, player);
    if (offer.problem || offer.price === null) return false;
    const furniture = this.furnitureToBuy(id);
    const routes: { actor: { route: Point[] }; path: Point[] }[] = [];
    if (furniture) {
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
    const tier = DEMAND.tiers.reduce((current, item, index) => this.spent >= item.spending ? index : current, 0);
    if (tier !== this.tier) {
      this.tier = tier; this.demandNotice = true;
      if (!this.firstArrival) this.arrivalElapsedMs = 0;
    }
    if (id === 'cook' || id === 'cleaner') {
      this.staff.hire(id === 'cook' && this.levels.cook === 2 ? 'cook-2' : id, this.teamCapacity);
      // A second cook fixes stove ownership; only tasks on the now unassigned stove become invalid.
      for (const worker of this.staff.employees)
        if (worker.task && this.validate(worker.task.command, worker.id)) this.staff.cancel(worker.id, this);
    }
    if (id === 'transport') {
      const capacity = UPGRADES.transport.capacities[this.levels.transport]!;
      this.production.playerInventory.setLimits({ ingredients: capacity, meals: capacity, waste: capacity });
      this.staff.upgradeCapacity(capacity);
    }
    if (id === 'stoveSpeed') this.production.cookingMs = UPGRADES.stoveSpeed.durationsMs[this.levels.stoveSpeed]!;
    if (furniture) {
      if (furniture.kind === 'table') this.seats.set(furniture.id, { id: furniture.id, cleanliness: 'clean', customerId: null, dirtySince: null });
      if (furniture.kind === 'stove') this.production.addStove(furniture.id);
      // Replan from current positions without changing tasks, reservations or elapsed actions.
      for (const { actor, path } of routes) actor.route = path;
    }
    return true;
  }
  private furnitureToBuy(id: UpgradeId): StationData | undefined {
    return id === 'tables' ? EXTRA_TABLES[this.levels.tables] : id === 'stove' && this.levels.stove === 0 ? EXTRA_STOVE : undefined;
  }
  private placementProblem(extra: StationData, player: Point): string | null {
    const obstacles = [...this.obstacles, extra.footprint];
    if (!canStand(player, obstacles) || this.staff.employees.some(a => !canStand(a.position, obstacles)) ||
        [...this.people.values()].some(a => !canStandCustomer(a.position, obstacles)))
      return 'Zona ocupada: cierra el panel y deja libre el espacio.';
    const tableIds = [...this.seats.keys(), ...(extra.kind === 'table' ? [extra.id] : [])];
    const publicDestinations = [...Object.values(CUSTOMER_LAYOUT), ...Object.values(QUEUE_POINTS).flat(),
      ...tableIds.flatMap(key => [TABLE_POSITIONS[key]!.seat, CLEANING_WAIT_POINTS[key]!])];
    const workDestinations = [...Object.values(STAFF_POSITIONS), ...this.interactionZones.map(z => z.position), extra.interaction];
    if (workDestinations.some(p => !findPath(player, p, this.routingObstacles)) ||
        publicDestinations.some(p => !findCustomerPath(QUEUE_POINTS['dine-in'][0]!, p, this.routingObstacles)) ||
        [...this.people.values()].some(a => a.route.length > 0 && !findCustomerPath(a.position, a.route.at(-1)!, this.routingObstacles)) ||
        this.staff.employees.some(a => a.route.length > 0 && !findPath(a.position, a.route.at(-1)!, this.routingObstacles)))
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
    if (!this.arrivalsActive) return;
    this.arrivalElapsedMs += deltaMs;
    if (this.arrivalElapsedMs + 0.000001 >= (this.firstArrival ? DEMAND.firstArrivalDelayMs : this.arrivalIntervalMs)) {
      this.arrivalElapsedMs = 0; this.firstArrival = false;
      this.admitCustomer(this.random() < this.options.dineInChance ? 'dine-in' : 'takeaway');
    }
  }

  // Called after collision resolution: key intent, blocked movement and staff never activate arrivals.
  playerMoved(from: Point, to: Point): void {
    if (this.arrivalsActive || ![from.x, from.y, to.x, to.y].every(Number.isFinite) ||
        Math.hypot(to.x - from.x, to.y - from.y) <= 0) return;
    this.arrivalsActive = true; this.firstArrival = true; this.arrivalElapsedMs = 0;
  }

  offer(zone: InteractionZone, actorId = 'player'): Offer {
    const inventory = this.actorInventory(actorId);
    if (!inventory) return { command: null, reason: 'Actor no disponible.' };
    if (zone.role === 'office') return { command: null, reason: 'Mejoras del local.' };
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
        { command: { kind: 'clean', tableId: table.id }, label: 'Recoger residuos de la mesa' } :
        { command: null, reason: 'Carga de residuos completa.' };
      return { command: null, reason: table.customerId ? 'Mesa reservada.' : 'Mesa limpia.' };
    }
    const kind = this.stations.find(s => s.id === zone.stationId)!.kind;
    const available = this.production.availableAt(kind, inventory, index => this.resourceAvailable('slot:' + zone.stationId + ':' + index, actorId), zone.stationId);
    return available.action ? { command: { kind: 'production', action: available.action, stoveId: kind === 'stove' ? zone.stationId : undefined, slotIndex: available.slotIndex }, label: available.label } : { command: null, reason: available.reason };
  }

  validate(command: RestaurantAction, actorId = 'player'): string | null {
    const inventory = this.actorInventory(actorId);
    if (!inventory) return 'Actor no disponible.';
    const resource = this.resourceKey(command);
    if (resource && !this.resourceAvailable(resource, actorId)) return 'Recurso ocupado por otra acción.';
    if (command.kind === 'production' && (command.action === 'start-cooking' || command.action === 'take-meal') && (command.slotIndex === undefined || command.stoveId === undefined)) return 'Falta el hornillo o su posición.';
    const worker = this.staff.get(actorId);
    if (worker?.role === 'cleaner' && !(command.kind === 'clean' || (command.kind === 'production' && command.action === 'discard'))) return 'Limpieza solo recoge y tira residuos.';
    if (worker?.role === 'cook') {
      if (command.kind !== 'production' || command.action === 'discard') return 'El cocinero solo produce.';
      if (command.stoveId && worker.assignedStove && command.stoveId !== worker.assignedStove) return 'Ese hornillo corresponde al otro cocinero.';
      // The pending load already owns one unit of capacity. Replace it with the real portion on completion.
      const ownReservation = this.loadReservations.get(actorId) === actionKey(command) ? 1 : 0;
      if ((command.action === 'start-cooking' || command.action === 'take-ingredients') &&
          this.committedProduction - ownReservation >= STAFF.cookStockTarget) return 'Producción objetivo alcanzada.';
    }
    if (command.kind === 'production') return this.production.canPerform(command.action, command.slotIndex, inventory, command.stoveId) ? null : 'La acción de producción ya no está disponible.';
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
    if (command.kind === 'production') {
      return this.production.perform(command.action, command.slotIndex, inventory, command.stoveId);
    }
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
      return '+' + this.options.price + ' monedas · #' + customer.number + (table ? ' recoge su plato.' : ' se lleva su nasi goreng.');
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
    this.staff.reset(); this.locks.clear(); this.loadReservations.clear(); this.comments.reset();
    this.spent = 0; this.tier = 0; this.demandNotice = false;
    for (const id of Object.keys(this.levels) as UpgradeId[]) this.levels[id] = 0;
    this.production.reset();
    this.people.clear(); this.tickets.clear(); this.seats.clear();
    this.lines['dine-in'].length = 0; this.lines.takeaway.length = 0;
    for (const station of STATIONS.filter(s => s.kind === 'table')) this.seats.set(station.id, { id: station.id, cleanliness: 'clean', customerId: null, dirtySince: null });
    this.arrivalsActive = false; this.firstArrival = true;
    this.clockMs = 0; this.arrivalElapsedMs = 0; this.coins = 0; this.sequence = 0;
    this.epoch++; // Old prepared actions can never refer to a new customer after resetting.
  }

  private chooseTable(): TableState | undefined {
    const free = [...this.seats.values()].filter(table => table.customerId === null);
    return free.find(table => table.cleanliness === 'clean') ?? free[0];
  }
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

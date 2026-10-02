import { CUSTOMERS } from '../config.ts';
import { CUSTOMER_LAYOUT, QUEUE_POINTS, STATIONS, TABLE_POSITIONS } from '../world/layout.ts';
import type { InteractionZone, Point } from '../world/layout.ts';
import { findPath } from '../world/navigation.ts';
import { Production } from './Production.ts';
import type { ProductionAction } from './Production.ts';

export type Intent = 'dine-in' | 'takeaway';
export type CustomerPhase = 'entering' | 'walking-to-queue' | 'queueing' | 'walking-to-table' |
  'waiting-cleaning' | 'walking-to-seat' | 'waiting-food' | 'eating' | 'leaving';
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
}
export interface TableState { readonly id: string; cleanliness: 'clean' | 'dirty'; customerId: string | null }
export interface Order {
  readonly id: string;
  readonly customerId: string;
  readonly number: number;
  readonly tableId: string | null;
  readonly paidAt: number;
  status: 'reserved' | 'carried' | 'served';
}
export type RestaurantAction =
  | { kind: 'production'; action: ProductionAction }
  | { kind: 'checkout'; customerId: string; tableId: string | null }
  | { kind: 'pickup'; orderId: string }
  | { kind: 'serve'; orderId: string; tableId: string }
  | { kind: 'clean'; tableId: string };
export type Offer = { command: RestaurantAction; label: string } | { command: null; reason: string };
export interface RestaurantOptions {
  arrivalMs: number; dineInChance: number; maxCustomers: number; maxQueueLength: number;
  speed: number; eatingMs: number; price: number;
}

const TRANSITIONS: Record<CustomerPhase, readonly CustomerPhase[]> = {
  entering: ['walking-to-queue'],
  'walking-to-queue': ['walking-to-queue', 'queueing'],
  queueing: ['walking-to-queue', 'walking-to-table', 'leaving'],
  'walking-to-table': ['waiting-cleaning', 'waiting-food', 'walking-to-seat'],
  'waiting-cleaning': ['walking-to-seat'],
  'walking-to-seat': ['waiting-food'],
  'waiting-food': ['eating'],
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
  private readonly obstacles = STATIONS.map(s => s.footprint);
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
        this.lines[intent].length >= Math.min(this.options.maxQueueLength, QUEUE_POINTS[intent].length)) return null;
    const id = this.epoch + '-c' + (++this.sequence);
    const customer: Customer = {
      id, number: this.sequence, intent, phase: 'entering', position: { ...CUSTOMER_LAYOUT.entry },
      route: [], waitingSince: null, queueIndex: this.lines[intent].length, orderId: null, eatingElapsedMs: 0,
    };
    const route = findPath(customer.position, CUSTOMER_LAYOUT.inside, this.obstacles);
    if (!route) return null;
    customer.route = route;
    this.people.set(id, customer);
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
    this.arrivalElapsedMs += deltaMs;
    if (this.arrivalElapsedMs >= this.options.arrivalMs) {
      this.arrivalElapsedMs %= this.options.arrivalMs;
      this.admitCustomer(this.random() < this.options.dineInChance ? 'dine-in' : 'takeaway');
    }
  }

  offer(zone: InteractionZone): Offer {
    if (zone.role === 'checkout') {
      if (this.production.carried !== null) return { command: null, reason: 'Necesitas las manos vacías para cobrar.' };
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
      if (!next) return { command: null, reason: this.production.availablePortions < 1 ? 'Deposita una ración disponible antes de cobrar.' :
        this.lines['dine-in'].length + this.lines.takeaway.length === 0 ? 'Aún no hay clientes en las filas.' :
        !this.chooseTable() && this.lines['dine-in'].length > 0 ? 'Sin mesas libres; la fila para llevar sigue activa.' : 'Espera a que un cliente llegue a la cabeza de su fila.' };
      return { command: { kind: 'checkout', customerId: next.customer.id, tableId: next.table?.id ?? null },
        label: 'Cobrar #' + next.customer.number + (next.customer.intent === 'takeaway' ? ' · llevar' : ' · comer aquí') };
    }
    if (zone.role === 'pickup') {
      if (this.production.carried !== null) return { command: null, reason: 'Deja libres las manos para recoger un pedido.' };
      const order = [...this.tickets.values()].filter(order => order.status === 'reserved' &&
        this.people.get(order.customerId)?.phase === 'waiting-food').sort((a, b) => a.paidAt - b.paidAt || a.number - b.number)[0];
      return order ? { command: { kind: 'pickup', orderId: order.id }, label: 'Recoger pedido #' + order.number + ' → ' + this.tableName(order.tableId!) } :
        { command: null, reason: 'No hay pedidos pagados con un cliente sentado esperando.' };
    }
    if (zone.role === 'table') {
      const table = this.seats.get(zone.stationId)!;
      if (table.cleanliness === 'dirty') return this.production.carried === null ?
        { command: { kind: 'clean', tableId: table.id }, label: 'Recoger residuos de ' + this.tableName(table.id) } :
        { command: null, reason: 'Necesitas las manos vacías para limpiar.' };
      const held = this.production.carried;
      if (held && typeof held === 'object') {
        const order = this.tickets.get(held.orderId);
        const command: RestaurantAction = { kind: 'serve', orderId: held.orderId, tableId: table.id };
        const problem = this.validate(command);
        return problem ? { command: null, reason: problem } : { command, label: 'Servir pedido #' + order!.number };
      }
      const customer = table.customerId ? this.people.get(table.customerId) : undefined;
      return { command: null, reason: !customer ? 'Mesa limpia, sin cliente asignado.' : customer.phase === 'eating' ? 'El cliente está comiendo.' :
        customer.phase === 'waiting-food' ? 'Recoge su pedido pagado en el mostrador.' : 'El cliente está llegando a su mesa.' };
    }
    const kind = STATIONS.find(s => s.id === zone.stationId)!.kind;
    const available = this.production.availableAt(kind);
    return available.action ? { command: { kind: 'production', action: available.action }, label: available.label } : { command: null, reason: available.reason };
  }

  validate(command: RestaurantAction): string | null {
    const held = this.production.carried;
    if (command.kind === 'production') return this.production.canPerform(command.action) ? null : 'La acción de producción ya no está disponible.';
    if (command.kind === 'clean') {
      const table = this.seats.get(command.tableId);
      return held !== null ? 'Necesitas las manos vacías para limpiar.' : table?.cleanliness !== 'dirty' ? 'La mesa ya está limpia.' : null;
    }
    if (command.kind === 'checkout') {
      const customer = this.people.get(command.customerId);
      if (held !== null) return 'Necesitas las manos vacías para cobrar.';
      if (!customer || customer.phase !== 'queueing' || customer.orderId || this.lines[customer.intent][0] !== customer.id) return 'Ese cliente ya no está listo en la caja.';
      if (this.production.availablePortions < 1) return 'Ya no queda una ración sin reservar.';
      if (customer.intent === 'dine-in') {
        const table = command.tableId ? this.seats.get(command.tableId) : undefined;
        if (!table || table.customerId !== null) return 'La mesa seleccionada ya no está disponible.';
      } else if (command.tableId !== null) return 'Un pedido para llevar no reserva mesa.';
      return null;
    }
    const order = this.tickets.get(command.orderId);
    if (!order || !order.tableId) return 'Ese pedido ya no está disponible.';
    const table = this.seats.get(order.tableId)!;
    const customer = this.people.get(order.customerId);
    if (command.kind === 'serve' && command.tableId !== order.tableId) return 'Este plato corresponde a ' + this.tableName(order.tableId) + '.';
    if (table.customerId !== order.customerId || table.cleanliness !== 'clean' || customer?.phase !== 'waiting-food') return 'Espera a que el cliente esté sentado en su mesa limpia.';
    if (command.kind === 'pickup') return held !== null ? 'Necesitas las manos vacías.' :
      order.status !== 'reserved' || !this.production.hasReservation(order.id) ? 'El pedido ya se ha recogido.' : null;
    return order.status !== 'carried' || !held || typeof held !== 'object' || held.orderId !== order.id ? 'No llevas el pedido de este cliente.' : null;
  }

  perform(command: RestaurantAction): string | null {
    if (this.validate(command)) return null;
    if (command.kind === 'production') return this.production.perform(command.action);
    if (command.kind === 'checkout') {
      const customer = this.people.get(command.customerId)!;
      const table = command.tableId ? this.seats.get(command.tableId)! : null;
      const destination = table ? TABLE_POSITIONS[table.id]![table.cleanliness === 'clean' ? 'seat' : 'waiting'] : CUSTOMER_LAYOUT.exit;
      const route = findPath(customer.position, destination, this.obstacles);
      if (!route) return null; // Validate the physical route before stock, money or reservations change.
      const id = 'order-' + customer.id;
      if (table ? !this.production.reservePortion(id) : !this.production.sellAvailable()) return null;
      const order: Order = { id, customerId: customer.id, number: customer.number, tableId: table?.id ?? null,
        paidAt: this.clockMs, status: table ? 'reserved' : 'served' };
      this.tickets.set(id, order);
      customer.orderId = id;
      if (table) table.customerId = customer.id;
      this.coins += this.options.price;
      this.lines[customer.intent].shift();
      this.transition(customer, table ? 'walking-to-table' : 'leaving');
      customer.route = route;
      this.advanceQueue(customer.intent);
      return '+' + this.options.price + ' monedas · #' + customer.number + (table ? ' va a ' + this.tableName(table.id) + '.' : ' se lleva su nasi goreng.');
    }
    if (command.kind === 'pickup') {
      if (!this.production.collectReserved(command.orderId)) return null;
      const order = this.tickets.get(command.orderId)!;
      order.status = 'carried';
      return 'Pedido #' + order.number + ' → ' + this.tableName(order.tableId!) + '.';
    }
    if (command.kind === 'serve') {
      if (!this.production.deliverReserved(command.orderId)) return null;
      const order = this.tickets.get(command.orderId)!;
      order.status = 'served';
      const customer = this.people.get(order.customerId)!;
      this.transition(customer, 'eating');
      customer.eatingElapsedMs = 0;
      return 'Pedido servido. ¡Buen provecho!';
    }
    const table = this.seats.get(command.tableId)!;
    if (!this.production.collectWaste()) return null;
    table.cleanliness = 'clean'; // Assignment is deliberately independent and retained.
    const customer = table.customerId ? this.people.get(table.customerId) : undefined;
    if (customer?.phase === 'waiting-cleaning') this.sendToSeat(customer, table.id);
    return 'Mesa limpia. Lleva los residuos a la papelera.';
  }

  reset(): void {
    this.production.reset();
    this.people.clear(); this.tickets.clear(); this.seats.clear();
    this.lines['dine-in'].length = 0; this.lines.takeaway.length = 0;
    for (const id of Object.keys(TABLE_POSITIONS)) this.seats.set(id, { id, cleanliness: 'clean', customerId: null });
    this.clockMs = 0; this.arrivalElapsedMs = 0; this.coins = 0; this.sequence = 0;
    this.epoch++; // Old prepared actions can never refer to a new customer after resetting.
  }

  private chooseTable(): TableState | undefined {
    const free = [...this.seats.values()].filter(table => table.customerId === null);
    return free.find(table => table.cleanliness === 'clean') ?? free[0];
  }
  private tableName(id: string): string { return STATIONS.find(s => s.id === id)!.name; }
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
  private sendToSeat(customer: Customer, tableId: string): void {
    customer.route = this.requireRoute(customer.position, TABLE_POSITIONS[tableId]!.seat);
    this.transition(customer, 'walking-to-seat');
    if (customer.route.length === 0) this.arrived(customer);
  }
  private requireRoute(from: Point, to: Point): Point[] {
    const route = findPath(from, to, this.obstacles);
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
      case 'walking-to-table': {
        const table = this.seats.get(this.tickets.get(customer.orderId!)!.tableId!)!;
        if (table.cleanliness === 'dirty') this.transition(customer, 'waiting-cleaning');
        else {
          const seat = TABLE_POSITIONS[table.id]!.seat;
          if (Math.hypot(customer.position.x - seat.x, customer.position.y - seat.y) > 0.1) this.sendToSeat(customer, table.id);
          else this.transition(customer, 'waiting-food');
        }
        break;
      }
      case 'walking-to-seat': this.transition(customer, 'waiting-food'); break;
      case 'leaving':
        if (customer.orderId) this.tickets.delete(customer.orderId);
        this.people.delete(customer.id);
        break;
    }
  }
  private finishMeal(customer: Customer): void {
    const order = this.tickets.get(customer.orderId!)!;
    const table = this.seats.get(order.tableId!)!;
    const route = findPath(customer.position, CUSTOMER_LAYOUT.exit, this.obstacles);
    if (!route) return;
    table.cleanliness = 'dirty'; table.customerId = null;
    this.transition(customer, 'leaving');
    customer.route = route;
  }
}

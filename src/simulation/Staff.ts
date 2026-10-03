import { STAFF } from '../config.ts';
import { STAFF_POSITIONS } from '../world/layout.ts';
import type { Point } from '../world/layout.ts';
import { findPath } from '../world/navigation.ts';
import { Inventory } from './Inventory.ts';
import type { Restaurant, RestaurantAction, Offer } from './Restaurant.ts';

export type StaffRole = 'cook' | 'cleaner';
export interface Employee {
  readonly id: StaffRole;
  readonly inventory: Inventory;
  position: Point;
  route: Point[];
  task: { command: RestaurantAction; destination: Point; label: string; elapsedMs: number; durationMs: number | null } | null;
  retryMs: number;
}
export class Staff {
  private readonly workers = new Map<StaffRole, Employee>();
  get employees(): readonly Employee[] { return [...this.workers.values()]; }
  get(id: string): Employee | undefined { return this.workers.get(id as StaffRole); }
  hire(id: StaffRole, capacity: number): void {
    if (this.workers.has(id)) return;
    this.workers.set(id, { id, inventory: new Inventory(id === 'cook' ? { ingredients: capacity, meals: capacity } : { waste: capacity }),
      position: { ...STAFF_POSITIONS[id] }, route: [], task: null, retryMs: 0 });
  }
  upgradeCapacity(capacity: number): void {
    for (const worker of this.workers.values()) worker.inventory.setLimits(worker.id === 'cook' ?
      { ingredients: capacity, meals: capacity } : { waste: capacity });
  }
  reset(): void { this.workers.clear(); }
  cancel(id: string, restaurant: Restaurant): void {
    const worker = this.get(id);
    if (!worker) return;
    restaurant.cancelAction(id); worker.task = null; worker.route = [];
  }
  update(restaurant: Restaurant, deltaMs: number): void {
    for (const worker of this.workers.values()) {
      worker.retryMs = Math.max(0, worker.retryMs - deltaMs);
      if (worker.task && restaurant.validate(worker.task.command, worker.id)) this.cancel(worker.id, restaurant);
      if (!worker.task && worker.retryMs === 0) {
        const next = worker.id === 'cook' ? this.planCook(worker, restaurant) : this.planCleaner(worker, restaurant);
        if (next?.offer.command) {
          const route = findPath(worker.position, next.destination, restaurant.routingObstacles);
          if (route && restaurant.beginAction(next.offer.command, worker.id)) {
            worker.task = { command: next.offer.command, destination: next.destination, label: next.offer.label, elapsedMs: 0, durationMs: null };
            worker.route = route;
          } else {
            restaurant.cancelAction(worker.id); worker.retryMs = 500;
          }
        } else if (worker.route.length === 0) {
          const wait = worker.id === 'cook' && restaurant.production.stoveSummary.cooking > 0 ?
            restaurant.interactionZones.find(z => z.id === 'stove')!.position : STAFF_POSITIONS[worker.id];
          if (Math.hypot(wait.x - worker.position.x, wait.y - worker.position.y) > 0.1)
            worker.route = findPath(worker.position, wait, restaurant.routingObstacles) ?? [];
        }
      }
      if (worker.route.length > 0) { this.walk(worker, deltaMs); continue; }
      if (!worker.task) continue;
      worker.task.durationMs ??= restaurant.teamActionMs;
      worker.task.elapsedMs += deltaMs;
      if (worker.task.elapsedMs + 0.000001 < worker.task.durationMs) continue;
      // Revalidate position and the exact reserved object before the atomic transfer.
      if (Math.hypot(worker.position.x - worker.task.destination.x, worker.position.y - worker.task.destination.y) < 0.1)
        restaurant.perform(worker.task.command, worker.id);
      this.cancel(worker.id, restaurant);
    }
  }
  private planCook(worker: Employee, r: Restaurant): { offer: Offer; destination: Point } | null {
    const inventory = { ingredients: worker.inventory.count('ingredients'), meals: worker.inventory.count('meals'), waste: worker.inventory.count('waste'),
      limits: { ingredients: worker.inventory.capacity('ingredients'), meals: worker.inventory.capacity('meals'), waste: worker.inventory.capacity('waste') } };
    const select = (id: string) => {
      const zone = r.interactionZones.find(z => z.id === id)!;
      return { offer: r.offer(zone, worker.id), destination: zone.position };
    };
    const slots = r.production.stove;
    const ready = slots.findIndex((s, i) => s.status === 'ready' && r.resourceAvailable('slot:' + i, worker.id));
    if (inventory.meals === inventory.limits.meals) return select('deposit');
    if (ready >= 0 && worker.inventory.canAdd('meals')) return select('stove');
    if (inventory.meals > 0) return select('deposit'); // Deposit partial batches without waiting for full capacity.
    if (r.production.availablePortions >= STAFF.cookStockTarget) return null;
    const empty = slots.filter((s, i) => s.status === 'empty' && r.resourceAvailable('slot:' + i, worker.id)).length;
    const inFlight = slots.filter(s => s.status !== 'empty').length;
    const needed = Math.max(0, STAFF.cookStockTarget - r.production.availablePortions - inFlight);
    if (empty === 0 || needed === 0) return null;
    const batch = Math.min(inventory.limits.ingredients, needed);
    const fridge = r.interactionZones.find(z => z.id === 'fridge')!.position;
    const atFridge = Math.hypot(worker.position.x - fridge.x, worker.position.y - fridge.y) < 0.1;
    if (inventory.ingredients === 0 || (atFridge && inventory.ingredients < batch)) return select('fridge');
    return select('stove');
  }
  private planCleaner(worker: Employee, r: Restaurant): { offer: Offer; destination: Point } | null {
    const dirty = r.tables.filter(t => t.cleanliness === 'dirty' && r.resourceAvailable('table:' + t.id, worker.id)).sort((a, b) => {
      const paidAt = (id: string | null): number => {
        const customer = id ? r.customer(id) : undefined;
        return customer?.orderId ? r.order(customer.orderId)!.paidAt : Infinity;
      };
      return Number(b.customerId !== null) - Number(a.customerId !== null) ||
        (paidAt(a.customerId) - paidAt(b.customerId) || (a.dirtySince! - b.dirtySince!)) || a.id.localeCompare(b.id);
    });
    const inventory = { ingredients: worker.inventory.count('ingredients'), meals: worker.inventory.count('meals'), waste: worker.inventory.count('waste'),
      limits: { ingredients: worker.inventory.capacity('ingredients'), meals: worker.inventory.capacity('meals'), waste: worker.inventory.capacity('waste') } };
    const id = inventory.waste === inventory.limits.waste || (dirty.length === 0 && inventory.waste > 0) ?
      'bin' : dirty[0]?.id;
    if (!id) return null;
    const zone = r.interactionZones.find(z => z.id === id)!;
    return { offer: r.offer(zone, worker.id), destination: zone.position };
  }
  private walk(worker: Employee, deltaMs: number): void {
    let distance = STAFF.speed * deltaMs / 1000;
    while (worker.route.length > 0) {
      const target = worker.route[0]!;
      const dx = target.x - worker.position.x, dy = target.y - worker.position.y, length = Math.hypot(dx, dy);
      if (length <= distance) { Object.assign(worker.position, target); worker.route.shift(); distance -= length; }
      else { worker.position.x += dx / length * distance; worker.position.y += dy / length * distance; break; }
      if (distance <= 0) break;
    }
  }
}

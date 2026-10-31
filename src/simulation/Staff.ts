import type { Message } from '../i18n/core.ts';
import { STAFF } from '../config.ts';
import { CASHIER_WORK, STAFF_POSITIONS } from '../world/layout.ts';
import type { Point } from '../world/layout.ts';
import { findPath } from '../world/navigation.ts';
import { Inventory } from './Inventory.ts';
import type { Restaurant, RestaurantAction, Offer } from './Restaurant.ts';

export type StaffRole = 'cook' | 'cleaner' | 'cashier';
export type StaffId = 'cook' | 'cook-2' | 'cleaner' | 'cashier';
export interface Employee {
  readonly id: StaffId;
  readonly role: StaffRole;
  assignedStove: string | null;
  readonly inventory: Inventory;
  position: Point;
  route: Point[];
  task: { command: RestaurantAction; destination: Point; label: Message; elapsedMs: number; durationMs: number | null } | null;
  retryMs: number;
}
export class Staff {
  private readonly workers = new Map<StaffId, Employee>();
  get employees(): readonly Employee[] { return [...this.workers.values()]; }
  get(id: string): Employee | undefined { return this.workers.get(id as StaffId); }
  hire(id: StaffId, capacity: number): void {
    if (this.workers.has(id)) return;
    const role: StaffRole = id === 'cashier' ? 'cashier' : id === 'cleaner' ? 'cleaner' : 'cook';
    this.workers.set(id, { id, role, assignedStove: null,
      inventory: new Inventory(role === 'cook' ? { ingredients: capacity, meals: capacity } : role === 'cleaner' ? { waste: capacity } : {}),
      position: { ...STAFF_POSITIONS[id] }, route: [], task: null, retryMs: 0 });
    if (this.get('cook') && this.get('cook-2')) {
      this.get('cook')!.assignedStove = 'stove';
      this.get('cook-2')!.assignedStove = 'stove-2';
    }
  }
  upgradeCapacity(capacity: number): void {
    for (const worker of this.workers.values()) worker.inventory.setLimits(worker.role === 'cook' ?
      { ingredients: capacity, meals: capacity } : worker.role === 'cleaner' ? { waste: capacity } : {});
  }
  snapshot() { return this.employees.map(w=>({id:w.id,position:{...w.position},inventory:w.inventory.snapshot()})); }
  restore(data:ReturnType<Staff['snapshot']>,capacity:number):void {
    this.reset();
    for(const w of data) { this.hire(w.id,capacity);const worker=this.get(w.id)!;
      worker.position={...w.position};worker.inventory.restore(w.inventory); }
    // Work and reservations start fresh. A carried item stays carried; nothing transfers on load.
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
        const next = worker.role === 'cashier' ? this.planCashier(worker, restaurant) :
          worker.role === 'cook' ? this.planCook(worker, restaurant) : this.planCleaner(worker, restaurant);
        if (next?.offer.command) {
          const route = findPath(worker.position, next.destination, restaurant.routingObstacles);
          if (route && restaurant.beginAction(next.offer.command, worker.id)) {
            worker.task = { command: next.offer.command, destination: next.destination, label: next.offer.label, elapsedMs: 0, durationMs: null };
            worker.route = route;
          } else {
            restaurant.cancelAction(worker.id); worker.retryMs = 500;
          }
        } else if (worker.route.length === 0) {
          const cooking = worker.role === 'cook' ? restaurant.interactionZones.filter(z =>
            (!worker.assignedStove || z.id === worker.assignedStove) &&
            restaurant.production.slotsFor(z.id).some(slot => slot.status === 'cooking'))
            .sort((a, b) => Math.hypot(a.position.x - worker.position.x, a.position.y - worker.position.y) -
              Math.hypot(b.position.x - worker.position.x, b.position.y - worker.position.y)) : [];
          const wait = worker.role === 'cashier' ? CASHIER_WORK : cooking[0]?.position ?? STAFF_POSITIONS[worker.id];
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
  private planCashier(worker: Employee, r: Restaurant): { offer: Offer; destination: Point } | null {
    // Reach the till before claiming it: walking to work never monopolizes checkout.
    if (Math.hypot(worker.position.x - CASHIER_WORK.x, worker.position.y - CASHIER_WORK.y) > .1) return null;
    const zone = r.interactionZones.find(z => z.id === 'checkout')!;
    return { offer: r.offer(zone, worker.id), destination: CASHIER_WORK };
  }
  private planCook(worker: Employee, r: Restaurant): { offer: Offer; destination: Point } | null {
    const inventory = { ingredients: worker.inventory.count('ingredients'), meals: worker.inventory.count('meals'), waste: worker.inventory.count('waste'),
      limits: { ingredients: worker.inventory.capacity('ingredients'), meals: worker.inventory.capacity('meals'), waste: worker.inventory.capacity('waste') } };
    const select = (id: string) => {
      const zone = r.interactionZones.find(z => z.id === id)!;
      return { offer: r.offer(zone, worker.id), destination: zone.position };
    };
    const stoves = r.production.stoveIds.filter(id => !worker.assignedStove || id === worker.assignedStove).map(id => ({ id, slots: r.production.slotsFor(id),
      position: r.interactionZones.find(z => z.id === id)!.position })).sort((a, b) =>
      Math.hypot(a.position.x - worker.position.x, a.position.y - worker.position.y) -
      Math.hypot(b.position.x - worker.position.x, b.position.y - worker.position.y));
    const ready = stoves.find(stove => stove.slots.some((s, i) =>
      s.status === 'ready' && r.resourceAvailable('slot:' + stove.id + ':' + i, worker.id)));
    const deposit = r.interactionZones.find(z => z.id === 'deposit')!.position;
    const atDeposit = Math.hypot(worker.position.x - deposit.x, worker.position.y - deposit.y) < .1;
    const mealBatch = Math.min(STAFF.cookBatchSize, inventory.limits.meals);
    // Finish unloading once at the counter; do not return to a stove halfway through a delivery.
    if (inventory.meals > 0 && (atDeposit || inventory.meals >= mealBatch)) return select('deposit');
    if (ready && worker.inventory.canAdd('meals')) return select(ready.id);
    const needed = Math.max(0, STAFF.cookStockTarget - r.committedProduction);
    const empty = stoves.find(stove => stove.slots.some((s, i) =>
      s.status === 'empty' && r.resourceAvailable('slot:' + stove.id + ':' + i, worker.id)));
    // Keep using ingredients already brought to the stove before making a partial delivery.
    if (needed > 0 && empty && inventory.ingredients > 0) {
      const fridge = r.interactionZones.find(z => z.id === 'fridge')!.position;
      const atFridge = Math.hypot(worker.position.x - fridge.x, worker.position.y - fridge.y) < .1;
      const ingredientsBatch = Math.min(inventory.limits.ingredients, Math.max(STAFF.cookBatchSize, needed));
      if (atFridge && inventory.ingredients < ingredientsBatch && r.production.ingredientsAvailable(worker.id) > 0) return select('fridge');
      return select(empty.id);
    }
    // Wait for our own cooking to finish, even after the first portion becomes ready.
    if (stoves.some(stove => stove.slots.some(slot => slot.status === 'cooking'))) return null;
    if (inventory.meals > 0) return select('deposit'); // Never strand a partial final batch.
    if (needed === 0 || !empty || r.production.ingredientsAvailable(worker.id) < 1) return null;
    return select('fridge');
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

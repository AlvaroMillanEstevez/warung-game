import test from 'node:test';
import assert from 'node:assert/strict';
import { Restaurant, actionKey } from '../src/simulation/Restaurant.ts';
import { DwellInteraction } from '../src/simulation/DwellInteraction.ts';
import { CLEANING_WAIT_POINTS, INTERACTION_ZONES, STATIONS, CUSTOMER_LAYOUT, QUEUE_POINTS, TABLE_POSITIONS } from '../src/world/layout.ts';
import { findCustomerPath as findPath, canStandCustomer } from '../src/world/customerNavigation.ts';
import { canStand } from '../src/world/collision.ts';
import { closestZone } from '../src/world/interaction.ts';
import { INTERACTION } from '../src/config.ts';

const zone = id => INTERACTION_ZONES.find(z => z.id === id);
// Isolate manual admissions from the new first-movement arrival schedule.
const make = options => { const r = new Restaurant({ arrivalMs: 1e9, eatingMs: 100000, ...options }); r.production.restock(100); r.arrivalsActive = true; r.firstArrival = false; return r; };
function cook(p) {
  assert.ok(p.perform('take-ingredients')); assert.ok(p.perform('start-cooking'));
  p.update(p.cookingMs); assert.ok(p.perform('take-meal'));
}
function stock(r, count = 1) {
  for (let i = 0; i < count; i++) { cook(r.production); assert.ok(r.production.perform('store-meal')); }
}
function until(r, condition, maxMs = 30000) {
  for (let t = 0; !condition() && t < maxMs; t += 20) r.update(20);
  assert.ok(condition(), 'El cliente debe alcanzar su destino físicamente');
}
function queued(r, intent = 'dine-in') {
  const id = r.admitCustomer(intent); assert.ok(id);
  until(r, () => r.customer(id)?.phase === 'queueing'); return id;
}
function act(r, id) {
  const offer = r.offer(zone(id)); assert.ok(offer.command, offer.reason);
  assert.ok(r.perform(offer.command)); return offer.command;
}
function dirtyBoth(r) {
  stock(r, 2);
  queued(r); act(r, 'checkout'); queued(r); act(r, 'checkout');
  until(r, () => r.tables.every(t => t.cleanliness === 'dirty'));
  until(r, () => r.customers.length === 0);
}

test('Venta atómica: la cabeza más antigua recibe una ración y paga una vez; nadie adelanta', () => {
  const r = make(); stock(r, 3);
  const a = queued(r, 'takeaway'), b = queued(r, 'takeaway'), c = queued(r);
  const command = r.offer(zone('checkout')).command;
  assert.equal(command.customerId, a);
  assert.equal(r.perform({ kind: 'checkout', customerId: b, tableId: null }), null);
  const before = r.production.inventory;
  assert.ok(r.perform(command));
  assert.equal(r.pendingCash, 10); assert.equal(r.production.availablePortions, 2);
  assert.equal(r.orders[0].status, 'takeaway');
  assert.deepEqual(r.production.inventory, before);
  assert.equal(r.perform(command), null);
  until(r, () => r.customer(b).phase === 'queueing');
  assert.equal(r.offer(zone('checkout')).command.customerId, b); act(r, 'checkout');
  assert.equal(r.offer(zone('checkout')).command.customerId, c);
});

test('Mesa limpia: cliente lleva plato desde caja y solo come cuando llega al asiento', () => {
  const r = make({ eatingMs: 1000 }); stock(r);
  const id = queued(r), sale = act(r, 'checkout'), order = r.orders[0];
  assert.equal(r.production.availablePortions, 0); assert.equal(r.pendingCash, 10);
  assert.equal(r.customer(id).carryingMeal, true);
  assert.equal(r.customer(id).phase, 'walking-to-table');
  assert.equal(order.status, 'carried');
  r.update(20);
  assert.equal(r.customer(id).eatingElapsedMs, 0);
  until(r, () => r.customer(id).phase === 'eating');
  assert.deepEqual(r.customer(id).position, TABLE_POSITIONS[sale.tableId].seat);
  assert.equal(r.customer(id).carryingMeal, false);
  assert.equal(order.status, 'eating');
  until(r, () => r.customer(id).phase === 'leaving');
  assert.equal(order.status, 'consumed');
  assert.equal(r.table(sale.tableId).cleanliness, 'dirty');
  assert.equal(r.table(sale.tableId).customerId, null); assert.equal(r.pendingCash, 10);
  until(r, () => r.customers.length === 0); assert.equal(r.orders.length, 0);
});

test('Mesas asignadas bloquean su fila pero permiten llevar; no existe reparto manual', () => {
  const r = make(); stock(r, 4);
  const first = queued(r), a = act(r, 'checkout');
  const second = queued(r), b = act(r, 'checkout');
  assert.notEqual(a.tableId, b.tableId);
  const blocked = queued(r), take = queued(r, 'takeaway');
  assert.equal(r.offer(zone('checkout')).command.customerId, take);
  act(r, 'checkout');
  assert.equal(r.pendingCash, 30); assert.equal(r.production.availablePortions, 1);
  assert.equal(r.table(a.tableId).customerId, first); assert.equal(r.table(b.tableId).customerId, second);
  assert.equal(r.customer(blocked).orderId, null);
  assert.equal(r.perform({ kind: 'checkout', customerId: blocked, tableId: a.tableId }), null);
  assert.equal(INTERACTION_ZONES.some(z => z.role === 'pickup'), false);
  assert.equal(r.perform({ kind: 'serve', orderId: r.orders[0].id, tableId: a.tableId }), null);
});

test('Dos reservas sucias esperan en posiciones distintas junto a caja; limpiar activa solo su cliente', () => {
  const r = make({ eatingMs: 4000 }); dirtyBoth(r); stock(r, 3);
  const a = queued(r), saleA = act(r, 'checkout');
  const b = queued(r), saleB = act(r, 'checkout');
  until(r, () => r.customer(a).phase === 'waiting-cleaning' && r.customer(b).phase === 'waiting-cleaning');
  assert.deepEqual(r.customer(a).position, CLEANING_WAIT_POINTS[saleA.tableId]);
  assert.deepEqual(r.customer(b).position, CLEANING_WAIT_POINTS[saleB.tableId]);
  assert.notDeepEqual(r.customer(a).position, r.customer(b).position);
  assert.ok(r.customer(a).carryingMeal && r.customer(b).carryingMeal);
  const take = queued(r, 'takeaway'); assert.equal(act(r, 'checkout').customerId, take);
  assert.equal(r.pendingCash, 50); assert.equal(r.production.availablePortions, 0);
  assert.equal(r.customer(a).eatingElapsedMs, 0);
  cook(r.production); r.production.perform('take-ingredients');
  const clean = act(r, saleA.tableId);
  assert.equal(r.production.inventory.meals, 1); assert.equal(r.production.inventory.ingredients, 1);
  assert.equal(r.production.inventory.waste, 1);
  assert.equal(r.table(saleA.tableId).customerId, a);
  assert.equal(r.customer(a).phase, 'walking-to-table');
  assert.equal(r.customer(b).phase, 'waiting-cleaning');
  assert.equal(r.perform(clean), null);
  assert.equal(r.customer(a).carryingMeal, true);
  until(r, () => r.customer(a).phase === 'eating');
  assert.deepEqual(r.customer(a).position, TABLE_POSITIONS[saleA.tableId].seat);
  assert.equal(r.customer(b).phase, 'waiting-cleaning');
  assert.equal(r.pendingCash, 50);
});

test('Prioriza mesa limpia; limpiar durante el camino de espera redirige desde la posición actual', () => {
  const r = make({ eatingMs: 1000 }); stock(r, 3);
  const first = queued(r), old = act(r, 'checkout');
  until(r, () => r.table(old.tableId).cleanliness === 'dirty');
  r.options.eatingMs = 100000;
  queued(r); const cleanSale = act(r, 'checkout'); assert.notEqual(cleanSale.tableId, old.tableId);
  const next = queued(r), dirtySale = act(r, 'checkout'); assert.equal(dirtySale.tableId, old.tableId);
  assert.equal(r.customer(next).phase, 'walking-to-cleaning-wait');
  r.update(100); const before = { ...r.customer(next).position };
  act(r, old.tableId);
  assert.deepEqual(r.customer(next).position, before);
  assert.equal(r.customer(next).phase, 'walking-to-table');
  assert.equal(r.table(old.tableId).customerId, next);
  until(r, () => r.customer(next).phase === 'eating');
  assert.equal(r.customer(first)?.carryingMeal ?? false, false);
});

test('Limpieza usa el mismo punto accesible, requiere capacidad de residuos y conserva otras categorías', () => {
  const r = make({ eatingMs: 500 }); stock(r);
  const id = queued(r), sale = act(r, 'checkout');
  until(r, () => r.table(sale.tableId).cleanliness === 'dirty');
  const points = INTERACTION_ZONES.filter(z => z.stationId === sale.tableId);
  assert.equal(points.length, 1);
  for (let i = 0; i < 8; i++) r.production.collectWaste();
  assert.equal(r.offer(points[0]).command, null);
  r.production.perform('discard'); cook(r.production); r.production.perform('take-ingredients');
  act(r, sale.tableId);
  assert.equal(r.production.inventory.waste, 8);
  assert.equal(r.production.inventory.ingredients, 1); assert.equal(r.production.inventory.meals, 1);
  assert.equal(r.table(sale.tableId).cleanliness, 'clean');
  assert.equal(r.customer(id)?.carryingMeal ?? false, false);
});

test('Caja continua llena 8/8/8; sin stock no acumula tiempo y al reponer inicia un ciclo completo', () => {
  const r = make(), d = new DwellInteraction(); stock(r, 2);
  for (let i = 0; i < 8; i++) { cook(r.production); r.production.collectWaste(); }
  for (let i = 0; i < 8; i++) r.production.perform('take-ingredients');
  const before = r.production.inventory;
  queued(r, 'takeaway'); queued(r, 'takeaway'); queued(r, 'takeaway');
  let pending = null;
  const tick = ms => {
    r.update(ms);
    if (pending && r.validate(pending)) { pending = null; d.cancel(); }
    pending ??= r.offer(zone('checkout')).command;
    if (d.update({ id: 'checkout', action: pending ? actionKey(pending) : null }, ['checkout'], false, ms)) {
      assert.ok(r.perform(pending)); pending = null;
    }
  };
  for (let i = 0; i < 200; i++) tick(50);
  assert.equal(r.pendingCash, 20); assert.equal(d.progress, 0);
  assert.deepEqual(r.production.inventory, before);
  r.production.perform('store-meal'); tick(799); assert.equal(r.pendingCash, 20);
  tick(1); assert.equal(r.pendingCash, 30);
});

test('Comando invalidado por stock no cobra ni reserva parcialmente', () => {
  const r = make(); stock(r); const id = queued(r);
  const locked = r.offer(zone('checkout')).command;
  r.production.sellAvailable();
  assert.equal(r.perform(locked), null);
  assert.equal(r.pendingCash, 0); assert.equal(r.customer(id).orderId, null);
  assert.equal(r.customer(id).carryingMeal, false);
  assert.ok(r.tables.every(t => t.customerId === null));
});

test('Reinicio desde cada estado de autoservicio elimina plato, espera, reserva, órdenes y relojes', () => {
  for (const phase of ['walking-to-cleaning-wait', 'waiting-cleaning', 'walking-to-table', 'eating', 'leaving']) {
    const r = make({ eatingMs: 500 }); dirtyBoth(r); stock(r);
    const id = queued(r), sale = act(r, 'checkout');
    if (phase !== 'walking-to-cleaning-wait') until(r, () => r.customer(id).phase === 'waiting-cleaning');
    if (['walking-to-table', 'eating', 'leaving'].includes(phase)) act(r, sale.tableId);
    if (['eating', 'leaving'].includes(phase)) until(r, () => r.customer(id).phase === phase);
    assert.equal(r.customer(id).phase, phase);
    r.production.perform('take-ingredients'); r.production.perform('start-cooking');
    r.reset();
    assert.equal(r.elapsedMs + r.pendingCash + r.customers.length + r.orders.length + r.production.availablePortions, 0);
    assert.equal(r.queue('dine-in').length + r.queue('takeaway').length, 0);
    assert.ok(r.tables.every(t => t.cleanliness === 'clean' && t.customerId === null));
    assert.equal(r.production.inventory.ingredients + r.production.inventory.meals + r.production.inventory.waste, 0);
    assert.ok(r.production.slotsFor('stove').every(slot => slot.status === 'empty'));
    const fresh = r.admitCustomer('dine-in'); assert.notEqual(fresh, id);
    assert.equal(r.perform(sale), null);
  }
});

test('Llegadas sin deuda, desvío ni exceso de clientes', () => {
  const r = new Restaurant({ arrivalMs: 8000, queueLimits: { 'dine-in': 1, takeaway: 1 } }, () => 0);
  r.playerMoved({ x: 378, y: 735 }, { x: 379, y: 735 });
  r.update(7999); assert.equal(r.customers.length, 0);
  r.update(1); assert.equal(r.customers[0].intent, 'dine-in');
  r.update(24000); assert.equal(r.customers.length, 1); assert.equal(r.queue('takeaway').length, 0);
  assert.ok(r.admitCustomer('takeaway')); assert.equal(r.admitCustomer('takeaway'), null);
  const capped = make({ maxCustomers: 1 });
  assert.ok(capped.admitCustomer('takeaway')); assert.equal(capped.admitCustomer('dine-in'), null);
});

test('Rutas y puntos de espera libres; movimiento respeta muebles y velocidad, también al redirigir', () => {
  const obstacles = STATIONS.map(s => s.footprint);
  const points = [...Object.values(CUSTOMER_LAYOUT), ...Object.values(QUEUE_POINTS).flat(),
    ...Object.values(TABLE_POSITIONS).map(t => t.seat), ...Object.values(CLEANING_WAIT_POINTS)];
  for (const from of points) for (const to of points) {
    const route = findPath(from, to, obstacles); assert.ok(route, JSON.stringify({ from, to }));
    let start = from;
    for (const end of route) {
      const steps = Math.ceil(Math.hypot(end.x - start.x, end.y - start.y));
      for (let n = 0; n <= steps; n++) {
        const t = steps ? n / steps : 0;
        assert.ok(canStandCustomer({ x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t }, obstacles));
      }
      start = end;
    }
  }
  for (const z of INTERACTION_ZONES) {
    assert.ok(canStand(z.position, obstacles)); assert.equal(closestZone(z.position, INTERACTION_ZONES, obstacles), z);
  }
  const counter = INTERACTION_ZONES.filter(z => z.stationId === 'counter');
  assert.deepEqual(counter.map(z => z.id).sort(), ['checkout', 'deposit']);
  for (const a of counter) for (const b of counter) if (a !== b)
    assert.ok(Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y) > 2 * INTERACTION.radius);
  assert.ok(Math.hypot(counter[0].position.x - counter[1].position.x, counter[0].position.y - counter[1].position.y) > 2 * INTERACTION.radius);
  const r = make({ eatingMs: 500 }); stock(r, 4);
  for (const intent of ['dine-in', 'takeaway', 'dine-in', 'takeaway']) r.admitCustomer(intent);
  for (let frame = 0; frame < 3000; frame++) {
    const before = new Map(r.customers.map(c => [c.id, { ...c.position }]));
    r.update(20);
    for (const c of r.customers) {
      assert.ok(canStandCustomer(c.position, obstacles));
      const from = before.get(c.id);
      if (from) assert.ok(Math.hypot(c.position.x - from.x, c.position.y - from.y) <= r.options.speed * 0.02 + 0.0001);
    }
    const offer = r.offer(zone('checkout')); if (offer.command) r.perform(offer.command);
  }
  assert.equal(r.customers.length, 0); assert.equal(r.pendingCash, 40);
});

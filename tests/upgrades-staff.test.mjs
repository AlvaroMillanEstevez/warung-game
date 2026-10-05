import test from 'node:test';
import assert from 'node:assert/strict';
import { Restaurant } from '../src/simulation/Restaurant.ts';
import { DwellInteraction } from '../src/simulation/DwellInteraction.ts';
import { STAFF, PLAYER, UPGRADES } from '../src/config.ts';
import { EXTRA_TABLES, TABLE_POSITIONS, CLEANING_WAIT_POINTS, CUSTOMER_LAYOUT, QUEUE_POINTS, STAFF_POSITIONS } from '../src/world/layout.ts';
import { canStand } from '../src/world/collision.ts';
import { findPath } from '../src/world/navigation.ts';
import { findCustomerPath, canStandCustomer } from '../src/world/customerNavigation.ts';

// Funds and deliberately dirty tables are fixtures, never normal game controls.
const make = () => { const r = new Restaurant({ arrivalMs: 1e9 }); r.coins = 2000; r.arrivalsActive = true; r.firstArrival = false; return r; };
const zone = (r, id) => r.interactionZones.find(z => z.id === id);
const buy = (r, id) => assert.ok(r.purchase(id, r.upgradeLevel(id)), r.purchaseState(id).problem);
const advance = (r, ms) => { for (let t = 0; t < ms; t += 50) r.update(Math.min(50, ms - t)); };
function until(r, condition, ms = 180000) {
  for (let t = 0; !condition() && t < ms; t += 50) r.update(50);
  assert.ok(condition(), 'El circuito debe progresar');
}
function stock(r, count) {
  for (let i = 0; i < count; i++) {
    r.production.perform('take-ingredients'); r.production.perform('start-cooking');
    r.production.update(r.production.cookingMs); r.production.perform('take-meal'); r.production.perform('store-meal');
  }
}
function dirty(r, id, since = 0) { Object.assign(r.table(id), { cleanliness: 'dirty', dirtySince: since }); }
function queued(r) {
  const id = r.admitCustomer('dine-in');
  until(r, () => r.customer(id)?.phase === 'queueing');
  return id;
}
function sale(r) { const c = r.offer(zone(r, 'checkout')).command; assert.ok(c); assert.ok(r.perform(c)); return c; }

test('Compras: fondos, débito único, niveles máximos, límites reales 8/12/16 y personal independiente', () => {
  const r = new Restaurant();
  assert.equal(r.money, 0);
  assert.equal(r.purchase('cook', 0), false);
  assert.equal(r.purchaseState('cook').problem, 'purchase.funds');
  r.coins = 2000;
  for (const category of ['ingredients', 'meals', 'waste'])
    for (let i = 0; i < 8; i++) assert.ok(r.production.playerInventory.change(category, 1));
  for (const capacity of [12, 16]) {
    const before = r.money, level = r.upgradeLevel('transport');
    buy(r, 'transport');
    assert.equal(r.money, before - UPGRADES.transport.prices[level]);
    assert.equal(r.purchase('transport', level), false);
    for (const category of ['ingredients', 'meals', 'waste']) {
      while (r.production.inventory[category] < capacity) assert.ok(r.production.playerInventory.change(category, 1));
      assert.equal(r.production.playerInventory.change(category, 1), false);
    }
  }
  const before = r.money; assert.equal(r.purchase('transport', 2), false); assert.equal(r.money, before);
  buy(r, 'cook'); buy(r, 'cleaner');
  assert.equal(r.staff.employees.length, 2);
  assert.equal(r.staff.get('cook').inventory.state.limits.ingredients, 16);
  assert.equal(r.staff.get('cleaner').inventory.state.limits.waste, 16);
  for (const id of ['cook', 'cleaner']) assert.equal(r.purchase(id, 1), false);
  for (const id of ['actionSpeed', 'stoveSpeed', 'tables', 'stove']) {
    for (let level = 0; level < UPGRADES[id].prices.length; level++) buy(r, id);
    assert.equal(r.purchaseState(id).price, null);
    assert.equal(r.purchase(id, r.upgradeLevel(id)), false);
  }
  assert.ok(r.money >= 0);
});

test('Mejorar conserva cocción y permanencia iniciadas; siguientes ciclos usan la nueva duración', () => {
  const r = make(), p = r.production;
  for (let i = 0; i < 3; i++) p.perform('take-ingredients');
  p.perform('start-cooking', 0); p.update(1000);
  buy(r, 'stoveSpeed'); p.perform('start-cooking', 1);
  buy(r, 'stoveSpeed'); p.perform('start-cooking', 2);
  assert.deepEqual(p.slotsFor('stove').slice(0, 3).map(s => s.durationMs), [4000, 3000, 2000]);
  p.update(1999); assert.equal(p.stoveSummary.ready, 0);
  p.update(1); assert.equal(p.slotsFor('stove')[2].status, 'ready'); assert.equal(p.slotsFor('stove')[0].status, 'cooking');
  p.update(1000); assert.equal(p.stoveSummary.ready, 3);
  const d = new DwellInteraction(), target = { id: 'fridge', action: 'take' };
  d.update(target, ['fridge'], false, 500, r.teamActionMs);
  buy(r, 'actionSpeed'); buy(r, 'actionSpeed');
  assert.equal(d.update(target, ['fridge'], false, 299, r.teamActionMs), null);
  assert.equal(d.update(target, ['fridge'], false, 1, r.teamActionMs), 'take');
  assert.equal(d.update(target, ['fridge'], false, 399, r.teamActionMs), null);
  assert.equal(d.update(target, ['fridge'], false, 1, r.teamActionMs), 'take');
  assert.equal(UPGRADES.actionSpeed.durationsMs[0], 800); assert.equal(r.options.eatingMs, 6000); assert.equal(r.options.speed, 90);
});

test('Mesas compradas: huella, destinos, rutas y seguridad de colocación con actores presentes', () => {
  const r = make();
  assert.equal(r.tables.length, 2); assert.equal(r.interactionZones.some(z => z.id === 'table-3'), false);
  const p = EXTRA_TABLES[0].footprint, occupied = { x: p.x + 30, y: p.y + 30 };
  const before = r.money;
  assert.equal(r.purchase('tables', 0, occupied), false); assert.equal(r.money, before);
  buy(r, 'tables'); buy(r, 'tables');
  assert.equal(r.tables.length, 4); assert.equal(r.obstacles.length, 9);
  const work = [...r.interactionZones.map(z => z.position), ...Object.values(STAFF_POSITIONS), PLAYER.spawn];
  const publicPoints = [...Object.values(TABLE_POSITIONS).map(t => t.seat), ...Object.values(CLEANING_WAIT_POINTS),
    ...Object.values(CUSTOMER_LAYOUT), ...Object.values(QUEUE_POINTS).flat()];
  for (const [points, path, stand] of [[work, findPath, canStand], [publicPoints, findCustomerPath, canStandCustomer]]) {
    for (const from of points) for (const to of points) {
      const route = path(from, to, r.routingObstacles); assert.ok(route, JSON.stringify({ from, to }));
      let previous = from;
      for (const end of route) {
        const steps = Math.max(1, Math.ceil(Math.hypot(end.x - previous.x, end.y - previous.y)));
        for (let i = 0; i <= steps; i++) assert.ok(stand({
          x: previous.x + (end.x - previous.x) * i / steps, y: previous.y + (end.y - previous.y) * i / steps,
        }, r.routingObstacles));
        previous = end;
      }
    }
  }
  r.options.eatingMs = 1e9; stock(r, 4);
  for (const id of ['table-1', 'table-2', 'table-3', 'table-4']) {
    const customerId = queued(r), command = sale(r); assert.equal(command.tableId, id);
    until(r, () => r.customer(customerId).phase === 'eating');
    assert.deepEqual(r.customer(customerId).position, TABLE_POSITIONS[id].seat);
  }
});


test('Comprar una mesa recalcula desde cada posición sin saltos, sin perder tareas ni volver atrás al salir', () => {
  const r = make();
  stock(r, 1);
  const id = r.admitCustomer('takeaway');
  until(r, () => r.customer(id)?.phase === 'queueing');
  sale(r);
  buy(r, 'cook'); buy(r, 'cleaner'); dirty(r, 'table-1');
  until(r, () => r.customer(id)?.position.x === CUSTOMER_LAYOUT.exit.x &&
    r.customer(id).position.y > 400 && r.staff.employees.some(w => w.route.length > 0));
  const actors = [...r.customers, ...r.staff.employees].map(actor => ({
    actor, position: { ...actor.position }, oldRoute: actor.route,
    destination: actor.route.at(-1), task: actor.task ? structuredClone(actor.task) : null,
  }));
  const locks = [...r.activeReservations];
  buy(r, 'tables');
  for (const { actor, position, oldRoute, destination, task } of actors) {
    assert.deepEqual(actor.position, position);
    if (destination) {
      assert.notEqual(actor.route, oldRoute);
      assert.deepEqual(actor.route.at(-1), destination);
      assert.ok(actor.route.length);
    }
    if (task) assert.deepEqual(actor.task, task);
  }
  assert.deepEqual([...r.activeReservations], locks);
  assert.ok(r.customer(id).route.every(p => p.y >= r.customer(id).position.y));
  until(r, () => !r.customer(id));
});

test('Cocinero completa circuito físico, reserva una posición y detiene stock a 12; reanuda al vender', () => {
  const r = make(); buy(r, 'cook');
  const worker = r.staff.get('cook'), playerBefore = r.production.inventory;
  const visited = new Set(), transfers = [];
  let priorInventory = worker.inventory.state;
  for (let t = 0; t < 240000 && r.production.availablePortions < 12; t += 50) {
    const before = { ...worker.position };
    r.update(50);
    assert.ok(canStand(worker.position, r.obstacles));
    assert.ok(Math.hypot(worker.position.x - before.x, worker.position.y - before.y) <= STAFF.speed * .05 + 1e-6);
    if (worker.task) visited.add(worker.task.command.action);
    const now = worker.inventory.state;
    if (['ingredients', 'meals'].some(c => now[c] !== priorInventory[c])) {
      transfers.push(t);
      assert.ok(r.interactionZones.some(z => Math.hypot(z.position.x - worker.position.x, z.position.y - worker.position.y) < .1));
      if (transfers.length > 1) assert.ok(t - transfers.at(-2) >= UPGRADES.actionSpeed.durationsMs[0]);
    }
    priorInventory = now;
  }
  assert.equal(r.production.availablePortions, 12);
  assert.deepEqual([...visited].sort(), ['take-ingredients', 'start-cooking', 'take-meal', 'store-meal'].sort());
  assert.deepEqual(r.production.inventory, playerBefore);
  advance(r, 15000); assert.equal(worker.task, null); assert.equal(r.activeReservations.size, 0);
  const idle = { ...worker.position }; advance(r, 10000); assert.deepEqual(worker.position, idle);
  assert.ok(r.production.sellAvailable()); until(r, () => r.production.availablePortions === 12);
  stock(r, 3); advance(r, 10000); assert.equal(r.production.availablePortions, 15);
});

test('Cocinero recoge y deposita un lote parcial sin exigir cuatro; termina lo ya cocinado sobre objetivo', () => {
  const r = make(); stock(r, 11); buy(r, 'cook');
  until(r, () => r.production.availablePortions === 12);
  assert.equal(r.staff.get('cook').inventory.state.meals, 0);
  // A manual batch finishes while stock is already at the operating target.
  r.production.perform('take-ingredients'); r.production.perform('start-cooking', 0);
  until(r, () => r.production.availablePortions === 13);
  assert.equal(r.production.stoveSummary.empty, 4);
});

test('Stock alcanzado durante un viaje cancela la carga pendiente y libera su posición', () => {
  const r = make(); buy(r, 'cook');
  until(r, () => r.staff.get('cook').task?.command.action === 'start-cooking');
  const worker = r.staff.get('cook'), ingredients = worker.inventory.state.ingredients;
  r.production.stock = 12; // exact concurrent-deposit fixture, without changing the reserved stove slot
  r.update(50);
  assert.equal(r.production.stoveSummary.empty, 4);
  assert.equal(worker.inventory.state.ingredients, ingredients);
  assert.equal(r.activeReservations.size, 0);
  assert.equal(worker.task, null);
});

test('Limpieza prioriza reserva más antigua, mantiene asignación y libera al cliente desde su espera', () => {
  const r = make(); r.options.eatingMs = 1e9;
  dirty(r, 'table-1', 100); dirty(r, 'table-2', 0); stock(r, 2);
  const first = queued(r); sale(r);
  const second = queued(r); sale(r);
  until(r, () => r.customer(first).phase === 'waiting-cleaning' && r.customer(second).phase === 'waiting-cleaning');
  buy(r, 'cleaner'); r.update(50);
  const worker = r.staff.get('cleaner');
  assert.equal(worker.task.command.tableId, 'table-1');
  until(r, () => r.table('table-1').cleanliness === 'clean');
  assert.equal(r.table('table-1').customerId, first);
  assert.equal(r.customer(first).phase, 'walking-to-table');
  assert.equal(worker.inventory.state.waste, 1);
  until(r, () => r.table('table-2').cleanliness === 'clean');
  until(r, () => worker.inventory.state.waste === 0);
  assert.equal(r.production.inventory.waste, 0);
  until(r, () => r.customer(first).phase === 'eating' && r.customer(second).phase === 'eating');
});

test('Limpieza atiende primero reservas, luego antigüedad; vacía parcial y capacidad completa', () => {
  const r = make(); stock(r, 1);
  dirty(r, 'table-1', 100); dirty(r, 'table-2', 0);
  const customer = queued(r); sale(r); // table-1 reserved despite newer dirt
  buy(r, 'cleaner'); r.update(50);
  const worker = r.staff.get('cleaner'); assert.equal(worker.task.command.tableId, 'table-1');
  assert.equal(r.table('table-1').customerId, customer);
  r.staff.cancel('cleaner', r);
  r.table('table-1').customerId = null; // isolate unreserved priority
  r.update(50); assert.equal(worker.task.command.tableId, 'table-2');
  r.staff.cancel('cleaner', r);
  for (let i = 0; i < 8; i++) worker.inventory.change('waste', 1);
  r.update(50); assert.equal(worker.task.command.action, 'discard');
  until(r, () => r.tables.every(t => t.cleanliness === 'clean') && worker.inventory.state.waste === 0);
  until(r, () => !worker.task && Math.hypot(worker.position.x - STAFF_POSITIONS.cleaner.x, worker.position.y - STAFF_POSITIONS.cleaner.y) < .1);
  assert.deepEqual(worker.position, STAFF_POSITIONS.cleaner);
});

test('Reservas por ración/posición/residuo: otro actor conserva acceso al resto, sin duplicados', () => {
  const r = make(); buy(r, 'cook'); buy(r, 'cleaner');
  for (let i = 0; i < 2; i++) { r.production.perform('take-ingredients'); r.production.perform('start-cooking', i); }
  r.production.update(4000);
  const first = { kind: 'production', action: 'take-meal', stoveId: 'stove', slotIndex: 0 };
  assert.ok(r.beginAction(first, 'cook'));
  assert.equal(r.beginAction(first), false);
  assert.equal(r.perform(first), null);
  const other = r.offer(zone(r, 'stove')).command; assert.equal(other.slotIndex, 1);
  assert.ok(r.beginAction(other)); assert.ok(r.perform(other));
  assert.ok(r.perform(first, 'cook')); assert.equal(r.perform(first, 'cook'), null);
  assert.equal(r.production.inventory.meals, 1); assert.equal(r.staff.get('cook').inventory.state.meals, 1);
  dirty(r, 'table-1');
  const clean = { kind: 'clean', tableId: 'table-1' };
  assert.ok(r.beginAction(clean, 'cleaner')); assert.equal(r.beginAction(clean), false);
  r.cancelAction('cleaner'); assert.ok(r.beginAction(clean)); assert.ok(r.perform(clean));
  assert.equal(r.perform(clean, 'cleaner'), null); assert.equal(r.production.inventory.waste, 1);
  r.production.perform('take-ingredients'); r.staff.get('cook').inventory.change('ingredients', 1);
  const start = { kind: 'production', action: 'start-cooking', stoveId: 'stove', slotIndex: 0 };
  assert.ok(r.beginAction(start)); assert.equal(r.beginAction(start, 'cook'), false);
  r.cancelAction(); assert.ok(r.beginAction(start, 'cook'));
  r.staff.cancel('cook', r); assert.equal(r.activeReservations.size, 0);
});

test('Invalidación y ruta imposible liberan reservas; reinicio restaura todo el Hito 4', () => {
  const r = make(); buy(r, 'cook'); buy(r, 'cleaner'); buy(r, 'tables'); buy(r, 'tables');
  buy(r, 'transport'); buy(r, 'actionSpeed'); buy(r, 'stoveSpeed');
  dirty(r, 'table-1'); r.update(50);
  assert.equal(r.activeReservations.get('table:table-1'), 'cleaner');
  r.table('table-1').cleanliness = 'clean';
  r.update(50); assert.equal(r.activeReservations.has('table:table-1'), false);
  dirty(r, 'table-2');
  r.staff.cancel('cleaner', r);
  r.staff.get('cleaner').position = { x: -100, y: -100 }; // unreachable actor fixture
  r.update(50); assert.equal(r.activeReservations.has('table:table-2'), false);
  r.reset();
  assert.equal(r.staff.employees.length + r.activeReservations.size + r.money + r.elapsedMs, 0);
  assert.equal(r.tables.length, 2); assert.equal(r.obstacles.length, 7);
  assert.deepEqual(r.production.inventory.limits, { ingredients: 8, meals: 8, waste: 8 });
  assert.equal(r.teamActionMs, 800); assert.equal(r.production.cookingMs, 4000);
  assert.equal(r.production.availablePortions, 0); assert.equal(r.production.stoveSummary.empty, 4);
  for (const id of Object.keys(UPGRADES)) assert.equal(r.upgradeLevel(id), 0);
  assert.equal(r.validate({ kind: 'clean', tableId: 'table-3' }), 'reason.tableAlreadyClean');
  assert.deepEqual(PLAYER.spawn, { x: 378, y: 735 });
});

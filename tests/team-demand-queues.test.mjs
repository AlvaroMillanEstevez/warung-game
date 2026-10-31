import test from 'node:test';
import assert from 'node:assert/strict';
import { Restaurant } from '../src/simulation/Restaurant.ts';
import { CustomerComments } from '../src/simulation/CustomerComments.ts';
import { COMMENTS, CUSTOMERS, DEMAND, ROOM } from '../src/config.ts';
import { QUEUE_POINTS, QUEUE_SPACING, EXTRA_TABLES, INTERACTION_ZONES, CLEANING_WAIT_POINTS } from '../src/world/layout.ts';
import { canStand, moveWithCollisions } from '../src/world/collision.ts';
import { canStandCustomer } from '../src/world/customerNavigation.ts';

const make = () => { const r = new Restaurant({ arrivalMs: 1e9 }); r.coins = 2000; r.production.restock(100); r.arrivalsActive = true; r.firstArrival = false; return r; };
const buy = (r, id) => assert.ok(r.purchase(id, r.upgradeLevel(id)), r.purchaseState(id).problem);
const advance = (r, ms) => { for (let t = 0; t < ms; t += 50) r.update(Math.min(50, ms - t)); };
function until(r, condition, limit = 90000) {
  for (let t = 0; !condition() && t < limit; t += 50) r.update(50);
  assert.ok(condition());
}

test('Capacidad fija de equipo: 8, mejora deshabilitada antes y después de contratar', () => {
  for (const hiredBefore of [true, false]) {
    const r = make();
    if (hiredBefore) { buy(r, 'cook'); buy(r, 'cleaner'); }
    const money = r.money, spent = r.totalSpent;
    assert.equal(r.purchaseState('transport').problem, 'purchase.disabledCapacity');
    assert.equal(r.purchase('transport', 0), false);
    assert.equal(r.money, money); assert.equal(r.totalSpent, spent);
    if (!hiredBefore) { buy(r, 'cook'); buy(r, 'cleaner'); }
    assert.equal(r.teamCapacity, 8);
    const cook = r.staff.get('cook').inventory, cleaner = r.staff.get('cleaner').inventory;
    assert.deepEqual(cook.state.limits, { ingredients: 8, meals: 8 });
    assert.deepEqual(cleaner.state.limits, { waste: 8 });
    assert.equal(cook.state.waste, undefined); assert.equal(cleaner.state.ingredients, undefined);
    for (const [inventory, category] of [[cook, 'ingredients'], [cook, 'meals'], [cleaner, 'waste']]) {
      for (let i = 0; i < 8; i++) assert.ok(inventory.change(category, 1));
      assert.equal(inventory.change(category, 1), false);
    }
    assert.equal(cook.change('waste', 1), false); assert.equal(cleaner.change('meals', 1), false);
  }
});

test('El cocinero recoge ingredientes por tandas y conserva sobrantes sin exceder el stock objetivo', () => {
  for (const [stock, expected] of [[0, 8], [11, 4]]) {
    const r = make();
    r.production.stock = stock; buy(r, 'cook');
    const worker = r.staff.get('cook');
    until(r, () => worker.task?.command.action === 'start-cooking');
    assert.equal(worker.inventory.count('ingredients'), expected);
    if (stock === 11) { until(r, () => r.production.availablePortions === 12); assert.equal(worker.inventory.count('ingredients'), 3); }
  }
});

test('Acción del trabajador captura duración al comenzar; mejora no completa tarea ni cambia desplazamiento/consumo', () => {
  const r = make(); buy(r, 'cook');
  const worker = r.staff.get('cook');
  until(r, () => worker.task?.elapsedMs >= 500);
  const previous = worker.task, elapsed = previous.elapsedMs;
  assert.equal(previous.durationMs, 800);
  buy(r, 'actionSpeed'); buy(r, 'actionSpeed');
  assert.equal(worker.task, previous); assert.equal(previous.elapsedMs, elapsed); assert.equal(previous.durationMs, 800);
  r.update(800 - elapsed - 1); assert.equal(worker.inventory.count('ingredients'), 0);
  r.update(1); assert.equal(worker.inventory.count('ingredients'), 1);
  until(r, () => worker.task?.durationMs !== null && worker.task?.durationMs !== undefined);
  assert.equal(worker.task.durationMs, 400);
  buy(r, 'cleaner');
  Object.assign(r.table('table-1'), { cleanliness: 'dirty', dirtySince: 0 });
  until(r, () => r.staff.get('cleaner').task?.durationMs === 400);
  assert.equal(r.options.speed, 90); assert.equal(r.options.eatingMs, 6000); assert.equal(r.production.cookingMs, 4000);
});

test('Tres frecuencias absolutas, compras válidas, aviso único y siguiente intervalo sin deuda', () => {
  const r = new Restaurant({}, () => 0);
  assert.equal(r.purchase('cook', 0), false); assert.equal(r.totalSpent, 0);
  r.coins = 5000;
  r.playerMoved({ x: 378, y: 735 }, { x: 379, y: 735 });
  buy(r, 'cook'); buy(r, 'tables'); buy(r, 'tables'); // 320
  assert.equal(r.arrivalIntervalMs, 8000 / 1.2);
  r.update(4000); // Purchases preserve the first countdown.
  assert.equal(r.arrivalElapsedMs, 4000);
  assert.equal(r.arrivalIntervalMs, 8000 / 1.2);
  assert.equal(r.takeDemandNotice(), true); assert.equal(r.takeDemandNotice(), false);
  r.update(3999); assert.equal(r.customers.length, 0);
  r.update(1); assert.equal(r.customers.length, 1);
  r.update(5000);
  buy(r, 'stove'); // 500 exactly
  assert.equal(r.totalSpent, 500); assert.equal(r.demandTier, 2);
  assert.equal(r.arrivalIntervalMs, 8000 / 2); assert.equal(r.arrivalElapsedMs, 0);
  assert.equal(r.takeDemandNotice(), true); assert.equal(r.takeDemandNotice(), false);
  assert.equal(r.purchase('stove', 0), false); assert.equal(r.totalSpent, 500);
  r.update(r.arrivalIntervalMs - 1); assert.equal(r.customers.length, 1);
  r.update(1); assert.equal(r.customers.length, 2);
  buy(r, 'actionSpeed'); buy(r, 'stoveSpeed');
  assert.equal(r.arrivalIntervalMs, 8000 / 2); assert.equal(r.takeDemandNotice(), false);
  r.update(600000); assert.equal(r.customers.length, 3);
  r.update(1); assert.equal(r.customers.length, 3);
  r.reset(); assert.equal(r.totalSpent, 0); assert.equal(r.demandTier, 0);
  assert.equal(r.arrivalIntervalMs, 10000); assert.equal(r.takeDemandNotice(), false);
});

test('Límites exactos de gasto y salto de varios umbrales eligen el tramo final una sola vez', () => {
  for (const [spent, frequency] of [[299, .8], [300, 1.2], [499, 1.2], [500, 2], [999, 2], [1000, 2.4]]) {
    const r = new Restaurant(); r.coins = 1000;
    r.spent = spent - 100; // Isolate each purchase boundary without changing provisional prices.
    buy(r, 'cook'); assert.equal(r.totalSpent, spent); assert.equal(r.demandFrequency, frequency);
  }
  const r = new Restaurant(); r.coins = 1000;
  r.spent = 400; // A previously unobserved tier fixture; one purchase crosses both tier checks.
  buy(r, 'cook'); assert.equal(r.demandTier, 2);
  assert.equal(r.takeDemandNotice(), true); assert.equal(r.takeDemandNotice(), false);
});

test('65/35 decide intención una vez y descarta llegada si esa fila está llena; nunca desvía', () => {
  let value = .649999;
  const r = new Restaurant({ queueLimits: { 'dine-in': 1, takeaway: 1 } }, () => value);
  r.playerMoved({ x: 378, y: 735 }, { x: 379, y: 735 });
  r.update(DEMAND.firstArrivalDelayMs); assert.equal(r.queue('dine-in').length, 1);
  r.update(r.arrivalIntervalMs); assert.equal(r.customers.length, 1); assert.equal(r.queue('takeaway').length, 0);
  value = .65; r.update(r.arrivalIntervalMs); assert.equal(r.queue('takeaway').length, 1);
  advance(r, 40000); assert.equal(r.customers.length, 2);
  assert.equal(CUSTOMERS.dineInChance, .65);
  assert.equal(r.customers[0].intent, 'dine-in'); // New arrivals never rewrite existing intentions.
  assert.deepEqual(CUSTOMERS.queueLimits, { 'dine-in': 20, takeaway: 10 });
});

test('30 plazas distintas y espaciadas: rutas reales, muebles futuros reservados y exterior exclusivo de clientes', () => {
  const r = make(); for (let i = 0; i < 4; i++) buy(r, 'tables');
  for (const intent of ['dine-in', 'takeaway']) {
    for (let i = 0; i < CUSTOMERS.queueLimits[intent]; i++) assert.ok(r.admitCustomer(intent));
    assert.equal(r.admitCustomer(intent), null);
    for (let i = 1; i < QUEUE_POINTS[intent].length; i++)
      assert.ok(Math.hypot(QUEUE_POINTS[intent][i].x - QUEUE_POINTS[intent][i - 1].x,
        QUEUE_POINTS[intent][i].y - QUEUE_POINTS[intent][i - 1].y) >= QUEUE_SPACING);
  }
  for (let t = 0; t < 16000; t += 50) {
    const before = new Map(r.customers.map(c => [c.id, { ...c.position }]));
    r.update(50);
    for (const c of r.customers) {
      assert.ok(canStandCustomer(c.position, r.routingObstacles));
      const old = before.get(c.id);
      assert.ok(Math.hypot(c.position.x - old.x, c.position.y - old.y) <= 4.500001);
    }
  }
  assert.equal(r.customers.length, 30); assert.ok(r.customers.every(c => c.phase === 'queueing'));
  assert.equal(new Set(r.customers.map(c => c.position.x + ':' + c.position.y)).size, 30);
  for (const c of r.customers) assert.deepEqual(c.position, QUEUE_POINTS[c.intent][c.queueIndex]);
  const tail = QUEUE_POINTS['dine-in'].at(-1);
  assert.ok(tail.y > ROOM.y + ROOM.height); assert.equal(canStand(tail, r.obstacles), false);
  const player = { x: 650, y: ROOM.y + ROOM.height - 7 };
  assert.deepEqual(moveWithCollisions(player, 0, 600, r.obstacles), player);
  for (const table of EXTRA_TABLES) {
    const clean = r.interactionZones.find(z => z.id === table.id).position;
    assert.ok(canStand(clean, r.obstacles));
    assert.ok([...QUEUE_POINTS['dine-in'], ...QUEUE_POINTS.takeaway].every(p => Math.hypot(clean.x - p.x, clean.y - p.y) > 48));
  }
  assert.equal(new Set(Object.values(CLEANING_WAIT_POINTS).map(p => p.x + ':' + p.y)).size, 6);
});

test('Con filas largas y todas las mesas asignadas, la cabeza para llevar avanza y no se duplica stock', () => {
  const r = make(); r.options.eatingMs = 1e9; for (let i = 0; i < 4; i++) buy(r, 'tables');
  r.production.stock = 10;
  for (let i = 0; i < 8; i++) r.admitCustomer('dine-in');
  for (let i = 0; i < 5; i++) r.admitCustomer('takeaway');
  advance(r, 16000);
  const checkout = INTERACTION_ZONES.find(z => z.id === 'checkout');
  for (let i = 0; i < 6; i++) {
    const next = r.offer(checkout).command; assert.ok(next.tableId); r.perform(next); advance(r, 650);
  }
  assert.ok(r.tables.every(t => t.customerId));
  const take = r.queue('takeaway')[0], waiting = r.queue('dine-in')[0];
  const next = r.offer(checkout).command;
  assert.equal(next.customerId, take); assert.equal(next.tableId, null);
  const before = r.production.availablePortions;
  r.perform(next); assert.equal(r.production.availablePortions, before - 1);
  assert.equal(r.perform(next), null); assert.equal(r.queue('dine-in')[0], waiting);
  assert.equal(r.customer(take).phase, 'leaving');
  const capped = new Restaurant({ maxCustomers: 1 });
  capped.admitCustomer('dine-in'); assert.equal(capped.admitCustomer('takeaway'), null);
});

test('Comentarios: umbral único, intervalos, dos como máximo, visibilidad, enfriamiento y retirada al cobrar', () => {
  let samples = 0;
  const comments = new CustomerComments(() => { samples++; return 0; });
  const customers = Array.from({ length: 4 }, (_, i) => ({
    id: 'c' + i, number: i, waitingSince: 0, orderId: null, phase: 'queueing', position: { x: 650, y: 350 + i * 52 },
  }));
  for (const c of customers) comments.admit(c.id);
  assert.equal(samples, 8);
  const ids = new Set(customers.map(c => c.id));
  comments.update(9999, customers, ids);
  assert.ok(customers.every(c => comments.text(c.id) === null));
  // No checks/probabilities each frame.
  for (let t = 10000; t < 10999; t++) comments.update(t, customers, ids);
  assert.equal(samples, 8);
  comments.update(11000, customers, ids);
  assert.equal(customers.filter(c => comments.text(c.id)).length, 2);
  const first = customers.filter(c => comments.text(c.id)).map(c => c.id);
  comments.update(11001, customers, new Set([customers[3].id]));
  assert.ok(first.every(id => comments.text(id) === null));
  for (let t = 12000; t < 31000; t += 1000) {
    comments.update(t, customers, ids);
    assert.ok(first.every(id => comments.text(id) === null));
    assert.ok(customers.filter(c => comments.text(c.id)).length <= 2);
  }
  comments.update(31000, customers, ids); assert.ok(first.some(id => comments.text(id)));
  customers[0].orderId = 'paid';
  comments.update(31001, customers, ids); assert.equal(comments.text(customers[0].id), null);
  comments.reset(); assert.ok(customers.every(c => comments.text(c.id) === null));
  assert.equal(COMMENTS.cooldownMs, 20000);
});

test('Quien no participa no comenta, las burbujas caducan en tiempo activo y no quedan tras reset', () => {
  const silent = new CustomerComments(() => .99);
  const c = { id: 'a', number: 1, waitingSince: 0, orderId: null, phase: 'queueing', position: { x: 650, y: 350 } };
  silent.admit(c.id); silent.update(60000, [c], new Set([c.id])); assert.equal(silent.text(c.id), null);
  const comments = new CustomerComments(() => 0); comments.admit(c.id);
  comments.update(15000, [c], new Set([c.id])); assert.ok(comments.text(c.id));
  comments.update(15000, [c], new Set([c.id])); assert.ok(comments.text(c.id));
  comments.update(17500, [c], new Set([c.id])); assert.equal(comments.text(c.id), null);
});

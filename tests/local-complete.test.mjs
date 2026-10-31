import test from 'node:test';
import assert from 'node:assert/strict';
import { Restaurant } from '../src/simulation/Restaurant.ts';
import { DEMAND, INTERACTION, PLAYER, UPGRADES } from '../src/config.ts';
import { CHECKOUT_PLAYER, CUSTOMER_SERVICE_POINTS, CUSTOMER_PUBLIC_Y, DEPOSIT_POINT, EXTRA_STOVE, EXTRA_TABLES,
  INTERACTION_ZONES, CLEANING_WAIT_POINTS, TABLE_POSITIONS } from '../src/world/layout.ts';
import { canInteract, closestZone } from '../src/world/interaction.ts';
import { canStand } from '../src/world/collision.ts';
import { findPath } from '../src/world/navigation.ts';
import { findCustomerPath, canStandCustomer } from '../src/world/customerNavigation.ts';

const make = () => { const r = new Restaurant({ arrivalMs: 1e9 }); r.coins = 5000; r.production.restock(100); return r; };
const buy = (r, id) => assert.ok(r.purchase(id, r.upgradeLevel(id)), r.purchaseState(id).problem);
const advance = (r, ms) => { for (let t = 0; t < ms; t += 50) r.update(Math.min(50, ms - t)); };
function until(r, predicate, limit = 180000) {
  for (let t = 0; !predicate() && t < limit; t += 50) r.update(50);
  assert.ok(predicate(), 'El circuito debe progresar');
}
const deposit = r => {
  r.production.playerInventory.change('meals', 1);
  assert.ok(r.perform({ kind: 'production', action: 'store-meal' }));
};
const zone = (r, id) => r.interactionZones.find(z => z.id === id);

test('Inicio por desplazamiento: 8 s únicos, depósitos y pausas sin reiniciar, reset espera movimiento', () => {
  const r = new Restaurant({}, () => 0), from = { x: 378, y: 735 }, to = { x: 379, y: 735 };
  r.update(600000);
  assert.equal(r.customers.length, 0); assert.equal(r.arrivalsStarted, false);
  deposit(r); r.production.sellAvailable();
  r.playerMoved(from, from); r.playerMoved(from, { x: NaN, y: 735 });
  r.update(600000); assert.equal(r.arrivalsStarted, false);
  r.playerMoved(from, to); assert.equal(r.arrivalsStarted, true);
  r.update(4000); r.playerMoved(to, from); deposit(r);
  r.update(0); r.update(-100); r.update(NaN); // Paused/invalid time cannot advance clocks.
  assert.equal(r.arrivalElapsedMs, 4000);
  r.update(3999); assert.equal(r.customers.length, 0);
  r.update(1); assert.equal(r.customers.length, 1); assert.equal(r.awaitingFirstArrival, false);
  r.update(9999); assert.equal(r.customers.length, 1);
  r.update(1); assert.equal(r.customers.length, 2);
  r.reset(); r.update(600000);
  assert.equal(r.arrivalsStarted, false); assert.equal(r.customers.length, 0);
  r.playerMoved(from, to); r.update(8000); assert.equal(r.customers.length, 1);
});

test('Producción autónoma y depósitos no activan llegadas sin movimiento del jugador', () => {
  const r = make(); buy(r, 'cook');
  until(r, () => r.production.availablePortions === 12);
  assert.equal(r.arrivalsStarted, false); assert.equal(r.arrivalElapsedMs, 0);
  assert.equal(r.customers.length, 0);
});

test('Una tarjeta de mesas compra 2 → 6 con precios crecientes y el hornillo cobra 180 una sola vez', () => {
  const r = make();
  for (const [index, price] of [80, 140, 220, 320].entries()) {
    const before = r.money, spent = r.totalSpent;
    assert.equal(r.purchaseState('tables').price, price);
    buy(r, 'tables');
    assert.equal(r.tables.length, index + 3); assert.equal(r.money, before - price);
    assert.equal(r.totalSpent, spent + price);
    assert.equal(r.purchase('tables', index), false); assert.equal(r.money, before - price);
  }
  assert.equal(r.purchaseState('tables').problem, 'limit.tables');
  assert.equal(r.purchase('tables', 4), false); assert.equal(r.tables.length, 6);
  const before = r.money; buy(r, 'stove');
  assert.equal(r.money, before - 180); assert.deepEqual(r.production.stoveIds, ['stove', 'stove-2']);
  assert.equal(r.purchase('stove', 0), false); assert.equal(r.purchase('stove', 1), false);
  assert.equal(r.purchaseState('stove').problem, 'limit.max');
  assert.equal(r.money, before - 180);
});

test('Colocación segura para mesa y hornillo: sin cobro ni aparición hasta liberar la huella', () => {
  for (const [id, furniture] of [['tables', EXTRA_TABLES[0]], ['stove', EXTRA_STOVE]]) {
    const r = make(), f = furniture.footprint, occupied = { x: f.x + 20, y: f.y + 20 };
    assert.ok(canStand(occupied, r.obstacles));
    const money = r.money;
    assert.equal(r.purchase(id, 0, occupied), false);
    assert.equal(r.money, money); assert.equal(r.totalSpent, 0); assert.equal(r.upgradeLevel(id), 0);
    assert.ok(!r.stations.some(s => s.id === furniture.id));
    buy(r, id); assert.ok(r.stations.some(s => s.id === furniture.id)); assert.equal(canStand(occupied, r.obstacles), false);
  }
});

test('Caja trasera, depósito separado y rutas públicas sin invadir la zona de trabajo con ampliación completa', () => {
  const r = make(); for (let i = 0; i < 4; i++) buy(r, 'tables'); buy(r, 'stove');
  const cashier = zone(r, 'checkout'), depot = zone(r, 'deposit');
  assert.ok(canInteract(CHECKOUT_PLAYER, cashier, r.obstacles));
  assert.equal(closestZone(CHECKOUT_PLAYER, r.interactionZones, r.obstacles).id, 'checkout');
  assert.equal(closestZone(DEPOSIT_POINT, r.interactionZones, r.obstacles).id, 'deposit');
  assert.ok(Math.hypot(CHECKOUT_PLAYER.x - DEPOSIT_POINT.x, CHECKOUT_PLAYER.y - DEPOSIT_POINT.y) > INTERACTION.radius * 2);
  for (const point of [...Object.values(CUSTOMER_SERVICE_POINTS), DEPOSIT_POINT, { x: 660, y: 220 }, { x: 770, y: 220 }])
    assert.equal(canInteract(point, cashier, r.obstacles), false);
  assert.equal(canInteract(CHECKOUT_PLAYER, depot, r.obstacles), false);
  for (const z of r.interactionZones) {
    assert.ok(findPath(PLAYER.spawn, z.position, r.routingObstacles), z.id);
    assert.ok(canStand(z.position, r.obstacles));
    assert.equal(closestZone(z.position, r.interactionZones, r.obstacles).id, z.id);
  }
  assert.equal(findCustomerPath(CUSTOMER_SERVICE_POINTS['dine-in'], CHECKOUT_PLAYER, r.routingObstacles), null);
  for (const from of Object.values(CUSTOMER_SERVICE_POINTS))
    for (const to of [...Object.values(TABLE_POSITIONS).map(t => t.seat), ...Object.values(CLEANING_WAIT_POINTS)]) {
      const path = findCustomerPath(from, to, r.routingObstacles); assert.ok(path);
      let start = from;
      for (const end of path) {
        const steps = Math.max(1, Math.ceil(Math.hypot(end.x - start.x, end.y - start.y)));
        for (let i = 0; i <= steps; i++) {
          const p = { x: start.x + (end.x - start.x) * i / steps, y: start.y + (end.y - start.y) * i / steps };
          assert.ok(p.y >= CUSTOMER_PUBLIC_Y); assert.ok(canStandCustomer(p, r.routingObstacles));
        }
        start = end;
      }
    }
  assert.ok(r.stations.filter(s => s.kind === 'table').every(t => !/Mesa\s*\d/i.test(t.name)));
});

test('Ocho posiciones de cocina simultáneas, relojes independientes y mejoras solo para nuevas cocciones', () => {
  const r = make(); buy(r, 'stove');
  const p = r.production, inventory = p.playerInventory;
  for (let i = 0; i < 8; i++) p.perform('take-ingredients');
  p.perform('start-cooking', 0, inventory, 'stove'); p.update(1000);
  buy(r, 'stoveSpeed');
  p.perform('start-cooking', 0, inventory, 'stove-2');
  buy(r, 'stoveSpeed');
  for (const id of p.stoveIds) for (let index = 1; index < 4; index++) assert.ok(p.perform('start-cooking', index, inventory, id));
  assert.equal(p.stoveSummary.cooking, 8);
  assert.equal(p.slotsFor('stove')[0].durationMs, 4000); assert.equal(p.slotsFor('stove-2')[0].durationMs, 3000);
  p.update(1999); assert.equal(p.stoveSummary.ready, 0);
  p.update(1); assert.equal(p.stoveSummary.ready, 6);
  p.update(1000); assert.equal(p.stoveSummary.ready, 8);
  for (const id of p.stoveIds) for (let index = 0; index < 4; index++) assert.ok(p.perform('take-meal', index, inventory, id));
  assert.equal(p.inventory.meals, 8); assert.equal(p.stoveSummary.empty, 8);
  assert.equal(p.perform('take-meal', 0, inventory, 'stove-2'), null);
});

test('Cocinero reconoce ambos hornillos antes y después de contratar; conserva tarea y reserva solo su posición', () => {
  for (const hiredFirst of [true, false]) {
    const r = make(), p = r.production;
    if (hiredFirst) buy(r, 'cook');
    buy(r, 'stove');
    if (!hiredFirst) buy(r, 'cook');
    p.cookingMs = 1e9;
    for (let i = 0; i < 4; i++) { p.perform('take-ingredients'); p.perform('start-cooking', i); }
    const worker = r.staff.get('cook'); worker.inventory.change('ingredients', 2);
    until(r, () => worker.task?.command.action === 'start-cooking');
    assert.equal(worker.task.command.stoveId, 'stove-2');
    const task = worker.task;
    until(r, () => task.elapsedMs >= 500);
    assert.equal(worker.task, task);
    const other = { kind: 'production', action: 'start-cooking', stoveId: 'stove-2', slotIndex: 1 };
    p.perform('take-ingredients');
    assert.ok(r.beginAction(other)); assert.ok(r.perform(other));
    assert.equal(worker.task, task);
    until(r, () => p.slotsFor('stove-2')[0].status === 'cooking');
    assert.equal(p.slotsFor('stove-2')[1].status, 'cooking');
    assert.equal(worker.inventory.count('ingredients'), 1);
    assert.equal(r.activeReservations.size, 0);
  }
});

test('Jugador y cocinero cooperan en hornillos distintos y terminan lo iniciado sobre el objetivo de stock', () => {
  const r = make(); buy(r, 'cook'); buy(r, 'stove');
  const p = r.production, cook = r.staff.get('cook');
  p.perform('take-ingredients'); cook.inventory.change('ingredients', 1);
  const a = { kind: 'production', action: 'start-cooking', stoveId: 'stove', slotIndex: 0 };
  const b = { ...a, stoveId: 'stove-2' };
  assert.ok(r.beginAction(a)); assert.ok(r.beginAction(b, 'cook'));
  assert.equal(r.activeReservations.size, 2);
  assert.ok(r.perform(a)); assert.ok(r.perform(b, 'cook'));
  p.stock = 12;
  until(r, () => p.availablePortions === 14 && p.stoveSummary.empty === 8);
  assert.equal(cook.inventory.count('meals'), 0);
  assert.equal(r.activeReservations.size, 0);
  p.sellAvailable(); p.sellAvailable(); p.sellAvailable();
  until(r, () => p.availablePortions === 12);
});

test('Seis reservas sucias esperan en plazas públicas distintas y limpieza activa los seis asientos', () => {
  const r = make(); for (let i = 0; i < 4; i++) buy(r, 'tables');
  r.options.eatingMs = 1e9; r.production.stock = 6;
  for (const table of r.tables) Object.assign(table, { cleanliness: 'dirty', dirtySince: 0 });
  const ids = Array.from({ length: 6 }, () => r.admitCustomer('dine-in'));
  advance(r, 16000);
  for (let i = 0; i < 6; i++) {
    const command = r.offer(zone(r, 'checkout')).command; assert.ok(command);
    assert.ok(r.perform(command)); advance(r, 650);
  }
  until(r, () => ids.every(id => r.customer(id).phase === 'waiting-cleaning'));
  assert.equal(new Set(ids.map(id => JSON.stringify(r.customer(id).position))).size, 6);
  assert.ok(ids.every(id => r.customer(id).position.y >= CUSTOMER_PUBLIC_Y));
  buy(r, 'cleaner');
  until(r, () => ids.every(id => r.customer(id).phase === 'eating'));
  until(r, () => r.staff.get('cleaner').inventory.count('waste') === 0);
  assert.ok(r.tables.every(t => t.cleanliness === 'clean' && t.customerId));
});

test('Reinicio de ampliación completa elimina hornillo extra, mesas, tareas y arranque de llegadas', () => {
  const r = make();
  for (const id of ['stove', ...Object.keys(UPGRADES).filter(id => id !== 'stove' && id !== 'transport')]) for (let i = 0; i < UPGRADES[id].prices.length; i++) buy(r, id);
  deposit(r); r.production.perform('take-ingredients');
  r.perform({ kind: 'production', action: 'start-cooking', stoveId: 'stove-2', slotIndex: 0 });
  Object.assign(r.table('table-6'), { cleanliness: 'dirty', dirtySince: 0 }); advance(r, 2000);
  r.reset();
  assert.deepEqual(r.production.stoveIds, ['stove']); assert.equal(r.production.stoveSummary.empty, 4);
  assert.equal(r.tables.length, 2); assert.equal(r.totalSpent + r.pendingCash + r.customers.length + r.activeReservations.size, 0);
  assert.equal(r.staff.employees.length, 0); assert.equal(r.arrivalsStarted, false);
  assert.equal(r.interactionZones.some(z => z.id === 'stove-2' || z.id === 'table-6'), false);
  assert.equal(r.purchaseState('tables').price, 80); assert.equal(r.purchaseState('stove').price, 180);
  r.update(600000); assert.equal(r.customers.length, 0);
});

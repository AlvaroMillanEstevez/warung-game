import test from 'node:test';
import assert from 'node:assert/strict';
import { DwellInteraction } from '../src/simulation/DwellInteraction.ts';
import { Restaurant, actionKey } from '../src/simulation/Restaurant.ts';
import { INTERACTION_ZONES, STATIONS, CUSTOMER_LAYOUT, QUEUE_POINTS, TABLE_POSITIONS } from '../src/world/layout.ts';
import { findPath } from '../src/world/navigation.ts';
import { canStand } from '../src/world/collision.ts';
import { closestZone } from '../src/world/interaction.ts';
import { INTERACTION } from '../src/config.ts';

const zone = id => INTERACTION_ZONES.find(zone => zone.id === id);
const make = options => new Restaurant({ arrivalMs: 1e9, ...options });
function stock(r, count = 1) {
  for (let i = 0; i < count; i++) {
    const p = r.production;
    assert.ok(p.perform('take-ingredients'));
    assert.ok(p.perform('start-cooking'));
    p.update(p.cookingMs);
    assert.ok(p.perform('take-meal'));
    assert.ok(p.perform('store-meal'));
  }
}
function until(r, condition, maxMs = 30000) {
  for (let elapsed = 0; !condition() && elapsed < maxMs; elapsed += 20) r.update(20);
  assert.ok(condition(), 'El cliente debe alcanzar su destino físicamente');
}
function queued(r, intent = 'dine-in') {
  const id = r.admitCustomer(intent);
  assert.ok(id);
  until(r, () => r.customer(id)?.phase === 'queueing');
  return id;
}
function act(r, id) {
  const offer = r.offer(zone(id));
  assert.ok(offer.command, offer.reason);
  assert.ok(r.perform(offer.command));
  return offer.command;
}
function serve(r, id) {
  until(r, () => r.customer(id)?.phase === 'waiting-food');
  const pickup = act(r, 'pickup');
  const table = r.order(pickup.orderId).tableId;
  act(r, table);
  return table;
}

test('La cabeza más antigua entre filas elegibles cobra una vez y nadie adelanta', () => {
  const r = make();
  stock(r, 3);
  const first = queued(r, 'takeaway');
  const nextInSameLine = queued(r, 'takeaway');
  const otherLine = queued(r);
  const command = r.offer(zone('checkout')).command;
  assert.equal(command.customerId, first);
  assert.equal(r.perform({ kind: 'checkout', customerId: nextInSameLine, tableId: null }), null);
  assert.ok(r.perform(command));
  assert.equal(r.money, 10);
  assert.equal(r.production.inventory.meals, 0);
  assert.equal(r.perform(command), null);
  assert.equal(r.money, 10);
  until(r, () => r.customer(nextInSameLine)?.phase === 'queueing');
  assert.equal(r.offer(zone('checkout')).command.customerId, nextInSameLine);
  act(r, 'checkout');
  assert.equal(r.offer(zone('checkout')).command.customerId, otherLine);
});

test('Para llevar avanza con las dos mesas reservadas; ninguna mesa se asigna dos veces', () => {
  const r = make();
  stock(r, 4);
  const first = queued(r);
  const a = act(r, 'checkout');
  const second = queued(r);
  const b = act(r, 'checkout');
  assert.notEqual(a.tableId, b.tableId);
  const blocked = queued(r);
  const take = queued(r, 'takeaway');
  assert.equal(r.offer(zone('checkout')).command.customerId, take);
  const before = r.production.portions;
  act(r, 'checkout');
  assert.equal(r.production.portions, before - 1);
  assert.equal(r.production.reservedPortions, 2);
  assert.equal(r.table(a.tableId).customerId, first);
  assert.equal(r.table(b.tableId).customerId, second);
  assert.equal(r.customer(blocked).phase, 'queueing');
  assert.equal(r.perform({ kind: 'checkout', customerId: blocked, tableId: a.tableId }), null);
  assert.equal(r.money, 30);
});

test('Las raciones reservadas permanecen separadas y no se venden para llevar', () => {
  const r = make();
  stock(r, 5);
  const dine = queued(r);
  act(r, 'checkout');
  assert.equal(r.production.portions, 5);
  assert.equal(r.production.availablePortions, 4);
  assert.equal(r.production.reservedPortions, 1);
  for (let i = 0; i < 4; i++) {
    queued(r, 'takeaway');
    act(r, 'checkout');
  }
  const take = queued(r, 'takeaway');
  assert.equal(r.offer(zone('checkout')).command, null);
  assert.equal(r.production.portions, 1);
  assert.equal(r.production.availablePortions, 0);
  assert.equal(r.customer(take).orderId, null);
  until(r, () => r.customer(dine).phase === 'waiting-food');
  act(r, 'pickup');
  assert.equal(r.production.portions, 0);
  assert.equal(r.production.reservedPortions, 0);
});

test('Pedido vinculado: no recoger antes del asiento, servir a otro, descartar ni servir dos veces', () => {
  const r = make();
  stock(r, 2);
  const customer = queued(r);
  const sale = act(r, 'checkout');
  assert.equal(r.customer(customer).phase, 'walking-to-table');
  assert.equal(r.offer(zone('pickup')).command, null);
  const order = r.orders[0];
  assert.equal(r.perform({ kind: 'pickup', orderId: order.id }), null);
  until(r, () => r.customer(customer).phase === 'waiting-food');
  const pickup = act(r, 'pickup');
  assert.equal(r.perform(pickup), null);
  assert.equal(r.production.perform('discard'), null);
  assert.match(r.production.availableAt('bin').reason, /residuos/);
  const wrong = { kind: 'serve', orderId: pickup.orderId, tableId: sale.tableId === 'table-1' ? 'table-2' : 'table-1' };
  assert.equal(r.perform(wrong), null);
  assert.deepEqual(r.production.inventory.orderMeals, [order.id]);
  assert.equal(r.customer(customer).phase, 'waiting-food');
  const delivery = act(r, sale.tableId);
  assert.equal(r.production.inventory.meals, 0);
  assert.equal(r.customer(customer).phase, 'eating');
  assert.equal(r.perform(delivery), null);
  assert.equal(r.money, 10);
});

test('Suciedad y reserva son independientes: esperar, limpiar, tirar residuos y servir al siguiente', () => {
  const r = make();
  stock(r, 3);
  const first = queued(r);
  act(r, 'checkout');
  const firstTable = serve(r, first);
  until(r, () => r.table(firstTable).cleanliness === 'dirty');
  assert.equal(r.table(firstTable).customerId, null);
  assert.equal(r.customer(first).phase, 'leaving');
  assert.equal(r.money, 10);
  // Prefer the other clean table; keep its customer seated so the dirty table is the next assignable one.
  const cleanCustomer = queued(r);
  const cleanSale = act(r, 'checkout');
  assert.notEqual(cleanSale.tableId, firstTable);
  const second = queued(r);
  const dirtySale = act(r, 'checkout');
  assert.equal(dirtySale.tableId, firstTable);
  until(r, () => r.customer(second)?.phase === 'waiting-cleaning');
  assert.deepEqual(r.customer(second).position, TABLE_POSITIONS[firstTable].waiting);
  const order = r.order(r.customer(second).orderId);
  assert.equal(r.perform({ kind: 'pickup', orderId: order.id }), null);
  const command = act(r, firstTable);
  assert.equal(r.table(firstTable).cleanliness, 'clean');
  assert.equal(r.table(firstTable).customerId, second);
  assert.equal(r.production.inventory.waste, 1);
  assert.equal(r.customer(second).phase, 'walking-to-seat');
  assert.equal(r.perform(command), null);
  assert.ok(r.production.perform('take-ingredients'));
  assert.ok(r.offer(zone('pickup')).command);
  // Keep ingredients and waste throughout pickup and service.
  until(r, () => r.customer(second).phase === 'waiting-food');
  // Oldest eligible paid order first, then the customer of the cleaned table.
  assert.equal(r.customer(cleanCustomer).phase, 'waiting-food');
  const older = act(r, 'pickup');
  assert.equal(r.order(older.orderId).customerId, cleanCustomer);
  act(r, cleanSale.tableId);
  const newer = act(r, 'pickup');
  assert.equal(r.order(newer.orderId).customerId, second);
  act(r, firstTable);
  assert.equal(r.customer(second).phase, 'eating');
  assert.equal(r.money, 30);
  until(r, () => r.customers.length === 0);
  assert.equal(r.orders.length, 0);
  assert.ok(r.tables.every(table => table.cleanliness === 'dirty' && table.customerId === null));
});

test('Limpiar mientras el cliente camina conserva su reserva y luego recorre el tramo hasta el asiento', () => {
  const r = make();
  stock(r, 3);
  const first = queued(r);
  act(r, 'checkout');
  const dirtyTable = serve(r, first);
  until(r, () => r.table(dirtyTable).cleanliness === 'dirty');
  queued(r); act(r, 'checkout');
  const next = queued(r);
  assert.equal(act(r, 'checkout').tableId, dirtyTable);
  act(r, dirtyTable);
  assert.equal(r.table(dirtyTable).customerId, next);
  until(r, () => r.customer(next).phase === 'waiting-food');
  assert.deepEqual(r.customer(next).position, TABLE_POSITIONS[dirtyTable].seat);
});

test('Un comando preparado se revalida sin cambiar de cliente ni cobrar parcialmente', () => {
  const r = make();
  stock(r);
  const first = queued(r, 'takeaway');
  const locked = r.offer(zone('checkout')).command;
  const second = queued(r);
  assert.equal(locked.customerId, first);
  r.production.sellAvailable();
  assert.equal(r.perform(locked), null);
  assert.equal(r.money, 0);
  assert.equal(r.customer(first).orderId, null);
  assert.equal(r.customer(second).orderId, null);
  assert.ok(r.tables.every(table => table.customerId === null));
});

test('Reinicio borra clientes, pedidos, reservas, suciedad, carga, caja y relojes; IDs viejos no renacen', () => {
  const r = make({ arrivalMs: 8000 });
  stock(r, 2);
  const customer = queued(r);
  const sale = act(r, 'checkout');
  until(r, () => r.customer(customer).phase === 'waiting-food');
  const oldPickup = act(r, 'pickup');
  r.reset();
  assert.equal(r.elapsedMs, 0);
  assert.equal(r.money, 0);
  assert.equal(r.customers.length + r.orders.length + r.queue('dine-in').length + r.queue('takeaway').length, 0);
  assert.ok(r.tables.every(table => table.cleanliness === 'clean' && table.customerId === null));
  assert.equal(r.production.portions, 0);
  assert.equal(r.production.inventory.meals, 0);
  assert.deepEqual(r.production.stoveSummary, { empty: 4, cooking: 0, ready: 0 });
  assert.equal(r.production.inventory.ingredients + r.production.inventory.waste, 0);
  assert.equal(r.production.reservedOrderIds.length, 0);
  r.update(7999);
  assert.equal(r.customers.length, 0);
  r.update(1);
  assert.equal(r.customers.length, 1);
  assert.notEqual(r.customers[0].id, customer);
  assert.equal(r.perform(sale), null);
  assert.equal(r.perform(oldPickup), null);
});

test('Llegadas limitadas: la intención elegida se mantiene y la fila llena descarta sin deuda ni desvío', () => {
  const r = new Restaurant({ arrivalMs: 8000, maxQueueLength: 1 }, () => 0);
  r.update(7999);
  assert.equal(r.customers.length, 0);
  r.update(1);
  const first = r.customers[0];
  assert.equal(first.intent, 'dine-in');
  r.update(24000);
  assert.equal(r.customers.length, 1);
  assert.equal(r.queue('takeaway').length, 0);
  until(r, () => r.customer(first.id).phase === 'queueing');
  stock(r); act(r, 'checkout');
  r.update(1);
  assert.equal(r.queue('dine-in').length, 0);
  assert.equal(r.admitCustomer('takeaway') !== null, true);
  assert.equal(r.admitCustomer('takeaway'), null);
  const capped = make({ maxCustomers: 1 });
  assert.ok(capped.admitCustomer('takeaway'));
  assert.equal(capped.admitCustomer('dine-in'), null);
});

test('Todos los itinerarios explícitos tienen ruta libre y cada paso respeta velocidad y muebles', () => {
  const obstacles = STATIONS.map(s => s.footprint);
  const points = [...Object.values(CUSTOMER_LAYOUT), ...Object.values(QUEUE_POINTS).flat(),
    ...Object.values(TABLE_POSITIONS).flatMap(t => [t.waiting, t.seat])];
  for (const from of points) for (const to of points) {
    const route = findPath(from, to, obstacles);
    assert.ok(route, JSON.stringify({ from, to }));
    let start = from;
    for (const end of route) {
      const steps = Math.ceil(Math.hypot(end.x - start.x, end.y - start.y));
      for (let n = 0; n <= steps; n++) {
        const t = steps ? n / steps : 0;
        assert.ok(canStand({ x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t }, obstacles));
      }
      start = end;
    }
  }
  const r = make();
  stock(r, 4);
  for (const intent of ['dine-in', 'takeaway', 'dine-in', 'takeaway']) r.admitCustomer(intent);
  for (let frame = 0; frame < 3000; frame++) {
    const previous = new Map(r.customers.map(c => [c.id, { ...c.position }]));
    r.update(20);
    for (const c of r.customers) {
      assert.ok(canStand(c.position, obstacles));
      const from = previous.get(c.id);
      if (from) assert.ok(Math.hypot(c.position.x - from.x, c.position.y - from.y) <= r.options.speed * 0.02 + 0.0001);
    }
    const offer = r.offer(zone('checkout'));
    if (offer.command) r.perform(offer.command);
    const pickup = r.offer(zone('pickup'));
    if (pickup.command) {
      r.perform(pickup.command);
      r.perform({ kind: 'serve', orderId: pickup.command.orderId, tableId: r.order(pickup.command.orderId).tableId });
    }
  }
  assert.equal(r.customers.length, 0);
  assert.equal(r.money, 40);
});

test('Los tres accesos del mostrador no solapan radios y todas las zonas son accesibles', () => {
  const obstacles = STATIONS.map(s => s.footprint);
  const counter = INTERACTION_ZONES.filter(z => z.stationId === 'counter');
  for (const a of counter) for (const b of counter) if (a !== b) {
    assert.ok(Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y) > 2 * INTERACTION.radius);
  }
  for (const z of INTERACTION_ZONES) {
    assert.ok(canStand(z.position, obstacles), z.id);
    assert.equal(closestZone(z.position, INTERACTION_ZONES, obstacles)?.id, z.id);
  }
});

test('Caja continua con todas las categorías llenas; espera stock y reanuda con 1500 ms nuevos', () => {
  const r = make(), d = new DwellInteraction();
  stock(r, 2);
  for (let i = 0; i < 4; i++) {
    const p = r.production;
    p.perform('take-ingredients'); p.perform('start-cooking'); p.update(4000); p.perform('take-meal'); p.collectWaste();
  }
  for (let i = 0; i < 4; i++) r.production.perform('take-ingredients');
  const before = r.production.inventory;
  queued(r, 'takeaway'); queued(r, 'takeaway'); queued(r, 'takeaway');
  let pending = null;
  const tick = ms => {
    r.update(ms);
    if (pending && r.validate(pending)) { pending = null; d.cancel(); }
    pending ??= r.offer(zone('checkout')).command;
    const done = d.update({ id: 'checkout', action: pending ? actionKey(pending) : null }, ['checkout'], false, ms);
    if (done) { assert.ok(r.perform(pending)); pending = null; }
  };
  for (let i = 0; i < 200; i++) tick(50);
  assert.equal(r.money, 20);
  assert.equal(d.progress, 0);
  assert.deepEqual(r.production.inventory, before);
  // Deposit one existing free plate without clearing the other categories.
  r.production.perform('store-meal');
  tick(1499);
  assert.equal(r.money, 20);
  tick(1);
  assert.equal(r.money, 30);
  assert.equal(r.production.inventory.ingredients, 4);
  assert.equal(r.production.inventory.waste, 4);
});
test('Dos pedidos se recogen por antigüedad con inventario mixto; límite compartido y entrega exacta', () => {
  const r = make();
  stock(r, 2);
  const a = queued(r); act(r, 'checkout');
  const b = queued(r); act(r, 'checkout');
  until(r, () => r.customer(a).phase === 'waiting-food' && r.customer(b).phase === 'waiting-food');
  for (let i = 0; i < 3; i++) {
    const p = r.production;
    p.perform('take-ingredients'); p.perform('start-cooking'); p.update(4000); p.perform('take-meal');
  }
  r.production.perform('take-ingredients'); r.production.collectWaste();
  const first = act(r, 'pickup');
  assert.equal(r.order(first.orderId).customerId, a);
  assert.equal(r.production.inventory.meals, 4);
  assert.equal(r.offer(zone('pickup')).command, null);
  assert.equal(r.perform(first), null);
  r.production.perform('store-meal');
  const second = act(r, 'pickup');
  assert.equal(r.order(second.orderId).customerId, b);
  assert.equal(r.production.inventory.orderMeals.length, 2);
  act(r, r.order(second.orderId).tableId);
  assert.deepEqual(r.production.inventory.orderMeals, [first.orderId]);
  act(r, r.order(first.orderId).tableId);
  assert.equal(r.production.inventory.ingredients, 1);
  assert.equal(r.production.inventory.waste, 1);
});
test('Un punto alcanzable por mesa sirve y limpia; residuos llenos bloquean solo la limpieza', () => {
  const r = make(), obstacles = STATIONS.map(s => s.footprint);
  stock(r);
  const id = queued(r); act(r, 'checkout');
  until(r, () => r.customer(id).phase === 'waiting-food');
  const pickup = act(r, 'pickup');
  const tableId = r.order(pickup.orderId).tableId;
  const points = INTERACTION_ZONES.filter(z => z.stationId === tableId);
  assert.equal(points.length, 1);
  assert.ok(findPath({ x: 444, y: 518 }, points[0].position, obstacles));
  assert.equal(closestZone(points[0].position, INTERACTION_ZONES, obstacles), points[0]);
  act(r, tableId);
  until(r, () => r.table(tableId).cleanliness === 'dirty');
  for (let i = 0; i < 4; i++) r.production.collectWaste();
  assert.equal(r.offer(points[0]).command, null);
  assert.equal(r.table(tableId).cleanliness, 'dirty');
  r.production.perform('discard');
  r.production.perform('take-ingredients');
  assert.equal(act(r, tableId).kind, 'clean');
  assert.equal(r.production.inventory.waste, 4);
  assert.equal(r.production.inventory.ingredients, 1);
});
test('Ciclo de hornillo mantiene la posición elegida aunque termine otra ración', () => {
  const r = make(), p = r.production;
  p.perform('take-ingredients'); p.perform('take-ingredients');
  p.perform('start-cooking');
  p.update(3500);
  const locked = r.offer(zone('stove')).command;
  assert.equal(locked.slotIndex, 1);
  p.update(500);
  assert.equal(r.offer(zone('stove')).command.action, 'take-meal');
  assert.equal(r.validate(locked), null);
  assert.ok(r.perform(locked));
  assert.equal(p.stove[0].status, 'ready');
  assert.equal(p.stove[1].status, 'cooking');
  assert.equal(r.perform(locked), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { Restaurant } from '../src/simulation/Restaurant.ts';
import { BulkOrders } from '../src/simulation/BulkOrders.ts';
import { BULK_ORDERS, INTERACTION, PLAYER, DEMAND } from '../src/config.ts';
import { ORDER_BOARD, OFFICE } from '../src/world/layout.ts';
import { canStand } from '../src/world/collision.ts';
import { closestZone, canInteract } from '../src/world/interaction.ts';
import { findPath } from '../src/world/navigation.ts';

test('Tablón junto a oficina: punto transitable y separado de cada interacción, también con ampliación completa', () => {
  const r = new Restaurant(); r.coins = 5000;
  for (const id of ['tables', 'tables', 'tables', 'tables', 'stove']) assert.ok(r.purchase(id, r.upgradeLevel(id)));
  const zone = r.interactionZones.find(z => z.id === 'board');
  assert.deepEqual(zone.position, ORDER_BOARD.interaction);
  assert.ok(canStand(zone.position, r.obstacles)); assert.ok(canInteract(zone.position, zone, r.obstacles));
  assert.ok(findPath(PLAYER.spawn, zone.position, r.routingObstacles));
  assert.ok(findPath(OFFICE.interaction, zone.position, r.routingObstacles));
  assert.ok(Math.hypot(zone.position.x - OFFICE.interaction.x, zone.position.y - OFFICE.interaction.y) < 130);
  for (const other of r.interactionZones.filter(z => z.id !== 'board')) {
    assert.ok(Math.hypot(zone.position.x - other.position.x, zone.position.y - other.position.y) > INTERACTION.radius * 2, other.id);
    assert.ok(findPath(zone.position, other.position, r.routingObstacles), other.id);
  }
  for (const id of ['board', 'office', 'checkout'])
    assert.equal(closestZone(r.interactionZones.find(z => z.id === id).position, r.interactionZones, r.obstacles).id, id);
});

test('Descubrimiento: bloqueo, primera visita efectiva, aceptación y orientación breve de empaquetado', () => {
  const r = new Restaurant(), b = r.bulkOrders;
  assert.equal(b.guidance, null); assert.equal(b.visitBoard(), false);
  assert.equal(b.boardVisited, false); assert.equal(r.acceptBulkOrder(1), false);
  r.coins = 100; assert.ok(r.purchase('cook', 0));
  assert.equal(b.state.phase, 'offer'); assert.equal(b.state.quantity, 4); assert.equal(b.guidance, 'board');
  const offer = b.state;
  b.update(1e6, 10, () => 0); assert.deepEqual(b.state, offer); assert.equal(b.guidance, 'board');
  assert.ok(b.visitBoard()); assert.equal(b.boardVisited, true); assert.equal(b.guidance, null);
  assert.ok(b.accept(offer.id)); assert.equal(b.guidance, 'packing');
  const snapshot = b.state;
  b.update(0, 10, () => 0); assert.deepEqual(b.state, snapshot); assert.equal(b.guidance, 'packing');
  b.update(BULK_ORDERS.packingHintMs - 1, 10, () => 0); assert.equal(b.guidance, 'packing');
  b.update(1, 10, () => 0); assert.equal(b.guidance, null); assert.equal(b.packingVisited, false);
  b.visitPacking(); assert.equal(b.packingVisited, true); assert.equal(b.guidance, null);
});

test('Visita a empaquetado, cancelación y DEV retiran ayudas y temporizadores sin residuos', () => {
  const b = new BulkOrders(); b.unlock(10); b.visitBoard(); b.accept(b.state.id);
  b.visitPacking(); assert.equal(b.guidance, null); assert.equal(b.packingVisited, true);
  b.cancel(b.state.id); b.update(45000, 10, () => 0); b.accept(b.state.id);
  assert.equal(b.guidance, null); // Reaching packing once is enough; do not keep teaching.
  b.reset(); assert.equal(b.boardVisited, false); assert.equal(b.packingVisited, false);
  assert.equal(b.guidance, null); b.update(1e6, 10, () => 0); assert.equal(b.state.phase, 'locked');
  b.unlock(10); assert.equal(b.guidance, 'board'); b.visitBoard(); b.accept(b.state.id);
  b.cancel(b.state.id); assert.equal(b.guidance, null);
  b.reset(); b.unlock(10); b.visitBoard(); b.accept(b.state.id); b.reset();
  assert.equal(b.guidance, null); assert.equal(b.packingHintMs, 0);
});

test('Tramo avanzado: configuración de cuatro mesas y equipo completo supera 1000, sin deuda ni avisos duplicados', () => {
  const r = new Restaurant({}, () => .65, 5000);
  r.playerMoved(PLAYER.spawn, { x: PLAYER.spawn.x + 1, y: PLAYER.spawn.y });
  r.update(8000);
  assert.equal(r.customers.length, 1);
  for (const id of ['cook', 'cleaner', 'stove', 'cook', 'tables', 'tables', 'actionSpeed', 'actionSpeed', 'stoveSpeed'])
    assert.ok(r.purchase(id, r.upgradeLevel(id)), id);
  assert.equal(r.totalSpent, 1140); assert.equal(r.demandFrequency, 2.4);
  r.takeDemandNotice();
  r.update(1000);
  assert.ok(r.purchase('stoveSpeed', 1));
  assert.equal(r.totalSpent, 1340); assert.equal(r.demandFrequency, 2.4);
  assert.equal(r.arrivalIntervalMs, 8000 / 2.4);
  assert.equal(r.takeDemandNotice(), false);
  assert.equal(r.arrivalElapsedMs, 1000);
  r.update(2333); assert.equal(r.customers.length, 1);
  r.update(1); assert.equal(r.customers.length, 2);
  assert.equal(r.purchase('stoveSpeed', 2), false);
  assert.ok(r.purchase('cashier', 0));
  assert.equal(r.demandFrequency, 2.4); assert.equal(r.takeDemandNotice(), false);
  for (let i = 0; i < 70; i++) r.update(1e6);
  assert.ok(r.queue('takeaway').length <= 10); assert.ok(r.customers.length <= 48);
  r.reset(); assert.equal(r.demandFrequency, .8); assert.equal(r.totalSpent, 0);
});

test('Tramo de 500: gasto válido, sin ráfaga, compras fallidas ni crecimiento sobre límite', () => {
  const r = new Restaurant({}, () => .65); r.coins = 5000;
  r.playerMoved(PLAYER.spawn, { x: PLAYER.spawn.x + 1, y: PLAYER.spawn.y });
  r.update(4000);
  for (const id of ['cook', 'tables', 'tables', 'stove']) assert.ok(r.purchase(id, r.upgradeLevel(id)));
  assert.equal(r.totalSpent, 500); assert.equal(r.demandFrequency, 2); assert.equal(r.arrivalIntervalMs, 8000 / 2);
  r.update(3999); assert.equal(r.customers.length, 0); r.update(1); assert.equal(r.customers.length, 1);
  assert.equal(DEMAND.firstArrivalDelayMs, 8000);
  const before = r.totalSpent; r.coins = 0;
  assert.equal(r.purchase('tables', 0), false); assert.equal(r.totalSpent, before);
  assert.equal(r.purchase('stove', 0), false); assert.equal(r.totalSpent, before);
  for (let i = 0; i < 70; i++) r.update(1e6);
  assert.equal(r.queue('takeaway').length, 10); assert.ok(r.customers.length <= r.options.maxCustomers);
  assert.equal(r.demandFrequency, 2);
  r.reset(); assert.equal(r.demandTier, 0); assert.equal(r.totalSpent, 0); assert.equal(r.takeDemandNotice(), false);
  assert.equal(r.arrivalsStarted, false); assert.equal(r.bulkOrders.guidance, null);
});

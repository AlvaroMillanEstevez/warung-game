import test from 'node:test';
import assert from 'node:assert/strict';
import { Restaurant } from '../src/simulation/Restaurant.ts';
import { startingCoins } from '../src/dev/startup.ts';
import { BULK_ORDERS, INTERACTION, PLAYER } from '../src/config.ts';
import { OFFICE, PACKING_STATION, STAFF_POSITIONS } from '../src/world/layout.ts';
import { canStand } from '../src/world/collision.ts';
import { findPath } from '../src/world/navigation.ts';
import { canInteract, closestZone } from '../src/world/interaction.ts';
import { DwellInteraction } from '../src/simulation/DwellInteraction.ts';

test('Saldo de prueba: solo desarrollo local, enteros acotados, sin gasto, desbloqueos ni persistencia', () => {
  for (const host of ['localhost', '127.0.0.1', '::1', '[::1]']) {
    assert.equal(startingCoins('?monedas=600', host, true), 600);
    assert.equal(startingCoins('?monedas=500', host, true), 500);
    assert.equal(startingCoins('?monedas=600', host, false), 30);
  }
  for (const value of ['', '-1', '600.5', 'NaN', 'Infinity', '1e3', '100001', '9007199254740993'])
    assert.equal(startingCoins('?monedas=' + value, 'localhost', true), 30);
  assert.equal(startingCoins('', 'localhost', true), 30);
  assert.equal(startingCoins('?monedas=600', 'example.com', true), 30);
  assert.equal(startingCoins('?monedas=0', 'localhost', true), 0);
  const r = new Restaurant({}, () => 0, startingCoins('?monedas=600', 'localhost', true));
  assert.equal(r.money, 600); assert.equal(r.totalSpent, 0); assert.equal(r.demandTier, 0);
  assert.equal(r.arrivalsStarted, false); assert.equal(r.bulkOrders.state.phase, 'locked');
  assert.equal(r.staff.employees.length, 0);
  assert.ok(r.purchase('cook', 0)); assert.equal(r.money, 500); assert.equal(r.totalSpent, 100);
  r.reset(); assert.equal(r.money, 600); assert.equal(r.totalSpent, 0); assert.equal(r.bulkOrders.state.phase, 'locked');
  assert.equal(new Restaurant().money, 30);
});

test('Distribución completa: papelera inferior y punto compartido accesibles sin solapar caja u oficina', () => {
  const r = new Restaurant({}, () => 0, 5000);
  for (const id of ['tables', 'tables', 'tables', 'tables', 'stove'])
    assert.ok(r.purchase(id, r.upgradeLevel(id)));
  assert.equal(r.interactionZones.filter(z => z.role === 'packing').length, 1);
  assert.equal(r.interactionZones.some(z => z.id === 'withdraw'), false);
  const packing = r.interactionZones.find(z => z.id === 'packing');
  const bin = r.stations.find(s => s.id === 'bin');
  assert.ok(bin.footprint.y > 700); assert.ok(PACKING_STATION.footprint.x >= 820);
  assert.ok(canStand(STAFF_POSITIONS.cleaner, r.obstacles));
  for (const z of r.interactionZones) {
    assert.ok(findPath(PLAYER.spawn, z.position, r.routingObstacles), z.id);
    assert.ok(findPath(OFFICE.interaction, z.position, r.routingObstacles), z.id);
    assert.ok(canInteract(z.position, z, r.obstacles), z.id);
  }
  for (const id of ['checkout', 'board', 'office', 'deposit', 'bin']) {
    const z = r.interactionZones.find(zone => zone.id === id);
    assert.ok(Math.hypot(z.position.x - packing.position.x, z.position.y - packing.position.y) > 2 * INTERACTION.radius);
    assert.equal(closestZone(z.position, r.interactionZones, r.obstacles).id, id);
  }
});

test('Preparar encargo comparte punto, alterna ciclos completos y completa 4/6/9 con capacidad 8', () => {
  for (const quantity of [4, 6, 9]) {
    const r = new Restaurant({}, () => 0, 600);
    assert.ok(r.purchase('cook', 0)); const b = r.bulkOrders;
    b.visitBoard();
    while (b.state.quantity !== quantity) {
      const offer = b.state; b.accept(offer.id);
      for (let i=0;i<offer.quantity;i++) b.pack(offer.id,i);
      b.claim(offer.id); b.update(BULK_ORDERS.nextOfferMs,10,()=>0);
    }
    assert.equal(b.state.quantity, quantity); assert.ok(r.acceptBulkOrder(b.state.id));
    const id = b.state.id, money = r.money, zone = r.interactionZones.find(z => z.id === 'packing');
    r.production.stock = quantity; // Isolate the station's transfer and dwell rules.
    r.production.playerInventory.change('ingredients', 8); r.production.playerInventory.change('waste', 8);
    const dwell = new DwellInteraction();
    for (let i = 0; i < quantity; i++) {
      for (const kind of ['withdraw', 'pack']) {
        const command = r.offer(zone).command; assert.equal(command.kind, kind); assert.ok(r.beginAction(command));
        const selected = { id: zone.id, action: JSON.stringify(command) };
        assert.equal(dwell.update(selected, [zone.id], false, 799, 800), null);
        assert.equal(b.state.packed, i); // A new full cycle, never instantaneous withdrawal+packing.
        assert.ok(dwell.update(selected, [zone.id], false, 1, 800));
        assert.ok(r.perform(command)); assert.equal(r.perform(command), null);
        assert.ok(r.production.inventory.meals <= 1);
      }
    }
    assert.equal(b.state.phase, 'ready'); assert.equal(b.state.packed, quantity);
    assert.equal(r.production.availablePortions, 0); assert.equal(r.production.inventory.meals, 0);
    assert.equal(r.production.inventory.ingredients, 8); assert.equal(r.production.inventory.waste, 8);
    assert.equal(r.money, money); assert.equal(r.offer(zone).reason, 'bulk.readyNotice');
    assert.equal(r.cancelBulkOrder(id), false); assert.equal(r.acceptBulkOrder(id), false);
    const reward = b.state.payment; b.update(1e7, 10, () => 0);
    assert.equal(b.state.payment, reward); assert.equal(b.state.phase, 'ready');
    assert.ok(r.claimBulkOrder(id)); assert.equal(r.claimBulkOrder(id), null);
    assert.equal(r.money, money + quantity * 15); assert.equal(r.totalSpent, 100);
    assert.equal(b.guidance, null); assert.equal(b.firstCompleted, true);
    assert.deepEqual(b.state, { phase: 'waiting', remainingMs: BULK_ORDERS.nextOfferMs });
  }
});

test('Reinicio de encargo listo elimina caja, recompensa pendiente y señales; ID anterior no cobra', () => {
  const r = new Restaurant({}, () => 0, 600);
  assert.ok(r.purchase('cook', 0)); const b = r.bulkOrders; b.visitBoard(); b.accept(b.state.id);
  const id = b.state.id; for (let i = 0; i < 4; i++) b.pack(id, i);
  assert.equal(b.state.phase, 'ready'); assert.equal(b.guidance, 'board');
  r.reset(); assert.equal(r.claimBulkOrder(id), null); assert.equal(b.guidance, null);
  assert.equal(b.boardVisited, false); assert.equal(b.packingVisited, false); assert.equal(b.firstCompleted, false);
  assert.equal(b.state.phase, 'locked'); assert.equal(r.money, 600);
  assert.equal(r.production.inventory.meals, 0); assert.equal(r.production.availablePortions, 0);
  assert.ok(r.purchase('cook', 0)); assert.notEqual(b.state.id, id); assert.equal(r.claimBulkOrder(id), null);
});

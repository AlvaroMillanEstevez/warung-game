import test from 'node:test';
import assert from 'node:assert/strict';
import { Restaurant } from '../src/simulation/Restaurant.ts';
import { BulkOrders } from '../src/simulation/BulkOrders.ts';
import { INTERACTION, BULK_ORDERS } from '../src/config.ts';
import { CASHIER_WORK } from '../src/world/layout.ts';

const make = () => { const r = new Restaurant({ arrivalMs: 1e9 }); r.coins = 5000; r.production.restock(100); return r; };
const buy = (r, id) => assert.ok(r.purchase(id, r.upgradeLevel(id)));
const zone = (r, id) => r.interactionZones.find(z => z.id === id);
// Isolate the withdrawal command's atomic rules; the live packing zone now chooses both operations.
const actionOffer = (r, id, actor = 'player') => {
  if (id !== 'withdraw') return r.offer(zone(r, id), actor);
  const command = { kind: 'withdraw', orderId: r.bulkOrders.state.id, carried: r.production.inventory.meals };
  const reason = r.validate(command, actor);
  return reason ? { command: null, reason } : { command };
};
const command = (r, id, actor = 'player') => {
  const result = actionOffer(r, id, actor); assert.ok(result.command, result.reason); return result.command;
};
const act = (r, id) => { const c = command(r, id); assert.ok(r.beginAction(c)); assert.ok(r.perform(c)); return c; };
const until = (r, condition, max = 180000) => {
  for (let time = 0; !condition() && time < max; time += 20) r.update(20);
  assert.ok(condition(), 'La simulación debe progresar');
};
function cook(r, count, deposit = true) {
  for (let i = 0; i < count; i++) {
    const p = r.production;
    assert.ok(p.perform('take-ingredients')); assert.ok(p.perform('start-cooking'));
    p.update(p.cookingMs); assert.ok(p.perform('take-meal'));
    if (deposit) assert.ok(p.perform('store-meal'));
  }
}
function accept(r) {
  if (!r.staff.get('cook')) buy(r, 'cook');
  const offer = r.bulkOrders.state;
  assert.equal(offer.phase, 'offer'); assert.ok(r.acceptBulkOrder(offer.id)); return offer;
}
function queued(r, intent = 'takeaway') {
  const id = r.admitCustomer(intent); until(r, () => r.customer(id)?.phase === 'queueing'); return id;
}

test('Cajero: primer cocinero obligatorio, precio único, gasto y profesión fija', () => {
  const r = make(), before = r.money;
  assert.equal(r.purchaseState('cashier').problem, 'purchase.firstCook');
  assert.equal(r.purchase('cashier', 0), false); assert.equal(r.money, before);
  buy(r, 'cook'); buy(r, 'cashier');
  assert.equal(r.money, before - 250); assert.equal(r.totalSpent, 250);
  assert.equal(r.purchase('cashier', 0), false); assert.equal(r.purchase('cashier', 1), false);
  assert.equal(r.staff.employees.filter(w => w.role === 'cashier').length, 1);
  assert.equal(r.staff.get('cashier').inventory.capacity('meals'), 0);
  assert.equal(r.validate({ kind: 'production', action: 'take-ingredients' }, 'cashier'), 'reason.cashierRole');
  assert.equal(r.purchase('transport', 0), false); assert.equal(r.staff.get('cashier').inventory.capacity('meals'), 0);
});

test('Caja única: jugador primero conserva operación; cajero andando no reserva', () => {
  const r = make(); cook(r, 2); const id = queued(r);
  buy(r, 'cook'); buy(r, 'cashier');
  const c = command(r, 'checkout'); assert.ok(r.beginAction(c));
  const before = r.pendingCash;
  for (let i = 0; i < 100; i++) r.staff.update(r, 20);
  assert.equal(r.activeReservations.get('checkout'), 'player');
  assert.equal(r.staff.get('cashier').task, null);
  assert.equal(r.beginAction(c, 'cashier'), false);
  assert.ok(r.perform(c)); assert.equal(r.pendingCash, before + 10);
  assert.equal(r.production.availablePortions, 1); assert.ok(r.customer(id).orderId);
  assert.equal(r.perform(c), null); assert.equal(r.perform(c, 'cashier'), null);
  assert.equal(r.pendingCash, before + 10); assert.equal(r.orders.length, 1);
});

test('Cajero primero no se reinicia por jugador; captura 800/600/400 ms y hereda mejoras', () => {
  const r = make(); cook(r, 3); queued(r); queued(r); queued(r);
  buy(r, 'cook'); buy(r, 'cashier');
  until(r, () => r.staff.get('cashier').task?.durationMs === 800);
  const w = r.staff.get('cashier'), task = w.task;
  buy(r, 'actionSpeed'); const before = r.pendingCash;
  assert.equal(task.durationMs, 800); assert.equal(r.teamActionMs, 600);
  for (let i = 0; i < 5; i++) {
    assert.equal(r.offer(zone(r, 'checkout')).command, null);
    assert.equal(r.beginAction(task.command), false);
    assert.equal(w.task, task);
  }
  until(r, () => r.pendingCash > before);
  assert.equal(r.pendingCash, before + 10); assert.equal(r.perform(task.command), null);
  until(r, () => w.task?.durationMs === 600);
  buy(r, 'actionSpeed'); assert.equal(w.task.durationMs, 600);
  until(r, () => w.task?.durationMs === 400);
  assert.equal(INTERACTION.panelDwellMs, 1500);
  const other = make(); buy(other, 'actionSpeed'); buy(other, 'actionSpeed');
  cook(other, 1); queued(other); buy(other, 'cook'); buy(other, 'cashier');
  until(other, () => other.staff.get('cashier').task?.durationMs === 400);
});

test('Caja y retirada compiten por la última ración sin duplicarla; cajero reanuda tras reposición', () => {
  for (const withdrawFirst of [true, false]) {
    const r = make(); cook(r, 1); queued(r); accept(r); buy(r, 'cashier');
    const worker = r.staff.get('cashier'); Object.assign(worker.position, CASHIER_WORK);
    const sale = command(r, 'checkout', 'cashier'), take = command(r, 'withdraw');
    assert.ok(r.beginAction(sale, 'cashier')); assert.ok(r.beginAction(take));
    const before = r.pendingCash;
    if (withdrawFirst) {
      assert.ok(r.perform(take)); assert.equal(r.perform(sale, 'cashier'), null);
      assert.equal(r.pendingCash, before); assert.equal(r.production.inventory.meals, 1);
      assert.equal(r.activeReservations.has('checkout'), false);
      until(r, () => r.pendingCash > before); // Cook naturally replenishes; cashier wakes.
      assert.equal(r.pendingCash, before + 10);
    } else {
      assert.ok(r.perform(sale, 'cashier')); assert.equal(r.perform(take), null);
      assert.equal(r.pendingCash, before + 10); assert.equal(r.production.inventory.meals, 0);
      assert.equal(r.production.availablePortions, 0);
    }
    assert.equal(r.orders.length <= 1, true); assert.ok(r.production.availablePortions >= 0);
  }
});

test('Oferta única: desbloqueo, aceptación idempotente, 90 s activos y espera exacta de 45 s', () => {
  const r = make(); assert.equal(r.bulkOrders.state.phase, 'locked');
  assert.equal(actionOffer(r, 'withdraw').command, null);
  buy(r, 'cook'); assert.equal(r.takeBulkUnlockedNotice(), true); assert.equal(r.takeBulkUnlockedNotice(), false);
  const b = r.bulkOrders, offer = b.state;
  assert.equal(offer.quantity, 4); assert.equal(offer.basePay, 40); assert.equal(offer.bonusPay, 20);
  b.update(1e7, 10, () => 0); assert.deepEqual(b.state, offer);
  assert.equal(r.acceptBulkOrder(offer.id + 1), false); assert.ok(r.acceptBulkOrder(offer.id));
  assert.equal(r.acceptBulkOrder(offer.id), false); assert.equal(b.unlock(10), false);
  b.update(89999, 10, () => 0); assert.equal(b.state.bonusRemainingMs, 1);
  b.update(1, 10, () => 0); assert.equal(b.state.bonusRemainingMs, 0); assert.equal(b.state.phase, 'active');
  assert.ok(r.cancelBulkOrder(offer.id));
  b.update(44999, 10, () => .5); assert.equal(b.state.phase, 'waiting');
  b.update(1, 10, () => .5); assert.equal(b.state.quantity, 4);
  assert.equal(r.acceptBulkOrder(offer.id), false);
  const model = new BulkOrders(); model.unlock(10);
  for (const quantity of [4, 6, 9, 6, 9, 6]) {
    const current = model.state;
    assert.equal(current.quantity, quantity); assert.equal(current.basePay, quantity * 10);
    assert.equal(current.bonusPay, quantity * 5);
    assert.ok(model.accept(current.id)); assert.equal(model.claim(current.id), null);
    for (let i=0;i<quantity;i++) assert.ok(model.pack(current.id,i));
    assert.ok(model.claim(current.id)); assert.equal(model.claim(current.id), null);
    model.update(BULK_ORDERS.nextOfferMs + 1e6, 10, () => 0);
    assert.equal(model.state.phase,'offer');
  }
  model.reset(); model.unlock(10); assert.equal(model.state.quantity,4);
  assert.ok(model.state.id>offer.id);
});

test('Retirada: una unidad, límite pendiente menos carga, capacidades independientes y sin cobro', () => {
  const r = make(); cook(r, 12); const before = r.production.availablePortions;
  assert.equal(actionOffer(r, 'withdraw').command, null);
  accept(r); const money = r.money, inventory = r.production.playerInventory;
  inventory.change('ingredients', 8); inventory.change('waste', 8);
  for (let i = 0; i < 4; i++) {
    const c = act(r, 'withdraw'); assert.equal(r.perform(c), null);
    assert.equal(inventory.count('meals'), i + 1);
  }
  assert.equal(r.production.availablePortions, before - 4); assert.equal(r.money, money);
  assert.equal(actionOffer(r, 'withdraw').reason, 'bulk.enoughCarried');
  act(r, 'packing'); assert.equal(actionOffer(r, 'withdraw').reason, 'bulk.enoughCarried');
  assert.equal(inventory.count('ingredients'), 8); assert.equal(inventory.count('waste'), 8);
  r.cancelBulkOrder(r.bulkOrders.state.id);
  r.bulkOrders.update(45000, 10, () => 0);
  // Advance two completed introductory offers in the model to isolate the nine-portion capacity case.
  for (let n=0;n<2;n++) {
    const b=r.bulkOrders, order=b.state; b.accept(order.id);
    for(let i=0;i<order.quantity;i++) b.pack(order.id,i);
    b.claim(order.id); b.update(45000,10,()=>0);
  }
  accept(r); assert.equal(r.bulkOrders.state.quantity,9);
  while (inventory.count('meals') < 8) act(r, 'withdraw');
  assert.equal(actionOffer(r, 'withdraw').reason, 'reason.mealsFull');
});

test('Empaquetado manual: un plato por ciclo, sobrantes conservados, pago y objetivo una sola vez', () => {
  const r = make(); const order = accept(r); cook(r, 8, false);
  const inv = r.production.playerInventory; inv.change('ingredients', 8); inv.change('waste', 8);
  const before = r.money, spent = r.totalSpent;
  let last;
  for (let i = 0; i < 4; i++) {
    last = act(r, 'packing'); assert.equal(r.perform(last), null);
    assert.equal(inv.count('meals'), 7 - i);
    if (i < 3) assert.equal(r.money, before);
  }
  assert.equal(r.money, before); assert.equal(r.bulkOrders.state.phase, 'ready');
  assert.equal(r.bulkOrders.firstCompleted, false); assert.equal(r.bulkOrders.guidance, 'board');
  r.bulkOrders.update(1e6, 10, () => 0); // Walking back never erodes an earned bonus.
  assert.equal(r.bulkOrders.state.phase, 'ready');
  assert.equal(r.claimBulkOrder(order.id + 1), null);
  assert.ok(r.claimBulkOrder(order.id)); assert.equal(r.claimBulkOrder(order.id), null);
  assert.equal(r.money, before + order.basePay + order.bonusPay);
  assert.equal(r.totalSpent, spent); assert.equal(r.production.availablePortions, 0);
  assert.equal(r.bulkOrders.firstCompleted, true); assert.equal(r.bulkOrders.state.phase, 'waiting');
  assert.equal(r.offer(zone(r, 'packing')).command, null); assert.equal(r.cancelBulkOrder(order.id), false);
  assert.equal(inv.count('ingredients'), 8); assert.equal(inv.count('waste'), 8);
});

test('Sin bonificación se conserva comida y solo se abona la base al terminar', () => {
  const r = make(); accept(r); cook(r, 4, false); act(r, 'packing');
  const before = r.money;
  r.bulkOrders.update(90000, 10, () => 0);
  assert.equal(r.bulkOrders.state.packed, 1); assert.equal(r.production.inventory.meals, 3);
  for (let i = 0; i < 3; i++) act(r, 'packing');
  assert.equal(r.money, before); assert.equal(r.bulkOrders.state.phase, 'ready');
  assert.ok(r.claimBulkOrder(r.bulkOrders.state.id));
  assert.equal(r.money, before + 40); assert.equal(r.bulkOrders.firstCompleted, true);
});

test('Cancelar devuelve exactamente lo empaquetado una vez; conserva carga y saldo, invalida comandos', () => {
  const r = make(); const order = accept(r); cook(r, 6, false);
  act(r, 'packing'); act(r, 'packing');
  const old = command(r, 'packing'), before = r.money;
  assert.ok(r.beginAction(old)); assert.ok(r.cancelBulkOrder(order.id));
  assert.equal(r.production.availablePortions, 2); assert.equal(r.production.inventory.meals, 4);
  assert.equal(r.cancelBulkOrder(order.id), false); assert.equal(r.perform(old), null);
  assert.equal(r.production.availablePortions, 2); assert.equal(r.money, before);
  assert.equal(r.bulkOrders.firstCompleted, false);
  assert.deepEqual(r.bulkOrders.state, { phase: 'waiting', remainingMs: 45000 });
});

test('DEV reinicia cajero, operación, encargos, comida y objetivo; identificadores anteriores caducan', () => {
  const r = make(); cook(r, 2); queued(r); const oldOrder = accept(r); buy(r, 'cashier');
  act(r, 'withdraw'); const pack = act(r, 'packing');
  Object.assign(r.staff.get('cashier').position, CASHIER_WORK);
  const sale = command(r, 'checkout', 'cashier'); assert.ok(r.beginAction(sale, 'cashier'));
  r.reset();
  assert.equal(r.bulkOrders.state.phase, 'locked'); assert.equal(r.bulkOrders.firstCompleted, false);
  assert.equal(r.staff.employees.length, 0); assert.equal(r.activeReservations.size, 0);
  assert.equal(r.reservedProduction, 0); assert.equal(r.production.availablePortions, 0);
  assert.equal(r.production.inventory.meals, 0); assert.equal(r.money, 30); assert.equal(r.totalSpent, 0);
  assert.equal(r.perform(pack), null); assert.equal(r.perform(sale, 'cashier'), null);
  r.coins = 100; buy(r, 'cook'); assert.notEqual(r.bulkOrders.state.id, oldOrder.id);
  assert.equal(r.acceptBulkOrder(oldOrder.id), false); assert.equal(r.cancelBulkOrder(oldOrder.id), false);
  const b = new BulkOrders(); b.unlock(10); const id = b.state.id; b.accept(id);
  for (let i = 0; i < 4; i++) b.pack(id, i);
  assert.equal(b.firstCompleted, false); assert.ok(b.claim(id));
  assert.equal(b.firstCompleted, true); b.reset(); assert.equal(b.firstCompleted, false);
});

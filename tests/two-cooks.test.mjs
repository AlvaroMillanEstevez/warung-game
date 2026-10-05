import test from 'node:test';
import assert from 'node:assert/strict';
import { Restaurant } from '../src/simulation/Restaurant.ts';
import { INTERACTION, STAFF, UPGRADES } from '../src/config.ts';
import { OFFICE } from '../src/world/layout.ts';
import { canStand } from '../src/world/collision.ts';
import { findPath } from '../src/world/navigation.ts';
import { canInteract } from '../src/world/interaction.ts';

const buy = (r, id) => assert.ok(r.purchase(id, r.upgradeLevel(id)), r.purchaseState(id).problem);
const make = () => {
  const r = new Restaurant(); r.coins = 5000;
  buy(r, 'cook'); buy(r, 'stove'); buy(r, 'cook');
  return r; // No player movement: no automatic arrivals during isolated production tests.
};
const load = (stoveId, slotIndex = 0) => ({ kind: 'production', action: 'start-cooking', stoveId, slotIndex });
function until(r, condition, limit = 240000) {
  for (let t = 0; !condition() && t < limit; t += 50) r.update(50);
  assert.ok(condition(), 'El circuito debe progresar');
}

test('Segundo cocinero: requisito operativo, precio, descuento único, máximo dos y capacidad heredada', () => {
  const r = new Restaurant(); r.coins = 5000;
  buy(r, 'transport'); buy(r, 'actionSpeed'); buy(r, 'cook');
  const before = r.money, spent = r.totalSpent;
  assert.equal(r.purchaseState('cook').problem, 'purchase.secondCook');
  assert.equal(r.purchaseState('cook').price, 220);
  assert.equal(r.purchase('cook', 1), false);
  assert.equal(r.money, before); assert.equal(r.totalSpent, spent);
  r.levels.stove = 1; // A level without an installed production stove is insufficient.
  assert.equal(r.purchase('cook', 1), false); r.levels.stove = 0;
  buy(r, 'stove'); buy(r, 'cook');
  assert.equal(r.money, before - 180 - 220); assert.equal(r.totalSpent, spent + 400);
  assert.equal(r.purchase('cook', 1), false); assert.equal(r.purchase('cook', 2), false);
  assert.equal(r.purchaseState('cook').problem, 'limit.cooks');
  for (const worker of r.staff.employees) {
    assert.equal(worker.role, 'cook');
    assert.deepEqual(worker.inventory.state.limits, { ingredients: 12, meals: 12 });
  }
  buy(r, 'transport'); buy(r, 'actionSpeed');
  until(r, () => r.staff.employees.every(w => w.task?.durationMs === 900));
  for (const worker of r.staff.employees) assert.deepEqual(worker.inventory.state.limits, { ingredients: 16, meals: 16 });
  assert.deepEqual(r.staff.employees.map(w => w.assignedStove), ['stove', 'stove-2']);
});

test('Contratar el segundo reasigna sin teletransporte y libera una carga del primer cocinero en el otro hornillo', () => {
  const r = new Restaurant(); r.coins = 5000; buy(r, 'stove'); buy(r, 'cook');
  const w = r.staff.get('cook');
  w.position = { x: 470, y: 288 }; w.inventory.change('ingredients', 2);
  r.update(50); assert.equal(w.task.command.stoveId, 'stove-2');
  const position = { ...w.position };
  assert.equal(r.reservedProduction, 1);
  buy(r, 'cook');
  assert.deepEqual(w.position, position); assert.equal(w.task, null);
  assert.equal(r.reservedProduction, 0); assert.equal(r.activeReservations.size, 0);
  assert.ok(r.validate(load('stove-2'), 'cook')); assert.ok(r.validate(load('stove'), 'cook-2'));
  until(r, () => w.task?.command.action === 'start-cooking');
  assert.equal(w.task.command.stoveId, 'stove');
});

test('Última capacidad compartida se reserva durante el viaje y se libera al cancelar o invalidarse', () => {
  const r = make(), p = r.production;
  p.stock = 11;
  for (const w of r.staff.employees) w.inventory.change('ingredients', 2);
  assert.ok(r.beginAction(load('stove'), 'cook'));
  assert.equal(r.reservedProduction, 1); assert.equal(r.committedProduction, 12);
  assert.equal(r.beginAction(load('stove-2'), 'cook-2'), false);
  r.staff.cancel('cook', r);
  assert.equal(r.reservedProduction, 0); assert.ok(r.beginAction(load('stove-2'), 'cook-2'));
  assert.ok(r.perform(load('stove-2'), 'cook-2'));
  assert.equal(r.reservedProduction, 0); assert.equal(r.committedProduction, 12);
  until(r, () => p.availablePortions === 12);
  p.sellAvailable();
  until(r, () => r.reservedProduction === 1);
  const w = r.staff.employees.find(w => w.task?.command.action === 'start-cooking');
  const ingredients = w.inventory.count('ingredients');
  p.playerInventory.change('meals', 1); r.perform({ kind: 'production', action: 'store-meal' });
  r.update(50);
  assert.equal(w.inventory.count('ingredients'), ingredients);
  assert.equal(r.reservedProduction, 0); assert.equal(r.activeReservations.size, 0);
  // A later sale must recover, with no orphan capacity.
  p.sellAvailable(); until(r, () => p.availablePortions === 12);
});

test('Cuenta stock, platos de ambos cocineros, cocina/listos y reservas una sola vez; materias primas no cuentan', () => {
  const r = make(), p = r.production, a = r.staff.get('cook'), b = r.staff.get('cook-2');
  p.stock = 4; a.inventory.change('meals', 2); b.inventory.change('meals', 2);
  a.inventory.change('ingredients', 8); b.inventory.change('ingredients', 8);
  p.playerInventory.change('ingredients', 2);
  r.perform(load('stove', 1)); p.update(4000); r.perform(load('stove-2', 1));
  assert.equal(r.committedProduction, 10);
  assert.ok(r.beginAction(load('stove'), 'cook')); assert.ok(r.beginAction(load('stove-2'), 'cook-2'));
  assert.equal(r.committedProduction, 12); assert.equal(r.reservedProduction, 2);
  assert.ok(r.perform(load('stove'), 'cook')); assert.equal(r.committedProduction, 12);
  assert.ok(r.perform(load('stove-2'), 'cook-2')); assert.equal(r.committedProduction, 12);
  until(r, () => p.availablePortions === 12);
  assert.equal(r.committedProduction, 12); assert.equal(r.reservedProduction, 0);
  assert.ok(r.staff.employees.every(w => w.inventory.count('meals') === 0));
});

test('Dos circuitos simultáneos, seis mesas, depósitos parciales y reanudación tras ventas sin superar 12', () => {
  const r = make();
  for (let i = 0; i < 4; i++) buy(r, 'tables');
  const completed = new Map(r.staff.employees.map(w => [w.id, new Set()]));
  const deposits = new Set(); let simultaneous = false;
  const observe = ms => {
    for (let t = 0; t < ms; t += 50) {
      const before = r.staff.employees.map(w => ({ w, position: { ...w.position }, task: w.task,
        ingredients: w.inventory.count('ingredients'), meals: w.inventory.count('meals') }));
      r.update(50);
      assert.ok(r.committedProduction <= STAFF.cookStockTarget);
      simultaneous ||= r.production.stoveIds.every(id => r.production.slotsFor(id).some(s => s.status === 'cooking'));
      for (const { w, position, task, ingredients, meals } of before) {
        assert.ok(canStand(w.position, r.obstacles));
        assert.ok(Math.hypot(w.position.x - position.x, w.position.y - position.y) <= STAFF.speed * .05 + 1e-6);
        if (w.task?.command.stoveId) assert.equal(w.task.command.stoveId, w.assignedStove);
        if (ingredients !== w.inventory.count('ingredients') || meals !== w.inventory.count('meals')) {
          assert.ok(task); completed.get(w.id).add(task.command.action);
          assert.ok(Math.hypot(w.position.x - task.destination.x, w.position.y - task.destination.y) < .1);
          if (task.command.action === 'store-meal' && meals < w.inventory.capacity('meals')) deposits.add(w.id);
        }
      }
    }
  };
  observe(180000);
  assert.ok(simultaneous); assert.equal(deposits.size, 2);
  for (const actions of completed.values()) assert.deepEqual([...actions].sort(),
    ['take-ingredients', 'start-cooking', 'take-meal', 'store-meal'].sort());
  assert.equal(r.production.availablePortions, 12); assert.equal(r.activeReservations.size, 0);
  for (const set of completed.values()) set.clear();
  for (let i = 0; i < 8; i++) assert.ok(r.production.sellAvailable());
  observe(180000);
  assert.equal(r.production.availablePortions, 12);
  for (const actions of completed.values()) assert.ok(actions.has('start-cooking') && actions.has('store-meal'));
});

test('Jugador colabora en ambos hornillos, no duplica raciones y puede superar el objetivo', () => {
  const r = make(), p = r.production; p.stock = 10;
  for (const w of r.staff.employees) w.inventory.change('ingredients', 1);
  assert.ok(r.beginAction(load('stove'), 'cook')); assert.ok(r.beginAction(load('stove-2'), 'cook-2'));
  p.playerInventory.change('ingredients', 4);
  assert.equal(r.beginAction(load('stove')), false);
  assert.ok(r.beginAction(load('stove', 1))); assert.ok(r.perform(load('stove', 1)));
  // Completion revalidates against the player's additional production.
  assert.equal(r.perform(load('stove'), 'cook'), null);
  assert.equal(r.reservedProduction, 1);
  assert.ok(r.perform(load('stove-2'), 'cook-2'));
  assert.equal(r.committedProduction, 12);
  for (const stoveId of p.stoveIds) assert.ok(r.perform(load(stoveId, 2)));
  until(r, () => p.availablePortions === 14);
  assert.equal(p.stoveSummary.empty, 8); assert.equal(r.reservedProduction, 0);
});

test('Invalidez, ruta imposible y reset liberan cargas de ambos cocineros y sus referencias', () => {
  const r = make();
  for (const w of r.staff.employees) w.inventory.change('ingredients', 1);
  r.update(50); assert.equal(r.reservedProduction, 2);
  for (const w of r.staff.employees) w.inventory.change('ingredients', -1);
  r.update(50); assert.equal(r.reservedProduction, 0);
  for (const w of r.staff.employees) {
    r.staff.cancel(w.id, r); w.inventory.change('ingredients', 1); w.position = { x: -100, y: -100 };
  }
  r.update(50); assert.equal(r.reservedProduction, 0); assert.equal(r.activeReservations.size, 0);
  r.reset();
  assert.equal(r.staff.employees.length, 0); assert.equal(r.committedProduction, 0);
  assert.equal(r.reservedProduction, 0); assert.equal(r.totalSpent, 0); assert.equal(r.demandFrequency, .8);
  assert.deepEqual(r.production.stoveIds, ['stove']); assert.equal(r.arrivalsStarted, false);
  assert.equal(r.purchaseState('cook').price, UPGRADES.cook.prices[0]);
});

test('Oficina integrada: antigua huella libre, alfombra accesible y zona sin solapamientos', () => {
  const r = make(); for (let i = 0; i < 4; i++) buy(r, 'tables');
  const office = r.interactionZones.find(z => z.id === 'office');
  assert.equal(r.stations.some(s => s.id === 'office'), false);
  assert.ok(canStand({ x: 135, y: 445 }, r.obstacles));
  assert.ok(canInteract(OFFICE.interaction, office, r.obstacles));
  for (const zone of r.interactionZones.filter(z => z.id !== 'office')) {
    assert.ok(Math.hypot(zone.position.x - OFFICE.interaction.x, zone.position.y - OFFICE.interaction.y) > 2 * INTERACTION.radius);
    assert.ok(findPath(OFFICE.interaction, zone.position, r.routingObstacles));
  }
});

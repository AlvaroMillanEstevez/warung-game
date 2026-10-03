import test from 'node:test';
import assert from 'node:assert/strict';
import { Production } from '../src/simulation/Production.ts';
import { DwellInteraction } from '../src/simulation/DwellInteraction.ts';

function cookOne(p) {
  assert.ok(p.perform('take-ingredients'));
  assert.ok(p.perform('start-cooking'));
  p.update(p.cookingMs);
  assert.ok(p.perform('take-meal'));
}
test('Ocho ingredientes con ocho ciclos completos sin salir; lleno espera sin progreso', () => {
  const p = new Production(), dwell = new DwellInteraction();
  for (let i = 1; i <= 8; i++) {
    const target = { id: 'fridge', action: p.availableAt('fridge').action };
    assert.equal(dwell.update(target, ['fridge'], false, 1499), null);
    assert.ok(p.perform(dwell.update(target, ['fridge'], false, 1)));
    assert.equal(p.inventory.ingredients, i);
  }
  assert.equal(p.perform('take-ingredients'), null);
  assert.equal(dwell.update({ id: 'fridge', action: p.availableAt('fridge').action }, ['fridge'], false, 10000), null);
  assert.equal(dwell.progress, 0);
});
test('Cuatro posiciones con tiempos independientes; lista sigue ocupada hasta recoger', () => {
  const p = new Production();
  for (let i = 0; i < 4; i++) p.perform('take-ingredients');
  for (let i = 0; i < 4; i++) {
    assert.ok(p.perform('start-cooking'));
    p.update(1000);
  }
  assert.deepEqual(p.stove, [{ status: 'ready' }, { status: 'cooking', elapsedMs: 3000, durationMs: 4000 },
    { status: 'cooking', elapsedMs: 2000, durationMs: 4000 }, { status: 'cooking', elapsedMs: 1000, durationMs: 4000 }]);
  p.perform('take-ingredients');
  assert.equal(p.perform('start-cooking', 0), null);
  assert.equal(p.perform('take-meal', 1), null);
  assert.ok(p.perform('take-meal', 0));
  assert.equal(p.perform('take-meal', 0), null);
  assert.ok(p.perform('start-cooking', 0));
  assert.equal(p.inventory.ingredients, 0);
  p.update(3000);
  assert.deepEqual(p.stoveSummary, { cooking: 1, ready: 3, empty: 0 });
});
test('Prioriza recogida, después carga; cargar con platos llenos y posición vacía es válido', () => {
  const p = new Production();
  for (let i = 0; i < 8; i++) cookOne(p);
  p.perform('take-ingredients');
  assert.equal(p.availableAt('stove').action, 'start-cooking');
  p.perform('start-cooking'); p.update(4000);
  p.perform('take-ingredients');
  assert.equal(p.availableAt('stove').action, 'start-cooking');
  p.perform('store-meal');
  assert.equal(p.availableAt('stove').action, 'take-meal');
  p.perform('take-meal');
  assert.equal(p.availableAt('stove').action, 'start-cooking');
  assert.equal(p.inventory.meals, 8);
});
test('Capacidades independientes de ingredientes, platos y residuos sin distinciones de pedido', () => {
  const p = new Production();
  for (let i = 0; i < 8; i++) cookOne(p);
  for (let i = 0; i < 8; i++) { p.perform('take-ingredients'); assert.ok(p.collectWaste()); }
  assert.deepEqual(p.inventory, { ingredients: 8, meals: 8, waste: 8, limits: p.limits });
  assert.equal(p.collectWaste(), false); assert.equal(p.perform('take-ingredients'), null);
  p.perform('start-cooking'); p.update(4000);
  assert.equal(p.perform('take-meal'), null);
  p.perform('store-meal');
  assert.ok(p.perform('take-meal')); assert.equal(p.inventory.meals, 8);
});
test('Mostrador sin límite; papelera solo residuos y venta descuenta una ración', () => {
  const p = new Production();
  for (let i = 0; i < 12; i++) { cookOne(p); assert.ok(p.perform('store-meal')); }
  assert.equal(p.availablePortions, 12); assert.equal(p.perform('store-meal'), null);
  cookOne(p); p.perform('take-ingredients');
  for (let i = 0; i < 4; i++) p.collectWaste();
  const before = p.inventory;
  for (let i = 0; i < 4; i++) assert.ok(p.perform('discard'));
  assert.equal(p.perform('discard'), null); assert.deepEqual(p.inventory, { ...before, waste: 0 });
  for (let i = 0; i < 12; i++) assert.ok(p.sellAvailable());
  assert.equal(p.sellAvailable(), false); assert.equal(p.availablePortions, 0);
  assert.deepEqual(p.inventory, { ...before, waste: 0 });
});
test('Los límites y el tiempo son configurables y el reinicio vacía toda la producción', () => {
  const p = new Production({ inventory: { ingredients: 2, meals: 1, waste: 3 }, stoveSlots: 2, cookingMs: 500 });
  cookOne(p); p.perform('store-meal'); cookOne(p);
  p.perform('take-ingredients'); p.perform('start-cooking'); p.collectWaste();
  p.reset(); p.update(10000);
  assert.deepEqual(p.inventory, { ingredients: 0, meals: 0, waste: 0, limits: p.limits });
  assert.deepEqual(p.stoveSummary, { empty: 2, cooking: 0, ready: 0 });
  assert.equal(p.availablePortions, 0);
});
test('Hornillo encadena carga y recogida quieto; cada acción requiere un ciclo nuevo', () => {
  const p = new Production(), dwell = new DwellInteraction();
  for (let i = 0; i < 4; i++) p.perform('take-ingredients');
  let pending = null, transfers = 0;
  for (let time = 0; time < 30000; time += 50) {
    p.update(50);
    if (!pending) { const offer = p.availableAt('stove'); if (offer.action) pending = offer; }
    const action = pending ? JSON.stringify(pending) : null;
    const done = dwell.update({ id: 'stove', action }, ['stove'], false, 50);
    if (done) { assert.ok(p.perform(pending.action, pending.slotIndex)); pending = null; transfers++; }
  }
  assert.equal(transfers, 8);
  assert.equal(p.inventory.meals, 4);
  assert.equal(p.inventory.ingredients, 0);
  assert.equal(dwell.progress, 0);
  assert.deepEqual(p.stoveSummary, { empty: 4, ready: 0, cooking: 0 });
});
test('Movimiento, salida, cambio de objetivo, invalidez y foco descartan progreso', () => {
  const target = { id: 'checkout', action: 'customer-1' };
  for (const mode of ['move', 'leave', 'target', 'invalid', 'focus', 'reset']) {
    const d = new DwellInteraction();
    d.update(target, ['checkout'], false, 1400);
    if (mode === 'move') d.update(target, ['checkout'], true, 5000);
    if (mode === 'leave') d.update(target, [], false, 5000);
    if (mode === 'target') d.update({ ...target, action: 'customer-2' }, ['checkout'], false, 0);
    if (mode === 'invalid') d.update({ ...target, action: null }, ['checkout'], false, 5000);
    if (mode === 'focus') d.cancel();
    if (mode === 'reset') d.reset();
    assert.equal(d.progress, 0);
    assert.equal(d.update(target, ['checkout'], false, 1499), null);
    assert.equal(d.update(target, ['checkout'], false, 1), target.action);
    assert.equal(d.update(target, ['checkout'], false, 1499), null);
  }
});
test('Espera sin acción no acumula tiempo y un delta enorme nunca ejecuta más de una unidad', () => {
  const d = new DwellInteraction();
  d.update({ id: 'checkout', action: null }, ['checkout'], false, 90000);
  const target = { id: 'checkout', action: 'customer-1' };
  assert.equal(d.update(target, ['checkout'], false, 1499), null);
  assert.equal(d.update(target, ['checkout'], false, 1), target.action);
  assert.equal(d.update(target, ['checkout'], false, 90000), target.action);
  assert.equal(d.progress, 0);
  assert.equal(d.update(target, ['checkout'], false, 0), null);
});

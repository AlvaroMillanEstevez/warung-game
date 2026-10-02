import test from 'node:test';
import assert from 'node:assert/strict';
import { Production } from '../src/simulation/Production.ts';
import { DwellInteraction } from '../src/simulation/DwellInteraction.ts';

function cookOne(production) {
  assert.ok(production.perform('take-ingredients'));
  assert.ok(production.perform('start-cooking'));
  production.update(production.cookingMs);
  assert.ok(production.perform('take-meal'));
}

test('Una sola unidad: el frigorífico no duplica ni sustituye la carga', () => {
  const p = new Production();
  assert.ok(p.perform('take-ingredients'));
  assert.equal(p.perform('take-ingredients'), null);
  assert.equal(p.carried, 'ingredients');
  assert.equal(p.perform('store-meal'), null);
  assert.equal(p.carried, 'ingredients');
});

test('La cocción transfiere una vez, no permite recogida temprana ni carga sobre un hornillo ocupado', () => {
  const p = new Production();
  p.perform('take-ingredients');
  p.perform('start-cooking');
  assert.equal(p.carried, null);
  assert.equal(p.perform('start-cooking'), null);
  p.update(p.cookingMs - 1);
  assert.equal(p.perform('take-meal'), null);
  p.perform('take-ingredients');
  assert.equal(p.perform('start-cooking'), null);
  p.update(1);
  assert.equal(p.stove.status, 'ready');
  assert.equal(p.perform('take-meal'), null);
  p.perform('discard');
  assert.ok(p.perform('take-meal'));
  assert.equal(p.stove.status, 'empty');
  assert.equal(p.carried, 'meal');
  assert.equal(p.perform('take-meal'), null);
});

test('Mostrador lleno: conserva la ración; no duplica al depositar ni descartar', () => {
  const p = new Production();
  for (let i = 0; i < p.capacity; i++) {
    cookOne(p);
    assert.ok(p.perform('store-meal'));
    assert.equal(p.perform('store-meal'), null);
    assert.equal(p.portions, i + 1);
    assert.equal(p.carried, null);
  }
  cookOne(p);
  assert.equal(p.perform('store-meal'), null);
  assert.equal(p.carried, 'meal');
  assert.equal(p.portions, p.capacity);
  assert.equal(p.complete, true);
  assert.ok(p.perform('discard'));
  assert.equal(p.perform('discard'), null);
});

test('Un comando seleccionado antes se revalida si el destino cambia', () => {
  const p = new Production(1);
  cookOne(p);
  const command = p.availableAt('counter').action;
  p.perform('discard');
  assert.equal(p.perform(command), null);
  assert.equal(p.portions, 0);
});

test('Reiniciar limpia carga, cocción, existencias y marca de finalización', () => {
  const p = new Production(1);
  cookOne(p); p.perform('store-meal'); p.perform('take-ingredients'); p.perform('start-cooking');
  p.reset();
  assert.equal(p.carried, null);
  assert.equal(p.stove.status, 'empty');
  assert.equal(p.portions, 0);
  assert.equal(p.complete, false);
  p.update(10000);
  assert.equal(p.stove.status, 'empty');
});

test('Permanecer sobre el hornillo no encadena carga y recogida, tampoco tras pausar o cambiar selección', () => {
  const p = new Production();
  const dwell = new DwellInteraction();
  const load = { id: 'stove', action: 'start-cooking' };
  p.perform('take-ingredients');
  const command = dwell.update(load, ['stove'], false, 1500);
  p.perform(command);
  p.update(4000);
  const collect = { id: 'stove', action: 'take-meal' };
  assert.equal(dwell.update(collect, ['stove'], false, 5000), null);
  dwell.cancel();
  assert.equal(dwell.update(null, ['stove'], false, 0), null);
  assert.equal(dwell.update(collect, ['stove'], false, 1500), null);
  assert.equal(p.carried, null);
  dwell.update(null, [], true, 16);
  assert.equal(dwell.update(collect, ['stove'], false, 1499), null);
  assert.equal(dwell.update(collect, ['stove'], false, 1), 'take-meal');
  assert.ok(p.perform('take-meal'));
  assert.equal(dwell.update(collect, ['stove'], false, 5000), null);
});

test('Intentar moverse cancela aunque la posición física no cambie (mueble o teclas opuestas)', () => {
  const dwell = new DwellInteraction();
  const target = { id: 'fridge', action: 'take-ingredients' };
  dwell.update(target, ['fridge'], false, 1400);
  assert.ok(dwell.progress > 0.9);
  dwell.update(target, ['fridge'], true, 1000);
  assert.equal(dwell.progress, 0);
  assert.equal(dwell.update(target, ['fridge'], false, 1499), null);
  assert.equal(dwell.update(target, ['fridge'], false, 1), 'take-ingredients');
});

test('Salir, cambiar estación o perder una condición válida reinicia los 1,5 segundos', () => {
  const target = { id: 'fridge', action: 'take-ingredients' };
  for (const interrupted of [null, { id: 'other', action: 'take-ingredients' }, { id: 'fridge', action: null }]) {
    const dwell = new DwellInteraction();
    dwell.update(target, ['fridge'], false, 1400);
    dwell.update(interrupted, ['fridge'], false, 0);
    assert.equal(dwell.update(target, ['fridge'], false, 100), null);
    assert.ok(dwell.progress < 0.1);
  }
});

test('Cancelar por foco elimina progreso parcial, sin acumular tiempo de fondo', () => {
  const dwell = new DwellInteraction();
  const target = { id: 'fridge', action: 'take-ingredients' };
  dwell.update(target, ['fridge'], false, 1400);
  dwell.cancel();
  assert.equal(dwell.progress, 0);
  assert.equal(dwell.update(target, ['fridge'], false, 100), null);
  const p = new Production();
  p.perform('take-ingredients'); p.perform('start-cooking');
  p.update(1000);
  assert.equal(p.cookingProgress, 0.25);
  p.update(0); // Scene passes no hidden time.
  assert.equal(p.cookingProgress, 0.25);
});

test('El reinicio de la prueba libera también el bloqueo de permanencia', () => {
  const dwell = new DwellInteraction();
  const target = { id: 'fridge', action: 'take-ingredients' };
  dwell.update(target, ['fridge'], false, 1500);
  dwell.reset();
  assert.equal(dwell.needsExit('fridge'), false);
  assert.equal(dwell.update(target, ['fridge'], false, 1500), 'take-ingredients');
});

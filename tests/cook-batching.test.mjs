import test from 'node:test';
import assert from 'node:assert/strict';
import { Restaurant } from '../src/simulation/Restaurant.ts';
import { STAFF } from '../src/config.ts';

const make = (two = false) => {
  const r = new Restaurant({}, () => 0, 10000); r.production.restock(1000);
  for (const id of ['cook', ...(two ? ['stove', 'cook'] : []), 'actionSpeed', 'actionSpeed', 'stoveSpeed', 'stoveSpeed'])
    assert.ok(r.purchase(id, r.upgradeLevel(id)), id);
  return r;
};
const placeAtStove = (r, id) => {
  const w = r.staff.get(id); w.position = {...r.interactionZones.find(z => z.id === (w.assignedStove ?? 'stove')).position};
  return w;
};

test('Cocinero no sale con el primer plato mientras otra ración de su hornillo está cocinándose', () => {
  const r = make(true), w = placeAtStove(r, 'cook');
  r.staff.get('cook-2').retryMs = 100000;
  w.inventory.change('ingredients', 2);
  const load = index => ({kind:'production',action:'start-cooking',stoveId:'stove',slotIndex:index});
  assert.ok(r.perform(load(0),'cook')); r.production.update(1000);
  assert.ok(r.perform(load(1),'cook')); r.production.update(1000);
  for (let i=0;i<9;i++) r.update(50);
  assert.equal(w.inventory.count('meals'),1);
  assert.equal(w.task?.command.action === 'store-meal',false);
  assert.equal(w.route.length,0);
  assert.deepEqual(w.position,r.interactionZones.find(z=>z.id==='stove').position);
  for(let t=0;t<10000 && r.production.availablePortions<2;t+=50) r.update(50);
  assert.equal(r.production.availablePortions,2); assert.equal(w.inventory.count('meals'),0);
});

test('Depositar descarga la tanda completa aunque aparezca otro plato listo durante el depósito', () => {
  const r=make(), w=r.staff.get('cook');
  w.position={...r.interactionZones.find(z=>z.id==='deposit').position};
  w.inventory.change('meals',3);
  w.inventory.change('ingredients',1);
  assert.ok(r.perform({kind:'production',action:'start-cooking',stoveId:'stove',slotIndex:0},'cook'));
  r.production.update(2000);
  for(let t=0;t<1500;t+=50) r.update(50);
  assert.equal(r.production.availablePortions,3); assert.equal(w.inventory.count('meals'),0);
  assert.equal(r.production.slotsFor('stove')[0].status,'ready');
});

test('Dos cocineros con demanda sostenida reúnen tandas, conservan asignación y no exceden objetivo 12', () => {
  const r=make(true), batches={cook:[], 'cook-2':[]}, previous=new Map();
  for(let t=0;t<180000;t+=50) {
    // Immediate consumers isolate production throughput from physical queue travel.
    r.production.sellAvailable();
    r.update(50);
    assert.ok(r.committedProduction<=STAFF.cookStockTarget);
    for(const w of r.staff.employees) {
      const action=w.task?.command.action;
      if(w.task?.command.stoveId) assert.equal(w.task.command.stoveId,w.assignedStove);
      if(!action) continue;
      if(action==='store-meal' && previous.get(w.id)!=='store-meal') batches[w.id].push(w.inventory.count('meals'));
      previous.set(w.id,action);
    }
  }
  for(const counts of Object.values(batches)) {
    assert.ok(counts.length>=4);
    assert.ok(counts.every(count=>count>=3),JSON.stringify(batches));
  }
  r.reset(); assert.equal(r.activeReservations.size,0); assert.equal(r.reservedProduction,0);
});

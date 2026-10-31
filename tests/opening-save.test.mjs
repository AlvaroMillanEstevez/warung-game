import test from 'node:test';
import assert from 'node:assert/strict';
import { Restaurant } from '../src/simulation/Restaurant.ts';
import { BUILD_POINTS, nextBuild } from '../src/simulation/Opening.ts';
import { LocalSave, decodeSave, SAVE_KEY, DEV_SAVE_KEY } from '../src/persistence/Save.ts';
import { PLAYER } from '../src/config.ts';
const normal=()=>new Restaurant({},()=>.9,0,'opening');
const build=r=>{for(const id of ['repair','fridge','stove','counter'])assert.ok(r.construct(id,BUILD_POINTS[id]));};
const act=(r,id)=>{const z=r.interactionZones.find(z=>z.id===id);assert.ok(z,id);const c=r.offer(z).command;assert.ok(c,id);assert.ok(r.beginAction(c));assert.ok(r.perform(c));};
const roundtrip=(r,position=PLAYER.spawn)=>{const raw=JSON.stringify({version:2,player:position,restaurant:r.snapshot()});const data=decodeSave(raw,r.mode);const copy=new Restaurant({},()=>.9,150,r.mode);copy.restore(data.restaurant);return copy;};
const until=(r,condition)=>{for(let n=0;n<5000&&!condition();n++)r.update(50);assert.ok(condition());};

test('Apertura: presupuesto 150, instalaciones secuenciales únicas y sin acciones antes de instalar',()=>{
 let r=normal();assert.equal(r.money,150);assert.equal(r.tables.length,0);assert.equal(r.production.stoveIds.length,0);
 assert.equal(r.purchase('cook',0),false);assert.equal(r.buySupplies('cash'),false);
 assert.equal(r.openBusiness(),false);assert.equal(r.admitCustomer('takeaway'),null);
 assert.equal(r.beginAction({kind:'production',action:'take-ingredients'}),false);
 r.playerMoved(PLAYER.spawn,{x:380,y:735});r.update(100000);assert.equal(r.customers.length,0);assert.equal(r.arrivalsStarted,false);
 for(const id of ['repair','fridge','stove','counter']){
  assert.equal(nextBuild(r.opening),id);const before=r.money;
  assert.equal(r.buildProblem(id,BUILD_POINTS[id]),null);assert.equal(r.money,before); // Cancel is side-effect free.
  assert.ok(r.construct(id,BUILD_POINTS[id]));assert.equal(r.construct(id,BUILD_POINTS[id]),false);
  r=roundtrip(r);assert.equal(r.construct(id,BUILD_POINTS[id]),false);
 }
 assert.equal(r.money,30);assert.equal(r.opening.spent,120);assert.equal(r.totalSpent,0);assert.equal(r.largeSupplyUnlocked,false);
 assert.ok(r.buySupplies('cash'));assert.equal(r.money,0);assert.equal(r.production.fridgeStock,10);
});

test('Instalación no aparece sobre jugador; tutorial detecta producción adelantada y primer cobro',()=>{
 let r=normal();r.playerMoved(PLAYER.spawn,{x:380,y:735});assert.equal(r.tutorialStep,'repair');
 assert.ok(r.construct('repair',BUILD_POINTS.repair));assert.equal(r.construct('fridge',{x:150,y:230}),false);
 for(const id of ['fridge','stove','counter'])assert.ok(r.construct(id,BUILD_POINTS[id]));
 assert.equal(r.tutorialStep,'supply');assert.ok(r.buySupplies('cash'));assert.equal(r.tutorialStep,'ingredients');
 act(r,'fridge');act(r,'fridge');assert.equal(r.tutorialStep,'cook');act(r,'stove');assert.equal(r.tutorialStep,'meal');
 r.update(2000);r=roundtrip(r);assert.equal(r.production.slotsFor('stove')[0].elapsedMs,2000);
 r.update(2000);act(r,'stove');assert.equal(r.tutorialStep,'deposit');act(r,'deposit');assert.equal(r.tutorialStep,'open');
 r=roundtrip(r);assert.ok(r.openBusiness());assert.equal(r.openBusiness(),false);
 r.update(1999);assert.equal(r.customers.length,0);r.update(1);assert.equal(r.customers.length,1);assert.equal(r.customers[0].intent,'takeaway');
 until(r,()=>r.customers.some(c=>c.phase==='queueing'));act(r,'checkout');assert.equal(r.money,0);assert.equal(r.pendingCash,10);assert.equal(r.tutorialStep,'cash');
 r=roundtrip(r);assert.equal(r.pendingCash,10);act(r,'cash');assert.equal(r.money,10);assert.equal(r.tutorialStep,'office');
 assert.equal(r.takeEconomyNotice(),'opening.complete');
 r=roundtrip(r);assert.notEqual(r.takeEconomyNotice(),'opening.complete');assert.equal(r.money,10);assert.equal(r.pendingCash,0);assert.equal(r.tutorialStep,'office');
});

test('Fiado reconocido; guardado conserva deuda y efectivo sin amortizar otra vez',()=>{
 let r=normal();build(r);r.buySupplies('credit');assert.equal(r.supplierDebt,33);assert.equal(r.opening.supplied,true);
 act(r,'fridge');act(r,'stove');r.update(4000);act(r,'stove');act(r,'deposit');r.openBusiness();
 until(r,()=>r.customers.some(c=>c.phase==='queueing'));act(r,'checkout');
 r=roundtrip(r);assert.deepEqual([r.money,r.pendingCash,r.supplierDebt],[30,5,28]);act(r,'cash');r=roundtrip(r);
 assert.deepEqual([r.money,r.pendingCash,r.supplierDebt],[35,0,28]);
});

test('Guardado local: escrituras agrupadas, fallo tolerado, corrupto/incompatible preservado y DEV aislado',()=>{
 const map=new Map();let writes=0;const store={getItem:k=>map.get(k)??null,setItem:(k,v)=>{writes++;map.set(k,v);}};
 const save=new LocalSave(()=>store,'opening'),r=normal();assert.equal(save.load().kind,'empty');
 assert.equal(save.write(r,PLAYER.spawn,false,4999),null);assert.equal(writes,0);assert.equal(save.write(r,PLAYER.spawn,false,1),true);
 const raw=map.get(SAVE_KEY);assert.equal(save.load().kind,'valid');
 const advanced=new LocalSave(()=>store,'advanced');advanced.write(new Restaurant(),PLAYER.spawn,true);
 assert.ok(map.has(DEV_SAVE_KEY));assert.equal(map.get(SAVE_KEY),raw);
 for(const value of ['{oops',JSON.stringify({version:99}),JSON.stringify({version:2,player:PLAYER.spawn,restaurant:{}})]){
  map.set(SAVE_KEY,value);assert.equal(save.load().kind,'invalid');assert.equal(save.write(r,PLAYER.spawn,true),null);assert.equal(map.get(SAVE_KEY),value);
 }
 assert.equal(save.replaceConfirmed(r),true);assert.equal(save.load().kind,'valid');
 const blocked=new LocalSave(()=>{throw new Error('blocked');},'opening');assert.equal(blocked.load().kind,'unavailable');assert.equal(blocked.write(r,PLAYER.spawn,true),false);
 const quota=new LocalSave(()=>({getItem:()=>null,setItem:()=>{throw new Error('quota');}}),'opening');assert.equal(quota.write(r,PLAYER.spawn,true),false);
 const bad=JSON.parse(raw);bad.restaurant.coins=-1;assert.throws(()=>decodeSave(JSON.stringify(bad),'opening'));
 bad.restaurant.coins=150;bad.restaurant.production.player.ingredients=999;assert.throws(()=>decodeSave(JSON.stringify(bad),'opening'));
});

test('Escenario avanzado: cocina, cargas, reservas reconstruidas, mesas/clientes pagados y encargo listo no duplican',()=>{
 let r=new Restaurant({},()=>.9,2000);for(const id of ['cook','cleaner','cashier','stove','cook'])assert.ok(r.purchase(id,r.upgradeLevel(id)));
 r.buySupplies('credit');r.playerMoved(PLAYER.spawn,{x:380,y:735});r.update(5000);
 const food=()=>r.production.fridgeStock+r.production.inventory.ingredients+r.production.inventory.meals+r.production.availablePortions+r.production.stoveSummary.cooking+r.production.stoveSummary.ready+r.staff.employees.reduce((n,w)=>n+w.inventory.count('ingredients')+w.inventory.count('meals'),0);
 const before=food();r=roundtrip(r);assert.equal(food(),before);assert.equal(r.activeReservations.size,0);assert.ok(r.staff.employees.every(w=>!w.task&&w.route.length===0));
 until(r,()=>r.pendingCash>0);const cash=r.pendingCash,debt=r.supplierDebt;r=roundtrip(r);assert.equal(r.pendingCash,cash);assert.equal(r.supplierDebt,debt);
 const id=r.bulkOrders.state.id;r.acceptBulkOrder(id);
 r.production.returnPackedMeals(4);
 for(let i=0;i<4;i++){act(r,'packing');act(r,'packing');}
 const reward=r.bulkOrders.state.payment;r=roundtrip(r);assert.equal(r.bulkOrders.state.phase,'ready');
 const money=r.money;assert.ok(r.claimBulkOrder(id));const net=r.money-money;assert.ok(net>0&&net<=reward);
 r=roundtrip(r);assert.equal(r.claimBulkOrder(id),null);assert.equal(r.money,money+net);
});

test('Guardar clientes de comedor pagados conserva mesa y comida durante trayecto, consumo y salida',()=>{
 let r=new Restaurant({},()=>.9,1000);r.buySupplies('cash');act(r,'fridge');act(r,'stove');r.update(4000);act(r,'stove');act(r,'deposit');
 const id=r.admitCustomer('dine-in');until(r,()=>r.customer(id)?.phase==='queueing');act(r,'checkout');
 const cash=r.pendingCash;r=roundtrip(r);assert.equal(r.pendingCash,cash);assert.equal(r.customer(id).phase,'walking-to-table');
 until(r,()=>r.customer(id)?.phase==='eating');r.update(500);r=roundtrip(r);assert.equal(r.customer(id).eatingElapsedMs,500);
 r.update(5550);assert.equal(r.customer(id).phase,'leaving');r=roundtrip(r);assert.equal(r.pendingCash,cash);assert.ok(r.tables.some(t=>t.cleanliness==='dirty'));
 until(r,()=>!r.customer(id));assert.equal(r.pendingCash,cash);assert.equal(r.orders.length,0);
});

test('Guardado rechaza referencias de ventas o mesas incoherentes sin aplicar progreso parcial',()=>{
 const r=new Restaurant();const raw={version:2,player:PLAYER.spawn,restaurant:r.snapshot()};
 raw.restaurant.tables[0].customerId='missing';assert.throws(()=>decodeSave(JSON.stringify(raw),'advanced'));
 raw.restaurant.tables[0].customerId=null;raw.restaurant.levels.cashier=1;assert.throws(()=>decodeSave(JSON.stringify(raw),'advanced'));
});

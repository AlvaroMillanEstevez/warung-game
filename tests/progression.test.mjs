import test from 'node:test';
import assert from 'node:assert/strict';
import { Restaurant } from '../src/simulation/Restaurant.ts';
import { BUILD_POINTS } from '../src/simulation/Opening.ts';
import { PLAYER, PROGRESSION } from '../src/config.ts';
import { ALL_TABLES, STATIONS, PACKING_STATION } from '../src/world/layout.ts';
import { canStand } from '../src/world/collision.ts';
import { findPath } from '../src/world/navigation.ts';
import { decodeSave, LocalSave, SAVE_VERSION } from '../src/persistence/Save.ts';
const act=(r,id)=>{const z=r.interactionZones.find(z=>z.id===id);assert.ok(z,id);const c=r.offer(z).command;assert.ok(c,id);assert.ok(r.beginAction(c),id);assert.ok(r.perform(c),id);};
const until=(r,fn)=>{for(let n=0;n<10000&&!fn();n++)r.update(50);assert.ok(fn());};
const normal=()=>{const r=new Restaurant({},()=>.9,0,'opening');for(const id of ['repair','fridge','stove','counter'])assert.ok(r.construct(id,BUILD_POINTS[id]));r.buySupplies('cash');return r;};
function meal(r){if(!r.production.fridgeStock)assert.ok(r.buySupplies(r.money>=30?'cash':'credit'));act(r,'fridge');act(r,'stove');until(r,()=>r.production.stoveSummary.ready>0);act(r,'stove');act(r,'deposit');}
function sell(r){meal(r);if(!r.opening.open)assert.ok(r.openBusiness());until(r,()=>r.customers.some(c=>c.phase==='queueing'));act(r,'checkout');act(r,'cash');}
const roundtrip=r=>{const d=decodeSave(JSON.stringify({version:SAVE_VERSION,player:PLAYER.spawn,restaurant:r.snapshot()}),r.mode);const c=new Restaurant({},()=>.9,0,r.mode);c.restore(d.restaurant);return c;};
// Only boundary/full-upgrade tests inject a wallet fixture; the opening/dining test earns every coin.
const funded=()=>{const r=normal();sell(r);const d=r.snapshot();d.coins=5000;r.restore(d);return r;};
const purchase=(r,id)=>{const level=r.upgradeLevel(id),offer=r.purchaseState(id);assert.equal(offer.problem,null,id);const money=r.money,spent=r.totalSpent;assert.ok(r.purchase(id,level));assert.equal(r.money,money-offer.price);assert.equal(r.totalSpent,spent+offer.price);assert.equal(r.purchase(id,level),false);};

test('Normal: apertura, ahorro real, oficina, primera mesa, comensal, limpieza y papelera',()=>{
 let r=normal();sell(r);assert.equal(r.money,10);assert.equal(r.tutorialStep,'office');
 assert.equal(r.buildProblem('office',BUILD_POINTS.office),'purchase.funds');assert.ok(r.interactionZones.some(z=>z.id==='build-office'));
 for(let i=0;i<9;i++)sell(r);assert.equal(r.money,100);assert.equal(r.totalSpent,0);r=roundtrip(r);
 assert.ok(r.construct('office',BUILD_POINTS.office));assert.equal(r.construct('office',BUILD_POINTS.office),false);assert.equal(r.totalSpent,50);assert.equal(r.money,50);
 r=roundtrip(r);assert.equal(r.progression.office,true);assert.equal(r.tutorialStep,null);assert.equal(r.purchaseState('cleaner').problem,'progress.needDining');
 const before=r.customers.map(c=>({id:c.id,intent:c.intent,order:c.orderId})),arrival=r.snapshot().arrivalElapsedMs;
 purchase(r,'tables');assert.equal(r.money,10);assert.equal(r.tableCount,1);assert.equal(r.progression.bin,true);assert.equal(r.snapshot().arrivalElapsedMs,arrival);
 assert.deepEqual(r.customers.map(c=>({id:c.id,intent:c.intent,order:c.orderId})),before);
 assert.equal(new Set(r.interactionZones.map(z=>z.id)).size,r.interactionZones.length);
 r=roundtrip(r);const id=r.admitCustomer('dine-in');assert.ok(id);until(r,()=>r.customer(id)?.phase==='queueing');
 // A diner arrives behind existing takeaway customers; serve the eligible oldest without changing intentions.
 while(r.customer(id).phase==='queueing'){meal(r);act(r,'checkout');}
 until(r,()=>r.tables[0].cleanliness==='dirty');act(r,r.tables[0].id);assert.equal(r.production.inventory.waste,1);act(r,'bin');assert.equal(r.production.inventory.waste,0);
 r=roundtrip(r);assert.equal(r.tableCount,1);assert.equal(r.totalSpent,90);assert.equal(r.opening.spent,120);
});

test('Primera mesa y papelera son atómicas: jugador, empleados y clientes bloquean sus huellas',()=>{
 const r=funded();r.construct('office',BUILD_POINTS.office);const before=r.snapshot();
 for(const s of [ALL_TABLES[0],STATIONS.find(s=>s.id==='bin')]){
  const point={x:s.footprint.x+20,y:s.footprint.y+20};assert.equal(r.purchase('tables',0,point),false);assert.deepEqual(r.snapshot(),before);
 }
 purchase(r,'cook');const worker=r.staff.get('cook'),original={...worker.position};worker.position={x:110,y:735};
 assert.equal(r.purchase('tables',0),false);assert.equal(r.progression.bin,false);worker.position=original;
 const c=r.customers[0];if(c){const position={...c.position};c.position={x:245,y:385};assert.equal(r.purchase('tables',0),false);c.position=position;}
 purchase(r,'tables');assert.equal(r.stations.filter(s=>s.id==='bin').length,1);
});

test('Cocinero antes de comedor; encargos bloqueados hasta construcción conjunta y cobro único',()=>{
 let r=funded();r.construct('office',BUILD_POINTS.office);purchase(r,'cook');assert.equal(r.tableCount,0);assert.equal(r.tutorialStep,'orders');
 assert.equal(r.bulkOrders.state.phase,'locked');r.update(120000);assert.equal(r.bulkOrders.state.phase,'locked');assert.equal(r.interactionZones.some(z=>z.id==='packing'||z.id==='board'),false);
 r=roundtrip(r);const worker=r.staff.get('cook'),position={...worker.position};worker.position={x:840,y:155};
 const money=r.money;assert.equal(r.construct('orders',BUILD_POINTS.orders),false);assert.equal(r.money,money);assert.equal(r.bulkOrders.state.phase,'locked');worker.position=position;
 assert.ok(r.construct('orders',BUILD_POINTS.orders));assert.equal(r.construct('orders',BUILD_POINTS.orders),false);assert.equal(r.totalSpent,200);
 assert.ok(r.stations.some(s=>s.id===PACKING_STATION.id));assert.equal(r.bulkOrders.state.phase,'offer');assert.equal(r.bulkOrders.state.quantity,4);
 r=roundtrip(r);assert.equal(r.bulkOrders.state.phase,'offer');const id=r.bulkOrders.state.id;assert.ok(r.acceptBulkOrder(id));assert.equal(r.acceptBulkOrder(id),false);
 assert.ok(r.buySupplies('credit'));until(r,()=>r.production.availablePortions>=4);
 for(let i=0;i<4;i++){act(r,'packing');act(r,'packing');}assert.equal(r.bulkOrders.state.phase,'ready');
 r=roundtrip(r);const payment=r.bulkOrders.state.payment,split=r.previewIncome(payment),wallet=r.money;assert.ok(r.claimBulkOrder(id));assert.equal(r.money,wallet+split.net);assert.equal(r.supplierDebt,split.remainingDebt);
 r=roundtrip(r);assert.equal(r.claimBulkOrder(id),null);assert.equal(r.totalSpent,200);
});

test('Seis mesas, dos hornillos y equipo completo en distintos órdenes; rutas y recursos conservados',()=>{
 for(const order of [ ['tables','cleaner','cook','cashier','stove','cook'], ['stove','cook','cook','cashier','tables','cleaner'] ]){
  let r=funded();r.construct('office',BUILD_POINTS.office);assert.equal(r.purchaseState('cashier').problem,'purchase.firstCook');
  for(const id of order){purchase(r,id);r=roundtrip(r);}
  assert.ok(r.construct('orders',BUILD_POINTS.orders));r=roundtrip(r);
  for(let i=1;i<6;i++){assert.equal(r.purchaseState('tables').price,PROGRESSION.tablePrices[i]);purchase(r,'tables');r=roundtrip(r);}
  for(const id of ['actionSpeed','actionSpeed','stoveSpeed','stoveSpeed'])purchase(r,id);
  assert.equal(r.tableCount,6);assert.equal(r.production.stoveIds.length,2);assert.equal(r.staff.employees.length,4);assert.equal(r.teamCapacity,8);assert.equal(r.purchase('tables',6),false);
  assert.equal(r.totalSpent,50+860+100+220+80+150+180+50+80+160+100+200);
  const food=()=>r.production.fridgeStock+r.production.inventory.ingredients+r.production.inventory.meals+r.production.availablePortions+r.production.stoveSummary.cooking+r.production.stoveSummary.ready+r.staff.employees.reduce((n,w)=>n+w.inventory.count('ingredients')+w.inventory.count('meals'),0);
  r.buySupplies('large');r.update(5000);const total=food();r=roundtrip(r);assert.equal(food(),total);
  for(const z of r.interactionZones)assert.ok(findPath(PLAYER.spawn,z.position,r.routingObstacles),z.id);
  for(let i=0;i<100;i++){r.update(50);assert.ok(r.staff.employees.every(w=>canStand(w.position,r.obstacles)));}
 }
});

test('La construcción usa gasto de progreso y la transición de demanda existente; suministros no cuentan',()=>{
 const r=funded();r.construct('office',BUILD_POINTS.office);purchase(r,'cook');purchase(r,'cashier'); // 300
 assert.equal(r.totalSpent,300);assert.equal(r.demandFrequency,1.2);
 r.update(1000);const before=r.customers.length;assert.ok(r.construct('orders',BUILD_POINTS.orders));assert.equal(r.totalSpent,350);assert.equal(r.snapshot().arrivalElapsedMs,1000);
 purchase(r,'tables');purchase(r,'tables');assert.equal(r.totalSpent,450);purchase(r,'tables');assert.equal(r.totalSpent,530);assert.equal(r.arrivalIntervalMs,4000);assert.equal(r.snapshot().arrivalElapsedMs,0);assert.equal(r.customers.length,before);
 const spent=r.totalSpent;r.buySupplies('large');r.buySupplies('credit');assert.equal(r.totalSpent,spent);
 r.update(3999);assert.equal(r.customers.length,before);r.update(1);assert.ok(r.customers.length<=before+1);
 r.reset();assert.equal(r.progression.office,false);assert.equal(r.progression.orders,false);assert.equal(r.progression.bin,false);assert.equal(r.totalSpent,0);assert.equal(r.tableCount,0);assert.equal(r.bulkOrders.state.phase,'locked');
});

test('Migración explícita v1: dinero, deuda, cocina, clientes e inversión intactos; sin concesiones',()=>{
 for(const phase of ['before','after','advanced']){
  const r=phase==='advanced'?new Restaurant({},()=>.9,2000):normal();
  if(phase==='after'){sell(r);r.buySupplies('credit');}
  if(phase==='advanced'){r.purchase('cook',0);r.purchase('tables',0);r.buySupplies('credit');}
  const old=r.snapshot();delete old.progression;
  const raw=JSON.stringify({version:1,player:PLAYER.spawn,restaurant:old});const d=decodeSave(raw,r.mode);
  assert.equal(d.version,2);const {progression,...state}=d.restaurant;assert.deepEqual(state,old);
  assert.equal(progression.office,phase==='advanced');assert.equal(progression.orders,phase==='advanced');assert.equal(progression.bin,phase==='advanced');
  const copy=new Restaurant({},()=>.9,0,r.mode);copy.restore(d.restaurant);if(phase==='after')assert.equal(copy.tutorialStep,'office');
  let stored=raw;const store=new LocalSave(()=>({getItem:()=>stored,setItem:(_,v)=>stored=v}),r.mode);assert.equal(store.load().kind,'valid');assert.equal(stored,raw);store.write(copy,PLAYER.spawn,true);assert.equal(JSON.parse(stored).version,2);assert.equal(decodeSave(stored,r.mode).restaurant.spent,old.spent);
 }
});

test('Persistencia rechaza progresión incoherente y conserva avisos pendientes una sola vez',()=>{
 let r=funded();r.construct('office',BUILD_POINTS.office);purchase(r,'tables');purchase(r,'cook');r.opening.completionSeen=true;
 r=roundtrip(r);assert.equal(r.takeEconomyNotice(),'progress.officeBuilt');r=roundtrip(r);assert.equal(r.takeEconomyNotice(),'progress.diningBuilt');r=roundtrip(r);assert.deepEqual(r.takeEconomyNotice(),{key:'progress.ordersAvailable',params:{price:50}});
 r=roundtrip(r);assert.notEqual(r.takeEconomyNotice(),'progress.ordersAvailable');
 for(const mutate of [d=>d.progression.office=false,d=>d.progression.bin=false,d=>d.progression.orders=true,d=>d.tables=[],d=>d.levels.tables=7]){
  const data={version:2,player:PLAYER.spawn,restaurant:r.snapshot()};mutate(data.restaurant);assert.throws(()=>decodeSave(JSON.stringify(data),'opening'));
 }
});

test('Llegadas futuras cambian con la primera mesa sin ráfaga ni cambio de intención; reservas activas sobreviven',()=>{
 const r=new Restaurant({},()=>0,0,'opening');r.restore(funded().snapshot());r.construct('office',BUILD_POINTS.office);
 r.update(10000);assert.ok(r.customers.every(c=>c.intent==='takeaway'));
 purchase(r,'cook');r.update(1000);const task=r.staff.get('cook').task,locks=[...r.activeReservations],food=r.production.snapshot(),elapsed=r.snapshot().arrivalElapsedMs;
 const old=r.customers.map(c=>({id:c.id,intent:c.intent,position:{...c.position}}));purchase(r,'tables');
 assert.equal(r.staff.get('cook').task,task);assert.deepEqual([...r.activeReservations],locks);assert.deepEqual(r.production.snapshot(),food);assert.equal(r.snapshot().arrivalElapsedMs,elapsed);
 assert.deepEqual(r.customers.map(c=>({id:c.id,intent:c.intent,position:{...c.position}})),old);
 r.update(r.arrivalIntervalMs-elapsed);assert.ok(r.customers.some(c=>c.intent==='dine-in'));assert.ok(old.every(c=>!r.customer(c.id)||r.customer(c.id).intent===c.intent));
});

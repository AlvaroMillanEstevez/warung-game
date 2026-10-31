import test from 'node:test';
import assert from 'node:assert/strict';
import { Restaurant } from '../src/simulation/Restaurant.ts';
import { Production } from '../src/simulation/Production.ts';
import { splitIncome } from '../src/simulation/Economy.ts';
import { ECONOMY, INTERACTION, PLAYER } from '../src/config.ts';
import { DwellInteraction } from '../src/simulation/DwellInteraction.ts';
import { canInteract, closestZone } from '../src/world/interaction.ts';
import { findPath } from '../src/world/navigation.ts';

const zone = (r, id) => r.interactionZones.find(z => z.id === id);
const command = (r, id, actor = 'player') => {
  const offer = r.offer(zone(r, id), actor); assert.ok(offer.command, offer.reason); return offer.command;
};
const act = (r, id, actor = 'player') => {
  const c = command(r, id, actor); assert.ok(r.beginAction(c, actor)); assert.ok(r.perform(c, actor)); return c;
};
const until = (r, predicate, limit = 180000) => {
  for (let ms = 0; !predicate() && ms < limit; ms += 50) r.update(50);
  assert.ok(predicate(), 'Simulation must progress');
};
const cook = (r, count, deposit = true) => {
  for (let i = 0; i < count; i++) {
    act(r, 'fridge'); act(r, 'stove'); r.production.update(r.production.cookingMs); act(r, 'stove');
    if (deposit) act(r, 'deposit');
  }
};
const queue = r => {
  const id = r.admitCustomer('takeaway'); assert.ok(id);
  until(r, () => r.customer(id)?.phase === 'queueing'); return id;
};
const sale = r => { queue(r); return act(r, 'checkout'); };
const food = r => r.production.fridgeStock + r.production.availablePortions +
  r.production.inventory.ingredients + r.production.inventory.meals +
  r.production.stoveSummary.cooking + r.production.stoveSummary.ready +
  r.staff.employees.reduce((n, w) => n + w.inventory.count('ingredients') + w.inventory.count('meals'), 0) +
  (['active','ready'].includes(r.bulkOrders.state.phase) ? r.bulkOrders.state.packed : 0);

test('Economía inicial: 30 disponibles, frigorífico/bandeja/deuda vacíos y configuración acordada', () => {
  const r = new Restaurant();
  assert.deepEqual([r.money, r.production.fridgeStock, r.pendingCash, r.supplierDebt, r.totalSpent], [30,0,0,0,0]);
  assert.deepEqual([ECONOMY.supplyQuantity, ECONOMY.cashPrice, ECONOMY.creditPrice, r.options.price], [10,30,33,10]);
  assert.equal(r.offer(zone(r,'fridge')).reason,'economy.fridgeEmpty');
  assert.equal(r.offer(zone(r,'cash')).reason,'economy.cashEmpty');
  assert.equal(r.takeEconomyNotice(),'economy.startHint'); assert.equal(r.takeEconomyNotice(),null);
});

test('Proveedor: compra atómica, sin saldo, fiado único, contado con deuda y pulsación antigua rechazada', () => {
  const r = new Restaurant(), quote = r.supplyRevision;
  assert.ok(r.buySupplies('cash',quote)); assert.equal(r.buySupplies('cash',quote),false);
  assert.deepEqual([r.money,r.production.fridgeStock,r.supplierDebt],[0,10,0]);
  assert.equal(r.buySupplies('cash'),false); assert.equal(r.supplyProblem('cash'),'supplier.insufficientFunds');
  assert.ok(r.buySupplies('credit')); assert.equal(r.buySupplies('credit'),false);
  assert.equal(r.supplyProblem('credit'),'supplier.debtOutstanding');
  assert.deepEqual([r.money,r.production.fridgeStock,r.supplierDebt],[0,20,33]);
  const funded = new Restaurant({},()=>0,90);
  assert.ok(funded.buySupplies('credit'));
  for(let n=0;n<3;n++)assert.ok(funded.buySupplies('cash'));
  assert.deepEqual([funded.money,funded.production.fridgeStock,funded.supplierDebt],[0,40,33]);
  assert.equal(funded.totalSpent,0); assert.equal(funded.demandFrequency,.8); assert.equal(funded.takeDemandNotice(),false);
});

test('Último ingrediente: reservas de jugador y dos cocineros, cancelación y consumo único', () => {
  for(const winner of ['player','cook','cook-2']) {
    const r=new Restaurant({},()=>0,1000);
    for(const id of ['cook','stove','cook'])assert.ok(r.purchase(id,r.upgradeLevel(id)));
    r.production.restock(1); // Deliberate single-resource fixture.
    const c={kind:'production',action:'take-ingredients'};
    assert.ok(r.beginAction(c,winner)); assert.equal(r.production.fridgeStock,1);
    for(const loser of ['player','cook','cook-2'].filter(id=>id!==winner)) {
      assert.equal(r.beginAction(c,loser),false); assert.equal(r.perform(c,loser),null);
      assert.equal(r.offer(zone(r,'fridge'),loser).reason,'economy.ingredientsReserved');
    }
    r.cancelAction(winner); assert.equal(r.production.fridgeStock,1); assert.equal(r.activeReservations.size,0);
    assert.ok(r.beginAction(c,winner)); assert.ok(r.perform(c,winner));
    assert.equal(r.production.fridgeStock,0); assert.equal(r.perform(c,winner),null);
    assert.equal(r.production.reservedIngredients.length,0); assert.equal(food(r),1);
  }
});

test('Reserva del frigorífico se libera al invalidar capacidad, faltar ruta o reiniciar', () => {
  const r=new Restaurant({},()=>0,1000); r.production.restock(10); assert.ok(r.purchase('cook',0));
  const w=r.staff.get('cook'); r.update(50); assert.ok(r.production.reservedIngredients.includes('cook'));
  w.inventory.change('ingredients',8); r.update(50);
  assert.equal(r.production.reservedIngredients.length,0); assert.equal(r.production.fridgeStock,10);
  r.staff.cancel('cook',r); w.inventory.change('ingredients',-8); w.position={x:-100,y:-100};
  r.update(50); assert.equal(r.production.reservedIngredients.length,0);
  r.reset(); assert.equal(r.production.reservedIngredients.length,0);
});

test('Aviso de stock bajo solo al cruzar 3, vuelve a habilitarse tras reponer y reset lo elimina', () => {
  const p=new Production(); p.restock(4);
  assert.equal(p.takeLowStockNotice(),false); p.perform('take-ingredients');
  assert.equal(p.fridgeStock,3); assert.equal(p.takeLowStockNotice(),true); assert.equal(p.takeLowStockNotice(),false);
  p.perform('take-ingredients'); assert.equal(p.takeLowStockNotice(),false);
  p.restock(2); p.perform('take-ingredients'); assert.equal(p.takeLowStockNotice(),true);
  p.restock(1); p.perform('take-ingredients'); p.reset(); assert.equal(p.takeLowStockNotice(),false);
});

test('Reparto entero: siete ventas de 10 saldan 33 y dejan exactamente 37 en bandeja', () => {
  const r=new Restaurant({},()=>0,0); assert.ok(r.buySupplies('credit')); cook(r,7);
  for(let n=1;n<=7;n++) {
    const c=sale(r); assert.equal(r.perform(c),null);
    assert.equal(r.supplierDebt,Math.max(0,33-5*n));
    assert.equal(r.pendingCash,n<=6?5*n:37); assert.equal(r.money,0);
  }
  assert.deepEqual(splitIncome(9,33),{gross:9,repaid:4,net:5,remainingDebt:29});
  assert.deepEqual(splitIncome(10,3),{gross:10,repaid:3,net:7,remainingDebt:0});
  assert.deepEqual(splitIncome(1,33),{gross:1,repaid:0,net:1,remainingDebt:33});
  const snapshot=[r.money,r.pendingCash,r.supplierDebt]; r.update(1e9); assert.deepEqual([r.money,r.pendingCash,r.supplierDebt],snapshot);
  act(r,'cash'); assert.equal(r.money,37); assert.equal(r.pendingCash,0); assert.equal(r.supplierDebt,0);
  assert.ok(r.buySupplies('cash')); assert.equal(r.money,7); assert.equal(r.production.fridgeStock,13);
  assert.equal(r.totalSpent,0); assert.equal(r.demandFrequency,.8);
});

test('Venta y recogida simultáneas: cualquier orden conserva el neto; recoger nunca amortiza otra vez', () => {
  for(const saleFirst of [true,false]) {
    const r=new Restaurant({},()=>0,0); assert.ok(r.buySupplies('credit')); cook(r,2); sale(r); queue(r);
    const collect=command(r,'cash'), checkout=command(r,'checkout'); assert.ok(r.beginAction(collect));
    if(saleFirst){assert.ok(r.perform(checkout));assert.ok(r.perform(collect));}
    else{assert.ok(r.perform(collect));assert.ok(r.perform(checkout));}
    assert.equal(r.money+r.pendingCash,10); assert.equal(r.supplierDebt,23);
    assert.equal(r.money,saleFirst?10:5); assert.equal(r.pendingCash,saleFirst?0:5);
    assert.equal(r.perform(collect),null); // Even if another sale has refilled the tray.
    if(r.pendingCash)act(r,'cash');
    assert.equal(r.money,10); assert.equal(r.supplierDebt,23);
  }
});

test('Bandeja: todas las categorías llenas, importe actual completo, sin progreso vacío y duración mejorada', () => {
  const r=new Restaurant({},()=>0,1000); assert.ok(r.buySupplies('cash')); cook(r,2); sale(r);
  for(const category of ['ingredients','meals','waste']) r.production.playerInventory.change(category,8);
  const inventory=r.production.inventory;
  assert.ok(r.purchase('actionSpeed',0)); assert.ok(r.purchase('actionSpeed',1));
  const d=new DwellInteraction(), c=command(r,'cash'), target={id:'cash',action:JSON.stringify(c)};
  assert.ok(r.beginAction(c)); assert.equal(d.update(target,['cash'],false,399,r.teamActionMs),null);
  queue(r); act(r,'checkout'); // A sale arriving during collection is included in that collection.
  assert.ok(d.update(target,['cash'],false,1,r.teamActionMs)); const before=r.money;
  assert.ok(r.perform(c)); assert.equal(r.money,before+20); assert.deepEqual(r.production.inventory,inventory);
  assert.equal(d.update({id:'cash',action:null},['cash'],false,100000,r.teamActionMs),null);
  assert.equal(d.progress,0);
});

test('Encargos amortizan al cobrar total con o sin bonus; empaquetar/cancelar no pagan', () => {
  for(const bonus of [true,false]) {
    const r=new Restaurant({},()=>0,100); assert.ok(r.purchase('cook',0)); assert.ok(r.buySupplies('credit'));
    const order=r.bulkOrders.state; assert.ok(r.acceptBulkOrder(order.id)); cook(r,4,false);
    if(!bonus)r.bulkOrders.update(90000,10,()=>0);
    for(let n=0;n<4;n++)act(r,'packing');
    assert.deepEqual([r.money,r.pendingCash,r.supplierDebt],[0,0,33]);
    const gross=bonus?60:40, repayment=bonus?30:20;
    assert.equal(r.previewIncome(gross).net,gross-repayment);
    assert.ok(r.claimBulkOrder(order.id)); assert.equal(r.claimBulkOrder(order.id),null);
    assert.deepEqual([r.money,r.pendingCash,r.supplierDebt],[gross-repayment,0,33-repayment]);
    assert.equal(r.totalSpent,100);
  }
  const r=new Restaurant({},()=>0,100); assert.ok(r.purchase('cook',0)); assert.ok(r.buySupplies('credit'));
  const order=r.bulkOrders.state; r.acceptBulkOrder(order.id); cook(r,4,false);
  act(r,'packing'); act(r,'packing'); const before=food(r);
  assert.ok(r.cancelBulkOrder(order.id)); assert.equal(r.cancelBulkOrder(order.id),false);
  assert.equal(food(r),before); assert.equal(r.production.availablePortions,2); assert.equal(r.production.inventory.meals,2);
  assert.deepEqual([r.money,r.pendingCash,r.supplierDebt],[0,0,33]);
});

test('Dos cocineros agotan stock, terminan cargas sin bucles y reanudan con suministros; cajero usa bandeja', () => {
  const r=new Restaurant({},()=>0,2000);
  for(const id of ['cook','stove','cook','cashier'])assert.ok(r.purchase(id,r.upgradeLevel(id)));
  assert.ok(r.buySupplies('cash')); const wallet=r.money;
  until(r,()=>r.production.availablePortions===10);
  for(let n=0;n<300;n++)r.update(50);
  assert.equal(r.production.fridgeStock,0); assert.equal(r.production.reservedIngredients.length,0);
  for(const w of r.staff.employees.filter(w=>w.role==='cook')) {
    assert.equal(w.task,null); assert.equal(w.route.length,0); assert.equal(w.inventory.count('ingredients'),0);
  }
  assert.equal(food(r),10); queue(r); until(r,()=>r.pendingCash===10);
  assert.equal(r.money,wallet); assert.equal(r.supplierDebt,0);
  assert.ok(r.buySupplies('cash')); until(r,()=>r.production.availablePortions===12);
  assert.ok(r.production.fridgeStock<10); assert.equal(food(r),19);
  assert.equal(r.reservedProduction,0); assert.equal(r.production.reservedIngredients.length,0);
});

test('Cancelación de tareas y papelera conservan ingredientes/platos; interrupción no consume reserva', () => {
  const r=new Restaurant({},()=>0,100); assert.ok(r.purchase('cook',0)); assert.ok(r.buySupplies('credit'));
  r.update(50); const amount=food(r); r.staff.cancel('cook',r);
  assert.equal(food(r),amount); assert.equal(r.production.reservedIngredients.length,0);
  act(r,'fridge'); const c=command(r,'fridge'); assert.ok(r.beginAction(c)); r.cancelAction();
  assert.equal(food(r),amount); assert.equal(r.production.fridgeStock,9);
  r.production.playerInventory.change('waste',1); act(r,'bin'); assert.equal(food(r),amount);
  assert.equal(r.offer(zone(r,'bin')).command,null);
});

test('Suministros, cobros y fiado no suman gasto ni cambian demanda', () => {
  const r=new Restaurant({},()=>0,1000);
  for(const id of ['cook','stove','cook'])assert.ok(r.purchase(id,r.upgradeLevel(id)));
  const before=[r.totalSpent,r.demandTier,r.demandFrequency]; r.takeDemandNotice();
  r.buySupplies('credit'); r.buySupplies('cash'); cook(r,1); sale(r); act(r,'cash');
  assert.deepEqual([r.totalSpent,r.demandTier,r.demandFrequency],before); assert.equal(r.takeDemandNotice(),false);
});

test('Reinicio limpia deuda, efectivo, stock, avisos, tareas y reservas; mock conserva solo saldo inicial', () => {
  for(const money of [30,0,600]) {
    const r=new Restaurant({},()=>0,money), quote=r.supplyRevision; r.buySupplies('credit'); cook(r,1); sale(r);
    const c=command(r,'cash'); r.beginAction(command(r,'fridge'));
    r.reset(); assert.deepEqual([r.money,r.pendingCash,r.supplierDebt,r.production.fridgeStock],[money,0,0,0]);
    assert.equal(r.activeReservations.size,0); assert.equal(r.staff.employees.length,0); assert.equal(r.totalSpent,0);
    assert.equal(r.perform(c),null); assert.equal(r.buySupplies('credit',quote),false);
    assert.equal(r.takeEconomyNotice(),'economy.startHint'); assert.equal(r.takeEconomyNotice(),null);
    assert.ok(r.buySupplies('credit'));
  }
});

test('Proveedor y bandeja accesibles con seis mesas: zonas separadas de venta/depósito/encargos', () => {
  const r=new Restaurant({},()=>0,5000);
  for(const id of ['tables','tables','tables','tables','stove'])assert.ok(r.purchase(id,r.upgradeLevel(id)));
  for(const id of ['cash','supplier']) {
    const z=zone(r,id); assert.ok(findPath(PLAYER.spawn,z.position,r.routingObstacles));
    assert.ok(canInteract(z.position,z,r.obstacles)); assert.equal(closestZone(z.position,r.interactionZones,r.obstacles).id,id);
    for(const other of r.interactionZones.filter(o=>o.id!==id))
      assert.ok(Math.hypot(z.position.x-other.position.x,z.position.y-other.position.y)>2*INTERACTION.radius, id+':'+other.id);
  }
});

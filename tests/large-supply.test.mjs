import test from 'node:test';
import assert from 'node:assert/strict';
import { Restaurant } from '../src/simulation/Restaurant.ts';
import { ECONOMY, UPGRADES, DEMAND } from '../src/config.ts';
const buy = (r,id) => assert.ok(r.purchase(id,r.purchaseState(id).level));
const unlock = r => { for(const id of ['cook','cleaner','tables','tables','stoveSpeed']) buy(r,id); };

test('Progresión real: dos mesas iniciales y combinación solicitada cuesta 410; umbral compartido 500',()=>{
 const r=new Restaurant({},()=>0,2000);
 assert.equal(r.tables.length,2);
 for(const id of ['tables','cook','cleaner','cashier'])buy(r,id);
 assert.equal(r.tables.length,3);
 assert.equal(r.totalSpent,UPGRADES.tables.prices[0]+UPGRADES.cook.prices[0]+UPGRADES.cleaner.prices[0]+UPGRADES.cashier.prices[0]);
 assert.equal(r.totalSpent,410);assert.equal(r.largeSupplyUnlocked,false);
 assert.equal(ECONOMY.largeSupplyUnlockSpending,500);
 assert.deepEqual(DEMAND.tiers.map(t=>[t.spending,8000/t.frequency]),[[0,10000],[300,8000/1.2],[500,4000],[1000,8000/2.4]]);
});

test('Límite 499/500, aviso único, saldo DEV no desbloquea y reinicio rearma el aviso',()=>{
 const r=new Restaurant({},()=>0,10000);
 assert.equal(r.largeSupplyUnlocked,false);assert.equal(r.buySupplies('large'),false);
 assert.equal(r.supplyProblem('large'),'supplier.largeLocked');
 r.takeEconomyNotice();r.spent=399;buy(r,'cook');
 assert.equal(r.totalSpent,499);assert.equal(r.largeSupplyUnlocked,false);assert.equal(r.takeEconomyNotice(),null);
 r.reset();r.takeEconomyNotice();unlock(r);
 assert.equal(r.totalSpent,500);assert.equal(r.largeSupplyUnlocked,true);assert.equal(r.demandFrequency,2);
 assert.equal(r.takeEconomyNotice().key,'supplier.largeUnlocked');assert.equal(r.takeEconomyNotice(),null);
 buy(r,'actionSpeed');assert.equal(r.largeSupplyUnlocked,true);assert.equal(r.takeEconomyNotice(),null);
 r.reset();assert.equal(r.totalSpent,0);assert.equal(r.largeSupplyUnlocked,false);assert.equal(r.demandFrequency,.8);
 assert.equal(r.takeEconomyNotice(),'economy.startHint');assert.equal(r.takeEconomyNotice(),null);
 unlock(r);assert.equal(r.takeEconomyNotice().key,'supplier.largeUnlocked');
});

test('Paquetes acumulativos, cotización consumida no se repite, nuevas pulsaciones sí; grande con deuda',()=>{
 const r=new Restaurant({},()=>0,2000);unlock(r);
 for(let i=0;i<3;i++)assert.ok(r.buySupplies('cash'));
 assert.equal(r.production.fridgeStock,30);
 assert.ok(r.buySupplies('credit'));assert.equal(r.production.fridgeStock,40);
 const money=r.money,spent=r.totalSpent,revision=r.supplyRevision;
 assert.ok(r.buySupplies('large',revision));
 assert.deepEqual([r.money,r.production.fridgeStock,r.supplierDebt,r.totalSpent,r.demandFrequency],[money-150,90,33,spent,2]);
 assert.equal(r.buySupplies('large',revision),false);
 assert.ok(r.buySupplies('large'));assert.equal(r.production.fridgeStock,140);
 assert.ok(r.buySupplies('cash'));assert.equal(r.production.fridgeStock,150);
 assert.equal(r.supplierDebt,33);assert.equal(r.totalSpent,spent);
 const twenty=new Restaurant({},()=>0,1000);unlock(twenty);
 assert.ok(twenty.buySupplies('cash'));assert.ok(twenty.buySupplies('cash'));assert.ok(twenty.buySupplies('large'));
 assert.equal(twenty.production.fridgeStock,70);
});

test('Paquete grande sin saldo: rechazo sin efectos; la bandeja no financia compras',()=>{
 const r=new Restaurant({},()=>0,649);unlock(r);r.cash=1000;
 const revision=r.supplyRevision;
 assert.equal(r.money,149);assert.equal(r.supplyProblem('large'),'supplier.insufficientFunds');
 assert.equal(r.buySupplies('large'),false);
 assert.deepEqual([r.money,r.pendingCash,r.production.fridgeStock,r.supplyRevision,r.totalSpent],[149,1000,0,revision,500]);
 assert.ok(r.buySupplies('cash'));assert.equal(r.production.fridgeStock,10);
});

test('Suministros no reinician el intervalo ni generan ráfagas tras desbloquear',()=>{
 const r=new Restaurant({},()=>.9,2000);
 r.playerMoved({x:378,y:735},{x:379,y:735});r.update(8000);
 unlock(r);assert.equal(r.customers.length,1);assert.equal(r.arrivalElapsedMs,0);
 r.update(2000);assert.ok(r.buySupplies('large'));assert.ok(r.buySupplies('cash'));assert.ok(r.buySupplies('credit'));
 assert.equal(r.arrivalElapsedMs,2000);assert.equal(r.arrivalIntervalMs,4000);assert.equal(r.totalSpent,500);
 r.update(1999);assert.equal(r.customers.length,1);r.update(1);assert.equal(r.customers.length,2);
 r.update(1);assert.equal(r.customers.length,2);
});

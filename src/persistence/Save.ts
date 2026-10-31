import { freshProgression } from '../simulation/Opening.ts';
import { Restaurant } from '../simulation/Restaurant.ts';
import { OPENING, UPGRADES, PLAYER } from '../config.ts';
import { canStand } from '../world/collision.ts';
import { canStandCustomer } from '../world/customerNavigation.ts';
import type { Point } from '../world/layout.ts';
export const SAVE_VERSION=2;
export const SAVE_KEY='warung-kita.save.v1';
export const DEV_SAVE_KEY='warung-kita.dev-save.v1';
export type Snapshot=ReturnType<Restaurant['snapshot']>;
export interface SaveData {version:2;player:Point;restaurant:Snapshot}
type Check=(v:unknown)=>boolean;
const number:Check=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=Number.MAX_SAFE_INTEGER;
const integer:Check=v=>number(v)&&Number.isSafeInteger(v);
const bool:Check=v=>typeof v==='boolean';
const text:Check=v=>typeof v==='string'&&v.length<100;
const one=(...values:unknown[]):Check=>v=>values.includes(v);
const nullable=(check:Check):Check=>v=>v===null||check(v);
const array=(check:Check,max=100):Check=>v=>Array.isArray(v)&&v.length<=max&&v.every(check);
const obj=(fields:Record<string,Check>):Check=>v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===Object.keys(fields).length&&Object.entries(fields).every(([k,f])=>Object.hasOwn(v,k)&&f((v as Record<string,unknown>)[k]));
const point=obj({x:v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<5000,y:v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<5000});
const inventory:Check=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.entries(v).every(([k,n])=>['ingredients','meals','waste'].includes(k)&&integer(n));
const slot:Check=v=>obj({status:one('empty','ready')})(v)||obj({status:one('cooking'),elapsedMs:number,durationMs:v=>number(v)&&Number(v)>0})(v);
const opening=obj(Object.fromEntries([...['repaired','fridge','stove','counter','open','moved','supplied','ingredients','cooked','meal','deposited','sold','collected','introSeen','completionSeen'].map(k=>[k,bool] as const),['spent',integer]]));
const offer={id:integer,quantity:one(4,6,9),basePay:integer,bonusPay:integer,bonusMs:number};
const bulkState:Check=v=>obj({phase:one('locked')})(v)||obj({phase:one('waiting'),remainingMs:number})(v)||
 obj({phase:one('offer'),...offer})(v)||obj({phase:one('active'),...offer,packed:integer,bonusRemainingMs:number})(v)||
 obj({phase:one('ready'),...offer,packed:integer,payment:integer,earnedBonus:integer})(v);
const income=obj({gross:integer,repaid:integer,net:integer,remainingDebt:integer});
const snapshotFields:Record<string,Check>={
 progression:obj({office:bool,bin:bool,orders:bool,officeNotice:bool,diningNotice:bool,ordersNotice:bool}),
 mode:one('opening','advanced'),opening,coins:integer,cash:integer,debt:integer,spent:integer,
 levels:obj(Object.fromEntries(Object.entries(UPGRADES).map(([k,v])=>[k,n=>integer(n)&&Number(n)<=(k==='tables'?6:v.prices.length)]))),
 clockMs:number,arrivalElapsedMs:number,arrivalsActive:bool,firstArrival:bool,epoch:integer,sequence:integer,
 production:obj({ingredients:integer,stock:integer,player:inventory,cookingMs:v=>number(v)&&Number(v)>0,
  kitchens:array(obj({id:one('stove','stove-2'),slots:array(slot,4)}),2),lowStockNotice:bool}),
 staff:array(obj({id:one('cook','cook-2','cleaner','cashier'),position:point,inventory}),4),
 bulk:obj({current:bulkState,sequence:integer,completed:integer,previousQuantity:nullable(one(4,6,9)),seenBoard:bool,seenPacking:bool,packingHintMs:number}),
 tables:array(obj({id:text,cleanliness:one('clean','dirty'),customerId:nullable(text),dirtySince:nullable(number)}),6),
 orders:array(obj({id:text,customerId:text,number:integer,tableId:nullable(text),paidAt:number,status:one('carried','eating','consumed','takeaway')}),48),
 customers:array(obj({id:text,number:integer,intent:one('dine-in','takeaway'),phase:one('entering','walking-to-queue','queueing','walking-to-table','walking-to-cleaning-wait','waiting-cleaning','eating','leaving'),
  position:point,waitingSince:nullable(number),queueIndex:integer,orderId:nullable(text),eatingElapsedMs:number,carryingMeal:bool}),48),
 lines:obj({'dine-in':array(text,20),takeaway:array(text,10)}),
 notices:obj({bulk:bool,demand:bool,supply:bool,large:bool,firstSaleSeen:bool,firstSale:bool,repaymentAnnounced:bool,repayment:nullable(income)})
};
const snapshotCheck=obj(snapshotFields);
const legacySnapshotCheck=obj(Object.fromEntries(Object.entries(snapshotFields).filter(([key])=>key!=='progression')));
function require(condition:unknown):asserts condition {if(!condition)throw new Error('Invalid save');}
export function decodeSave(raw:string,mode:'opening'|'advanced'):SaveData {
 let value:unknown=JSON.parse(raw);
 // The storage keys are stable. Only the payload version changes; migrate without granting purchases.
 if(obj({version:one(1),player:point,restaurant:legacySnapshotCheck})(value)) {
  const old=value as {version:1;player:Point;restaurant:Omit<Snapshot,'progression'>};
  const d=old.restaurant;
  require(d.levels.tables<=4);
  if(d.mode==='opening')require(d.spent===0&&Object.values(d.levels).every(n=>n===0)&&d.tables.length===0&&d.staff.length===0&&d.bulk.current.phase==='locked');
  value={...old,version:SAVE_VERSION,restaurant:{...d,progression:freshProgression(d.mode==='advanced')}};
 }
 require(obj({version:one(SAVE_VERSION),player:point,restaurant:snapshotCheck})(value));
 const data=value as SaveData,d=data.restaurant;
 require(d.mode===mode);
 const unique=(values:readonly string[])=>new Set(values).size===values.length;
 require(unique(d.customers.map(c=>c.id))&&unique(d.orders.map(o=>o.id))&&unique(d.tables.map(t=>t.id))&&unique(d.staff.map(w=>w.id))&&unique(d.production.kitchens.map(k=>k.id)));
 require(d.production.kitchens.every(k=>k.slots.length===4&&k.slots.every(s=>s.status!=='cooking'||s.elapsedMs<s.durationMs)));
 const p=d.progression;
 require((!p.officeNotice||p.office)&&(!p.diningNotice||p.bin)&&(!p.ordersNotice||(!p.orders&&d.levels.cook>0)));
 const o=d.opening;
 require(d.levels.transport===0);
 require(d.levels.cook<2||d.levels.stove===1);
 require(d.levels.cashier===0||d.levels.cook>0);
 require((!o.fridge||o.repaired)&&(!o.stove||o.fridge)&&(!o.counter||o.stove)&&(!o.open||o.counter)&&(!o.collected||o.sold));
 if(mode==='opening') {
  const p=d.progression;
  require(!p.office||o.collected);
  require(p.office||(d.spent===0&&Object.values(d.levels).every(n=>n===0)));
  require(p.bin===(d.levels.tables>0));
  require(!p.orders||(p.office&&d.levels.cook>0));
  require(d.levels.cleaner===0||p.bin);
  require(o.spent===(o.repaired?OPENING.prices.repair:0)+(o.fridge?OPENING.prices.fridge:0)+(o.stove?OPENING.prices.stove:0)+(o.counter?OPENING.prices.counter:0));
  require(d.arrivalsActive===o.open&&(d.levels.tables>0||d.customers.every(c=>c.intent==='takeaway'))&&(o.open||d.customers.length===0));
  require(o.fridge||d.production.ingredients===0);
  require(!o.collected||o.open);
  if(!o.open){
   require(!o.sold&&d.cash===0&&d.orders.length===0);
   if(o.deposited)require(d.production.stock>0);
   else if(o.meal)require((d.production.player.meals??0)>0);
   else if(o.cooked)require(d.production.kitchens.some(k=>k.slots.some(s=>s.status!=='empty')));
   else if(o.ingredients)require((d.production.player.ingredients??0)>0);
   else if(o.supplied)require(d.production.ingredients>0);
  }
  require(o.counter||(d.production.stock===0&&d.cash===0));
 }
 require(d.production.kitchens.map(k=>k.id).sort().join(',')===[...(o.stove?['stove']:[]),...(d.levels.stove?['stove-2']:[])].sort().join(','));
 const expectedWorkers=[...(d.levels.cook?['cook']:[]),...(d.levels.cook===2?['cook-2']:[]),...(d.levels.cleaner?['cleaner']:[]),...(d.levels.cashier?['cashier']:[])];
 require(expectedWorkers.sort().join(',')===d.staff.map(w=>w.id).sort().join(','));
 if(mode==='advanced')require(d.levels.tables<=4&&d.progression.office&&d.progression.bin&&d.progression.orders);
 require(d.progression.orders&&d.levels.cook>0 ? d.bulk.current.phase!=='locked' : d.bulk.current.phase==='locked');
 const expectedTables=Array.from({length:(mode==='advanced'?2:0)+d.levels.tables},(_,i)=>'table-'+(i+1));
 require(expectedTables.sort().join(',')===d.tables.map(t=>t.id).sort().join(','));
 const cMap=new Map(d.customers.map(c=>[c.id,c])),tMap=new Map(d.tables.map(t=>[t.id,t])),orders=new Map(d.orders.map(o=>[o.id,o]));
 for(const intent of ['dine-in','takeaway'] as const) {
  require(unique(d.lines[intent]));
  for(const [i,id] of d.lines[intent].entries()){const c=cMap.get(id);require(c&&c.intent===intent&&c.queueIndex===i&&!c.orderId&&['entering','walking-to-queue','queueing'].includes(c.phase));}
 }
 for(const c of d.customers) {
  require(c.number<=d.sequence);
  if(['entering','walking-to-queue','queueing'].includes(c.phase))require(d.lines[c.intent].includes(c.id)&&!c.orderId);
  else {const order=c.orderId?orders.get(c.orderId):null;require(order&&order.customerId===c.id);
   if(c.phase!=='leaving'){
    require(order.tableId&&tMap.get(order.tableId)?.customerId===c.id&&c.intent==='dine-in');
    require(c.phase==='eating'?order.status==='eating'&&!c.carryingMeal:order.status==='carried'&&c.carryingMeal);
   }else require(c.intent==='takeaway'?order.status==='takeaway'&&order.tableId===null:
     order.status==='consumed'&&order.tableId!==null&&tMap.get(order.tableId)?.customerId!==c.id);
  }
 }
 for(const t of d.tables)if(t.customerId)require(cMap.get(t.customerId)?.orderId&&orders.get(cMap.get(t.customerId)!.orderId!)?.tableId===t.id);
 for(const order of d.orders)require(cMap.get(order.customerId)?.orderId===order.id&&(!order.tableId||tMap.has(order.tableId)));
 const b=d.bulk.current;
 if('id' in b)require(b.id<=d.bulk.sequence&&b.basePay===b.quantity*10&&b.bonusPay===b.basePay/2);
 if(b.phase==='active')require(b.packed<b.quantity&&b.bonusRemainingMs<=b.bonusMs);
 if(b.phase==='ready')require(b.packed===b.quantity&&[0,b.bonusPay].includes(b.earnedBonus)&&b.payment===b.basePay+b.earnedBonus);
 const r=new Restaurant({},()=>.9,150,mode);r.restore(d);
 require(canStand(data.player,r.obstacles));
 require(d.staff.every(w=>canStand(w.position,r.obstacles))&&d.customers.every(c=>canStandCustomer(c.position,r.routingObstacles)));
 return data;
}
export type LoadResult={kind:'empty'}|{kind:'valid';data:SaveData}|{kind:'invalid'}|{kind:'unavailable'};
export interface StorageLike {getItem(key:string):string|null;setItem(key:string,value:string):void}
export class LocalSave {
 private elapsed=0;
 private last='';
 blocked=false;
 private readonly storage:()=>StorageLike;readonly mode:'opening'|'advanced';readonly enabled:boolean;
 constructor(storage:()=>StorageLike,mode:'opening'|'advanced',enabled=true){this.storage=storage;this.mode=mode;this.enabled=enabled;}
 get key():string{return this.mode==='opening'?SAVE_KEY:DEV_SAVE_KEY;}
 load():LoadResult {
  if(!this.enabled)return {kind:'empty'};
  let raw:string|null;try{raw=this.storage().getItem(this.key);}catch{return {kind:'unavailable'};}
  if(raw===null)return {kind:'empty'};
  try{const data=decodeSave(raw,this.mode);this.last=raw;return {kind:'valid',data};}
  catch{this.blocked=true;return {kind:'invalid'};}
 }
 write(restaurant:Restaurant,player:Point,force=false,delta=0):boolean|null {
  if(!this.enabled||this.blocked)return null;
  this.elapsed+=delta;if(!force&&this.elapsed<OPENING.saveIntervalMs)return null;
  this.elapsed=0;
  const data:SaveData={version:SAVE_VERSION,player:{...player},restaurant:restaurant.snapshot()};
  const raw=JSON.stringify(data);if(raw===this.last)return null;
  try{this.storage().setItem(this.key,raw);this.last=raw;return true;}catch{return false;}
 }
 replaceConfirmed(restaurant:Restaurant,player:Point={...PLAYER.spawn}):boolean|null {
  this.blocked=false;this.last='';return this.write(restaurant,player,true);
 }
}

import { freshOpening, freshProgression, nextBuild, buildCost, buildZone, OPEN_POINT } from './Opening.ts';
import type { BuildId } from './Opening.ts';
import type { Key, Message } from '../i18n/core.ts';
import { CUSTOMERS, OPENING, PROGRESSION, DEMAND, ECONOMY, PLAYER, STAFF, UPGRADES } from '../config.ts';
import { ALL_TABLES, PACKING_STATION, CASHIER_WORK, CLEANING_WAIT_POINTS, CUSTOMER_ENTRIES, CUSTOMER_LAYOUT, EXTRA_TABLES, EXTRA_STOVE, INTERACTION_ZONES, QUEUE_POINTS, STAFF_POSITIONS, STATIONS, TABLE_POSITIONS, stationZone } from '../world/layout.ts';
import type { InteractionZone, Point, Rect, StationData } from '../world/layout.ts';
import { canStandCustomer, findCustomerPath } from '../world/customerNavigation.ts';
import { CustomerComments } from './CustomerComments.ts';
import { splitIncome } from './Economy.ts';
import type { IncomeSplit, SupplyPayment } from './Economy.ts';
import { BulkOrders } from './BulkOrders.ts';
import { Production } from './Production.ts';
import { Staff } from './Staff.ts';
import type { UpgradeId } from '../config.ts';
import type { Inventory } from './Inventory.ts';
import { canStand } from '../world/collision.ts';
import { findPath } from '../world/navigation.ts';
import type { ProductionAction } from './Production.ts';

export type Intent = 'dine-in' | 'takeaway';
export type CustomerPhase = 'entering' | 'walking-to-queue' | 'queueing' | 'walking-to-table' |
  'walking-to-cleaning-wait' | 'waiting-cleaning' | 'eating' | 'leaving';
export interface Customer {
  readonly id: string;
  readonly number: number;
  readonly intent: Intent;
  phase: CustomerPhase;
  position: Point;
  route: Point[];
  waitingSince: number | null;
  queueIndex: number;
  orderId: string | null;
  eatingElapsedMs: number;
  carryingMeal: boolean;
}
export interface TableState { readonly id: string; cleanliness: 'clean' | 'dirty'; customerId: string | null; dirtySince: number | null }
export interface Order {
  readonly id: string;
  readonly customerId: string;
  readonly number: number;
  readonly tableId: string | null;
  readonly paidAt: number;
  status: 'carried' | 'eating' | 'consumed' | 'takeaway';
}
export type RestaurantAction =
  | { kind: 'production'; action: ProductionAction; stoveId?: string | undefined; slotIndex?: number | undefined }
  | { kind: 'collect-cash'; revision: number }
  | { kind: 'checkout'; customerId: string; tableId: string | null }
  | { kind: 'clean'; tableId: string }
  | { kind: 'withdraw'; orderId: number; carried: number }
  | { kind: 'pack'; orderId: number; packed: number };
export type Offer = { command: RestaurantAction; label: Message } | { command: null; reason: Key };
export interface RestaurantOptions {
  arrivalMs: number; dineInChance: number; maxCustomers: number; queueLimits: Record<Intent, number>;
  speed: number; eatingMs: number; price: number;
}

const TRANSITIONS: Record<CustomerPhase, readonly CustomerPhase[]> = {
  entering: ['walking-to-queue'],
  'walking-to-queue': ['walking-to-queue', 'queueing'],
  queueing: ['walking-to-queue', 'walking-to-table', 'walking-to-cleaning-wait', 'leaving'],
  'walking-to-cleaning-wait': ['waiting-cleaning', 'walking-to-table'],
  'walking-to-table': ['eating'],
  'waiting-cleaning': ['walking-to-table'],
  eating: ['leaving'],
  leaving: [],
};

export function actionKey(action: RestaurantAction): string { return JSON.stringify(action); }

// This model owns the restaurant state. Graphics only read it; transfers happen here synchronously.
export class Restaurant {
  opening = freshOpening(false);
  progression = freshProgression(false);
  readonly production = new Production();
  readonly options: Readonly<RestaurantOptions>;
  private readonly people = new Map<string, Customer>();
  private readonly tickets = new Map<string, Order>();
  private readonly seats = new Map<string, TableState>();
  private readonly lines: Record<Intent, string[]> = { 'dine-in': [], takeaway: [] };
  readonly staff = new Staff();
  readonly comments = new CustomerComments();
  readonly bulkOrders = new BulkOrders();
  private bulkUnlockedNotice = false;
  private spent = 0;
  private tier = 0;
  private demandNotice = false;
  private readonly locks = new Map<string, string>();
  private readonly loadReservations = new Map<string, string>();
  private levels: Record<UpgradeId, number> = { cook: 0, cleaner: 0, cashier: 0, transport: 0, actionSpeed: 0, stoveSpeed: 0, tables: 0, stove: 0 };
  private readonly random: () => number;
  private clockMs = 0;
  private arrivalElapsedMs = 0;
  private arrivalsActive = false;
  private firstArrival = true;
  private coins = 0;
  private cash: number = ECONOMY.initialCash;
  private debt: number = ECONOMY.initialDebt;
  private cashRevision = 0;
  private suppliesRevision = 0;
  private supplyIntroNotice = true;
  private largeSupplyNotice = false;
  private firstSaleSeen = false;
  private firstSaleNotice = false;
  private repaymentAnnounced = false;
  private repaymentNotice: IncomeSplit | null = null;
  get pendingCash(): number { return this.cash; }
  get supplierDebt(): number { return this.debt; }
  get supplyRevision(): number { return this.suppliesRevision; }
  get largeSupplyUnlocked(): boolean { return this.spent >= ECONOMY.largeSupplyUnlockSpending; }
  supplyProblem(method: SupplyPayment): Key | null {
    if (this.mode === 'opening' && !this.opening.counter) return 'opening.unavailable';
    if (method === 'large' && !this.largeSupplyUnlocked) return 'supplier.largeLocked';
    return method === 'credit' ? (this.debt > 0 ? 'supplier.debtOutstanding' : null) :
      this.coins < (method === 'large' ? ECONOMY.largeSupplyPrice : ECONOMY.cashPrice) ? 'supplier.insufficientFunds' : null;
  }
  buySupplies(method: SupplyPayment, expectedRevision = this.suppliesRevision): boolean {
    if (!['cash', 'credit', 'large'].includes(method) || expectedRevision !== this.suppliesRevision || this.supplyProblem(method)) return false;
    if (method !== 'credit') this.coins -= method === 'large' ? ECONOMY.largeSupplyPrice : ECONOMY.cashPrice;
    else { this.debt = ECONOMY.creditPrice; this.repaymentAnnounced = false; this.repaymentNotice = null; }
    this.production.restock(method === 'large' ? ECONOMY.largeSupplyQuantity : ECONOMY.supplyQuantity);
    this.suppliesRevision++; this.opening.supplied=true;
    return true;
  }
  previewIncome(gross: number): IncomeSplit { return splitIncome(gross, this.debt); }
  private receiveIncome(gross: number, destination: 'cash' | 'wallet'): IncomeSplit {
    const income = this.previewIncome(gross);
    this.debt = income.remainingDebt;
    if (destination === 'cash') this.cash += income.net;
    else this.coins += income.net;
    if (income.repaid > 0 && (!this.repaymentAnnounced || this.debt === 0)) {
      this.repaymentNotice = income; this.repaymentAnnounced = true;
    }
    return income;
  }
  takeEconomyNotice(): Message | null {
    if (this.mode === 'opening' && this.opening.collected && !this.opening.completionSeen) { this.opening.completionSeen=true; return 'opening.complete'; }
    for (const [flag,key] of [['officeNotice','progress.officeBuilt'],['diningNotice','progress.diningBuilt'],['ordersNotice','progress.ordersAvailable']] as const) {
      if(this.progression[flag]) { this.progression[flag]=false;return flag==='ordersNotice'?{key,params:{price:PROGRESSION.prices.orders}}:key; }
    }
    if (this.supplyIntroNotice) { this.supplyIntroNotice = false; return 'economy.startHint'; }
    if (this.largeSupplyNotice) { this.largeSupplyNotice = false; return { key: 'supplier.largeUnlocked', params: { quantity: ECONOMY.largeSupplyQuantity, price: ECONOMY.largeSupplyPrice } }; }
    if (this.firstSaleNotice) { this.firstSaleNotice = false; return 'economy.firstSale'; }
    if (this.repaymentNotice) {
      const income = this.repaymentNotice; this.repaymentNotice = null;
      return { key: income.remainingDebt === 0 ? 'economy.debtPaid' : 'economy.repayment',
        params: { repaid: income.repaid, debt: income.remainingDebt } };
    }
    if (this.production.takeLowStockNotice())
      return { key: 'economy.lowStock', params: { count: this.production.fridgeStock } };
    return null;
  }
  private epoch = 0;
  private sequence = 0;

  readonly mode:'opening'|'advanced';
  private readonly initialCoins: number;
  constructor(options: Partial<RestaurantOptions> = {}, random: () => number = Math.random, initialCoins: number = ECONOMY.initialCoins, mode: 'opening' | 'advanced' = 'advanced') {
    this.mode=mode;
    this.initialCoins = mode === 'opening' ? OPENING.initialCoins : initialCoins;
    this.options = { ...CUSTOMERS, ...options };
    this.random = random;
    this.reset();
  }


  private get boughtFurniture(): readonly StationData[] {
    return [...(this.mode==='opening'?ALL_TABLES:EXTRA_TABLES).slice(0, this.levels.tables), ...(this.levels.stove ? [EXTRA_STOVE] : [])];
  }
  get stations() { return this.mode === 'advanced' ? [...STATIONS, ...this.boughtFurniture] : STATIONS.filter(s =>
    s.kind === 'supplier' || (s.kind === 'fridge' && this.opening.fridge) || (s.kind === 'stove' && this.opening.stove) ||
    (['counter','cash'].includes(s.kind) && this.opening.counter) || (s.kind==='bin'&&this.progression.bin) ||
    (s.kind==='packing'&&this.progression.orders)).concat(this.boughtFurniture); }
  get routingObstacles(): Rect[] { return this.mode === 'opening' ? this.obstacles : [...STATIONS, ...EXTRA_TABLES, EXTRA_STOVE].map(s => s.footprint); }
  get obstacles(): Rect[] { return this.stations.map(s => s.footprint); }
  get interactionZones(): readonly InteractionZone[] {
    if (this.mode === 'advanced') return [...INTERACTION_ZONES, ...this.boughtFurniture.map(stationZone)];
    const ids = new Set(this.stations.map(s=>s.id));
    const zones = INTERACTION_ZONES.filter(z=>ids.has(z.stationId) && (z.role!=='supplier' || this.opening.counter));
    if(this.progression.office) zones.push(INTERACTION_ZONES.find(z=>z.id==='office')!);
    if(this.progression.orders) zones.push(INTERACTION_ZONES.find(z=>z.id==='board')!);
    zones.push(...this.boughtFurniture.filter(s=>!zones.some(z=>z.id===s.id)).map(stationZone));
    const build = this.availableBuild; if (build) zones.push(buildZone(build));
    if (this.canOpen) zones.push({id:'open-business',stationId:'open-business',role:'opening',name:'opening.open',position:OPEN_POINT});
    return zones;
  }
  get tableCount():number { return (this.mode==='advanced'?2:0)+this.levels.tables; }
  get availableBuild():BuildId|null {
    if(this.mode==='advanced')return null;
    return nextBuild(this.opening) ?? (this.opening.collected&&!this.progression.office?'office':
      this.progression.office&&this.levels.cook>0&&!this.progression.orders?'orders':null);
  }
  get canOpen(): boolean { return this.mode === 'opening' && !this.opening.open && !nextBuild(this.opening) && this.production.availablePortions > 0; }
  openBusiness(): boolean {
    if (!this.canOpen) return false;
    this.opening.open=true; this.arrivalsActive=true; this.firstArrival=true; this.arrivalElapsedMs=0; return true;
  }
  get tutorialStep(): string | null {
    if (this.mode === 'advanced') return null;
    if(this.opening.collected)return this.availableBuild;
    const o=this.opening,p=this.production;
    if (!o.moved && !o.repaired) return 'move';
    const build=nextBuild(o); if(build) return build;
    if(o.sold) return 'cash';
    if(o.open) return 'sale';
    if(p.availablePortions>0 || o.deposited) return 'open';
    if(p.inventory.meals>0 || o.meal) return 'deposit';
    if(p.stoveSummary.cooking+p.stoveSummary.ready>0 || o.cooked) return 'meal';
    if(p.inventory.ingredients>0 || o.ingredients) return 'cook';
    if(p.fridgeStock>0 || o.supplied) return 'ingredients';
    return 'supply';
  }
  get tutorialTarget(): Point | null {
    const step=this.tutorialStep;
    if(step==='move') return buildZone('repair').position;
    if(step && ['repair','fridge','stove','counter','office','orders'].includes(step)) return buildZone(step as BuildId).position;
    const id=step==='supply'?'supplier':step==='ingredients'?'fridge':step==='cook'||step==='meal'?'stove':step==='sale'?'checkout':step==='open'?'open-business':step;
    return this.interactionZones.find(z=>z.id===id)?.position??null;
  }
  buildProblem(id: BuildId, player: Point): Key | null {
    if(this.mode!=='opening' || this.availableBuild!==id) return 'opening.unavailable';
    if(this.coins<buildCost(id)) return 'purchase.funds';
    const future=id==='orders'?[PACKING_STATION]:STATIONS.filter(s=>s.id===id || (id==='counter' && s.id==='cash'));
    return this.placementProblem(future,player);
  }
  construct(id:BuildId,player:Point):boolean {
    if(this.buildProblem(id,player))return false;
    const future=id==='orders'?[PACKING_STATION]:STATIONS.filter(s=>s.id===id||(id==='counter'&&s.id==='cash'));
    const routes=this.planRoutes(future);if(!routes)return false;
    this.coins-=buildCost(id);
    if(id==='office'||id==='orders') {
      this.progression[id]=true;this.recordInvestment(buildCost(id));
      if(id==='office')this.progression.officeNotice=true;
      else {this.progression.ordersNotice=false;this.bulkOrders.unlock(this.options.price);this.bulkUnlockedNotice=true;}
    } else {
      this.opening.spent+=buildCost(id);
      if(id==='repair')this.opening.repaired=true;else this.opening[id]=true;
      if(id==='stove')this.production.addStove('stove');
    }
    for(const {actor,path} of routes)actor.route=path;
    return true;
  }
  private recordInvestment(amount:number):void {
    const largeWasUnlocked=this.largeSupplyUnlocked;
    this.spent+=amount;
    if(!largeWasUnlocked&&this.largeSupplyUnlocked)this.largeSupplyNotice=true;
    const tier=DEMAND.tiers.reduce((current,item,index)=>this.spent>=item.spending?index:current,0);
    if(tier!==this.tier){this.tier=tier;this.demandNotice=true;if(!this.firstArrival)this.arrivalElapsedMs=0;}
  }
  get teamCapacity(): number { return UPGRADES.transport.capacities[this.levels.transport]!; }
  get totalSpent(): number { return this.spent; }
  get demandTier(): number { return this.tier; }
  get demandFrequency(): number { return DEMAND.tiers[this.tier]!.frequency; }
  get increasedDemand(): boolean { return this.tier > 0; }
  get arrivalIntervalMs(): number { return this.options.arrivalMs / this.demandFrequency; }
  get arrivalsStarted(): boolean { return this.arrivalsActive; }
  get awaitingFirstArrival(): boolean { return this.arrivalsActive && this.firstArrival; }
  takeDemandNotice(): boolean { const value = this.demandNotice; this.demandNotice = false; return value; }
  takeBulkUnlockedNotice(): boolean { const value = this.bulkUnlockedNotice; this.bulkUnlockedNotice = false; return value; }
  acceptBulkOrder(id: number): boolean { return this.bulkOrders.accept(id); }
  claimBulkOrder(id: number): Message | null {
    const reward = this.bulkOrders.claim(id);
    if (!reward) return null;
    const income = this.receiveIncome(reward.payment, 'wallet');
    return income.repaid > 0 ? { key: reward.first ? 'bulk.firstPaidNet' : 'bulk.paidNet',
      params: { gross: income.gross, bonus: reward.bonus, repaid: income.repaid, net: income.net, debt: income.remainingDebt } } :
      { key: reward.first ? 'bulk.firstComplete' : 'bulk.complete', params: { payment: income.net, bonus: reward.bonus } };
  }
  cancelBulkOrder(id: number): boolean {
    const returned = this.bulkOrders.cancel(id);
    if (returned === null) return false;
    this.production.returnPackedMeals(returned);
    this.cancelAction('player');
    return true;
  }
  get teamActionMs(): number { return UPGRADES.actionSpeed.durationsMs[this.levels.actionSpeed]!; }
  upgradeLevel(id: UpgradeId): number { return this.levels[id]; }
  get activeReservations(): ReadonlyMap<string, string> { return new Map([...this.locks,
    ...this.production.reservedIngredients.map(actor => ['ingredient:' + actor, actor] as const)]); }
  get reservedProduction(): number { return this.loadReservations.size; }
  get committedProduction(): number {
    const stove = this.production.stoveSummary;
    return this.production.availablePortions + stove.cooking + stove.ready +
      this.staff.employees.filter(w => w.role === 'cook').reduce((sum, w) => sum + w.inventory.count('meals'), 0) +
      this.reservedProduction;
  }
  resourceAvailable(resource: string, actorId: string): boolean { return !this.locks.has(resource) || this.locks.get(resource) === actorId; }
  private actorInventory(actorId: string): Inventory | undefined {
    return actorId === 'player' ? this.production.playerInventory : this.staff.get(actorId)?.inventory;
  }
  private resourceKey(command: RestaurantAction): string | null {
    return command.kind === 'checkout' ? 'checkout' : command.kind === 'clean' ? 'table:' + command.tableId :
      command.kind === 'production' && command.slotIndex !== undefined ? 'slot:' + command.stoveId + ':' + command.slotIndex : null;
  }
  beginAction(command: RestaurantAction, actorId = 'player'): boolean {
    this.cancelAction(actorId);
    if (this.validate(command, actorId)) return false;
    if (command.kind === 'production' && command.action === 'take-ingredients' && !this.production.reserveIngredient(actorId)) return false;
    const key = this.resourceKey(command);
    if (key) this.locks.set(key, actorId);
    if (this.staff.get(actorId)?.role === 'cook' && command.kind === 'production' && command.action === 'start-cooking')
      this.loadReservations.set(actorId, actionKey(command));
    return true;
  }
  cancelAction(actorId = 'player'): void {
    this.loadReservations.delete(actorId); this.production.releaseIngredient(actorId);
    for (const [resource, owner] of this.locks) if (owner === actorId) this.locks.delete(resource);
  }
  perform(command: RestaurantAction, actorId = 'player'): Message | null {
    try { return this.apply(command, actorId); }
    finally { this.cancelAction(actorId); }
  }
  purchaseState(id: UpgradeId, player: Point = PLAYER.spawn): { level: number; price: number | null; problem: Key | null } {
    const level = this.levels[id], price = (id==='tables'&&this.mode==='opening'?PROGRESSION.tablePrices:UPGRADES[id].prices)[level] ?? null;
    const secondCookReady = this.staff.get('cook') && this.levels.stove > 0 && this.production.slotsFor(EXTRA_STOVE.id).length > 0;
    const problem = !this.progression.office ? 'progress.needOffice' : id === 'transport' && !UPGRADES.transport.enabled ? 'purchase.disabledCapacity' : price === null ? (id === 'tables' ? 'limit.tables' : id === 'cook' ? 'limit.cooks' : 'limit.max') :
      id === 'cleaner' && (!this.tableCount||!this.progression.bin) ? 'progress.needDining' :
      id === 'cashier' && !this.staff.get('cook') ? 'purchase.firstCook' :
      id === 'cook' && level === 1 && !secondCookReady ? 'purchase.secondCook' :
      this.coins < price ? 'purchase.funds' :
      this.furnitureToBuy(id) ? this.placementProblem(this.purchaseFurniture(id), player) : null;
    return { level, price, problem };
  }
  purchase(id: UpgradeId, expectedLevel: number, player: Point = PLAYER.spawn): boolean {
    if (!(id in UPGRADES) || this.levels[id] !== expectedLevel) return false;
    const offer = this.purchaseState(id, player);
    if (offer.problem || offer.price === null) return false;
    const furniture = this.furnitureToBuy(id);
    const routes=this.planRoutes(this.purchaseFurniture(id));if(!routes)return false;
    // Validate all bundled furniture and routes before the single debit.
    this.coins -= offer.price; this.levels[id]++;
    this.recordInvestment(offer.price);
    if(id==='tables'&&this.mode==='opening'&&this.levels.tables===1){this.progression.bin=true;this.progression.diningNotice=true;}
    if (id === 'cook' || id === 'cleaner' || id === 'cashier') {
      this.staff.hire(id === 'cook' && this.levels.cook === 2 ? 'cook-2' : id, this.teamCapacity);
      // A second cook fixes stove ownership; only tasks on the now unassigned stove become invalid.
      for (const worker of this.staff.employees)
        if (worker.task && this.validate(worker.task.command, worker.id)) this.staff.cancel(worker.id, this);
    }
    if(id==='cook'&&this.levels.cook===1) {
      if(this.progression.orders){if(this.bulkOrders.unlock(this.options.price))this.bulkUnlockedNotice=true;}
      else this.progression.ordersNotice=true;
    }
    if (id === 'transport') {
      const capacity = UPGRADES.transport.capacities[this.levels.transport]!;
      this.production.playerInventory.setLimits({ ingredients: capacity, meals: capacity, waste: capacity });
      this.staff.upgradeCapacity(capacity);
    }
    if (id === 'stoveSpeed') this.production.cookingMs = UPGRADES.stoveSpeed.durationsMs[this.levels.stoveSpeed]!;
    if (furniture) {
      if (furniture.kind === 'table') this.seats.set(furniture.id, { id: furniture.id, cleanliness: 'clean', customerId: null, dirtySince: null });
      if (furniture.kind === 'stove') this.production.addStove(furniture.id);
      // Replan from current positions without changing tasks, reservations or elapsed actions.
      for (const { actor, path } of routes) actor.route = path;
    }
    return true;
  }
  private furnitureToBuy(id: UpgradeId): StationData | undefined {
    return id === 'tables' ? (this.mode==='opening'?ALL_TABLES:EXTRA_TABLES)[this.levels.tables] : id === 'stove' && this.levels.stove === 0 ? EXTRA_STOVE : undefined;
  }
  private purchaseFurniture(id:UpgradeId):StationData[] {
    const item=this.furnitureToBuy(id);
    return [...(item?[item]:[]),...(id==='tables'&&this.mode==='opening'&&this.levels.tables===0?[STATIONS.find(s=>s.id==='bin')!]:[])];
  }
  private planRoutes(extra:readonly StationData[]):{actor:{route:Point[]};path:Point[]}[]|null {
    const obstacles=[...this.routingObstacles,...extra.map(s=>s.footprint)];
    const routes:{actor:{route:Point[]};path:Point[]}[]=[];
    for(const actor of this.people.values())if(actor.route.length){const path=findCustomerPath(actor.position,actor.route.at(-1)!,obstacles);if(!path)return null;routes.push({actor,path});}
    for(const actor of this.staff.employees)if(actor.route.length){const path=findPath(actor.position,actor.route.at(-1)!,obstacles);if(!path)return null;routes.push({actor,path});}
    return routes;
  }
  private placementProblem(extra: readonly StationData[], player: Point): Key | null {
    const obstacles = [...this.obstacles, ...extra.map(s=>s.footprint)];
    const routing=[...this.routingObstacles,...extra.map(s=>s.footprint)];
    if (!canStand(player, obstacles) || this.staff.employees.some(a => !canStand(a.position, obstacles)) ||
        [...this.people.values()].some(a => !canStandCustomer(a.position, obstacles)))
      return 'purchase.occupied';
    const tableIds = [...this.seats.keys(), ...extra.filter(s=>s.kind==='table').map(s=>s.id)];
    const publicDestinations = [...Object.values(CUSTOMER_LAYOUT), ...Object.values(QUEUE_POINTS).flat(),
      ...tableIds.flatMap(key => [TABLE_POSITIONS[key]!.seat, CLEANING_WAIT_POINTS[key]!])];
    const workDestinations = [...Object.values(STAFF_POSITIONS), ...this.interactionZones.map(z => z.position), ...extra.map(s=>s.interaction)];
    if (workDestinations.some(p => !findPath(player, p, routing)) ||
        publicDestinations.some(p => !findCustomerPath(QUEUE_POINTS['dine-in'][0]!, p, routing)) ||
        [...this.people.values()].some(a => a.route.length > 0 && !findCustomerPath(a.position, a.route.at(-1)!, routing)) ||
        this.staff.employees.some(a => a.route.length > 0 && !findPath(a.position, a.route.at(-1)!, routing)))
      return 'purchase.route';
    return null;
  }

  get customers(): readonly Readonly<Customer>[] { return [...this.people.values()]; }
  get orders(): readonly Readonly<Order>[] { return [...this.tickets.values()]; }
  get tables(): readonly Readonly<TableState>[] { return [...this.seats.values()]; }
  get money(): number { return this.coins; }
  get elapsedMs(): number { return this.clockMs; }
  queue(intent: Intent): readonly string[] { return this.lines[intent]; }
  table(id: string): Readonly<TableState> | undefined { return this.seats.get(id); }
  order(id: string): Readonly<Order> | undefined { return this.tickets.get(id); }
  customer(id: string): Readonly<Customer> | undefined { return this.people.get(id); }

  // One attempted arrival, fixed intention. A full chosen queue drops it, without fallback or debt.
  admitCustomer(intent: Intent): string | null {
    if (this.mode === 'opening' && (!this.opening.open || (intent==='dine-in'&&!this.tableCount))) return null;
    if (this.people.size >= this.options.maxCustomers ||
        this.lines[intent].length >= Math.min(this.options.queueLimits[intent], QUEUE_POINTS[intent].length)) return null;
    const id = this.epoch + '-c' + (++this.sequence);
    const customer: Customer = {
      id, number: this.sequence, intent, phase: 'entering', position: { ...CUSTOMER_ENTRIES[intent] },
      route: [], waitingSince: null, queueIndex: this.lines[intent].length, orderId: null, eatingElapsedMs: 0, carryingMeal: false,
    };
    const route = findCustomerPath(customer.position, QUEUE_POINTS[intent][customer.queueIndex]!, this.routingObstacles);
    if (!route) return null;
    customer.route = route;
    this.people.set(id, customer);
    this.comments.admit(id);
    this.lines[intent].push(id);
    return id;
  }

  update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
    this.clockMs += deltaMs;
    this.bulkOrders.update(deltaMs, this.options.price, this.random);
    this.production.update(deltaMs);
    for (const customer of [...this.people.values()]) {
      if (customer.phase === 'eating') {
        customer.eatingElapsedMs += deltaMs;
        if (customer.eatingElapsedMs >= this.options.eatingMs) this.finishMeal(customer);
      } else if (customer.route.length > 0) {
        this.walk(customer, deltaMs);
      }
    }
    this.staff.update(this, deltaMs);
    if (!this.arrivalsActive) return;
    this.arrivalElapsedMs += deltaMs;
    if (this.arrivalElapsedMs + 0.000001 >= (this.firstArrival ? (this.mode === 'opening' ? OPENING.firstArrivalMs : DEMAND.firstArrivalDelayMs) : this.arrivalIntervalMs)) {
      this.arrivalElapsedMs = 0; this.firstArrival = false;
      this.admitCustomer(!this.tableCount ? 'takeaway' : this.random() < this.options.dineInChance ? 'dine-in' : 'takeaway');
    }
  }

  // Called after collision resolution: key intent, blocked movement and staff never activate arrivals.
  playerMoved(from: Point, to: Point): void {
    if (this.mode === 'opening') { if (Math.hypot(to.x-from.x,to.y-from.y)>0) this.opening.moved=true; return; }
    if (this.arrivalsActive || ![from.x, from.y, to.x, to.y].every(Number.isFinite) ||
        Math.hypot(to.x - from.x, to.y - from.y) <= 0) return;
    this.arrivalsActive = true; this.firstArrival = true; this.arrivalElapsedMs = 0;
  }

  offer(zone: InteractionZone, actorId = 'player'): Offer {
    if (!this.interactionZones.some(z=>z.id===zone.id)) return {command:null,reason:'opening.unavailable'};
    if (zone.role==='construction'||zone.role==='opening') return {command:null,reason:'opening.unavailable'};
    const inventory = this.actorInventory(actorId);
    if (!inventory) return { command: null, reason: 'reason.actor' };
    if (zone.role === 'supplier') return { command: null, reason: 'supplier.hint' };
    if (zone.role === 'cash') {
      const command: RestaurantAction = { kind: 'collect-cash', revision: this.cashRevision };
      const reason = this.validate(command, actorId);
      return reason ? { command: null, reason } : { command, label: 'action.collectCash' };
    }
    if (zone.role === 'board') return { command: null, reason: 'bulk.boardHint' };
    if (zone.role === 'packing') {
      if (actorId !== 'player') return { command: null, reason: 'bulk.playerOnly' };
      const order = this.bulkOrders.state;
      if (order.phase !== 'active') return { command: null, reason: order.phase === 'ready' ? 'bulk.readyNotice' : 'bulk.needActive' };
      const command: RestaurantAction = inventory.has('meals') ?
        { kind: 'pack', orderId: order.id, packed: order.packed } :
        { kind: 'withdraw', orderId: order.id, carried: inventory.count('meals') };
      const reason = this.validate(command, actorId);
      return reason ? { command: null, reason } : { command, label: command.kind === 'pack' ? 'action.pack' : 'action.withdraw' };
    }
    if (zone.role === 'office') return { command: null, reason: 'reason.office' };
    if (zone.role === 'checkout') {
      if (actorId !== 'player' && this.staff.get(actorId)?.role !== 'cashier') return { command: null, reason: 'reason.playerCheckout' };
      if (!this.resourceAvailable('checkout', actorId)) return { command: null, reason: 'reason.checkoutBusy' };
      const eligible = (['dine-in', 'takeaway'] as const).map(intent => {
        const id = this.lines[intent][0];
        const customer = id ? this.people.get(id) : undefined;
        if (!customer || customer.phase !== 'queueing' || this.production.availablePortions < 1) return null;
        const table = customer.intent === 'dine-in' ? this.chooseTable() : null;
        if (customer.intent === 'dine-in' && !table) return null;
        return { customer, table };
      }).filter(item => item !== null).sort((a, b) =>
        (a.customer.waitingSince! - b.customer.waitingSince!) || a.customer.number - b.customer.number);
      const next = eligible[0];
      if (!next) return { command: null, reason: this.production.availablePortions < 1 ? 'reason.noStock' :
        this.lines['dine-in'].length + this.lines.takeaway.length === 0 ? 'reason.waitCustomers' :
        !this.chooseTable() && this.lines['dine-in'].length > 0 ? 'reason.noTables' : 'reason.customerArriving' };
      return { command: { kind: 'checkout', customerId: next.customer.id, tableId: next.table?.id ?? null },
        label: { key: next.customer.intent === 'takeaway' ? 'action.checkoutTakeaway' : 'action.checkoutDineIn', params: { number: next.customer.number } } };
    }
    if (zone.role === 'table') {
      const table = this.seats.get(zone.stationId);
      if (!table) return { command: null, reason: 'reason.tableUnavailable' };
      if (!this.resourceAvailable('table:' + table.id, actorId)) return { command: null, reason: 'reason.tableBeingCleaned' };
      if (table.cleanliness === 'dirty') return inventory.canAdd('waste') ?
        { command: { kind: 'clean', tableId: table.id }, label: 'action.clean' } :
        { command: null, reason: 'reason.wasteFull' };
      return { command: null, reason: table.customerId ? 'reason.tableReserved' : 'reason.tableClean' };
    }
    if (zone.stationId === 'fridge' && this.production.ingredientsAvailable(actorId) < 1)
      return { command: null, reason: this.production.fridgeStock < 1 ? 'economy.fridgeEmpty' : 'economy.ingredientsReserved' };
    const kind = this.stations.find(s => s.id === zone.stationId)!.kind;
    const available = this.production.availableAt(kind, inventory, index => this.resourceAvailable('slot:' + zone.stationId + ':' + index, actorId), zone.stationId);
    return available.action ? { command: { kind: 'production', action: available.action, stoveId: kind === 'stove' ? zone.stationId : undefined, slotIndex: available.slotIndex }, label: available.label } : { command: null, reason: available.reason };
  }

  validate(command: RestaurantAction, actorId = 'player'): Key | null {
    if(this.mode==='opening') {
      const o=this.opening;
      if(command.kind==='clean'&&!this.tableCount)return 'opening.unavailable';
      if((command.kind==='pack'||command.kind==='withdraw')&&!this.progression.orders)return 'opening.unavailable';
      if(command.kind==='checkout'&&(!o.open||!o.counter))return 'opening.unavailable';
      if(command.kind==='collect-cash'&&!o.counter)return 'opening.unavailable';
      if(command.kind==='production'&&((command.action==='take-ingredients'&&!o.fridge)||
        (['start-cooking','take-meal'].includes(command.action)&&!o.stove)||
        (command.action==='store-meal'&&!o.counter)||(command.action==='discard'&&!this.progression.bin)))return 'opening.unavailable';
    }
    const inventory = this.actorInventory(actorId);
    if (!inventory) return 'reason.actor';
    const resource = this.resourceKey(command);
    if (resource && !this.resourceAvailable(resource, actorId)) return 'reason.resourceBusy';
    if (command.kind === 'production' && (command.action === 'start-cooking' || command.action === 'take-meal') && (command.slotIndex === undefined || command.stoveId === undefined)) return 'reason.missingSlot';
    const worker = this.staff.get(actorId);
    if (worker?.role === 'cashier' && command.kind !== 'checkout') return 'reason.cashierRole';
    if (worker?.role === 'cleaner' && !(command.kind === 'clean' || (command.kind === 'production' && command.action === 'discard'))) return 'reason.cleanerRole';
    if (worker?.role === 'cook') {
      if (command.kind !== 'production' || command.action === 'discard') return 'reason.cookRole';
      if (command.stoveId && worker.assignedStove && command.stoveId !== worker.assignedStove) return 'reason.otherStove';
      // The pending load already owns one unit of capacity. Replace it with the real portion on completion.
      const ownReservation = this.loadReservations.get(actorId) === actionKey(command) ? 1 : 0;
      if ((command.action === 'start-cooking' || command.action === 'take-ingredients') &&
          this.committedProduction - ownReservation >= STAFF.cookStockTarget) return 'reason.productionTarget';
    }
    if (command.kind === 'withdraw' || command.kind === 'pack') {
      if (actorId !== 'player') return 'bulk.playerOnly';
      const order = this.bulkOrders.state;
      if (order.phase !== 'active' || order.id !== command.orderId) return 'bulk.needActive';
      if (command.kind === 'pack') return !this.bulkOrders.canPack(command.orderId, command.packed) ?
        'reason.actionUnavailable' : !inventory.has('meals') ? 'reason.noMealsCarried' : null;
      if (inventory.count('meals') !== command.carried) return 'reason.actionUnavailable';
      if (command.carried >= this.bulkOrders.pending) return 'bulk.enoughCarried';
      if (!inventory.canAdd('meals')) return 'reason.mealsFull';
      return this.production.availablePortions < 1 ? 'reason.noStock' : null;
    }
    if (command.kind === 'collect-cash') return actorId !== 'player' ? 'economy.playerCash' :
      command.revision !== this.cashRevision ? 'reason.actionUnavailable' : this.cash < 1 ? 'economy.cashEmpty' : null;
    if (command.kind === 'production' && command.action === 'take-ingredients' && this.production.ingredientsAvailable(actorId) < 1)
      return this.production.fridgeStock < 1 ? 'economy.fridgeEmpty' : 'economy.ingredientsReserved';
    if (command.kind === 'production') return this.production.canPerform(command.action, command.slotIndex, inventory, command.stoveId, actorId) ? null : 'reason.productionUnavailable';
    if (command.kind === 'clean') {
      const table = this.seats.get(command.tableId);
      return !inventory.canAdd('waste') ? 'reason.wasteFull' : table?.cleanliness !== 'dirty' ? 'reason.tableAlreadyClean' : null;
    }
    if (command.kind === 'checkout') {
      if (actorId !== 'player' && this.staff.get(actorId)?.role !== 'cashier') return 'reason.playerCheckout';
      const cashier = this.staff.get(actorId);
      if (cashier?.role === 'cashier' && Math.hypot(cashier.position.x - CASHIER_WORK.x, cashier.position.y - CASHIER_WORK.y) > .1) return 'reason.cashierPosition';
      const customer = this.people.get(command.customerId);
      if (!customer || customer.phase !== 'queueing' || customer.orderId || this.lines[customer.intent][0] !== customer.id) return 'reason.customerNotReady';
      if (this.production.availablePortions < 1) return 'reason.stockGone';
      if (customer.intent === 'dine-in') {
        const table = command.tableId ? this.seats.get(command.tableId) : undefined;
        if (!table || table.customerId !== null) return 'reason.chosenTableGone';
      } else if (command.tableId !== null) return 'reason.takeawayTable';
      return null;
    }
    return 'reason.actionUnavailable';
  }

  private apply(command: RestaurantAction, actorId: string): Message | null {
    if (this.validate(command, actorId)) return null;
    const inventory = this.actorInventory(actorId)!;
    if (command.kind === 'production') {
      const result=this.production.perform(command.action, command.slotIndex, inventory, command.stoveId, actorId);
      if(result) { if(command.action==='take-ingredients')this.opening.ingredients=true;
        if(command.action==='start-cooking')this.opening.cooked=true;
        if(command.action==='take-meal')this.opening.meal=true;
        if(command.action==='store-meal')this.opening.deposited=true; }
      return result;
    }
    if (command.kind === 'collect-cash') {
      const amount = this.cash; this.cash = 0; this.cashRevision++; this.coins += amount; if(this.opening.sold)this.opening.collected=true;
      return { key: 'economy.cashCollected', params: { amount } };
    }
    if (command.kind === 'checkout') {
      const customer = this.people.get(command.customerId)!;
      const table = command.tableId ? this.seats.get(command.tableId)! : null;
      const destination = table ? (table.cleanliness === 'clean' ? TABLE_POSITIONS[table.id]!.seat : CLEANING_WAIT_POINTS[table.id]!) : CUSTOMER_LAYOUT.exit;
      const route = findCustomerPath(customer.position, destination, this.routingObstacles);
      if (!route) return null; // Validate the physical route before stock, money or reservations change.
      const id = 'order-' + customer.id;
      if (!this.production.sellAvailable()) return null;
      const order: Order = { id, customerId: customer.id, number: customer.number, tableId: table?.id ?? null,
        paidAt: this.clockMs, status: table ? 'carried' : 'takeaway' };
      this.tickets.set(id, order);
      customer.orderId = id;
      this.comments.remove(customer.id);
      customer.carryingMeal = table !== null;
      if (table) table.customerId = customer.id;
      this.receiveIncome(this.options.price, 'cash'); this.opening.sold=true;
      if (!this.firstSaleSeen) { this.firstSaleSeen = true; this.firstSaleNotice = true; }
      this.lines[customer.intent].shift();
      this.transition(customer, table ? (table.cleanliness === 'clean' ? 'walking-to-table' : 'walking-to-cleaning-wait') : 'leaving');
      customer.route = route;
      this.advanceQueue(customer.intent);
      return { key: table ? 'result.checkoutDineIn' : 'result.checkoutTakeaway', params: { price: this.options.price, number: customer.number } };
    }
    if (command.kind === 'withdraw') return this.production.withdrawMeal(inventory) ? 'result.withdraw' : null;
    if (command.kind === 'pack') {
      const packed = this.bulkOrders.pack(command.orderId, command.packed);
      if (!packed) return null;
      inventory.change('meals', -1);
      return packed.ready ? 'bulk.readyNotice' : 'result.packed';
    }
    const table = this.seats.get(command.tableId)!;
    if (!this.production.collectWaste(inventory)) return null;
    table.dirtySince = null;
    table.cleanliness = 'clean'; // Assignment is deliberately independent and retained.
    const customer = table.customerId ? this.people.get(table.customerId) : undefined;
    if (customer && (customer.phase === 'waiting-cleaning' || customer.phase === 'walking-to-cleaning-wait')) this.sendToTable(customer, table.id);
    return 'result.clean';
  }

  reset(): void {
    this.opening=freshOpening(this.mode==='advanced');this.progression=freshProgression(this.mode==='advanced');
    this.staff.reset(); this.locks.clear(); this.loadReservations.clear(); this.comments.reset();
    this.spent = 0; this.tier = 0; this.demandNotice = false;
    this.bulkOrders.reset(); this.bulkUnlockedNotice = false;
    for (const id of Object.keys(this.levels) as UpgradeId[]) this.levels[id] = 0;
    this.production.reset(); if(this.mode==='opening')this.production.removeStoves();
    this.people.clear(); this.tickets.clear(); this.seats.clear();
    this.lines['dine-in'].length = 0; this.lines.takeaway.length = 0;
    for (const station of this.stations.filter(s => s.kind === 'table')) this.seats.set(station.id, { id: station.id, cleanliness: 'clean', customerId: null, dirtySince: null });
    this.arrivalsActive = false; this.firstArrival = true;
    this.clockMs = 0; this.arrivalElapsedMs = 0; this.coins = this.initialCoins; this.sequence = 0;
    this.cash = ECONOMY.initialCash; this.debt = ECONOMY.initialDebt; this.cashRevision++; this.suppliesRevision++;
    this.supplyIntroNotice = this.mode==='advanced'; this.largeSupplyNotice = false; this.firstSaleSeen = false; this.firstSaleNotice = false;
    this.repaymentNotice = null; this.repaymentAnnounced = false;
    this.epoch++; // Old prepared actions can never refer to a new customer after resetting.
  }

  snapshot() {
    return {mode:this.mode,opening:{...this.opening},progression:{...this.progression},coins:this.coins,cash:this.cash,debt:this.debt,spent:this.spent,
      levels:{...this.levels},clockMs:this.clockMs,arrivalElapsedMs:this.arrivalElapsedMs,arrivalsActive:this.arrivalsActive,
      firstArrival:this.firstArrival,epoch:this.epoch,sequence:this.sequence,production:this.production.snapshot(),staff:this.staff.snapshot(),
      bulk:this.bulkOrders.snapshot(),tables:this.tables.map(t=>({...t})),orders:this.orders.map(o=>({...o})),
      customers:this.customers.map(({route:_route,...c})=>({...c,position:{...c.position}})),
      lines:{'dine-in':[...this.lines['dine-in']],takeaway:[...this.lines.takeaway]},
      notices:{bulk:this.bulkUnlockedNotice,demand:this.demandNotice,supply:this.supplyIntroNotice,large:this.largeSupplyNotice,
        firstSaleSeen:this.firstSaleSeen,firstSale:this.firstSaleNotice,repaymentAnnounced:this.repaymentAnnounced,
        repayment:this.repaymentNotice?{...this.repaymentNotice}:null}};
  }
  restore(data:ReturnType<Restaurant['snapshot']>):void {
    if(data.mode!==this.mode)throw new Error('Wrong session');
    this.reset();this.opening={...data.opening};this.progression={...data.progression};this.coins=data.coins;this.cash=data.cash;this.debt=data.debt;this.spent=data.spent;
    this.levels={...data.levels};this.tier=DEMAND.tiers.reduce((t,v,i)=>this.spent>=v.spending?i:t,0);
    this.clockMs=data.clockMs;this.arrivalElapsedMs=data.arrivalElapsedMs;this.arrivalsActive=data.arrivalsActive;
    this.firstArrival=data.firstArrival;this.epoch=data.epoch+1;this.sequence=data.sequence;
    this.production.playerInventory.reset({ingredients:this.teamCapacity,meals:this.teamCapacity,waste:this.teamCapacity});
    this.production.restore(data.production);this.staff.restore(data.staff,this.teamCapacity);this.bulkOrders.restore(data.bulk);
    this.seats.clear();for(const table of data.tables)this.seats.set(table.id,{...table});
    this.tickets.clear();for(const order of data.orders)this.tickets.set(order.id,{...order});
    for(const intent of ['dine-in','takeaway'] as const)this.lines[intent].push(...data.lines[intent]);
    for(const c of data.customers) {
      const customer:Customer={...c,position:{...c.position},route:[]};
      const order=c.orderId?this.tickets.get(c.orderId):null;
      const target=c.phase==='entering'||c.phase==='walking-to-queue'?QUEUE_POINTS[c.intent][c.queueIndex]:
        c.phase==='walking-to-table'?TABLE_POSITIONS[order!.tableId!]!.seat:
        c.phase==='walking-to-cleaning-wait'?CLEANING_WAIT_POINTS[order!.tableId!]:
        c.phase==='leaving'?CUSTOMER_LAYOUT.exit:null;
      if(target)customer.route=this.requireRoute(customer.position,target);
      this.people.set(c.id,customer);this.comments.admit(c.id);
    }
    const n=data.notices;this.bulkUnlockedNotice=n.bulk;this.demandNotice=n.demand;this.supplyIntroNotice=n.supply;
    this.largeSupplyNotice=n.large;this.firstSaleSeen=n.firstSaleSeen;this.firstSaleNotice=n.firstSale;
    this.repaymentAnnounced=n.repaymentAnnounced;this.repaymentNotice=n.repayment?{...n.repayment}:null;
  }

  private chooseTable(): TableState | undefined {
    const free = [...this.seats.values()].filter(table => table.customerId === null);
    return free.find(table => table.cleanliness === 'clean') ?? free[0];
  }
  private transition(customer: Customer, phase: CustomerPhase): void {
    if (!TRANSITIONS[customer.phase].includes(phase)) throw new Error('Transición inválida: ' + customer.phase + ' → ' + phase);
    customer.phase = phase;
  }
  private advanceQueue(intent: Intent): void {
    this.lines[intent].forEach((id, index) => {
      const customer = this.people.get(id)!;
      if (customer.queueIndex === index) return;
      customer.queueIndex = index;
      if (customer.phase !== 'entering') this.sendToQueue(customer);
    });
  }
  private sendToQueue(customer: Customer): void {
    const destination = QUEUE_POINTS[customer.intent][customer.queueIndex]!;
    customer.route = this.requireRoute(customer.position, destination);
    this.transition(customer, 'walking-to-queue');
    if (customer.route.length === 0) this.arrived(customer);
  }
  private sendToTable(customer: Customer, tableId: string): void {
    customer.route = this.requireRoute(customer.position, TABLE_POSITIONS[tableId]!.seat);
    this.transition(customer, 'walking-to-table');
    if (customer.route.length === 0) this.arrived(customer);
  }
  private requireRoute(from: Point, to: Point): Point[] {
    const route = findCustomerPath(from, to, this.routingObstacles);
    if (!route) throw new Error('El itinerario del cliente no tiene un camino accesible.');
    return route;
  }
  private walk(customer: Customer, deltaMs: number): void {
    let distance = this.options.speed * deltaMs / 1000;
    while (distance > 0 && customer.route.length > 0) {
      const target = customer.route[0]!;
      const dx = target.x - customer.position.x, dy = target.y - customer.position.y;
      const length = Math.hypot(dx, dy);
      if (length <= distance) {
        customer.position = { ...target };
        customer.route.shift(); distance -= length;
      } else {
        customer.position.x += dx / length * distance;
        customer.position.y += dy / length * distance;
        distance = 0;
      }
    }
    if (customer.route.length === 0) this.arrived(customer);
  }
  private arrived(customer: Customer): void {
    switch (customer.phase) {
      case 'entering': this.sendToQueue(customer); break;
      case 'walking-to-queue':
        this.transition(customer, 'queueing');
        customer.waitingSince ??= this.clockMs;
        break;
      case 'walking-to-cleaning-wait': {
        const table = this.seats.get(this.tickets.get(customer.orderId!)!.tableId!)!;
        if (table.cleanliness === 'dirty') this.transition(customer, 'waiting-cleaning');
        else this.sendToTable(customer, table.id);
        break;
      }
      case 'walking-to-table': {
        const order = this.tickets.get(customer.orderId!)!;
        this.transition(customer, 'eating');
        customer.carryingMeal = false;
        customer.eatingElapsedMs = 0;
        order.status = 'eating';
        break;
      }
      case 'leaving':
        if (customer.orderId) this.tickets.delete(customer.orderId);
        this.people.delete(customer.id); this.comments.remove(customer.id);
        break;
    }
  }
  private finishMeal(customer: Customer): void {
    const order = this.tickets.get(customer.orderId!)!;
    const table = this.seats.get(order.tableId!)!;
    const route = findCustomerPath(customer.position, CUSTOMER_LAYOUT.exit, this.routingObstacles);
    if (!route) return;
    order.status = 'consumed';
    table.cleanliness = 'dirty'; table.customerId = null; table.dirtySince = this.clockMs;
    this.transition(customer, 'leaving');
    customer.route = route;
  }
}

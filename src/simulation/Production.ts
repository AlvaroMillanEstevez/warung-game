import type { Key } from '../i18n/core.ts';
import { ECONOMY, PRODUCTION } from '../config.ts';
import type { StationKind } from '../world/layout.ts';
import { Inventory } from './Inventory.ts';
import type { InventoryLimits, InventoryState } from './Inventory.ts';
export type { InventoryLimits, InventoryState } from './Inventory.ts';

export type StoveState = { readonly status: 'empty' } |
  { readonly status: 'cooking'; readonly elapsedMs: number; readonly durationMs: number } | { readonly status: 'ready' };
export type ProductionAction = 'take-ingredients' | 'start-cooking' | 'take-meal' | 'store-meal' | 'discard';
export type Availability = { action: ProductionAction; label: Key; slotIndex?: number } | { action: null; reason: Key };
export interface ProductionOptions { cookingMs: number; stoveSlots: number; inventory: InventoryLimits }

// One implementation of transfers and clocks, keyed by stove and slot.
export class Production {
  readonly playerInventory: Inventory;
  private readonly kitchens = new Map<string, StoveState[]>();
  private readonly slotCount: number;
  private stock = 0;
  private ingredients: number = ECONOMY.initialIngredients;
  private readonly ingredientClaims = new Set<string>();
  private lowStockNotice = false;
  get fridgeStock(): number { return this.ingredients; }
  get reservedIngredients(): readonly string[] { return [...this.ingredientClaims]; }
  ingredientsAvailable(actorId = 'player'): number {
    return this.ingredients - this.ingredientClaims.size + (this.ingredientClaims.has(actorId) ? 1 : 0);
  }
  reserveIngredient(actorId: string): boolean {
    if (this.ingredientsAvailable(actorId) < 1) return false;
    this.ingredientClaims.add(actorId); return true;
  }
  releaseIngredient(actorId: string): void { this.ingredientClaims.delete(actorId); }
  restock(count: number): void {
    if (!Number.isSafeInteger(count) || count < 0 || !Number.isSafeInteger(this.ingredients + count))
      throw new Error('Invalid ingredient quantity');
    this.ingredients += count;
    if (this.ingredients > ECONOMY.lowStockThreshold) this.lowStockNotice = false;
  }
  takeLowStockNotice(): boolean { const pending = this.lowStockNotice; this.lowStockNotice = false; return pending; }
  cookingMs: number;
  private readonly initialCookingMs: number;
  private readonly initialLimits: InventoryLimits;
  constructor(options: Partial<ProductionOptions> = {}) {
    this.initialLimits = { ...PRODUCTION.inventory, ...options.inventory };
    this.cookingMs = this.initialCookingMs = options.cookingMs ?? PRODUCTION.cookingMs;
    this.slotCount = options.stoveSlots ?? PRODUCTION.stoveSlots;
    if (![this.slotCount, ...Object.values(this.initialLimits)].every(n => Number.isInteger(n) && n > 0) ||
        !Number.isFinite(this.cookingMs) || this.cookingMs <= 0) throw new Error('Capacidades y duración deben ser positivas.');
    this.playerInventory = new Inventory(this.initialLimits);
    this.addStove('stove');
  }
  get limits(): InventoryLimits { return this.inventory.limits; }
  get inventory(): InventoryState { return this.playerInventory.state as InventoryState; }
  get stoveIds(): readonly string[] { return [...this.kitchens.keys()]; }
  slotsFor(id: string): readonly StoveState[] { return (this.kitchens.get(id) ?? []).map(slot => ({ ...slot })); }
  addStove(id: string): boolean {
    if (this.kitchens.has(id)) return false;
    this.kitchens.set(id, Array.from({ length: this.slotCount }, () => ({ status: 'empty' })));
    return true;
  }
  get stoveSummary(): { cooking: number; ready: number; empty: number } {
    const slots = [...this.kitchens.values()].flat();
    return { cooking: slots.filter(s => s.status === 'cooking').length,
      ready: slots.filter(s => s.status === 'ready').length, empty: slots.filter(s => s.status === 'empty').length };
  }
  get availablePortions(): number { return this.stock; }
  hasMealSpace(): boolean { return this.playerInventory.canAdd('meals'); }
  hasWasteSpace(): boolean { return this.playerInventory.canAdd('waste'); }

  availableAt(kind: StationKind, inventory = this.playerInventory, slotAllowed: (index: number) => boolean = () => true,
    stoveId = 'stove'): Availability {
    switch (kind) {
      case 'fridge': return this.ingredients < 1 ? { action: null, reason: 'economy.fridgeEmpty' } : inventory.canAdd('ingredients') ? { action: 'take-ingredients', label: 'action.ingredients' } :
        { action: null, reason: 'reason.ingredientsFull' };
      case 'stove': {
        const slots = this.kitchens.get(stoveId);
        if (!slots) return { action: null, reason: 'reason.stoveUnavailable' };
        const ready = slots.findIndex((s, i) => s.status === 'ready' && slotAllowed(i));
        const empty = slots.findIndex((s, i) => s.status === 'empty' && slotAllowed(i));
        if (ready >= 0 && inventory.canAdd('meals')) return { action: 'take-meal', slotIndex: ready, label: 'action.meal' };
        if (empty >= 0 && inventory.has('ingredients')) return { action: 'start-cooking', slotIndex: empty, label: 'action.cook' };
        return { action: null, reason: ready >= 0 && !inventory.canAdd('meals') ? 'reason.mealsFull' :
          empty >= 0 ? 'reason.ingredientsMissing' : 'reason.cooking' };
      }
      case 'counter': return inventory.has('meals') ? { action: 'store-meal', label: 'action.deposit' } :
        { action: null, reason: 'reason.noMealsCarried' };
      case 'bin': return inventory.has('waste') ? { action: 'discard', label: 'action.discard' } :
        { action: null, reason: 'reason.noWaste' };
      case 'supplier': return { action: null, reason: 'supplier.hint' };
      case 'cash': return { action: null, reason: 'economy.cashEmpty' };
      case 'packing': return { action: null, reason: 'bulk.needActive' };
      case 'table': return { action: null, reason: 'reason.tableNeedsDirt' };
    }
  }
  canPerform(action: ProductionAction, slotIndex?: number, inventory = this.playerInventory, stoveId = 'stove', actorId = 'player'): boolean {
    const slots = this.kitchens.get(stoveId);
    switch (action) {
      case 'take-ingredients': return this.ingredientsAvailable(actorId) > 0 && inventory.canAdd('ingredients');
      case 'store-meal': return inventory.has('meals');
      case 'discard': return inventory.has('waste');
      case 'start-cooking': return inventory.has('ingredients') && (slotIndex === undefined ?
        this.availableAt('stove', inventory, () => true, stoveId).action === action : slots?.[slotIndex]?.status === 'empty');
      case 'take-meal': return inventory.canAdd('meals') && (slotIndex === undefined ?
        this.availableAt('stove', inventory, () => true, stoveId).action === action : slots?.[slotIndex]?.status === 'ready');
    }
  }
  perform(action: ProductionAction, slotIndex?: number, inventory = this.playerInventory, stoveId = 'stove', actorId = 'player'): Key | null {
    if (!this.canPerform(action, slotIndex, inventory, stoveId, actorId)) return null;
    switch (action) {
      case 'take-ingredients': {
        const before = this.ingredients;
        inventory.change('ingredients', 1); this.ingredients--; this.releaseIngredient(actorId);
        if (before > ECONOMY.lowStockThreshold && this.ingredients <= ECONOMY.lowStockThreshold) this.lowStockNotice = true;
        return 'result.ingredient';
      }
      case 'start-cooking': {
        const slots = this.kitchens.get(stoveId)!;
        const index = slotIndex ?? slots.findIndex(s => s.status === 'empty');
        inventory.change('ingredients', -1);
        slots[index] = { status: 'cooking', elapsedMs: 0, durationMs: this.cookingMs }; return 'result.cooking';
      }
      case 'take-meal': {
        const slots = this.kitchens.get(stoveId)!;
        const index = slotIndex ?? slots.findIndex(s => s.status === 'ready');
        slots[index] = { status: 'empty' }; inventory.change('meals', 1); return 'result.meal';
      }
      case 'store-meal': this.stock++; inventory.change('meals', -1); return 'result.deposit';
      case 'discard': inventory.change('waste', -1); return 'result.discard';
    }
  }
  withdrawMeal(inventory = this.playerInventory): boolean {
    if (this.stock < 1 || !inventory.canAdd('meals')) return false;
    if (!inventory.change('meals', 1)) return false;
    this.stock--; return true;
  }
  returnPackedMeals(count: number): void {
    if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid returned quantity');
    this.stock += count;
  }
  sellAvailable(): boolean { if (this.stock < 1) return false; this.stock--; return true; }
  collectWaste(inventory = this.playerInventory): boolean { return inventory.change('waste', 1); }
  update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
    for (const [id, slots] of this.kitchens) this.kitchens.set(id, slots.map(slot => {
      if (slot.status !== 'cooking') return slot;
      const elapsedMs = slot.elapsedMs + deltaMs;
      return elapsedMs + 0.000001 >= slot.durationMs ? { status: 'ready' } : { ...slot, elapsedMs };
    }));
  }
  snapshot() { return {ingredients:this.ingredients,stock:this.stock,player:this.playerInventory.snapshot(),
    cookingMs:this.cookingMs,kitchens:[...this.kitchens].map(([id,slots])=>({id,slots:slots.map(s=>({...s}))})),lowStockNotice:this.lowStockNotice}; }
  restore(data:ReturnType<Production['snapshot']>):void {
    this.ingredients=data.ingredients;this.stock=data.stock;this.cookingMs=data.cookingMs;
    this.playerInventory.restore(data.player);this.kitchens.clear();
    for(const kitchen of data.kitchens)this.kitchens.set(kitchen.id,kitchen.slots.map(s=>({...s})));
    this.ingredientClaims.clear();this.lowStockNotice=data.lowStockNotice;
  }
  removeStoves(): void { this.kitchens.clear(); }
  reset(): void {
    this.playerInventory.reset(this.initialLimits); this.cookingMs = this.initialCookingMs;
    this.kitchens.clear(); this.addStove('stove'); this.stock = 0;
    this.ingredients = ECONOMY.initialIngredients; this.ingredientClaims.clear(); this.lowStockNotice = false;
  }
}

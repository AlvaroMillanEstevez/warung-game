import { PRODUCTION } from '../config.ts';
import type { StationKind } from '../world/layout.ts';

export type StoveState = { readonly status: 'empty' } | { readonly status: 'cooking'; readonly elapsedMs: number } | { readonly status: 'ready' };
export interface InventoryLimits { readonly ingredients: number; readonly meals: number; readonly waste: number }
export interface InventoryState {
  readonly ingredients: number;
  readonly meals: number; readonly waste: number; readonly limits: InventoryLimits;
}
export type ProductionAction = 'take-ingredients' | 'start-cooking' | 'take-meal' | 'store-meal' | 'discard';
export type Availability = { action: ProductionAction; label: string; slotIndex?: number } | { action: null; reason: string };
export interface ProductionOptions { cookingMs: number; stoveSlots: number; inventory: InventoryLimits }

// All player plates are production; customers receive their meal at checkout.
export class Production {
  private ingredients = 0;
  private meals = 0;
  private waste = 0;
  private slots: StoveState[];
  private stock = 0;
  readonly limits: InventoryLimits;
  readonly cookingMs: number;

  constructor(options: Partial<ProductionOptions> = {}) {
    this.limits = Object.freeze({ ...PRODUCTION.inventory, ...options.inventory });
    this.cookingMs = options.cookingMs ?? PRODUCTION.cookingMs;
    const count = options.stoveSlots ?? PRODUCTION.stoveSlots;
    if (![count, ...Object.values(this.limits)].every(n => Number.isInteger(n) && n > 0) ||
        !Number.isFinite(this.cookingMs) || this.cookingMs <= 0) throw new Error('Capacidades y duración deben ser positivas.');
    this.slots = Array.from({ length: count }, () => ({ status: 'empty' }));
  }
  get inventory(): InventoryState {
    return { ingredients: this.ingredients, meals: this.meals, waste: this.waste, limits: this.limits };
  }
  get stove(): readonly StoveState[] { return this.slots.map(slot => ({ ...slot })); }
  get stoveSummary(): { cooking: number; ready: number; empty: number } {
    return { cooking: this.slots.filter(s => s.status === 'cooking').length,
      ready: this.slots.filter(s => s.status === 'ready').length, empty: this.slots.filter(s => s.status === 'empty').length };
  }
  get availablePortions(): number { return this.stock; }
  hasMealSpace(): boolean { return this.meals < this.limits.meals; }
  hasWasteSpace(): boolean { return this.waste < this.limits.waste; }

  availableAt(kind: StationKind): Availability {
    switch (kind) {
      case 'fridge':
        return this.ingredients < this.limits.ingredients ? { action: 'take-ingredients', label: 'Recoger ingredientes' } :
          { action: null, reason: 'Inventario de ingredientes lleno.' };
      case 'stove': {
        const ready = this.slots.findIndex(slot => slot.status === 'ready');
        const empty = this.slots.findIndex(slot => slot.status === 'empty');
        if (ready >= 0 && this.hasMealSpace()) return { action: 'take-meal', slotIndex: ready, label: 'Recoger nasi goreng' };
        if (empty >= 0 && this.ingredients > 0) return { action: 'start-cooking', slotIndex: empty, label: 'Poner a cocinar' };
        return { action: null, reason: ready >= 0 && !this.hasMealSpace() ? 'Inventario de platos lleno.' :
          empty >= 0 ? 'Necesitas ingredientes del frigorífico.' : 'Espera a que termine una ración.' };
      }
      case 'counter':
        return this.meals > 0 ? { action: 'store-meal', label: 'Depositar nasi goreng' } :
          { action: null, reason: 'No llevas platos para depositar.' };
      case 'bin':
        return this.waste > 0 ? { action: 'discard', label: 'Tirar residuos' } :
          { action: null, reason: 'La papelera solo recibe residuos; no llevas ninguno.' };
      case 'table': return { action: null, reason: 'Esta mesa solo necesita limpieza cuando está sucia.' };
    }
  }
  canPerform(action: ProductionAction, slotIndex?: number): boolean {
    switch (action) {
      case 'take-ingredients': return this.ingredients < this.limits.ingredients;
      case 'store-meal': return this.meals > 0;
      case 'discard': return this.waste > 0;
      case 'start-cooking': return this.ingredients > 0 && (slotIndex === undefined ?
        this.availableAt('stove').action === action : this.slots[slotIndex]?.status === 'empty');
      case 'take-meal': return this.hasMealSpace() && (slotIndex === undefined ?
        this.availableAt('stove').action === action : this.slots[slotIndex]?.status === 'ready');
    }
  }
  perform(action: ProductionAction, slotIndex?: number): string | null {
    if (!this.canPerform(action, slotIndex)) return null;
    switch (action) {
      case 'take-ingredients': this.ingredients++; return 'Ingrediente recogido.';
      case 'start-cooking': {
        const index = slotIndex ?? this.slots.findIndex(slot => slot.status === 'empty');
        this.ingredients--; this.slots[index] = { status: 'cooking', elapsedMs: 0 }; return 'Nasi goreng al fuego.';
      }
      case 'take-meal': {
        const index = slotIndex ?? this.slots.findIndex(slot => slot.status === 'ready');
        this.slots[index] = { status: 'empty' }; this.meals++; return 'Ración lista para depositar.';
      }
      case 'store-meal': this.stock++; this.meals--; return 'Ración disponible en el mostrador.';
      case 'discard': this.waste--; return 'Residuo retirado.';
    }
  }
  sellAvailable(): boolean {
    if (this.stock < 1) return false;
    this.stock--; return true;
  }
  collectWaste(): boolean {
    if (!this.hasWasteSpace()) return false;
    this.waste++; return true;
  }
  update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
    this.slots = this.slots.map(slot => {
      if (slot.status !== 'cooking') return slot;
      const elapsedMs = slot.elapsedMs + deltaMs;
      return elapsedMs + 0.000001 >= this.cookingMs ? { status: 'ready' } : { status: 'cooking', elapsedMs };
    });
  }
  reset(): void {
    this.ingredients = 0; this.meals = 0; this.waste = 0;
    this.slots = this.slots.map(() => ({ status: 'empty' })); this.stock = 0;
  }
}

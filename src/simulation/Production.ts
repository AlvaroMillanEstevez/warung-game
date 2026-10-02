import { PRODUCTION } from '../config.ts';
import type { StationKind } from '../world/layout.ts';

export type StoveState = { readonly status: 'empty' } | { readonly status: 'cooking'; readonly elapsedMs: number } | { readonly status: 'ready' };
export interface InventoryLimits { readonly ingredients: number; readonly meals: number; readonly waste: number }
export interface InventoryState {
  readonly ingredients: number; readonly freeMeals: number; readonly orderMeals: readonly string[];
  readonly meals: number; readonly waste: number; readonly limits: InventoryLimits;
}
export type ProductionAction = 'take-ingredients' | 'start-cooking' | 'take-meal' | 'store-meal' | 'discard';
export type Availability = { action: ProductionAction; label: string; slotIndex?: number } | { action: null; reason: string };
export interface ProductionOptions { cookingMs: number; stoveSlots: number; inventory: InventoryLimits }

// Independent inventory capacities; paid plates retain their order identity.
export class Production {
  private ingredients = 0;
  private freeMeals = 0;
  private waste = 0;
  private readonly orderMeals: string[] = [];
  private slots: StoveState[];
  private stock = 0;
  private readonly reservations = new Set<string>();
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
    return { ingredients: this.ingredients, freeMeals: this.freeMeals, orderMeals: [...this.orderMeals],
      meals: this.freeMeals + this.orderMeals.length, waste: this.waste, limits: this.limits };
  }
  get stove(): readonly StoveState[] { return this.slots.map(slot => ({ ...slot })); }
  get stoveSummary(): { cooking: number; ready: number; empty: number } {
    return { cooking: this.slots.filter(s => s.status === 'cooking').length,
      ready: this.slots.filter(s => s.status === 'ready').length, empty: this.slots.filter(s => s.status === 'empty').length };
  }
  get portions(): number { return this.stock + this.reservations.size; }
  get availablePortions(): number { return this.stock; }
  get reservedPortions(): number { return this.reservations.size; }
  get reservedOrderIds(): readonly string[] { return [...this.reservations]; }
  hasMealSpace(): boolean { return this.freeMeals + this.orderMeals.length < this.limits.meals; }
  hasWasteSpace(): boolean { return this.waste < this.limits.waste; }
  hasCarriedOrder(orderId: string): boolean { return this.orderMeals.includes(orderId); }

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
        return this.freeMeals > 0 ? { action: 'store-meal', label: 'Depositar nasi goreng' } :
          { action: null, reason: 'No llevas platos sin asignar para depositar.' };
      case 'bin':
        return this.waste > 0 ? { action: 'discard', label: 'Tirar residuos' } :
          { action: null, reason: 'La papelera solo recibe residuos; no llevas ninguno.' };
      case 'table': return { action: null, reason: 'Consulta el pedido o la limpieza de esta mesa.' };
    }
  }
  canPerform(action: ProductionAction, slotIndex?: number): boolean {
    switch (action) {
      case 'take-ingredients': return this.ingredients < this.limits.ingredients;
      case 'store-meal': return this.freeMeals > 0;
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
        this.slots[index] = { status: 'empty' }; this.freeMeals++; return 'Ración lista para depositar.';
      }
      case 'store-meal': this.stock++; this.freeMeals--; return 'Ración disponible en el mostrador.';
      case 'discard': this.waste--; return 'Residuo retirado.';
    }
  }
  hasReservation(orderId: string): boolean { return this.reservations.has(orderId); }
  reservePortion(orderId: string): boolean {
    if (this.stock < 1 || this.reservations.has(orderId) || this.hasCarriedOrder(orderId)) return false;
    this.stock--; this.reservations.add(orderId); return true;
  }
  sellAvailable(): boolean {
    if (this.stock < 1) return false;
    this.stock--; return true;
  }
  collectReserved(orderId: string): boolean {
    if (!this.hasMealSpace() || !this.reservations.has(orderId)) return false;
    this.reservations.delete(orderId); this.orderMeals.push(orderId); return true;
  }
  deliverReserved(orderId: string): boolean {
    const index = this.orderMeals.indexOf(orderId);
    if (index < 0) return false;
    this.orderMeals.splice(index, 1); return true;
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
    this.ingredients = 0; this.freeMeals = 0; this.waste = 0; this.orderMeals.length = 0;
    this.slots = this.slots.map(() => ({ status: 'empty' })); this.stock = 0; this.reservations.clear();
  }
}

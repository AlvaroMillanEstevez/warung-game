import { PRODUCTION } from '../config.ts';
import type { StationKind } from '../world/layout.ts';
import { Inventory } from './Inventory.ts';
import type { InventoryLimits, InventoryState } from './Inventory.ts';
export type { InventoryLimits, InventoryState } from './Inventory.ts';

export type StoveState = { readonly status: 'empty' } |
  { readonly status: 'cooking'; readonly elapsedMs: number; readonly durationMs: number } | { readonly status: 'ready' };
export type ProductionAction = 'take-ingredients' | 'start-cooking' | 'take-meal' | 'store-meal' | 'discard';
export type Availability = { action: ProductionAction; label: string; slotIndex?: number } | { action: null; reason: string };
export interface ProductionOptions { cookingMs: number; stoveSlots: number; inventory: InventoryLimits }

// The same transfers apply to any actor's independent inventory.
export class Production {
  readonly playerInventory: Inventory;
  private slots: StoveState[];
  private stock = 0;
  cookingMs: number;
  private readonly initialCookingMs: number;
  private readonly initialLimits: InventoryLimits;
  constructor(options: Partial<ProductionOptions> = {}) {
    this.initialLimits = { ...PRODUCTION.inventory, ...options.inventory };
    this.cookingMs = this.initialCookingMs = options.cookingMs ?? PRODUCTION.cookingMs;
    const count = options.stoveSlots ?? PRODUCTION.stoveSlots;
    if (![count, ...Object.values(this.initialLimits)].every(n => Number.isInteger(n) && n > 0) ||
        !Number.isFinite(this.cookingMs) || this.cookingMs <= 0) throw new Error('Capacidades y duración deben ser positivas.');
    this.playerInventory = new Inventory(this.initialLimits);
    this.slots = Array.from({ length: count }, () => ({ status: 'empty' }));
  }
  get limits(): InventoryLimits { return this.inventory.limits; }
  get inventory(): InventoryState { return this.playerInventory.state as InventoryState; }
  get stove(): readonly StoveState[] { return this.slots.map(slot => ({ ...slot })); }
  get stoveSummary(): { cooking: number; ready: number; empty: number } {
    return { cooking: this.slots.filter(s => s.status === 'cooking').length,
      ready: this.slots.filter(s => s.status === 'ready').length, empty: this.slots.filter(s => s.status === 'empty').length };
  }
  get availablePortions(): number { return this.stock; }
  hasMealSpace(): boolean { return this.playerInventory.canAdd('meals'); }
  hasWasteSpace(): boolean { return this.playerInventory.canAdd('waste'); }

  availableAt(kind: StationKind, inventory = this.playerInventory, slotAllowed: (index: number) => boolean = () => true): Availability {
    switch (kind) {
      case 'fridge': return inventory.canAdd('ingredients') ? { action: 'take-ingredients', label: 'Recoger ingredientes' } :
        { action: null, reason: 'Carga de ingredientes completa.' };
      case 'stove': {
        const ready = this.slots.findIndex((s, i) => s.status === 'ready' && slotAllowed(i));
        const empty = this.slots.findIndex((s, i) => s.status === 'empty' && slotAllowed(i));
        if (ready >= 0 && inventory.canAdd('meals')) return { action: 'take-meal', slotIndex: ready, label: 'Recoger nasi goreng' };
        if (empty >= 0 && inventory.has('ingredients')) return { action: 'start-cooking', slotIndex: empty, label: 'Poner a cocinar' };
        return { action: null, reason: ready >= 0 && !inventory.canAdd('meals') ? 'Carga de platos completa.' :
          empty >= 0 ? 'Faltan ingredientes.' : 'Se está cocinando…' };
      }
      case 'counter': return inventory.has('meals') ? { action: 'store-meal', label: 'Depositar nasi goreng' } :
        { action: null, reason: 'No llevas platos.' };
      case 'bin': return inventory.has('waste') ? { action: 'discard', label: 'Tirar residuos' } :
        { action: null, reason: 'No llevas residuos.' };
      case 'table': return { action: null, reason: 'Esta mesa solo necesita limpieza cuando está sucia.' };
    }
  }
  canPerform(action: ProductionAction, slotIndex?: number, inventory = this.playerInventory): boolean {
    switch (action) {
      case 'take-ingredients': return inventory.canAdd('ingredients');
      case 'store-meal': return inventory.has('meals');
      case 'discard': return inventory.has('waste');
      case 'start-cooking': return inventory.has('ingredients') && (slotIndex === undefined ?
        this.availableAt('stove', inventory).action === action : this.slots[slotIndex]?.status === 'empty');
      case 'take-meal': return inventory.canAdd('meals') && (slotIndex === undefined ?
        this.availableAt('stove', inventory).action === action : this.slots[slotIndex]?.status === 'ready');
    }
  }
  perform(action: ProductionAction, slotIndex?: number, inventory = this.playerInventory): string | null {
    if (!this.canPerform(action, slotIndex, inventory)) return null;
    switch (action) {
      case 'take-ingredients': inventory.change('ingredients', 1); return 'Ingrediente recogido.';
      case 'start-cooking': {
        const index = slotIndex ?? this.slots.findIndex(s => s.status === 'empty');
        inventory.change('ingredients', -1);
        this.slots[index] = { status: 'cooking', elapsedMs: 0, durationMs: this.cookingMs }; return 'Nasi goreng al fuego.';
      }
      case 'take-meal': {
        const index = slotIndex ?? this.slots.findIndex(s => s.status === 'ready');
        this.slots[index] = { status: 'empty' }; inventory.change('meals', 1); return 'Ración lista para depositar.';
      }
      case 'store-meal': this.stock++; inventory.change('meals', -1); return 'Ración disponible en el mostrador.';
      case 'discard': inventory.change('waste', -1); return 'Residuo retirado.';
    }
  }
  sellAvailable(): boolean { if (this.stock < 1) return false; this.stock--; return true; }
  collectWaste(inventory = this.playerInventory): boolean { return inventory.change('waste', 1); }
  update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
    this.slots = this.slots.map(slot => {
      if (slot.status !== 'cooking') return slot;
      const elapsedMs = slot.elapsedMs + deltaMs;
      return elapsedMs + 0.000001 >= slot.durationMs ? { status: 'ready' } : { ...slot, elapsedMs };
    });
  }
  reset(): void {
    this.playerInventory.reset(this.initialLimits); this.cookingMs = this.initialCookingMs;
    this.slots = this.slots.map(() => ({ status: 'empty' })); this.stock = 0;
  }
}

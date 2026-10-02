import { PRODUCTION } from '../config.ts';
import type { StationKind } from '../world/layout.ts';

export type CarriedItem = 'ingredients' | 'meal' | null;
export type StoveState = { readonly status: 'empty' } | { readonly status: 'cooking'; readonly elapsedMs: number } | { readonly status: 'ready' };
export type ProductionAction = 'take-ingredients' | 'start-cooking' | 'take-meal' | 'store-meal' | 'discard';
export type Availability = { action: ProductionAction; label: string } | { action: null; reason: string };

const ACTION_STATION: Record<ProductionAction, StationKind> = {
  'take-ingredients': 'fridge', 'start-cooking': 'stove', 'take-meal': 'stove', 'store-meal': 'counter', discard: 'bin',
};

// Pure rules: no Phaser, DOM, timers or controls. Future actors can use the same validated transfers.
export class Production {
  private held: CarriedItem = null;
  private cooker: StoveState = { status: 'empty' };
  private stock = 0;

  readonly capacity: number;
  readonly cookingMs: number;

  constructor(capacity: number = PRODUCTION.counterCapacity, cookingMs: number = PRODUCTION.cookingMs) {
    this.capacity = capacity;
    this.cookingMs = cookingMs;
    if (!Number.isInteger(capacity) || capacity < 1 || !Number.isFinite(cookingMs) || cookingMs <= 0) {
      throw new Error('La capacidad y la duración de cocción deben ser positivas.');
    }
  }

  get carried(): CarriedItem { return this.held; }
  get stove(): StoveState { return this.cooker; }
  get portions(): number { return this.stock; }
  get complete(): boolean { return this.stock === this.capacity; }
  get cookingProgress(): number {
    return this.cooker.status === 'ready' ? 1 : this.cooker.status === 'cooking' ? this.cooker.elapsedMs / this.cookingMs : 0;
  }

  availableAt(kind: StationKind): Availability {
    switch (kind) {
      case 'fridge':
        return this.held === null ? { action: 'take-ingredients', label: 'Recoger ingredientes' } : { action: null, reason: 'Tienes las manos ocupadas.' };
      case 'stove':
        if (this.cooker.status === 'cooking') return { action: null, reason: 'El nasi goreng se está cocinando.' };
        if (this.cooker.status === 'ready') return this.held === null
          ? { action: 'take-meal', label: 'Recoger nasi goreng' }
          : { action: null, reason: 'Deja libres las manos para recoger la ración.' };
        return this.held === 'ingredients'
          ? { action: 'start-cooking', label: 'Poner a cocinar' }
          : { action: null, reason: this.held === 'meal' ? 'Lleva esa ración al mostrador.' : 'Necesitas ingredientes del frigorífico.' };
      case 'counter':
        if (this.complete) return { action: null, reason: 'Mostrador lleno · circuito de prueba completado.' };
        return this.held === 'meal' ? { action: 'store-meal', label: 'Dejar nasi goreng' } : { action: null, reason: 'Trae una ración cocinada.' };
      case 'bin':
        return this.held !== null ? { action: 'discard', label: 'Descartar lo que llevas' } : { action: null, reason: 'No llevas nada que descartar.' };
      case 'table':
        return { action: null, reason: 'Las mesas todavía no tienen servicio.' };
    }
  }

  // Revalidate at commit time, even if the caller selected this action earlier.
  perform(action: ProductionAction): string | null {
    if (this.availableAt(ACTION_STATION[action]).action !== action) return null;
    switch (action) {
      case 'take-ingredients':
        this.held = 'ingredients';
        return 'Llevas ingredientes para nasi goreng.';
      case 'start-cooking':
        this.held = null;
        this.cooker = { status: 'cooking', elapsedMs: 0 };
        return 'Nasi goreng al fuego.';
      case 'take-meal':
        this.cooker = { status: 'empty' };
        this.held = 'meal';
        return 'Ración lista para llevar al mostrador.';
      case 'store-meal':
        this.stock++;
        this.held = null;
        return this.complete ? '¡Mostrador lleno! Circuito de prueba completado.' : 'Ración depositada en el mostrador.';
      case 'discard':
        this.held = null;
        return 'Unidad descartada. Tienes las manos libres.';
    }
  }

  // Only active simulation time enters here; background time is never added.
  update(deltaMs: number): void {
    if (this.cooker.status !== 'cooking' || !Number.isFinite(deltaMs) || deltaMs <= 0) return;
    const elapsedMs = this.cooker.elapsedMs + deltaMs;
    this.cooker = elapsedMs + 0.000001 >= this.cookingMs ? { status: 'ready' } : { status: 'cooking', elapsedMs };
  }

  reset(): void {
    this.held = null;
    this.cooker = { status: 'empty' };
    this.stock = 0;
  }
}

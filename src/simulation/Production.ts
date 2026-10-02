import { PRODUCTION } from '../config.ts';
import type { StationKind } from '../world/layout.ts';

export type CarriedItem = 'ingredients' | 'meal' | 'waste' | { readonly kind: 'order'; readonly orderId: string } | null;
export type StoveState = { readonly status: 'empty' } | { readonly status: 'cooking'; readonly elapsedMs: number } | { readonly status: 'ready' };
export type ProductionAction = 'take-ingredients' | 'start-cooking' | 'take-meal' | 'store-meal' | 'discard';
export type Availability = { action: ProductionAction; label: string } | { action: null; reason: string };
const ACTION_STATION: Record<ProductionAction, StationKind> = {
  'take-ingredients': 'fridge', 'start-cooking': 'stove', 'take-meal': 'stove', 'store-meal': 'counter', discard: 'bin',
};

// Physical inventory has a single owner. Reservation IDs identify the actual portions on the counter.
export class Production {
  private held: CarriedItem = null;
  private cooker: StoveState = { status: 'empty' };
  private stock = 0;
  private readonly reservations = new Set<string>();
  readonly capacity: number;
  readonly cookingMs: number;

  constructor(capacity: number = PRODUCTION.counterCapacity, cookingMs: number = PRODUCTION.cookingMs) {
    this.capacity = capacity; this.cookingMs = cookingMs;
    if (!Number.isInteger(capacity) || capacity < 1 || !Number.isFinite(cookingMs) || cookingMs <= 0) throw new Error('Capacidad y duración deben ser positivas.');
  }
  get carried(): CarriedItem { return this.held; }
  get stove(): StoveState { return this.cooker; }
  get portions(): number { return this.stock + this.reservations.size; }
  get availablePortions(): number { return this.stock; }
  get reservedPortions(): number { return this.reservations.size; }
  get reservedOrderIds(): readonly string[] { return [...this.reservations]; }
  get full(): boolean { return this.portions === this.capacity; }
  get cookingProgress(): number {
    return this.cooker.status === 'ready' ? 1 : this.cooker.status === 'cooking' ? this.cooker.elapsedMs / this.cookingMs : 0;
  }
  availableAt(kind: StationKind): Availability {
    switch (kind) {
      case 'fridge':
        return this.held === null ? { action: 'take-ingredients', label: 'Recoger ingredientes' } : { action: null, reason: 'Tienes las manos ocupadas.' };
      case 'stove':
        if (this.cooker.status === 'cooking') return { action: null, reason: 'El nasi goreng se está cocinando.' };
        if (this.cooker.status === 'ready') return this.held === null ? { action: 'take-meal', label: 'Recoger nasi goreng' } : { action: null, reason: 'Deja libres las manos para recoger la ración.' };
        return this.held === 'ingredients' ? { action: 'start-cooking', label: 'Poner a cocinar' } :
          { action: null, reason: this.held === null ? 'Necesitas ingredientes del frigorífico.' : 'Primero entrega o deposita lo que llevas.' };
      case 'counter':
        if (this.full) return { action: null, reason: 'Mostrador lleno; atiende clientes o recoge pedidos.' };
        return this.held === 'meal' ? { action: 'store-meal', label: 'Depositar nasi goreng' } : { action: null, reason: 'Trae una ración recién cocinada, sin pedido asignado.' };
      case 'bin':
        if (this.held && typeof this.held === 'object') return { action: null, reason: 'Es un pedido pagado: debes entregarlo en su mesa.' };
        return this.held !== null ? { action: 'discard', label: this.held === 'waste' ? 'Tirar residuos' : 'Descartar lo que llevas' } : { action: null, reason: 'No llevas nada que descartar.' };
      case 'table': return { action: null, reason: 'Consulta el pedido o la limpieza de esta mesa.' };
    }
  }
  canPerform(action: ProductionAction): boolean { return this.availableAt(ACTION_STATION[action]).action === action; }
  perform(action: ProductionAction): string | null {
    if (!this.canPerform(action)) return null;
    switch (action) {
      case 'take-ingredients': this.held = 'ingredients'; return 'Llevas ingredientes para nasi goreng.';
      case 'start-cooking': this.held = null; this.cooker = { status: 'cooking', elapsedMs: 0 }; return 'Nasi goreng al fuego.';
      case 'take-meal': this.cooker = { status: 'empty' }; this.held = 'meal'; return 'Ración lista para depositar.';
      case 'store-meal': this.stock++; this.held = null; return 'Ración disponible en el mostrador.';
      case 'discard': this.held = null; return 'Unidad descartada. Tienes las manos libres.';
    }
  }
  hasReservation(orderId: string): boolean { return this.reservations.has(orderId); }
  reservePortion(orderId: string): boolean {
    if (this.stock < 1 || this.reservations.has(orderId)) return false;
    this.stock--; this.reservations.add(orderId); return true;
  }
  sellAvailable(): boolean {
    if (this.stock < 1) return false;
    this.stock--; return true;
  }
  collectReserved(orderId: string): boolean {
    if (this.held !== null || !this.reservations.has(orderId)) return false;
    this.reservations.delete(orderId); this.held = { kind: 'order', orderId }; return true;
  }
  deliverReserved(orderId: string): boolean {
    if (!this.held || typeof this.held !== 'object' || this.held.orderId !== orderId) return false;
    this.held = null; return true;
  }
  collectWaste(): boolean {
    if (this.held !== null) return false;
    this.held = 'waste'; return true;
  }
  update(deltaMs: number): void {
    if (this.cooker.status !== 'cooking' || !Number.isFinite(deltaMs) || deltaMs <= 0) return;
    const elapsedMs = this.cooker.elapsedMs + deltaMs;
    this.cooker = elapsedMs + 0.000001 >= this.cookingMs ? { status: 'ready' } : { status: 'cooking', elapsedMs };
  }
  reset(): void { this.held = null; this.cooker = { status: 'empty' }; this.stock = 0; this.reservations.clear(); }
}

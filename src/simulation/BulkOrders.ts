import { BULK_ORDERS } from '../config.ts';

interface OfferData { id: number; quantity: number; basePay: number; bonusPay: number; bonusMs: number }
export type BulkState = { phase: 'locked' } | ({ phase: 'offer' } & OfferData) |
  ({ phase: 'active'; packed: number; bonusRemainingMs: number } & OfferData) |
  { phase: 'waiting'; remainingMs: number };
export interface PackedResult { completed: boolean; payment: number; bonus: number; first: boolean }

// One optional job, no queue. Only Restaurant coordinates food transfers and money.
export class BulkOrders {
  private current: BulkState = { phase: 'locked' };
  private sequence = 0; // Never reused across DEV resets: stale panel/commands stay invalid.
  private learned = false;
  get state(): Readonly<BulkState> { return { ...this.current }; }
  get firstCompleted(): boolean { return this.learned; }
  get pending(): number { return this.current.phase === 'active' ? this.current.quantity - this.current.packed : 0; }
  unlock(price: number): boolean {
    if (this.current.phase !== 'locked') return false;
    this.makeOffer(BULK_ORDERS.firstQuantity, price); return true;
  }
  private makeOffer(quantity: number, price: number): void {
    const basePay = quantity * price;
    this.current = { phase: 'offer', id: ++this.sequence, quantity, basePay,
      bonusPay: Math.round(basePay * BULK_ORDERS.bonusRatio), bonusMs: BULK_ORDERS.bonusMs };
  }
  accept(id: number): boolean {
    const offer = this.current;
    if (offer.phase !== 'offer' || offer.id !== id) return false;
    this.current = { ...offer, phase: 'active', packed: 0, bonusRemainingMs: offer.bonusMs };
    return true;
  }
  canPack(id: number, packed: number): boolean {
    return this.current.phase === 'active' && this.current.id === id &&
      this.current.packed === packed && packed < this.current.quantity;
  }
  pack(id: number, packed: number): PackedResult | null {
    if (!this.canPack(id, packed) || this.current.phase !== 'active') return null;
    const active = this.current; active.packed++;
    if (active.packed < active.quantity) return { completed: false, payment: 0, bonus: 0, first: false };
    const bonus = active.bonusRemainingMs > 0 ? active.bonusPay : 0;
    const first = !this.learned; this.learned = true;
    this.wait();
    return { completed: true, payment: active.basePay + bonus, bonus, first };
  }
  cancel(id: number): number | null {
    if (this.current.phase !== 'active' || this.current.id !== id) return null;
    const returned = this.current.packed;
    this.wait(); return returned;
  }
  private wait(): void { this.current = { phase: 'waiting', remainingMs: BULK_ORDERS.nextOfferMs }; }
  update(deltaMs: number, price: number, random: () => number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
    if (this.current.phase === 'active')
      this.current.bonusRemainingMs = Math.max(0, this.current.bonusRemainingMs - deltaMs);
    else if (this.current.phase === 'waiting') {
      this.current.remainingMs = Math.max(0, this.current.remainingMs - deltaMs);
      if (this.current.remainingMs === 0) {
        const index = Math.min(BULK_ORDERS.quantities.length - 1, Math.max(0, Math.floor(random() * BULK_ORDERS.quantities.length)));
        this.makeOffer(BULK_ORDERS.quantities[index]!, price);
      }
    }
  }
  reset(): void { this.current = { phase: 'locked' }; this.learned = false; }
}

import { BULK_ORDERS } from '../config.ts';

interface OfferData { id: number; quantity: number; basePay: number; bonusPay: number; bonusMs: number }
export type BulkState = { phase: 'locked' } | ({ phase: 'offer' } & OfferData) |
  ({ phase: 'active'; packed: number; bonusRemainingMs: number } & OfferData) |
  ({ phase: 'ready'; packed: number; payment: number; earnedBonus: number } & OfferData) |
  { phase: 'waiting'; remainingMs: number };
export interface PaymentResult { payment: number; bonus: number; first: boolean }

// One optional job, no queue. Only Restaurant coordinates food transfers and money.
export class BulkOrders {
  private current: BulkState = { phase: 'locked' };
  private sequence = 0; // Never reused across DEV resets: stale panel/commands stay invalid.
  private completed = 0;
  private previousQuantity: number | null = null;
  private seenBoard = false;
  private seenPacking = false;
  private packingHintMs = 0;
  get boardVisited(): boolean { return this.seenBoard; }
  get packingVisited(): boolean { return this.seenPacking; }
  get guidance(): 'board' | 'packing' | null {
    if (this.current.phase === 'locked') return null;
    if (!this.seenBoard || this.current.phase === 'ready') return 'board';
    return this.current.phase === 'active' && !this.firstCompleted && !this.seenPacking && this.packingHintMs > 0 ? 'packing' : null;
  }
  visitBoard(): boolean {
    if (this.current.phase === 'locked') return false;
    this.seenBoard = true; return true;
  }
  visitPacking(): void {
    if (this.current.phase !== 'active') return;
    this.seenPacking = true; this.packingHintMs = 0;
  }
  get state(): Readonly<BulkState> { return { ...this.current }; }
  get firstCompleted(): boolean { return this.completed > 0; }
  get pending(): number { return this.current.phase === 'active' ? this.current.quantity - this.current.packed : 0; }
  unlock(price: number): boolean {
    if (this.current.phase !== 'locked') return false;
    this.makeOffer(BULK_ORDERS.introQuantities[0], price); return true;
  }
  private makeOffer(quantity: number, price: number): void {
    this.previousQuantity = quantity;
    const basePay = quantity * price;
    this.current = { phase: 'offer', id: ++this.sequence, quantity, basePay,
      bonusPay: Math.round(basePay * BULK_ORDERS.bonusRatio), bonusMs: BULK_ORDERS.bonusMs };
  }
  accept(id: number): boolean {
    const offer = this.current;
    if (offer.phase !== 'offer' || offer.id !== id) return false;
    this.current = { ...offer, phase: 'active', packed: 0, bonusRemainingMs: offer.bonusMs };
    if (!this.firstCompleted && !this.seenPacking) this.packingHintMs = BULK_ORDERS.packingHintMs;
    return true;
  }
  canPack(id: number, packed: number): boolean {
    return this.current.phase === 'active' && this.current.id === id &&
      this.current.packed === packed && packed < this.current.quantity;
  }
  pack(id: number, packed: number): { ready: boolean } | null {
    if (!this.canPack(id, packed) || this.current.phase !== 'active') return null;
    this.visitPacking();
    const active = this.current; active.packed++;
    if (active.packed < active.quantity) return { ready: false };
    const bonus = active.bonusRemainingMs > 0 ? active.bonusPay : 0;
    const { bonusRemainingMs: _remaining, ...offer } = active;
    this.current = { ...offer, phase: 'ready', payment: active.basePay + bonus, earnedBonus: bonus };
    return { ready: true };
  }
  claim(id: number): PaymentResult | null {
    const ready = this.current;
    if (ready.phase !== 'ready' || ready.id !== id) return null;
    const first = !this.firstCompleted; this.completed++;
    this.wait();
    return { payment: ready.payment, bonus: ready.earnedBonus, first };
  }
  cancel(id: number): number | null {
    if (this.current.phase !== 'active' || this.current.id !== id) return null;
    const returned = this.current.packed;
    this.wait(); return returned;
  }
  private wait(): void { this.packingHintMs = 0; this.current = { phase: 'waiting', remainingMs: BULK_ORDERS.nextOfferMs }; }
  update(deltaMs: number, price: number, random: () => number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
    this.packingHintMs = Math.max(0, this.packingHintMs - deltaMs);
    if (this.current.phase === 'active')
      this.current.bonusRemainingMs = Math.max(0, this.current.bonusRemainingMs - deltaMs);
    else if (this.current.phase === 'waiting') {
      this.current.remainingMs = Math.max(0, this.current.remainingMs - deltaMs);
      if (this.current.remainingMs === 0) {
        const introductory = BULK_ORDERS.introQuantities[this.completed];
        const choices = BULK_ORDERS.quantities.filter(quantity => quantity !== this.previousQuantity);
        const index = Math.min(choices.length - 1, Math.max(0, Math.floor(random() * choices.length)));
        this.makeOffer(introductory ?? choices[index]!, price);
      }
    }
  }
  snapshot() { return {current:{...this.current},sequence:this.sequence,completed:this.completed,previousQuantity:this.previousQuantity,
    seenBoard:this.seenBoard,seenPacking:this.seenPacking,packingHintMs:this.packingHintMs}; }
  restore(data:ReturnType<BulkOrders['snapshot']>):void {
    this.current={...data.current};this.sequence=data.sequence;this.completed=data.completed;this.previousQuantity=data.previousQuantity;
    this.seenBoard=data.seenBoard;this.seenPacking=data.seenPacking;this.packingHintMs=data.packingHintMs;
  }
  reset(): void {
    this.current = { phase: 'locked' }; this.completed = 0; this.previousQuantity = null;
    this.seenBoard = false; this.seenPacking = false; this.packingHintMs = 0;
  }
}

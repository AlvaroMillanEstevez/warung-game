import { COMMENTS } from '../config.ts';
import type { Customer } from './Restaurant.ts';

interface CommentState {
  thresholdMs: number;
  participates: boolean;
  lastSpokeAt: number;
  untilMs: number;
  text: string | null;
}
export class CustomerComments {
  private readonly states = new Map<string, CommentState>();
  private lastCheckMs = 0;
  private readonly random: () => number;
  constructor(random: () => number = Math.random) { this.random = random; }
  admit(id: string): void {
    this.states.set(id, {
      thresholdMs: COMMENTS.thresholdMinMs + this.random() * (COMMENTS.thresholdMaxMs - COMMENTS.thresholdMinMs),
      participates: this.random() < COMMENTS.participationChance, lastSpokeAt: -Infinity, untilMs: 0, text: null,
    });
  }
  text(id: string): string | null { return this.states.get(id)?.text ?? null; }
  remove(id: string): void { this.states.delete(id); }
  reset(): void { this.states.clear(); this.lastCheckMs = 0; }
  update(now: number, customers: readonly Readonly<Customer>[], visible: ReadonlySet<string>): void {
    const waiting = new Map(customers.filter(c => c.waitingSince !== null && !c.orderId &&
      (c.phase === 'queueing' || c.phase === 'walking-to-queue')).map(c => [c.id, c]));
    for (const [id, state] of this.states) {
      if (!waiting.has(id) || !visible.has(id) || now >= state.untilMs) state.text = null;
    }
    if (now - this.lastCheckMs < COMMENTS.checkIntervalMs) return;
    this.lastCheckMs = now; // No accumulated checks after a long frame or pause.
    let count = [...this.states.values()].filter(s => s.text !== null).length;
    const candidates = [...waiting.values()].sort((a, b) =>
      (this.states.get(a.id)!.lastSpokeAt - this.states.get(b.id)!.lastSpokeAt) || a.number - b.number);
    for (const customer of candidates) {
      if (count >= COMMENTS.maxVisible) break;
      const state = this.states.get(customer.id)!;
      if (!visible.has(customer.id) || !state.participates || state.text ||
          now - customer.waitingSince! < state.thresholdMs || now - state.lastSpokeAt < COMMENTS.cooldownMs) continue;
      const overlaps = [...waiting.values()].some(other => other.id !== customer.id && this.states.get(other.id)?.text &&
        Math.abs(other.position.x - customer.position.x) < 140 && Math.abs(other.position.y - customer.position.y) < 52);
      if (overlaps) continue;
      state.text = COMMENTS.phrases[Math.min(COMMENTS.phrases.length - 1, Math.floor(this.random() * COMMENTS.phrases.length))]!;
      state.untilMs = now + COMMENTS.durationMs; state.lastSpokeAt = now; count++;
    }
  }
}

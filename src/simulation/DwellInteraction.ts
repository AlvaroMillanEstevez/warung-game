import { INTERACTION } from '../config.ts';

export interface DwellTarget { id: string; action: string | null }

// One selected station; completed stations stay latched until physically leaving their radius.
export class DwellInteraction {
  private target: DwellTarget | null = null;
  private elapsedMs = 0;
  private readonly latched = new Set<string>();

  readonly durationMs: number;

  constructor(durationMs: number = INTERACTION.dwellMs) { this.durationMs = durationMs; }

  get progress(): number { return this.elapsedMs / this.durationMs; }
  needsExit(id: string): boolean { return this.latched.has(id); }

  update(target: DwellTarget | null, insideZones: readonly string[], tryingToMove: boolean, deltaMs: number): string | null {
    for (const id of this.latched) if (!insideZones.includes(id)) this.latched.delete(id);
    if (target?.id !== this.target?.id || target?.action !== this.target?.action) this.cancel();
    this.target = target;
    if (!target || !target.action || tryingToMove || this.latched.has(target.id)) {
      this.elapsedMs = 0;
      return null;
    }
    this.elapsedMs += Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
    if (this.elapsedMs + 0.000001 < this.durationMs) return null;
    this.latched.add(target.id);
    this.elapsedMs = 0;
    return target.action;
  }

  // Focus loss and movement cancel progress without unlocking a completed station.
  cancel(): void { this.target = null; this.elapsedMs = 0; }
  reset(): void { this.cancel(); this.latched.clear(); }
}

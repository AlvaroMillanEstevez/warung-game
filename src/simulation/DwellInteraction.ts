import { INTERACTION } from '../config.ts';

export interface DwellTarget { id: string; action: string | null }

// Each completed cycle discards excess time; the next cycle gets a full duration.
export class DwellInteraction {
  private target: DwellTarget | null = null;
  private elapsedMs = 0;
  readonly durationMs: number;

  constructor(durationMs: number = INTERACTION.dwellMs) { this.durationMs = durationMs; }
  get progress(): number { return this.elapsedMs / this.durationMs; }

  update(target: DwellTarget | null, insideZones: readonly string[], tryingToMove: boolean, deltaMs: number): string | null {
    if (target && !insideZones.includes(target.id)) target = null;
    if (target?.id !== this.target?.id || target?.action !== this.target?.action) this.cancel();
    this.target = target;
    if (!target || !target.action || tryingToMove) { this.elapsedMs = 0; return null; }
    this.elapsedMs += Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
    if (this.elapsedMs + 0.000001 < this.durationMs) return null;
    this.elapsedMs = 0;
    return target.action;
  }
  cancel(): void { this.target = null; this.elapsedMs = 0; }
  reset(): void { this.cancel(); }
}

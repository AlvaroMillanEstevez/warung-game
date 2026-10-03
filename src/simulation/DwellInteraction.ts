import { INTERACTION } from '../config.ts';

export interface DwellTarget { id: string; action: string | null }

// Each cycle captures its duration; upgrades only affect a fresh cycle.
export class DwellInteraction {
  private target: DwellTarget | null = null;
  private elapsedMs = 0;
  private cycleDurationMs: number;
  private started = false;
  readonly durationMs: number;
  constructor(durationMs: number = INTERACTION.dwellMs) { this.durationMs = durationMs; this.cycleDurationMs = durationMs; }
  get progress(): number { return this.elapsedMs / this.cycleDurationMs; }

  update(target: DwellTarget | null, insideZones: readonly string[], tryingToMove: boolean, deltaMs: number,
    nextDurationMs = this.durationMs): string | null {
    if (target && !insideZones.includes(target.id)) target = null;
    if (target?.id !== this.target?.id || target?.action !== this.target?.action) this.cancel();
    this.target = target;
    if (!target || !target.action || tryingToMove) { this.cancel(); return null; }
    if (!this.started) { this.cycleDurationMs = nextDurationMs; this.started = true; }
    this.elapsedMs += Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
    if (this.elapsedMs + 0.000001 < this.cycleDurationMs) return null;
    this.elapsedMs = 0;
    this.started = false;
    return target.action;
  }
  cancel(): void { this.target = null; this.elapsedMs = 0; this.started = false; }
  reset(): void { this.cancel(); }
}

import { CONTROLS } from '../config';
import { dragVector } from './drag';
import type { Point } from '../world/layout';

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);

export class Controls {
  private readonly keys = new Set<string>();
  private readonly abort = new AbortController();
  private readonly indicator = document.querySelector<HTMLDivElement>('#drag-indicator')!;
  private readonly knob = document.querySelector<HTMLSpanElement>('#drag-knob')!;
  private readonly notice = document.querySelector<HTMLDivElement>('#pause-notice')!;
  private pointerId: number | null = null;
  private origin: Point = { x: 0, y: 0 };
  private touch: Point = { x: 0, y: 0 };
  private blocked = false;
  paused = document.hidden || !document.hasFocus();

  constructor(private readonly surface: HTMLCanvasElement, private readonly onCancel: (discardFrame?: boolean) => void) {
    const options = { signal: this.abort.signal };
    this.notice.hidden = !this.paused;
    window.addEventListener('keydown', (event) => {
      if (event.target instanceof HTMLElement && event.target.closest('button, input, textarea, select, [contenteditable], [data-ui]')) return;
      if (!MOVE_KEYS.has(event.code)) return;
      event.preventDefault();
      if (event.repeat || this.paused || this.blocked) return;
      this.keys.add(event.code);
      // Cancel immediately, so even a tap between two frames counts as an intent to move.
      this.onCancel();
    }, options);
    window.addEventListener('keyup', (event) => this.keys.delete(event.code), options);
    window.addEventListener('blur', () => this.setPaused(true), options);
    window.addEventListener('focus', () => this.setPaused(document.hidden), options);
    document.addEventListener('visibilitychange', () => this.setPaused(document.hidden || !document.hasFocus()), options);
    window.addEventListener('resize', () => this.reset(), options);
    window.addEventListener('pagehide', () => this.setPaused(true), options);
    window.addEventListener('pageshow', () => this.setPaused(document.hidden || !document.hasFocus()), options);

    // The canvas alone owns movement. HUD buttons/windows never start a gesture.
    surface.addEventListener('pointerdown', (event) => {
      if (event.target !== surface || this.pointerId !== null || !event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      if (document.hidden || this.blocked) return;
      document.querySelector<HTMLElement>('#game')!.focus({ preventScroll: true });
      if (this.paused) this.setPaused(false);
      else this.onCancel();
      this.pointerId = event.pointerId;
      this.origin = { x: event.clientX, y: event.clientY };
      surface.setPointerCapture(event.pointerId);
      this.indicator.style.left = event.clientX + 'px';
      this.indicator.style.top = event.clientY + 'px';
      this.indicator.hidden = false;
      this.updateDrag(event);
    }, options);
    surface.addEventListener('pointermove', (event) => {
      if (event.pointerId === this.pointerId) this.updateDrag(event);
    }, options);
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
      surface.addEventListener(name, (event) => {
        if (event.pointerId === this.pointerId) {
          this.releasePointer();
          if (name !== 'pointerup') this.onCancel();
        }
      }, options);
    }
  }

  get movement(): Point {
    if (this.paused || this.blocked) return { x: 0, y: 0 };
    let x = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    let y = Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
    if (this.pointerId !== null) ({ x, y } = this.touch);
    const magnitude = Math.hypot(x, y);
    return magnitude > 1 ? { x: x / magnitude, y: y / magnitude } : { x, y };
  }

  get tryingToMove(): boolean {
    // Opposing keys and pushing into furniture still count, even with zero physical displacement.
    return !this.paused && !this.blocked && (this.keys.size > 0 || Math.hypot(this.touch.x, this.touch.y) > 0);
  }

  setBlocked(blocked: boolean): void { this.blocked = blocked; this.reset(); }

  reset(): void {
    this.keys.clear();
    this.releasePointer();
    this.onCancel(true);
  }

  destroy(): void { this.reset(); this.abort.abort(); }

  private setPaused(paused: boolean): void {
    this.reset();
    this.paused = paused;
    this.notice.hidden = !paused;
  }

  private releasePointer(): void {
    const id = this.pointerId;
    this.pointerId = null;
    this.touch = { x: 0, y: 0 };
    this.knob.style.transform = 'translate(0px, 0px)';
    this.indicator.hidden = true;
    if (id !== null && this.surface.hasPointerCapture(id)) this.surface.releasePointerCapture(id);
  }

  private updateDrag(event: PointerEvent): void {
    // Both values are CSS viewport pixels. Camera scroll/zoom and devicePixelRatio cannot move the origin.
    // On resize the gesture is cancelled, so an old coordinate space is never reused.
    const dx = event.clientX - this.origin.x;
    const dy = event.clientY - this.origin.y;
    const length = Math.hypot(dx, dy);
    const factor = length > CONTROLS.dragMaxDistance ? CONTROLS.dragMaxDistance / length : 1;
    this.touch = dragVector(this.origin, { x: event.clientX, y: event.clientY });
    this.knob.style.transform = 'translate(' + dx * factor + 'px, ' + dy * factor + 'px)';
    if (this.tryingToMove) this.onCancel();
  }
}

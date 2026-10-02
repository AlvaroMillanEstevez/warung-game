import { CONTROLS } from '../config';
import type { Point } from '../world/layout';

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);

export class Controls {
  private readonly keys = new Set<string>();
  private readonly abort = new AbortController();
  private readonly joystick = document.querySelector<HTMLDivElement>('#joystick')!;
  private readonly knob = document.querySelector<HTMLSpanElement>('#joystick-knob')!;
  private readonly button = document.querySelector<HTMLButtonElement>('#interact-button')!;
  private readonly notice = document.querySelector<HTMLDivElement>('#pause-notice')!;
  private pointerId: number | null = null;
  private touch: Point = { x: 0, y: 0 };
  private pendingInteraction = false;
  paused = false;

  constructor() {
    const options = { signal: this.abort.signal };
    window.addEventListener('keydown', (event) => {
      if (event.target instanceof HTMLElement && event.target.matches('input, textarea, select, [contenteditable]')) return;
      if (MOVE_KEYS.has(event.code) || event.code === 'KeyE') {
        event.preventDefault();
        if (event.repeat || this.paused) return;
        this.keys.add(event.code);
        if (event.code === 'KeyE') this.pendingInteraction = true;
      }
    }, options);
    window.addEventListener('keyup', (event) => this.keys.delete(event.code), options);
    window.addEventListener('blur', () => this.setPaused(true), options);
    window.addEventListener('focus', () => this.setPaused(document.hidden), options);
    document.addEventListener('visibilitychange', () => this.setPaused(document.hidden || !document.hasFocus()), options);
    window.addEventListener('resize', () => this.reset(), options);
    window.addEventListener('pagehide', () => this.reset(), options);

    this.joystick.addEventListener('pointerdown', (event) => {
      if (this.pointerId !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      this.setPaused(false);
      this.pointerId = event.pointerId;
      this.joystick.setPointerCapture(event.pointerId);
      this.updateJoystick(event);
    }, options);
    this.joystick.addEventListener('pointermove', (event) => {
      if (event.pointerId === this.pointerId) this.updateJoystick(event);
    }, options);
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
      this.joystick.addEventListener(name, (event) => {
        if (event.pointerId === this.pointerId) this.releaseJoystick();
      }, options);
    }
    this.button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (event.button === 0 && !this.button.disabled && !this.paused) this.pendingInteraction = true;
    }, options);
    // Native keyboard and assistive-technology activation.
    this.button.addEventListener('click', (event) => {
      if (event.detail === 0 && !this.paused) this.pendingInteraction = true;
    }, options);
  }

  get movement(): Point {
    if (this.paused) return { x: 0, y: 0 };
    let x = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    let y = Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
    if (this.pointerId !== null) ({ x, y } = this.touch);
    const magnitude = Math.hypot(x, y);
    return magnitude > 1 ? { x: x / magnitude, y: y / magnitude } : { x, y };
  }

  consumeInteraction(): boolean {
    const pending = this.pendingInteraction;
    this.pendingInteraction = false;
    return pending && !this.paused;
  }

  reset(): void {
    this.keys.clear();
    this.pendingInteraction = false;
    this.releaseJoystick();
  }

  destroy(): void {
    this.reset();
    this.abort.abort();
  }

  private setPaused(paused: boolean): void {
    this.reset();
    this.paused = paused;
    this.notice.hidden = !paused;
  }

  private releaseJoystick(): void {
    const id = this.pointerId;
    this.pointerId = null;
    this.touch = { x: 0, y: 0 };
    this.knob.style.transform = 'translate(0px, 0px)';
    this.joystick.classList.remove('active');
    if (id !== null && this.joystick.hasPointerCapture(id)) this.joystick.releasePointerCapture(id);
  }

  private updateJoystick(event: PointerEvent): void {
    // DOM client coordinates share the same space as this rect, independent of canvas scale/DPR.
    const rect = this.joystick.getBoundingClientRect();
    const radius = rect.width * CONTROLS.joystickTravel;
    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
    const length = Math.hypot(dx, dy);
    const factor = length > radius ? radius / length : 1;
    this.knob.style.transform = 'translate(' + dx * factor + 'px, ' + dy * factor + 'px)';
    this.touch = length < radius * CONTROLS.deadZone ? { x: 0, y: 0 } : { x: dx * factor / radius, y: dy * factor / radius };
    this.joystick.classList.add('active');
  }
}

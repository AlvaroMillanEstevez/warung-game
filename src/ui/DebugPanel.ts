import type { Restaurant } from '../simulation/Restaurant';

export class DebugPanel {
  private readonly dialog = document.querySelector<HTMLDialogElement>('#debug-panel')!;
  private readonly abort = new AbortController();
  private hold: ReturnType<typeof setTimeout> | null = null;
  get isOpen(): boolean { return this.dialog.open; }
  constructor(private readonly restaurant: Restaurant, private readonly onToggle: (open: boolean) => void) {
    const options = { signal: this.abort.signal }, money = document.querySelector('#money-display')!;
    const cancelHold = () => { if (this.hold !== null) clearTimeout(this.hold); this.hold = null; };
    window.addEventListener('keydown', event => {
      if (event.code !== 'F2' || event.repeat) return;
      event.preventDefault(); this.isOpen ? this.close() : this.open();
    }, options);
    money.addEventListener('pointerdown', () => { cancelHold(); this.hold = setTimeout(() => this.open(), 1200); }, options);
    for (const name of ['pointerup', 'pointercancel', 'pointerleave']) money.addEventListener(name, cancelHold, options);
    window.addEventListener('blur', cancelHold, options);
    document.querySelector('#close-debug')!.addEventListener('click', () => this.close(), options);
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); }, options);
  }
  open(): void {
    if (document.querySelector('dialog[open]')) return;
    this.onToggle(true);
    const r = this.restaurant;
    document.querySelector('#debug-state')!.textContent = JSON.stringify({
      gasto: r.totalSpent, demandaAumentada: r.increasedDemand, intervaloMs: r.arrivalIntervalMs,
      filas: { dentro: r.queue('dine-in').length, llevar: r.queue('takeaway').length }, clientes: r.customers.length,
      capacidadEquipo: r.teamCapacity, accionMs: r.teamActionMs,
      jugador: r.production.inventory, stock: r.production.availablePortions,
    }, null, 2);
    this.dialog.showModal();
  }
  close(): void {
    if (!this.isOpen) return;
    this.dialog.close(); this.onToggle(false);
    document.querySelector<HTMLElement>('#game')!.focus({ preventScroll: true });
  }
  destroy(): void { if (this.hold !== null) clearTimeout(this.hold); this.close(); this.abort.abort(); }
}

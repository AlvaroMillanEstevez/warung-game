import { STAFF, UPGRADES } from '../config';
import type { UpgradeId } from '../config';
import type { Restaurant } from '../simulation/Restaurant';
import type { Point } from '../world/layout';

const NAMES: Record<UpgradeId, string> = {
  cook: 'Cocinero', cleaner: 'Limpieza', transport: 'Más capacidad',
  actionSpeed: 'Acciones más rápidas', stoveSpeed: 'Cocina más rápida', 'table-3': 'Mesa 3', 'table-4': 'Mesa 4',
};
export class UpgradePanel {
  private readonly dialog = document.querySelector<HTMLDialogElement>('#upgrades-panel')!;
  private readonly list = document.querySelector<HTMLElement>('#upgrade-list')!;
  private readonly money = document.querySelector<HTMLElement>('#upgrade-money')!;
  private readonly feedback = document.querySelector<HTMLElement>('#upgrade-feedback')!;
  private readonly abort = new AbortController();
  private lastPurchase = -Infinity;
  get isOpen(): boolean { return this.dialog.open; }

  constructor(private readonly restaurant: Restaurant, private readonly position: () => Point,
    private readonly onToggle: (open: boolean) => void, private readonly onPurchase: () => void) {
    const options = { signal: this.abort.signal };
    document.querySelector('#open-upgrades')!.addEventListener('click', () => this.open(), options);
    document.querySelector('#close-upgrades')!.addEventListener('click', () => this.close(), options);
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); }, options);
  }
  open(): void {
    if (this.isOpen) return;
    this.onToggle(true);
    this.feedback.textContent = '';
    this.render();
    this.dialog.showModal();
  }
  close(): void {
    if (!this.isOpen) return;
    this.dialog.close();
    this.onToggle(false);
    document.querySelector<HTMLElement>('#game')!.focus({ preventScroll: true });
  }
  destroy(): void { this.close(); this.abort.abort(); }
  private effect(id: UpgradeId, level: number): string {
    switch (id) {
      case 'cook': return level ? 'Contratado · carga propia de ' + STAFF.capacity :
        'Prepara y deposita platos. Carga propia de ' + STAFF.capacity + '; objetivo de stock ' + STAFF.cookStockTarget + '.';
      case 'cleaner': return level ? 'Contratada · residuos propios ' + STAFF.capacity :
        'Limpia mesas y vacía residuos. Carga propia de ' + STAFF.capacity + '; prioriza a los clientes que esperan.';
      case 'transport': return UPGRADES.transport.capacities[level] + ' por categoría: ingredientes, platos y residuos.';
      case 'actionSpeed': return UPGRADES.actionSpeed.durationsMs[level]! / 1000 + ' s por acción del jugador. Se aplica al próximo ciclo.';
      case 'stoveSpeed': return UPGRADES.stoveSpeed.durationsMs[level]! / 1000 + ' s por ración nueva. Conserva las cocciones en curso.';
      default: return level ? 'Mesa disponible para comer y limpiar.' : 'Añade una mesa en su espacio fijo del local.';
    }
  }
  private render(): void {
    this.money.textContent = this.restaurant.money + ' monedas disponibles';
    this.list.replaceChildren();
    for (const id of Object.keys(UPGRADES) as UpgradeId[]) {
      const state = this.restaurant.purchaseState(id, this.position());
      const row = document.createElement('article');
      row.className = 'upgrade-row';
      const description = document.createElement('div');
      const title = document.createElement('h3');
      title.textContent = NAMES[id];
      const current = document.createElement('p');
      current.textContent = 'Nivel ' + state.level + '/' + UPGRADES[id].prices.length + ' · ' + this.effect(id, state.level);
      description.append(title, current);
      if (state.price !== null && ['transport', 'actionSpeed', 'stoveSpeed'].includes(id)) {
        const next = document.createElement('p');
        next.className = 'upgrade-next';
        next.textContent = 'Siguiente: ' + this.effect(id, state.level + 1);
        description.append(next);
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.upgrade = id;
      button.disabled = state.problem !== null;
      button.textContent = state.price === null ? 'Máximo' : 'Comprar · ' + state.price;
      button.setAttribute('aria-label', NAMES[id] + ' · ' + button.textContent);
      button.addEventListener('click', event => {
        if (event.detail > 1 || performance.now() - this.lastPurchase < 450) return;
        this.lastPurchase = performance.now();
        const purchased = this.restaurant.purchase(id, state.level, this.position());
        this.feedback.textContent = purchased ? NAMES[id] + ': compra realizada.' : 'La compra ya no está disponible.';
        this.onPurchase();
        this.render();
      });
      const purchase = document.createElement('div');
      purchase.className = 'upgrade-buy';
      purchase.append(button);
      if (state.problem) {
        const reason = document.createElement('small');
        reason.textContent = state.problem;
        purchase.append(reason);
      }
      row.append(description, purchase);
      this.list.append(row);
    }
  }
}

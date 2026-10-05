import { i18n, t } from '../i18n';
import type { Key, Message } from '../i18n';
import type { Restaurant } from '../simulation/Restaurant';

export class OrderPanel {
  private readonly dialog = document.querySelector<HTMLDialogElement>('#orders-panel')!;
  private readonly content = document.querySelector<HTMLElement>('#order-content')!;
  private readonly hud = document.querySelector<HTMLElement>('#order-card')!;
  private readonly abort = new AbortController();
  private readonly unsubscribe: () => void;
  private confirmId: number | null = null;
  private feedback: Key | null = null;
  private hudKey = '';
  get isOpen(): boolean { return this.dialog.open; }
  constructor(private readonly restaurant: Restaurant, private readonly onToggle: (open: boolean) => void,
    private readonly onChange: () => void) {
    const options = { signal: this.abort.signal };
    document.querySelector('#close-orders')!.addEventListener('click', () => this.close(), options);
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); }, options);
    this.unsubscribe = i18n.subscribe(() => { if (this.isOpen) this.render(); this.update(); });
  }
  open(): void {
    if (document.querySelector('dialog[open]')) return;
    this.onToggle(true); this.confirmId = null; this.feedback = null;
    this.render(); this.dialog.showModal();
  }
  close(): void {
    if (!this.isOpen) return;
    this.dialog.close(); this.confirmId = null; this.onToggle(false);
    document.querySelector<HTMLElement>('#game')!.focus({ preventScroll: true });
  }
  destroy(): void { this.close(); this.abort.abort(); this.unsubscribe(); this.hud.hidden = true; }
  update(): void {
    const order = this.restaurant.bulkOrders.state;
    this.hud.hidden = order.phase !== 'active';
    if (order.phase !== 'active') { this.hudKey = ''; return; }
    const seconds = Math.ceil(order.bonusRemainingMs / 1000);
    const key = [i18n.current, order.id, order.packed, seconds].join(':');
    if (key === this.hudKey) return; this.hudKey = key;
    document.querySelector('#order-card-progress')!.textContent = t('bulk.card', { packed: order.packed, total: order.quantity });
    document.querySelector('#order-card-timer')!.textContent = seconds ? t('bulk.timer', { seconds }) : t('bulk.expired');
  }
  private render(): void {
    const state = this.restaurant.bulkOrders.state;
    this.content.replaceChildren();
    const add = (message: Message, tag = 'p', className = ''): HTMLElement => {
      const element = document.createElement(tag); element.textContent = t(message); element.className = className;
      this.content.append(element); return element;
    };
    const button = (key: Key, id: string, action: () => void): void => {
      const element = document.createElement('button'); element.type = 'button'; element.id = id; element.textContent = t(key);
      element.addEventListener('click', action); this.content.append(element);
    };
    if (state.phase === 'locked') { add('bulk.locked'); return; }
    add(this.restaurant.bulkOrders.firstCompleted ? 'bulk.goalDone' : 'bulk.goal', 'h3', 'order-goal');
    if (!this.restaurant.bulkOrders.firstCompleted) add('bulk.intro', 'p', 'order-help');
    if (this.feedback) add(this.feedback, 'p', 'order-feedback').setAttribute('role', 'status');
    if (state.phase === 'waiting') {
      add({ key: 'bulk.waiting', params: { seconds: Math.ceil(state.remainingMs / 1000) } }); return;
    }
    add(state.phase === 'offer' ? 'bulk.offer' : 'bulk.active', 'span', 'upgrade-status');
    add({ key: 'bulk.quantity', params: { quantity: state.quantity } }, 'h3');
    add({ key: 'bulk.base', params: { amount: state.basePay } });
    add({ key: 'bulk.bonus', params: { amount: state.bonusPay } });
    if (state.phase === 'offer') {
      add({ key: 'bulk.deadline', params: { seconds: state.bonusMs / 1000 } });
      add('bulk.late', 'p', 'order-help'); add('bulk.noExpiry', 'p', 'order-help');
      button('bulk.accept', 'accept-order', () => {
        this.feedback = this.restaurant.acceptBulkOrder(state.id) ? 'bulk.accepted' : 'bulk.stale';
        this.onChange(); this.render(); this.update();
      });
    } else {
      add({ key: 'bulk.progress', params: { packed: state.packed, total: state.quantity } }, 'p', 'order-progress');
      add(state.bonusRemainingMs > 0 ? { key: 'bulk.timer', params: { seconds: Math.ceil(state.bonusRemainingMs / 1000) } } : 'bulk.expired');
      add('bulk.late', 'p', 'order-help'); add('bulk.how', 'p', 'order-help');
      if (this.confirmId === state.id) {
        add('bulk.confirmTitle', 'h3');
        add({ key: 'bulk.confirmBody', params: { packed: state.packed } }, 'p', 'order-confirm');
        button('bulk.confirmCancel', 'confirm-cancel-order', () => {
          this.feedback = this.restaurant.cancelBulkOrder(state.id) ? 'bulk.cancelled' : 'bulk.stale';
          this.confirmId = null; this.onChange(); this.render(); this.update();
        });
        button('bulk.keep', 'keep-order', () => { this.confirmId = null; this.render(); });
      } else button('bulk.cancel', 'cancel-order', () => {
        this.confirmId = state.id; this.render();
        document.querySelector<HTMLElement>('#confirm-cancel-order')!.focus();
      });
    }
  }
}

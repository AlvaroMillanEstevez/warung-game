import { ECONOMY } from '../config';
import { i18n, t } from '../i18n';
import type { Message } from '../i18n';
import type { SupplyPayment } from '../simulation/Economy';
import type { Restaurant } from '../simulation/Restaurant';

export class SupplierPanel {
  private readonly dialog = document.querySelector<HTMLDialogElement>('#supplier-panel')!;
  private readonly content = document.querySelector<HTMLElement>('#supplier-content')!;
  private readonly abort = new AbortController();
  private readonly unsubscribe: () => void;
  private feedback: Message | null = null;
  get isOpen(): boolean { return this.dialog.open; }
  constructor(private readonly restaurant: Restaurant, private readonly onToggle: (open: boolean) => void,
    private readonly onChange: () => void) {
    const options = { signal: this.abort.signal };
    document.querySelector('#close-supplier')!.addEventListener('click', () => this.close(), options);
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); }, options);
    this.unsubscribe = i18n.subscribe(() => { if (this.isOpen) this.render(); });
  }
  open(): void {
    if (document.querySelector('dialog[open]')) return;
    this.onToggle(true); this.feedback = null; this.render(); this.dialog.showModal();
  }
  close(): void {
    if (!this.isOpen) return;
    this.dialog.close(); this.onToggle(false);
    document.querySelector<HTMLElement>('#game')!.focus({ preventScroll: true });
  }
  destroy(): void { this.close(); this.abort.abort(); this.unsubscribe(); }
  private render(): void {
    const r = this.restaurant, revision = r.supplyRevision;
    this.content.replaceChildren();
    const add = (message: Message, className = ''): HTMLElement => {
      const p = document.createElement('p'); p.textContent = t(message); p.className = className;
      this.content.append(p); return p;
    };
    add({ key: 'supplier.stock', params: { count: r.production.fridgeStock } }, 'order-progress');
    add({ key: 'supplier.money', params: { amount: r.money } });
    add({ key: 'supplier.debt', params: { amount: r.supplierDebt } });
    for (const method of ['cash', 'credit', 'large'] as const) {
      const price = method === 'large' ? ECONOMY.largeSupplyPrice : method === 'cash' ? ECONOMY.cashPrice : ECONOMY.creditPrice;
      const quantity = method === 'large' ? ECONOMY.largeSupplyQuantity : ECONOMY.supplyQuantity;
      const button = document.createElement('button'); button.type = 'button'; button.id = 'supply-' + method;
      button.textContent = t(method === 'credit' ? 'supplier.creditOffer' : 'supplier.cashOffer',
        { quantity, price });
      const problem = r.supplyProblem(method); button.disabled = problem !== null;
      button.addEventListener('click', event => {
        event.stopPropagation(); this.buy(method, revision, price, quantity);
      }, { once: true });
      this.content.append(button);
      if (problem) add({ key: problem, params: { spending: ECONOMY.largeSupplyUnlockSpending } }, 'order-help');
    }
    add('supplier.how', 'order-help');
    if (this.feedback) add(this.feedback, 'order-feedback').setAttribute('role', 'status');
  }
  private buy(method: SupplyPayment, revision: number, price: number, quantity: number): void {
    this.feedback = this.restaurant.buySupplies(method, revision) ?
      { key: method === 'credit' ? 'supplier.creditBought' : 'supplier.cashBought', params: { quantity, price } } :
      { key: this.restaurant.supplyProblem(method) ?? 'supplier.stale', params: { spending: ECONOMY.largeSupplyUnlockSpending } };
    this.onChange(); this.render();
    // A fresh button accepts the next deliberate click; the previous event/quote cannot buy again.
  }
}

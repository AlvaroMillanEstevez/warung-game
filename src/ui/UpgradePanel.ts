import { PRODUCTION, STAFF, UPGRADES } from '../config';
import type { UpgradeId } from '../config';
import type { Restaurant } from '../simulation/Restaurant';
import type { Point } from '../world/layout';
import { chooseLanguage, i18n, t } from '../i18n';
import { isLanguage } from '../i18n/core';
import type { Key, Message } from '../i18n';

const NAMES: Record<UpgradeId, Key> = {
  cashier: 'upgrade.cashier', cook: 'upgrade.cook', cleaner: 'upgrade.cleaner', transport: 'upgrade.transport',
  actionSpeed: 'upgrade.actionSpeed', stoveSpeed: 'upgrade.stoveSpeed', tables: 'upgrade.tables', stove: 'upgrade.stove',
};
export class UpgradePanel {
  private readonly dialog = document.querySelector<HTMLDialogElement>('#upgrades-panel')!;
  private readonly list = document.querySelector<HTMLElement>('#upgrade-list')!;
  private readonly money = document.querySelector<HTMLElement>('#upgrade-money')!;
  private readonly feedback = document.querySelector<HTMLElement>('#upgrade-feedback')!;
  private readonly language = document.querySelector<HTMLSelectElement>('#language-select')!;
  private readonly abort = new AbortController();
  private readonly unsubscribeLanguage: () => void;
  private lastPurchase = -Infinity;
  private purchaseFeedback: { id: UpgradeId; purchased: boolean } | null = null;
  get isOpen(): boolean { return this.dialog.open; }

  constructor(private readonly restaurant: Restaurant, private readonly position: () => Point,
    private readonly onToggle: (open: boolean) => void, private readonly onPurchase: () => void) {
    const options = { signal: this.abort.signal };
    document.querySelector('#close-upgrades')!.addEventListener('click', () => this.close(), options);
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); }, options);
    this.language.value = i18n.current;
    this.language.addEventListener('change', () => {
      if (isLanguage(this.language.value)) chooseLanguage(this.language.value);
    }, options);
    this.unsubscribeLanguage = i18n.subscribe(() => {
      this.language.value = i18n.current;
      if (this.isOpen) this.render();
    });
  }
  open(): void {
    if (this.isOpen) return;
    this.onToggle(true);
    this.purchaseFeedback = null;
    this.render();
    this.dialog.showModal();
  }
  close(): void {
    if (!this.isOpen) return;
    this.dialog.close();
    this.onToggle(false);
    document.querySelector<HTMLElement>('#game')!.focus({ preventScroll: true });
  }
  destroy(): void { this.close(); this.abort.abort(); this.unsubscribeLanguage(); }
  private effect(id: UpgradeId, level: number): string {
    let message: Message;
    switch (id) {
      case 'cashier': message = { key: 'effect.cashier', params: { seconds: this.restaurant.teamActionMs / 1000 } }; break;
      case 'cook': message = { key: level === 2 ? 'effect.cook.assigned' : 'effect.cook.shared',
        params: { count: level, max: UPGRADES.cook.prices.length, capacity: this.restaurant.teamCapacity, target: STAFF.cookStockTarget } }; break;
      case 'cleaner': message = { key: level ? 'effect.cleaner.hired' : 'effect.cleaner',
        params: { capacity: this.restaurant.teamCapacity } }; break;
      case 'transport': message = { key: 'effect.transport', params: { capacity: UPGRADES.transport.capacities[level]! } }; break;
      case 'actionSpeed': message = { key: 'effect.actionSpeed', params: { seconds: UPGRADES.actionSpeed.durationsMs[level]! / 1000 } }; break;
      case 'stoveSpeed': message = { key: 'effect.stoveSpeed', params: { seconds: UPGRADES.stoveSpeed.durationsMs[level]! / 1000 } }; break;
      case 'tables': message = { key: 'effect.tables', params: { count: (this.restaurant.mode==='advanced'?2:0) + level, max: 6 } }; break;
      case 'stove': message = { key: 'effect.stove', params: { count: 1 + level, max: 2, slots: PRODUCTION.stoveSlots } }; break;
    }
    return t(message);
  }
  private render(): void {
    this.money.textContent = t('office.money', { count: this.restaurant.money });
    this.feedback.textContent = this.purchaseFeedback ? (this.purchaseFeedback.purchased ?
      t('upgrade.success', { name: t(NAMES[this.purchaseFeedback.id]) }) : t('upgrade.unavailable')) : '';
    this.list.replaceChildren();
    for (const id of Object.keys(UPGRADES) as UpgradeId[]) {
      if (id === 'transport' && !UPGRADES.transport.enabled) continue;
      const state = this.restaurant.purchaseState(id, this.position());
      const row = document.createElement('article');
      row.className = 'upgrade-row';
      const disabled = state.problem === 'purchase.disabledCapacity';
      const status = disabled ? 'disabled' : state.price === null ? 'complete' : !state.problem ? 'available' :
        state.problem === 'purchase.funds' ? 'funds' : 'requirement';
      row.dataset.state = status;
      const description = document.createElement('div');
      const title = document.createElement('h3');
      title.textContent = t(id==='tables'&&this.restaurant.tableCount===0?'progress.firstTable':NAMES[id]);
      const current = document.createElement('p');
      const effect = this.effect(id, state.level);
      current.textContent = disabled ? effect : id === 'tables' || id === 'stove' || id === 'cook' ? effect :
        t('upgrade.level', { level: state.level, max: UPGRADES[id].prices.length, effect });
      const badge = document.createElement('span');
      badge.className = 'upgrade-status';
      badge.textContent = t(`status.${status}`);
      description.append(badge, title, current);
      if(id==='tables'&&this.restaurant.tableCount===0){const included=document.createElement('p');included.textContent=t('progress.binIncluded');description.append(included);}
      if (!disabled && state.price !== null && ['transport', 'actionSpeed', 'stoveSpeed'].includes(id)) {
        const next = document.createElement('p');
        next.className = 'upgrade-next';
        next.textContent = t('upgrade.next', { effect: this.effect(id, state.level + 1) });
        description.append(next);
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.upgrade = id;
      button.disabled = state.problem !== null;
      button.textContent = disabled ? t('status.disabled') : state.price === null ? t(id === 'tables' ? 'limit.tables' : id === 'cook' ? 'limit.cooks' : 'limit.max') :
        t('upgrade.buy', { price: state.price });
      button.setAttribute('aria-label', t('upgrade.aria', { name: t(NAMES[id]), action: button.textContent }));
      button.addEventListener('click', event => {
        if (event.detail > 1 || performance.now() - this.lastPurchase < 450) return;
        this.lastPurchase = performance.now();
        const purchased = this.restaurant.purchase(id, state.level, this.position());
        this.purchaseFeedback = { id, purchased };
        this.onPurchase();
        this.render();
      });
      const purchase = document.createElement('div');
      purchase.className = 'upgrade-buy';
      purchase.append(button);
      if (state.problem && state.price !== null) {
        const reason = document.createElement('small');
        reason.textContent = t(state.problem);
        purchase.append(reason);
      }
      row.append(description, purchase);
      this.list.append(row);
    }
  }
}

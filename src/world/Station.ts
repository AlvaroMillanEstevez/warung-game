import Phaser from 'phaser';
import { i18n, t } from '../i18n';
import { PALETTE as C, VISUAL as V, cssColor } from '../visuals/theme';
import { checkmark, label, meal, progressBar, softShadow } from '../visuals/drawing';
import { TABLE_POSITIONS } from './layout';
import type { StationData } from './layout';
import type { Restaurant } from '../simulation/Restaurant';

export class Station {
  readonly visual: Phaser.GameObjects.Container;
  private readonly highlight: Phaser.GameObjects.Graphics;
  private readonly shadow: Phaser.GameObjects.Graphics;
  private chair?: Phaser.GameObjects.Graphics;
  private selected = false;
  private readonly productionArt: Phaser.GameObjects.Graphics;
  private lastProductionKey = '';
  private lastReady = 0;
  private packingText?: Phaser.GameObjects.Text;
  private economyText?: Phaser.GameObjects.Text;
  private readyAt = -Infinity;

  constructor(scene: Phaser.Scene, readonly data: StationData) {
    const { x, y, width: w, height: d } = data.footprint, lift = data.height;
    this.shadow = scene.add.graphics().setDepth(V.depth.groundShadow);
    softShadow(this.shadow, x + w / 2 + 3, y + d - 1, w + 4, 21);
    const g = scene.add.graphics();
    this.visual = scene.add.container(x, y, [g]).setDepth(y + d);
    const table = data.kind === 'table';
    const front = data.kind === 'fridge' ? C.green : data.kind === 'counter' ? C.green :
      data.kind === 'stove' ? C.metal : data.kind === 'bin' ? C.greenDark : C.wood;
    const top = data.kind === 'fridge' ? C.greenLight : data.kind === 'stove' ? C.cream :
      data.kind === 'bin' ? C.greenLight : C.woodLight;
    if (table) {
      const seat = TABLE_POSITIONS[data.id]!.seat;
      this.chair = scene.add.graphics().setDepth(V.depth.floorText + 1);
      softShadow(this.chair, seat.x, seat.y + 7, 29, 10);
      this.chair.fillStyle(C.woodDark).fillRoundedRect(seat.x - 10, seat.y - 2, 6, 15, 3)
        .fillRoundedRect(seat.x + 4, seat.y - 2, 6, 15, 3);
      this.chair.fillStyle(C.wood).fillRoundedRect(seat.x - 16, seat.y - 14, 32, 17, 7);
      this.chair.fillStyle(C.greenLight).fillRoundedRect(seat.x - 15, seat.y - 18, 30, 17, 7);
      this.chair.lineStyle(1, C.cream, .4).strokeRoundedRect(seat.x - 11, seat.y - 15, 22, 10, 5);
      for (const bx of [10, w - 20]) {
        g.fillStyle(C.woodDark).fillRoundedRect(bx, d - lift - 6, 10, lift + 5, 4);
        g.fillStyle(C.wood).fillRoundedRect(bx, d - lift, 4, lift - 5, 2);
      }
      g.fillStyle(C.wood).fillRoundedRect(0, -lift + 7, w, d, V.radius.furniture);
    } else {
      g.fillStyle(C.woodDark).fillRoundedRect(9, d - 9, w - 18, 10, 4);
      g.fillStyle(front).fillRoundedRect(0, d - lift - 7, w, lift + 5, V.radius.furniture);
      g.fillStyle(C.shadow, .09).fillRoundedRect(w - 10, d - lift, 10, lift - 8, 4);
      g.fillStyle(C.cream, .16).fillRoundedRect(3, d - lift, 3, lift - 14, 1.5);
    }
    g.fillStyle(top).fillRoundedRect(0, -lift, w, d, V.radius.furniture);
    g.lineStyle(V.stroke.normal, C.cream, .50).strokeRoundedRect(3, -lift + 3, w - 6, d - 7, V.radius.furniture - 2);

    switch (data.kind) {
      case 'fridge': {
        const frontY = d - lift;
        g.fillStyle(C.greenDark, .24).fillRoundedRect(9, frontY + 4, w - 20, 27, 7)
          .fillRoundedRect(9, frontY + 36, w - 20, lift - 48, 7);
        g.fillStyle(C.greenLight, .32).fillRoundedRect(12, frontY + 6, w - 26, 22, 6);
        g.fillStyle(C.cream).fillRoundedRect(w - 23, frontY + 11, 6, 13, 3)
          .fillRoundedRect(w - 23, frontY + 44, 6, 26, 3);
        g.fillStyle(C.cream).fillRoundedRect(18, frontY + 46, 24, 28, 5);
        g.fillStyle(C.coral).fillCircle(30, frontY + 46, 3);
        g.fillStyle(C.green).fillEllipse(26, frontY + 59, 5, 9).fillEllipse(32, frontY + 61, 8, 4);
        g.lineStyle(1.5, C.woodLight).lineBetween(23, frontY + 68, 36, frontY + 68);
        g.fillStyle(C.cream, .17).fillRoundedRect(8, -lift + 8, w - 16, 8, 4);
        break;
      }
      case 'stove': {
        for (const bx of [24, 74]) for (const by of [-lift + 16, -lift + 41]) {
          g.fillStyle(C.wallShade).fillEllipse(bx + 1, by + 2, 31, 20);
          g.fillStyle(C.greenDark).fillEllipse(bx, by, 27, 17);
          g.lineStyle(1.5, C.metal).strokeEllipse(bx, by, 18, 11);
          g.fillStyle(C.ink).fillEllipse(bx, by, 10, 6);
        }
        g.fillStyle(C.greenDark).fillRoundedRect(15, d - lift + 18, w - 30, 17, 6);
        g.fillStyle(C.cream, .15).fillRoundedRect(20, d - lift + 21, w - 40, 3, 1.5);
        for (const bx of [22, 41, 60, 79]) {
          g.fillStyle(C.woodDark, .3).fillCircle(bx, d - lift + 9, 4);
          g.fillStyle(C.cream).fillCircle(bx, d - lift + 8, 3.4);
          g.lineStyle(1, C.greenDark).lineBetween(bx, d - lift + 6, bx, d - lift + 8);
        }
        break;
      }
      case 'counter': {
        g.fillStyle(C.greenDark).fillRoundedRect(15, d - lift + 7, w - 30, 27, 9);
        for (const bx of [25, w - 25]) {
          g.fillStyle(C.woodLight).fillEllipse(bx, d - lift + 20, 4, 8).fillEllipse(bx, d - lift + 20, 8, 4);
        }
        this.visual.add(label(scene, w / 2, d - lift + 20, 'Warung Kita', 14, C.cream).setFontStyle('bold').setOrigin(.5));
        // Serving tray left; small till on the rear right, aligned with the existing checkout.
        g.fillStyle(C.wood).fillRoundedRect(12, -lift + 11, 119, 40, 9);
        g.fillStyle(C.cream).fillRoundedRect(15, -lift + 12, 113, 35, 7);
        g.lineStyle(1, C.wallShade).strokeRoundedRect(20, -lift + 17, 103, 25, 5);
        g.fillStyle(C.greenDark).fillRoundedRect(w - 63, -lift + 13, 43, 28, 7);
        g.fillStyle(C.metal).fillRoundedRect(w - 59, -lift + 7, 35, 21, 5);
        g.fillStyle(C.greenDark).fillRoundedRect(w - 55, -lift + 10, 27, 12, 3);
        g.lineStyle(2, C.cream).lineBetween(w - 49, -lift + 15, w - 36, -lift + 15);
        for (let bx = w - 55; bx < w - 30; bx += 8)
          g.fillStyle(C.cream).fillRoundedRect(bx, -lift + 32, 5, 3, 1);
        break;
      }
      case 'table': {
        // Rounded slab, quiet grain and one folded woven napkin.
        for (const by of [-lift + 18, -lift + 40])
          g.lineStyle(1, C.wood, .24).lineBetween(14, by, w - 14, by - 3);
        g.fillStyle(C.cream).fillRoundedRect(67, -lift + 19, 22, 24, 5);
        g.fillStyle(C.coral, .65).fillRoundedRect(70, -lift + 20, 3, 22, 1.5);
        g.lineStyle(1, C.woodLight).lineBetween(77, -lift + 23, 85, -lift + 23).lineBetween(77, -lift + 39, 85, -lift + 39);
        break;
      }
      case 'packing': {
        g.fillStyle(C.cream).fillEllipse(12, -lift + 10, 14, 9);
        g.fillStyle(C.wood).fillEllipse(12, -lift + 10, 7, 4);
        this.packingText = label(scene, w / 2, d - lift + 12, '', 10, C.greenDark).setOrigin(.5);
        this.visual.add(this.packingText);
        break;
      }
      case 'cash': {
        g.fillStyle(C.greenDark).fillRoundedRect(4, -lift + 3, w - 8, d - 6, 5);
        g.fillStyle(C.cream).fillRoundedRect(8, -lift + 6, w - 16, d - 11, 3);
        break;
      }
      case 'supplier': {
        // Crate, ingredient sacks and invoice: a stationary supply point, not a delivery vehicle.
        for (const bx of [12, 32, 51]) {
          g.fillStyle(C.cream).fillRoundedRect(bx, -lift + 7, 14, 19, 5);
          g.fillStyle(C.green).fillRoundedRect(bx + 4, -lift + 11, 6, 10, 2);
        }
        g.lineStyle(3, C.woodDark).lineBetween(5, d - lift + 13, w - 5, d - lift + 13)
          .lineBetween(5, d - lift + 26, w - 5, d - lift + 26);
        g.fillStyle(C.cream).fillRoundedRect(w / 2 - 9, d - lift + 4, 18, 20, 2);
        g.lineStyle(1.5, C.green).lineBetween(w / 2 - 5, d - lift + 10, w / 2 + 5, d - lift + 10)
          .lineBetween(w / 2 - 5, d - lift + 16, w / 2 + 3, d - lift + 16);
        break;
      }
      case 'bin': {
        g.fillStyle(C.greenDark).fillRoundedRect(8, -lift + 8, w - 16, d - 17, 9);
        g.fillStyle(C.shadow, .35).fillRoundedRect(12, -lift + 12, w - 24, 10, 5);
        g.lineStyle(2, C.metal).strokeRoundedRect(18, d - lift + 13, 16, 16, 5);
        g.lineStyle(2, C.metal).lineBetween(21, d - lift + 20, 23, d - lift + 24)
          .lineBetween(28, d - lift + 24, 31, d - lift + 19);
        g.fillStyle(C.metal).fillRoundedRect(18, d - 6, 18, 5, 2.5);
        break;
      }
    }
    if (data.kind === 'fridge' || data.kind === 'cash') {
      this.economyText = label(scene, data.kind === 'cash' ? w + 28 : w / 2,
        data.kind === 'cash' ? d - lift - 2 : d - lift + 10, '', 11, C.greenDark).setOrigin(.5)
        .setStyle({ backgroundColor: cssColor(C.cream), padding: { x: 4, y: 2 } });
      this.economyText.setName('economy-count-' + data.id);
      this.visual.add(this.economyText);
    }
    this.highlight = scene.add.graphics().setDepth(y + d + .1);
    this.highlight.lineStyle(V.stroke.emphasis, C.green, .6)
      .strokeRoundedRect(x - 3, y - lift - 3, w + 6, d + lift + 6, V.radius.furniture + 3).setVisible(false);
    this.productionArt = scene.add.graphics(); this.visual.add(this.productionArt);
  }
  showState(restaurant: Restaurant): void {
    if (!['stove', 'counter', 'table', 'packing', 'fridge', 'cash'].includes(this.data.kind)) return;
    const production = restaurant.production, table = restaurant.table(this.data.id);
    const customer = table?.customerId ? restaurant.customer(table.customerId) : undefined;
    const slots = production.slotsFor(this.data.id), readyCount = slots.filter(slot => slot.status === 'ready').length;
    if (readyCount > this.lastReady) this.readyAt = restaurant.elapsedMs;
    this.lastReady = readyCount;
    // Tiny settling lift only on becoming ready, using the active simulation clock.
    const settle = Math.max(0, 1 - (restaurant.elapsedMs - this.readyAt) / V.motion.settleMs);
    this.productionArt.y = -Math.sin(settle * Math.PI) * 1.5;
    const stoveKey = slots.map(slot => slot.status === 'cooking' ? Math.floor(slot.elapsedMs / slot.durationMs * 50) : slot.status).join(',');
    const bulk = restaurant.bulkOrders.state;
    const packingKey = bulk.phase === 'active' || bulk.phase === 'ready' ? bulk.id + ':' + bulk.packed : bulk.phase;
    const key = [packingKey, i18n.current, production.fridgeStock, restaurant.pendingCash, stoveKey, production.availablePortions, table?.cleanliness, customer?.id, customer?.phase].join(':');
    if (key === this.lastProductionKey) return;
    this.lastProductionKey = key;
    const g = this.productionArt.clear(), lift = this.data.height, d = this.data.footprint.height;
    if (this.data.kind === 'fridge') {
      this.economyText?.setText(t('economy.fridgeCount', { count: production.fridgeStock }));
    } else if (this.data.kind === 'cash') {
      this.economyText?.setText(t('economy.cashCount', { amount: restaurant.pendingCash }));
      const piles = restaurant.pendingCash === 0 ? 0 : Math.min(3, Math.ceil(restaurant.pendingCash / 20));
      for (let i = 0; i < piles; i++) {
        g.fillStyle(C.woodDark).fillEllipse(13 + i * 12, -lift + 11, 10, 5);
        g.fillStyle(C.gold).fillEllipse(13 + i * 12, -lift + 8, 10, 5);
        g.lineStyle(1, C.cream, .7).strokeEllipse(13 + i * 12, -lift + 8, 6, 3);
      }
    } else if (this.data.kind === 'packing') {
      this.packingText?.setVisible(bulk.phase === 'active' || bulk.phase === 'ready');
      if (bulk.phase !== 'active' && bulk.phase !== 'ready') return;
      this.packingText?.setText(t('bulk.box', { packed: bulk.packed, total: bulk.quantity }));
      g.fillStyle(C.woodDark).fillRoundedRect(17, -lift + 7, 43, 20, 4);
      g.fillStyle(C.wallShade).fillRoundedRect(20, -lift + 8, 37, 14, 3);
      for (let i = 0; i < bulk.packed; i++) meal(g, 26 + i % 5 * 6, -lift + 12 + Math.floor(i / 5) * 6, .22);
      g.fillStyle(C.woodLight).fillRect(17, -lift + 22, 43, 6);
      g.fillStyle(C.cream).fillRect(36, -lift + 22, 5, 6);
      progressBar(g, 6, d - lift + 22, 54, bulk.packed / bulk.quantity);
    } else if (this.data.kind === 'stove') {
      slots.forEach((slot, index) => {
        if (slot.status === 'empty') return;
        const x = 24 + Math.floor(index / 2) * 50, y = -lift + 16 + (index % 2) * 25;
        if (slot.status === 'ready') {
          meal(g, x, y, .85);
          g.fillStyle(C.ready).fillCircle(x + 12, y - 7, 6);
          checkmark(g, x + 12, y - 7, .6);
        } else {
          g.fillStyle(C.ink).fillEllipse(x, y, 29, 17);
          g.fillStyle(C.woodDark).fillRoundedRect(x + 11, y - 1, 10, 4, 2);
          g.fillStyle(C.woodLight).fillEllipse(x, y - 1, 20, 10);
          g.lineStyle(1.3, C.cream, .9).beginPath().moveTo(x - 4, y - 6).lineTo(x - 6, y - 9).lineTo(x - 4, y - 12).strokePath();
          progressBar(g, x - 13, y + 8, 26, slot.elapsedMs / slot.durationMs, C.cooking);
        }
      });
    } else if (this.data.kind === 'table') {
      const dirty = table!.cleanliness === 'dirty';
      if (dirty || customer?.phase === 'eating') meal(g, 35, -lift + 31, 1.15, dirty);
      if (dirty) {
        g.fillStyle(C.cream).fillTriangle(52, -lift + 29, 61, -lift + 25, 63, -lift + 37);
        g.fillStyle(C.woodDark).fillCircle(26, -lift + 44, 2).fillCircle(44, -lift + 42, 1.5);
        g.fillStyle(C.dirty).fillRoundedRect(5, d - lift - 1, 25, 12, 6);
        g.fillStyle(C.cream).fillRoundedRect(16, d - lift + 1, 2, 4, 1).fillCircle(17, d - lift + 8, 1.2);
      }
    } else {
      // Display tray is illustrative, while carried inventories always show exact quantities.
      for (let i = 0; i < Math.min(production.availablePortions, 8); i++)
        meal(g, 29 + (i % 4) * 26, -lift + 23 + Math.floor(i / 4) * 15, .85);
    }
  }
  destroy(): void { this.visual.destroy(); this.shadow.destroy(); this.chair?.destroy(); this.highlight.destroy(); }
  setSelected(selected: boolean): void {
    if (this.selected === selected) return;
    this.selected = selected; this.highlight.setVisible(selected);
  }
}

import Phaser from 'phaser';
import { COLORS as C } from '../config';
import { TABLE_POSITIONS } from './layout';
import type { StationData } from './layout';
import type { Restaurant } from '../simulation/Restaurant';

export class Station {
  readonly visual: Phaser.GameObjects.Container;
  private readonly highlight: Phaser.GameObjects.Graphics;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private chair?: Phaser.GameObjects.Graphics;
  private selected = false;
  private readonly productionArt: Phaser.GameObjects.Graphics;
  private readonly statusLabel: Phaser.GameObjects.Text;
  private lastProductionKey = '';

  constructor(scene: Phaser.Scene, readonly data: StationData) {
    const { x, y, width: w, height: d } = data.footprint;
    const lift = data.height;
    this.shadow = scene.add.ellipse(x + w / 2 + 5, y + d - 2, w + 16, 25, C.shadow, 0.15).setDepth(-2);
    const g = scene.add.graphics();
    this.visual = scene.add.container(x, y, [g]).setDepth(y + d);
    const tabletop = data.kind === 'table';
    const front = data.kind === 'fridge' ? C.green : data.kind === 'stove' ? C.metal : data.kind === 'bin' ? C.greenDark : C.wood;
    const top = data.kind === 'fridge' ? C.greenLight : data.kind === 'stove' ? C.cream : data.kind === 'bin' ? C.greenLight : C.woodLight;
    if (tabletop) {
      const seat = TABLE_POSITIONS[data.id]!.seat;
      this.chair = scene.add.graphics().setDepth(-90);
      this.chair.fillStyle(C.woodDark).fillRoundedRect(seat.x - 11, seat.y - 5, 22, 10, 3);
      this.chair.fillStyle(C.woodLight).fillEllipse(seat.x, seat.y - 8, 28, 15);
      g.fillStyle(C.woodDark).fillRoundedRect(10, d - lift - 6, 10, lift + 6, 2).fillRoundedRect(w - 20, d - lift - 6, 10, lift + 6, 2);
      g.fillStyle(C.woodDark).fillRoundedRect(4, -lift + 9, 8, lift + 4, 2).fillRoundedRect(w - 12, -lift + 9, 8, lift + 4, 2);
      g.fillStyle(C.wood).fillRoundedRect(0, -lift + 8, w, d, 8);
    } else {
      g.fillStyle(front).fillRoundedRect(0, d - lift - 6, w, lift + 6, 5);
    }
    g.fillStyle(top).fillRoundedRect(0, -lift, w, d, tabletop ? 8 : 5);
    g.lineStyle(2, C.cream, 0.25).lineBetween(5, -lift + 3, w - 5, -lift + 3);

    switch (data.kind) {
      case 'fridge': {
        g.lineStyle(2, C.greenDark, 0.6).lineBetween(4, d - lift + 28, w - 4, d - lift + 28);
        g.fillStyle(C.cream).fillRoundedRect(w - 17, d - lift + 7, 5, 15, 2).fillRoundedRect(w - 17, d - lift + 40, 5, 27, 2);
        g.fillStyle(C.cream, 0.85).fillRoundedRect(12, d - lift + 41, 25, 25, 2);
        g.fillStyle(C.coral).fillCircle(24, d - lift + 40, 3);
        g.lineStyle(2, C.greenLight).lineBetween(17, d - lift + 50, 31, d - lift + 50).lineBetween(17, d - lift + 57, 27, d - lift + 57);
        g.fillStyle(C.shadow, 0.2).fillRect(9, d - 5, w - 18, 3);
        break;
      }
      case 'stove': {
        for (const bx of [24, 74]) {
          for (const by of [-lift + 16, -lift + 41]) {
            g.fillStyle(C.greenDark).fillEllipse(bx, by, 24, 17);
            g.lineStyle(2, C.metal).strokeEllipse(bx, by, 14, 9);
          }
        }
        g.fillStyle(C.greenDark).fillRoundedRect(12, d - lift + 16, w - 24, 20, 4);
        for (const bx of [20, 40, 60, 80]) g.fillStyle(C.cream).fillCircle(bx, d - lift + 7, 3);
        break;
      }
      case 'counter': {
        for (let bx = 10; bx < w; bx += 20) g.lineStyle(1, C.woodDark, 0.55).lineBetween(bx, d - lift + 3, bx, d - 3);
        g.fillStyle(C.green).fillRoundedRect(28, d - lift + 7, w - 56, 23, 3);
        const sign = scene.add.text(w / 2, d - lift + 19, 'WARUNG KITA', { fontFamily: 'Georgia, serif', fontSize: '13px', color: '#fff7e7', letterSpacing: 2 }).setOrigin(0.5);
        this.visual.add(sign);
        g.fillStyle(C.cream).fillRoundedRect(17, -lift + 16, 68, 30, 4);
        g.lineStyle(1, C.wood).strokeRoundedRect(22, -lift + 21, 58, 20, 3);
        g.fillStyle(C.coral).fillRoundedRect(w - 40, -lift + 20, 19, 18, 3);
        g.fillStyle(C.green).fillEllipse(w - 38, -lift + 13, 14, 7).fillEllipse(w - 25, -lift + 10, 12, 7).fillEllipse(w - 30, -lift + 5, 7, 18);
        break;
      }
      case 'table': {
        g.lineStyle(1, C.wood, 0.5).lineBetween(w / 2, -lift + 5, w / 2, d - lift - 5);
        g.fillStyle(C.cream, 0.9).fillRoundedRect(16, -lift + 16, 30, 28, 2);
        g.fillStyle(C.green).fillRoundedRect(58, -lift + 22, 20, 22, 3);
        g.fillStyle(C.cream).fillRect(61, -lift + 17, 14, 12);
        g.lineStyle(1, C.wallShade).lineBetween(64, -lift + 20, 73, -lift + 20);
        const number = scene.add.text(w - 15, d - lift - 13, data.id.slice(-1).padStart(2, '0'), { fontFamily: 'Georgia, serif', fontSize: '12px', color: '#975f3f' }).setOrigin(0.5);
        this.visual.add(number);
        break;
      }
      case 'bin': {
        g.fillStyle(C.greenDark).fillRoundedRect(5, -lift + 5, w - 10, d - 10, 7);
        g.fillStyle(C.shadow).fillRoundedRect(13, -lift + 15, w - 26, 9, 4);
        g.lineStyle(2, C.greenLight).lineBetween(12, d - lift + 9, 15, d - 6).lineBetween(w - 12, d - lift + 9, w - 15, d - 6);
        break;
      }
    }
    this.highlight = scene.add.graphics().setDepth(y + d + 0.1);
    this.highlight.lineStyle(3, C.highlight).strokeRoundedRect(x - 3, y - lift - 3, w + 6, d + lift + 6, 7).setVisible(false);
    this.productionArt = scene.add.graphics();
    this.visual.add(this.productionArt);
    this.statusLabel = scene.add.text(x + w / 2, y - lift + (data.kind === 'table' ? 11 : -10), '', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#315e50',
      backgroundColor: '#fff7e7', padding: { x: 6, y: 4 },
    }).setOrigin(0.5, 1).setDepth(y + d + 0.3).setVisible(data.kind === 'stove' || data.kind === 'counter' || data.kind === 'table');

  }

  showState(restaurant: Restaurant): void {
    if (!['stove', 'counter', 'table'].includes(this.data.kind)) return;
    const production = restaurant.production;
    const table = restaurant.table(this.data.id);
    const customer = table?.customerId ? restaurant.customer(table.customerId) : undefined;
    const slots = production.stove;
    const stoveKey = slots.map(slot => slot.status === 'cooking' ? Math.round(slot.elapsedMs / slot.durationMs * 100) : slot.status).join(',');
    const key = [stoveKey, production.availablePortions,
      table?.cleanliness, customer?.id, customer?.phase].join(':');
    if (key === this.lastProductionKey) return;
    this.lastProductionKey = key;
    const g = this.productionArt;

    const lift = this.data.height;
    g.clear();
    if (this.data.kind === 'stove') {
      const state = production.stoveSummary;
      this.statusLabel.setText(state.cooking + ' cocinando · ' + state.ready + ' listas');
      this.statusLabel.setColor(state.ready > 0 ? '#315e50' : '#6c735c');
      slots.forEach((slot, index) => {
        if (slot.status === 'empty') return;
        const x = 24 + Math.floor(index / 2) * 50, y = -lift + 16 + (index % 2) * 25;
        const ready = slot.status === 'ready';
        g.fillStyle(ready ? C.highlight : C.gold, 0.35).fillEllipse(x, y, 30, 22);
        g.fillStyle(C.woodLight).fillEllipse(x, y, 20, 12);
        g.fillStyle(C.cream).fillEllipse(x + 2, y - 2, 9, 6);
        g.fillStyle(C.gold).fillCircle(x + 2, y - 2, 2);
        g.fillStyle(C.greenDark).fillRect(x - 12, y + 8, 24, 3);
        g.fillStyle(ready ? C.highlight : C.gold).fillRect(x - 12, y + 8,
          24 * (ready ? 1 : slot.elapsedMs / slot.durationMs), 3);
      });
    } else if (this.data.kind === 'table') {
      const dirty = table!.cleanliness === 'dirty';
      this.statusLabel.setText(this.data.name + ' · ' + (dirty ? 'sucia' : 'limpia') +
        (customer ? ' · #' + customer.number : ' · libre'));
      this.statusLabel.setColor(dirty ? '#995336' : '#315e50');
      if (dirty || customer?.phase === 'eating') {
        g.fillStyle(C.cream).fillEllipse(35, -lift + 31, 29, 16);
        g.fillStyle(dirty ? C.woodDark : C.woodLight).fillEllipse(35, -lift + 31, dirty ? 12 : 23, 9);
        g.fillStyle(C.green).fillCircle(31, -lift + 28, 2);
        g.fillStyle(C.gold).fillCircle(40, -lift + 31, 3);
        if (dirty) {
          g.fillStyle(C.cream).fillTriangle(56, -lift + 34, 66, -lift + 30, 69, -lift + 41);
          g.fillStyle(C.coral).fillCircle(46, -lift + 40, 2).fillCircle(29, -lift + 44, 2);
        }
      }
    } else {
      this.statusLabel.setText(production.availablePortions + ' disponibles');
      // Stock has no cap; artwork stays bounded regardless of the total.
      for (let i = 0; i < Math.min(production.availablePortions, 8); i++) {
        const px = 30 + (i % 4) * 28;
        const py = -lift + 23 + Math.floor(i / 4) * 16;
        g.fillStyle(C.cream).fillEllipse(px, py, 25, 13);
        g.fillStyle(C.woodLight).fillEllipse(px, py - 1, 18, 9);
        g.fillStyle(C.cream).fillEllipse(px + 2, py - 2, 8, 6);
        g.fillStyle(C.gold).fillCircle(px + 2, py - 2, 2);
        g.fillStyle(C.green).fillCircle(px - 5, py, 1.5);
      }
    }
  }

  destroy(): void {
    this.visual.destroy(); this.shadow.destroy(); this.chair?.destroy();
    this.highlight.destroy(); this.statusLabel.destroy();
  }

  setSelected(selected: boolean): void {
    if (this.selected === selected) return;
    this.selected = selected;
    this.highlight.setVisible(selected);
  }
}

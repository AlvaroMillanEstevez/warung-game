import Phaser from 'phaser';
import { COLORS as C } from '../config';
import type { StationData } from './layout';

export class Station {
  readonly visual: Phaser.GameObjects.Container;
  private readonly highlight: Phaser.GameObjects.Graphics;
  private readonly marker: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private selected = false;

  constructor(scene: Phaser.Scene, readonly data: StationData) {
    const { x, y, width: w, height: d } = data.footprint;
    const lift = data.height;
    scene.add.ellipse(x + w / 2 + 5, y + d - 2, w + 16, 25, C.shadow, 0.15).setDepth(-2);
    const g = scene.add.graphics();
    this.visual = scene.add.container(x, y, [g]).setDepth(y + d);
    const tabletop = data.kind === 'table';
    const front = data.kind === 'fridge' ? C.green : data.kind === 'stove' ? C.metal : data.kind === 'bin' ? C.greenDark : C.wood;
    const top = data.kind === 'fridge' ? C.greenLight : data.kind === 'stove' ? C.cream : data.kind === 'bin' ? C.greenLight : C.woodLight;
    if (tabletop) {
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
        g.fillStyle(C.woodDark).fillRoundedRect(66, -lift + 18, 27, 5, 2);
        g.fillStyle(C.ink).fillEllipse(58, -lift + 19, 33, 23);
        g.fillStyle(0x7b8d80).fillEllipse(58, -lift + 21, 22, 12);
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
        const number = scene.add.text(w - 15, d - lift - 13, data.id === 'table-1' ? '01' : '02', { fontFamily: 'Georgia, serif', fontSize: '12px', color: '#975f3f' }).setOrigin(0.5);
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
    this.marker = scene.add.graphics().setDepth(-0.25);
    this.label = scene.add.text(data.interaction.x, data.interaction.y + 18, data.name, { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#526451', backgroundColor: '#eee4ce', padding: { x: 5, y: 2 } }).setOrigin(0.5, 0).setDepth(-0.1);
    this.drawMarker();
  }

  setSelected(selected: boolean): void {
    if (this.selected === selected) return;
    this.selected = selected;
    this.highlight.setVisible(selected);
    this.label.setColor(selected ? '#244a40' : '#526451');
    this.label.setFontStyle(selected ? 'bold' : 'normal');
    this.drawMarker();
  }

  private drawMarker(): void {
    const { x, y } = this.data.interaction;
    this.marker.clear();
    if (this.selected) {
      this.marker.fillStyle(C.highlight, 0.12).fillEllipse(x, y, 44, 24);
      this.marker.lineStyle(2, C.highlight, 0.9).strokeEllipse(x, y, 32, 16);
    } else {
      this.marker.lineStyle(1.5, C.woodDark, 0.45).strokeEllipse(x, y, 15, 8);
    }
    this.marker.fillStyle(this.selected ? C.highlight : C.woodDark, this.selected ? 0.9 : 0.4).fillCircle(x, y, 2);
  }
}

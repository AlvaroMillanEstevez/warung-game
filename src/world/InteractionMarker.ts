import Phaser from 'phaser';
import { COLORS as C } from '../config';
import type { InteractionZone } from './layout';

export class InteractionMarker {
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private selected = false;

  constructor(scene: Phaser.Scene, readonly zone: InteractionZone) {
    this.ring = scene.add.graphics().setDepth(-0.25);
    this.bar = scene.add.graphics().setDepth(1000);
    this.label = scene.add.text(zone.position.x, zone.position.y + 16, zone.name, {
      fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#526451',
      backgroundColor: '#eee4ce', padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 0).setDepth(-0.1);
    this.drawRing();
  }
  update(selected: boolean, progress: number): void {
    if (selected !== this.selected) {
      this.selected = selected; this.drawRing();
      this.label.setColor(selected ? '#244a40' : '#526451').setFontStyle(selected ? 'bold' : 'normal');
    }
    this.bar.clear();
    if (progress <= 0) return;
    const { x, y } = this.zone.position;
    this.bar.fillStyle(C.cream, 0.95).fillRoundedRect(x - 24, y + 36, 48, 8, 4);
    this.bar.fillStyle(C.highlight).fillRoundedRect(x - 22, y + 38, 44 * Math.min(1, progress), 4, 2);
  }
  destroy(): void { this.ring.destroy(); this.bar.destroy(); this.label.destroy(); }

  private drawRing(): void {
    const { x, y } = this.zone.position;
    this.ring.clear();
    if (this.selected) this.ring.fillStyle(C.highlight, 0.12).fillEllipse(x, y, 44, 24);
    this.ring.lineStyle(this.selected ? 2 : 1.5, this.selected ? C.highlight : C.woodDark, this.selected ? 0.9 : 0.45)
      .strokeEllipse(x, y, this.selected ? 32 : 15, this.selected ? 16 : 8);
    this.ring.fillStyle(this.selected ? C.highlight : C.woodDark, 0.6).fillCircle(x, y, 2);
  }
}

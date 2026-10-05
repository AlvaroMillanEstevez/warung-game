import Phaser from 'phaser';
import { PALETTE as C, VISUAL as V } from '../visuals/theme';
import { localizedLabel, progressBar } from '../visuals/drawing';
import type { InteractionZone } from './layout';

export class InteractionMarker {
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private selected = false;
  private lastProgress = -1;
  constructor(scene: Phaser.Scene, readonly zone: InteractionZone) {
    // Only rear checkout needs an overlay: the counter projects above its floor point.
    const rear = zone.role === 'checkout';
    this.ring = scene.add.graphics().setDepth(rear ? V.depth.rearMarker : V.depth.marker);
    this.bar = scene.add.graphics().setDepth(V.depth.rearMarker + 2);
    this.label = localizedLabel(scene, zone.position.x, zone.position.y + 15, zone.name, 10.5,
      zone.role === 'office' ? C.cream : C.greenDark, zone.role === 'office' ? 62 : 104).setOrigin(.5, 0)
      .setDepth(rear ? V.depth.rearMarker + 1 : -.1);
    this.drawRing();
  }
  update(selected: boolean, progress: number): void {
    if (selected !== this.selected) {
      this.selected = selected; this.drawRing();
      this.label.setFontStyle(selected ? 'bold' : 'normal');
    }
    const bucket = Math.round(progress * 100);
    if (this.lastProgress === bucket) return;
    this.lastProgress = bucket;
    this.bar.clear();
    if (progress > 0) progressBar(this.bar, this.zone.position.x - 24, this.zone.position.y + 32, 48, progress);
  }
  destroy(): void { this.ring.destroy(); this.bar.destroy(); this.label.destroy(); }
  private drawRing(): void {
    const { x, y } = this.zone.position, g = this.ring.clear();
    if (this.selected) {
      g.fillStyle(C.green, .10).fillEllipse(x, y, 44, 25);
      g.lineStyle(V.stroke.normal, C.green, .5).strokeEllipse(x, y, 40, 22);
    }
    g.fillStyle(this.selected ? C.green : C.cream, .95).fillRoundedRect(x - 10, y - 6, 20, 12, 6);
    g.lineStyle(V.stroke.normal, this.selected ? C.cream : C.green);
    const role = this.zone.role;
    if (role === 'checkout') {
      g.strokeCircle(x, y, 3.5).lineBetween(x, y - 2, x, y + 2);
    } else if (role === 'office') {
      g.strokeRoundedRect(x - 3, y - 4, 6, 8, 1).lineBetween(x + 1, y, x + 2, y);
    } else if (role === 'table' || role === 'bin') {
      g.lineBetween(x - 3, y - 3, x + 4, y + 2).lineBetween(x - 4, y, x + 1, y + 3);
    } else {
      const down = role === 'deposit';
      g.lineBetween(x, y + (down ? -3 : 3), x, y + (down ? 3 : -3));
      g.lineBetween(x - 3, y, x, y + (down ? 3 : -3)).lineBetween(x + 3, y, x, y + (down ? 3 : -3));
    }
  }
}

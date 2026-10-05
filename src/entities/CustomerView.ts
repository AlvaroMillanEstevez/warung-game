import Phaser from 'phaser';
import { PALETTE as C, VISUAL as V, cssColor } from '../visuals/theme';
import { CharacterArt } from '../visuals/CharacterArt';
import { label, softShadow, meal } from '../visuals/drawing';
import type { Customer } from '../simulation/Restaurant';

export class CustomerView {
  private readonly visual: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly body: CharacterArt;
  private readonly carried: Phaser.GameObjects.Graphics;
  private lastCarry = '';
  constructor(scene: Phaser.Scene, customer: Readonly<Customer>) {
    this.shadow = scene.add.graphics().setDepth(V.depth.groundShadow); softShadow(this.shadow, 0, 2, 27, 10);
    this.body = new CharacterArt(scene, 'customer', customer.number % 4);
    this.carried = scene.add.graphics();
    this.label = label(scene, 0, -79, '', 11, C.greenDark)
      .setStyle({ backgroundColor: cssColor(C.cream), wordWrap: { width: 122 }, padding: { x: 7, y: 5 }, align: 'center' })
      .setOrigin(.5, 1);
    this.visual = scene.add.container(customer.position.x, customer.position.y, [this.body.visual, this.carried, this.label]);
    this.update(customer);
  }
  update(customer: Readonly<Customer>, comment: string | null = null): void {
    if (this.label.text !== (comment ?? '')) this.label.setText(comment ?? '');
    this.label.setVisible(comment !== null);
    const { x, y } = customer.position;
    this.body.moveFrom(this.visual, customer.position, customer.phase === 'eating');
    this.visual.setPosition(x, y).setDepth(y);
    this.shadow.setPosition(x, y);
    const takeaway = customer.intent === 'takeaway' && customer.phase === 'leaving';
    const key = [takeaway, customer.carryingMeal].join(':');
    if (key === this.lastCarry) return;
    this.lastCarry = key;
    const g = this.carried.clear();
    if (takeaway) {
      g.fillStyle(C.woodLight).fillRoundedRect(11, -22, 17, 20, 4);
      g.fillStyle(C.cream).fillRoundedRect(12, -22, 15, 4, 2);
      g.lineStyle(1.5, C.woodDark).strokeRoundedRect(15, -27, 9, 8, 3);
      g.fillStyle(C.green).fillEllipse(20, -13, 7, 10);
    }
    if (customer.carryingMeal) meal(g, 22, -17, .9);
  }
  destroy(): void { this.visual.destroy(); this.shadow.destroy(); }
}

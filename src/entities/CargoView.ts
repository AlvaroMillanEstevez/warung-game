import Phaser from 'phaser';
import { COLORS as C } from '../config';
import type { ApplicableInventory } from '../simulation/Inventory';

// One reusable graphics object. Redraw only when counts or carrying side change.
export class CargoView {
  readonly visual: Phaser.GameObjects.Graphics;
  private key = '';
  height = 0;
  constructor(scene: Phaser.Scene) { this.visual = scene.add.graphics(); }
  update(inventory: ApplicableInventory, side = 1): void {
    const ingredients = inventory.ingredients ?? 0, meals = inventory.meals ?? 0, waste = inventory.waste ?? 0;
    const key = [ingredients, meals, waste, side].join(':');
    if (key === this.key) return;
    this.key = key;
    const g = this.visual.clear().setPosition(side * 44, -16);
    this.height = Math.max(ingredients, meals, waste) * 5.5;
    if (ingredients + meals + waste === 0) return;
    g.fillStyle(C.woodDark).fillRoundedRect(-24, 3, 48, 5, 2);
    for (let i = 0; i < ingredients; i++) {
      const y = -i * 5.5;
      g.fillStyle(C.woodLight).fillRoundedRect(-23, y - 4, 13, 4, 1);
      g.lineStyle(.7, C.woodDark).lineBetween(-22, y - 1, -11, y - 1);
      g.fillStyle(i % 2 ? C.coral : C.green).fillCircle(-17, y - 3, 1.3);
    }
    for (let i = 0; i < meals; i++) {
      const y = -i * 5.5;
      g.fillStyle(C.woodDark).fillEllipse(0, y + .8, 18, 4);
      g.fillStyle(C.cream).fillEllipse(0, y - 1, 18, 4);
      g.fillStyle(C.gold).fillEllipse(0, y - 2, 10, 2);
    }
    for (let i = 0; i < waste; i++) {
      const y = -i * 5.5;
      g.fillStyle(C.greenDark).fillRoundedRect(11, y - 4, 12, 4, 1);
      g.lineStyle(.7, C.greenLight).lineBetween(12, y - 1, 22, y - 1);
      g.fillStyle(C.cream).fillTriangle(14, y - 4, 17, y - 6, 19, y - 4);
    }
  }
}

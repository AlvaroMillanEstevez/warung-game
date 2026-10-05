import Phaser from 'phaser';
import { PALETTE as C, VISUAL as V } from '../visuals/theme';
import type { ApplicableInventory } from '../simulation/Inventory';

// Exact quantities in three distinct silhouettes; one reused Graphics, redrawn only on a change.
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
    const g = this.visual.clear().setPosition(side * V.cargo.side, V.cargo.baseY);
    this.height = Math.max(ingredients, meals, waste) * V.cargo.spacing;
    if (ingredients + meals + waste === 0) return;
    g.fillStyle(C.woodDark).fillRoundedRect(-26, 3, 52, 5, 2.5);
    g.fillStyle(C.woodLight).fillRoundedRect(-26, 2, 52, 3, 1.5);
    for (let i = 0; i < ingredients; i++) {
      const y = -i * V.cargo.spacing;
      // Wrapped ingredient parcels: rectangular with a folded leaf band.
      g.fillStyle(C.woodLight).fillRoundedRect(-25, y - 5, 14, 5, 2);
      g.fillStyle(C.greenLight).fillRoundedRect(-20, y - 5, 4, 5, 1);
      g.lineStyle(.7, C.cream, .75).lineBetween(-23, y - 4, -13, y - 4);
    }
    for (let i = 0; i < meals; i++) {
      const y = -i * V.cargo.spacing;
      g.fillStyle(C.metal).fillEllipse(0, y + .6, 19, 4);
      g.fillStyle(C.cream).fillEllipse(0, y - 1, 19, 5);
      g.fillStyle(C.wood).fillEllipse(0, y - 2, 12, 3);
      g.fillStyle(C.gold).fillCircle(3, y - 2.5, 1.5);
    }
    for (let i = 0; i < waste; i++) {
      const y = -i * V.cargo.spacing;
      // Tied waste bundles: rounded bags with a visible knot, never plate-shaped.
      g.fillStyle(C.greenDark).fillRoundedRect(12, y - 4, 13, 5, 2.5);
      g.fillStyle(C.metal).fillTriangle(16, y - 4, 19, y - 6, 22, y - 4);
      g.lineStyle(.8, C.greenLight).lineBetween(15, y - 1, 22, y - 1);
    }
  }
}

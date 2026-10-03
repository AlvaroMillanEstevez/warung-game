import Phaser from 'phaser';
import { CARGO_FEEDBACK, COLORS as C, PLAYER } from '../config';
import { moveWithCollisions } from '../world/collision';
import type { Point, Rect } from '../world/layout';
import type { InventoryState } from '../simulation/Production';

export class Player {
  readonly position: Point = { ...PLAYER.spawn };
  readonly visual: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Graphics;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly direction: Phaser.GameObjects.Graphics;
  private readonly cargo: Phaser.GameObjects.Graphics;
  private inventory: InventoryState | null = null;
  private readonly feedback: Phaser.GameObjects.Text;
  private feedbackRemainingMs = 0;
  private facing: Point = { x: 0, y: 1 };
  private walkTime = 0;

  constructor(scene: Phaser.Scene) {
    this.shadow = scene.add.ellipse(this.position.x, this.position.y + 2, 36, 15, C.shadow, 0.18).setDepth(-1);
    this.direction = scene.add.graphics().setDepth(-0.5);
    this.body = scene.add.graphics();
    this.cargo = scene.add.graphics();
    this.feedback = scene.add.text(28, -64, '', { fontFamily: 'Arial, sans-serif', fontSize: '10px',
      color: '#fff7e7', backgroundColor: '#315e50', padding: { x: 4, y: 2 } }).setVisible(false);
    this.visual = scene.add.container(this.position.x, this.position.y, [this.body, this.cargo, this.feedback]);
    this.draw(0);
    this.sync();
  }

  setInventory(inventory: InventoryState): void {
    this.inventory = inventory;
    this.drawCargo();
  }

  update(movement: Point, deltaMs: number, obstacles: readonly Rect[]): void {
    this.feedbackRemainingMs = Math.max(0, this.feedbackRemainingMs - deltaMs);
    this.feedback.setVisible(this.feedbackRemainingMs > 0);
    if (this.feedbackRemainingMs > 0) {
      const progress = 1 - this.feedbackRemainingMs / CARGO_FEEDBACK.durationMs;
      this.feedback.setY(-64 - CARGO_FEEDBACK.rise * progress).setAlpha(1 - progress * 0.6);
    }
    const seconds = Math.min(deltaMs / 1000, PLAYER.maxFrameSeconds);
    const next = moveWithCollisions(this.position, movement.x * PLAYER.speed * seconds, movement.y * PLAYER.speed * seconds, obstacles);
    const moving = Math.hypot(next.x - this.position.x, next.y - this.position.y) > 0.01;
    Object.assign(this.position, next);
    if (Math.hypot(movement.x, movement.y) > 0.01) {
      const magnitude = Math.hypot(movement.x, movement.y);
      this.facing = { x: movement.x / magnitude, y: movement.y / magnitude };
    }
    this.walkTime = moving ? this.walkTime + seconds * 13 : 0;
    this.draw(moving ? Math.sin(this.walkTime) : 0);
    this.drawCargo();
    this.sync();
  }

  showTransfer(before: InventoryState, after: InventoryState): void {
    const labels = { ingredients: 'Ingred.', meals: 'Plato', waste: 'Residuo' };
    for (const category of ['ingredients', 'meals', 'waste'] as const) {
      const delta = after[category] - before[category];
      if (delta === 0) continue;
      this.feedback.setText(labels[category] + (delta > 0 ? ' +1' : ' −1')).setPosition(28, -64).setAlpha(1).setVisible(true);
      this.feedbackRemainingMs = CARGO_FEEDBACK.durationMs;
      break; // A transfer changes exactly one carried category.
    }
  }

  clearFeedback(): void { this.feedbackRemainingMs = 0; this.feedback.setVisible(false); }

  private drawCargo(): void {
    const g = this.cargo;
    g.clear();
    const inventory = this.inventory;
    if (!inventory || inventory.ingredients + inventory.meals + inventory.waste === 0) return;
    // Keep every stack beside the body in all four directions, including facing away.
    const side = this.facing.x < -0.5 ? -1 : 1;
    g.setPosition(side * 42, -16);
    this.feedback.setX(side * 28).setOrigin(side > 0 ? 0 : 1, 0);
    g.fillStyle(C.woodDark).fillRoundedRect(-22, 1, 44, 9, 3);
    for (let i = 0; i < Math.min(inventory.ingredients, 4); i++) {
      const y = 2 - i * 6;
      g.fillStyle(C.woodLight).fillRoundedRect(-22, y - 6, 14, 7, 2);
      g.lineStyle(1, C.woodDark).strokeRoundedRect(-22, y - 6, 14, 7, 2);
      g.fillStyle(C.green).fillEllipse(-18, y - 7, 5, 5);
      g.fillStyle(C.coral).fillCircle(-12, y - 5, 2);
    }
    if (inventory.meals > 0) {
      for (let i = 0; i < Math.min(inventory.meals, 4); i++) {
        g.fillStyle(C.cream).fillEllipse(0, 3 - i * 3, 21, 9);
      }
      g.fillStyle(C.gold).fillEllipse(0, 3 - Math.min(inventory.meals, 4) * 3, 13, 5);
    }
    for (let i = 0; i < Math.min(inventory.waste, 4); i++) {
      const y = 3 - i * 6;
      g.fillStyle(C.greenDark).fillRoundedRect(10, y - 6, 12, 9, 3);
      g.lineStyle(1, C.greenLight).strokeRoundedRect(10, y - 6, 12, 9, 3);
      g.fillStyle(C.cream).fillTriangle(12, y - 6, 16, y - 10, 19, y - 6);
    }
    this.visual.bringToTop(this.cargo);
    this.visual.bringToTop(this.feedback);
  }

  private sync(): void {
    this.visual.setPosition(this.position.x, this.position.y).setDepth(this.position.y);
    this.shadow.setPosition(this.position.x, this.position.y + 2);
    this.direction.setPosition(this.position.x + this.facing.x * 24, this.position.y + this.facing.y * 20);
    this.direction.setRotation(Math.atan2(this.facing.y, this.facing.x) - Math.PI / 2);
  }

  private draw(step: number): void {
    const g = this.body;
    const bob = Math.abs(step) * 1.5;
    g.clear();
    g.fillStyle(C.greenDark).fillRoundedRect(-11, -12 + step * 2, 9, 14, 4).fillRoundedRect(2, -12 - step * 2, 9, 14, 4);
    g.fillStyle(C.cream).fillRoundedRect(-17, -31 - bob, 34, 21, 9);
    g.fillStyle(C.skin).fillCircle(-17, -15 - bob + step * 2, 5).fillCircle(17, -15 - bob - step * 2, 5);
    g.fillStyle(C.coral).fillRoundedRect(-11, -28 - bob, 22, 23, 4);
    g.fillStyle(C.woodLight).fillRect(-6, -17 - bob, 12, 2);
    g.fillStyle(C.skin).fillCircle(0, -38 - bob, 13);
    g.fillStyle(C.hair).fillEllipse(0, -47 - bob, 27, 16);
    if (this.facing.y > -0.5) {
      g.fillStyle(C.hair).fillCircle(-4 + this.facing.x * 4, -38 - bob, 1.5).fillCircle(4 + this.facing.x * 4, -38 - bob, 1.5);
      g.fillStyle(C.woodDark).fillEllipse(this.facing.x * 6, -33 - bob, 4, 2);
    }
    g.fillStyle(C.cream).fillRoundedRect(-14, -54 - bob, 28, 9, 4);
    g.fillCircle(-8, -56 - bob, 8).fillCircle(1, -59 - bob, 9).fillCircle(10, -55 - bob, 7);
    g.fillStyle(0xe0d7c3).fillRect(-11, -48 - bob, 23, 2);
    this.direction.clear().fillStyle(C.green, 0.8).fillTriangle(-4, -3, 4, -3, 0, 3);
  }
}

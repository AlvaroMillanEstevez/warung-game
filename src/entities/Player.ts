import Phaser from 'phaser';
import { t } from '../i18n';
import type { Message } from '../i18n';
import { CargoView } from './CargoView';
import { CARGO_FEEDBACK, PLAYER } from '../config';
import { PALETTE as C, VISUAL as V, cssColor } from '../visuals/theme';
import { CharacterArt } from '../visuals/CharacterArt';
import { label, softShadow } from '../visuals/drawing';
import { moveWithCollisions } from '../world/collision';
import type { Point, Rect } from '../world/layout';
import type { InventoryState } from '../simulation/Production';

export class Player {
  readonly position: Point = { ...PLAYER.spawn };
  readonly visual: Phaser.GameObjects.Container;
  private readonly body: CharacterArt;
  private readonly shadow: Phaser.GameObjects.Graphics;
  private readonly direction: Phaser.GameObjects.Graphics;
  private readonly cargo: CargoView;
  private inventory: InventoryState | null = null;
  private readonly feedback: Phaser.GameObjects.Text;
  private feedbackRemainingMs = 0;
  private feedbackMessage: Message | null = null;
  private facing: Point = { x: 0, y: 1 };
  constructor(scene: Phaser.Scene) {
    this.shadow = scene.add.graphics().setDepth(V.depth.groundShadow);
    softShadow(this.shadow, 0, 2, 30, 11);
    this.direction = scene.add.graphics().setDepth(-.5);
    this.direction.fillStyle(C.green, .75).fillTriangle(-4, -3, 4, -3, 0, 3);
    this.body = new CharacterArt(scene, 'player');
    this.cargo = new CargoView(scene);
    this.feedback = label(scene, 28, -84, '', 11, C.cream)
      .setStyle({ backgroundColor: cssColor(C.greenDark), padding: { x: 6, y: 4 } }).setVisible(false);
    this.visual = scene.add.container(this.position.x, this.position.y, [this.body.visual, this.cargo.visual, this.feedback]);
    this.sync();
  }
  setInventory(inventory: InventoryState): void { this.inventory = inventory; this.drawCargo(); }
  update(movement: Point, deltaMs: number, obstacles: readonly Rect[]): void {
    this.feedbackRemainingMs = Math.max(0, this.feedbackRemainingMs - deltaMs);
    this.feedback.setVisible(this.feedbackRemainingMs > 0);
    if (this.feedbackRemainingMs > 0) {
      const progress = 1 - this.feedbackRemainingMs / CARGO_FEEDBACK.durationMs;
      this.feedback.setY(-Math.max(86, this.cargo.height + 34) - CARGO_FEEDBACK.rise * progress).setAlpha(1 - progress * .6);
    }
    const seconds = Math.min(deltaMs / 1000, PLAYER.maxFrameSeconds);
    const next = moveWithCollisions(this.position, movement.x * PLAYER.speed * seconds, movement.y * PLAYER.speed * seconds, obstacles);
    const distance = Math.hypot(next.x - this.position.x, next.y - this.position.y);
    Object.assign(this.position, next);
    if (Math.hypot(movement.x, movement.y) > .01) {
      const magnitude = Math.hypot(movement.x, movement.y);
      this.facing = { x: movement.x / magnitude, y: movement.y / magnitude };
    }
    this.body.update(distance, this.facing.x, this.facing.y);
    this.drawCargo(); this.sync();
  }
  showTransfer(before: InventoryState, after: InventoryState): void {
    for (const category of ['ingredients', 'meals', 'waste'] as const) {
      const delta = after[category] - before[category];
      if (delta === 0) continue;
      this.feedbackMessage = { key: `transfer.${category}`, params: { sign: delta > 0 ? '+' : '−', count: Math.abs(delta) } };
      this.feedback.setText(t(this.feedbackMessage))
        .setPosition(this.cargo.visual.x, -Math.max(86, this.cargo.height + 34)).setAlpha(1).setVisible(true);
      this.feedbackRemainingMs = CARGO_FEEDBACK.durationMs;
      break;
    }
  }
  get cargoHeight(): number { return this.cargo.height; }
  get cargoBounds(): Rect | null {
    return this.cargo.height ? { x: this.position.x + this.cargo.visual.x - V.cargo.width / 2,
      y: this.position.y + V.cargo.baseY - this.cargo.height, width: V.cargo.width, height: this.cargo.height + 12 } : null;
  }
  refreshLanguage(): void { if (this.feedbackMessage) this.feedback.setText(t(this.feedbackMessage)); }
  clearFeedback(): void { this.feedbackRemainingMs = 0; this.feedbackMessage = null; this.feedback.setVisible(false); }
  private drawCargo(): void {
    const side = this.facing.x < -.5 ? -1 : 1;
    this.cargo.update(this.inventory ?? {}, side);
    this.feedback.setX(side * V.cargo.side).setOrigin(.5, 1);
  }
  private sync(): void {
    this.visual.setPosition(this.position.x, this.position.y).setDepth(this.position.y);
    this.shadow.setPosition(this.position.x, this.position.y);
    this.direction.setPosition(this.position.x + this.facing.x * 24, this.position.y + this.facing.y * 20);
    this.direction.setRotation(Math.atan2(this.facing.y, this.facing.x) - Math.PI / 2);
  }
}

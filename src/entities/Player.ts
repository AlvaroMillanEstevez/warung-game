import Phaser from 'phaser';
import { COLORS as C, PLAYER } from '../config';
import { moveWithCollisions } from '../world/collision';
import type { Point, Rect } from '../world/layout';

export class Player {
  readonly position: Point = { ...PLAYER.spawn };
  readonly visual: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Graphics;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly direction: Phaser.GameObjects.Graphics;
  private facing: Point = { x: 0, y: 1 };
  private walkTime = 0;

  constructor(scene: Phaser.Scene) {
    this.shadow = scene.add.ellipse(this.position.x, this.position.y + 2, 36, 15, C.shadow, 0.18).setDepth(-1);
    this.direction = scene.add.graphics().setDepth(-0.5);
    this.body = scene.add.graphics();
    this.visual = scene.add.container(this.position.x, this.position.y, [this.body]);
    this.draw(0);
    this.sync();
  }

  update(movement: Point, deltaMs: number, obstacles: readonly Rect[]): void {
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
    this.sync();
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

import type Phaser from 'phaser';
import type { Point } from '../world/layout';
import { PALETTE as C, VISUAL as V, CHARACTER_COLORS } from './theme';
export type CharacterRole = 'player' | 'cook' | 'cleaner' | 'customer';

// Parts are drawn once. Walking moves only visual joints, never the simulation position.
export class CharacterArt {
  readonly visual: Phaser.GameObjects.Container;
  private readonly torso: Phaser.GameObjects.Container;
  private readonly legs: Phaser.GameObjects.Graphics[];
  private readonly arms: Phaser.GameObjects.Graphics[];
  private readonly face: Phaser.GameObjects.Graphics;
  private readonly back: Phaser.GameObjects.Graphics;
  private phase = 0;
  constructor(scene: Phaser.Scene, role: CharacterRole, variant = 0) {
    const customer = role === 'customer', cook = role === 'cook', cleaner = role === 'cleaner';
    const skin = CHARACTER_COLORS.skins[variant % 4]!;
    const shirt = customer ? CHARACTER_COLORS.shirts[variant % 4]! : cleaner ? C.greenLight : C.cream;
    const apron = cleaner ? C.greenDark : role === 'player' ? C.green : variant === 1 ? C.coral : C.gold;
    this.legs = [-1, 1].map(side => {
      const g = scene.add.graphics().setPosition(side * 6, -7);
      g.fillStyle(customer ? C.woodDark : C.greenDark).fillRoundedRect(-4, -6, 8, 13, 4);
      g.fillStyle(C.ink).fillRoundedRect(-5, 3, 11, 6, 3);
      g.fillStyle(C.cream, .35).fillRoundedRect(-4, 3, 8, 1.5, 1);
      return g;
    });
    this.arms = [-1, 1].map(side => {
      const g = scene.add.graphics().setPosition(side * 14, -28);
      g.fillStyle(shirt).fillRoundedRect(-4, -3, 8, 14, 4);
      g.fillStyle(skin).fillEllipse(0, 12, 9, 10);
      return g;
    });
    const body = scene.add.graphics();
    body.fillStyle(shirt).fillRoundedRect(-14, -34, 28, 29, 10);
    body.fillStyle(C.shadow, .08).fillRoundedRect(8, -26, 5, 18, 3);
    body.fillStyle(C.cream, .48).fillRoundedRect(-10, -32, 3, 12, 1.5);
    if (!customer) {
      body.fillStyle(apron).fillRoundedRect(-10, -26, 20, 22, 5);
      body.lineStyle(2, apron).lineBetween(-7, -30, -5, -23).lineBetween(7, -30, 5, -23);
      body.fillStyle(C.cream, .6).fillRoundedRect(-6, -16, 12, 7, 2);
      if (role === 'player') {
        // Owner: rolled sleeves, short apron and a tied headband, distinct from staff hats.
        body.fillStyle(C.coral).fillTriangle(-6, -33, 6, -33, 0, -26);
      } else if (cook) {
        for (const x of [-5, 5]) body.fillStyle(C.woodDark).fillCircle(x, -29, 1);
      } else {
        body.lineStyle(2.5, C.cream).lineBetween(-7, -31, 7, -19).lineBetween(7, -31, -7, -19);
        body.fillStyle(C.gold).fillRoundedRect(4, -14, 5, 12, 2);
      }
    } else {
      if (variant % 2 === 0) {
        body.lineStyle(1.5, C.cream, .7).lineBetween(0, -30, 0, -9);
        body.fillStyle(C.cream).fillCircle(3, -22, 1).fillCircle(3, -15, 1);
      } else {
        body.fillStyle(C.cream, .6).fillRoundedRect(-9, -20, 18, 3, 1.5);
      }
    }
    const head = scene.add.graphics();
    head.fillStyle(skin).fillEllipse(-12, -42, 7, 9).fillEllipse(12, -42, 7, 9);
    head.fillStyle(C.hair).fillRoundedRect(-14, -59, 28, 29, 12);
    head.fillStyle(skin).fillRoundedRect(-13, -57, 26, 26, 11);
    head.fillStyle(C.cream, .15).fillEllipse(-6, -49, 9, 11);
    if (customer && variant % 4 === 3) {
      // Rounded headscarf silhouette; one of several deterministic customer variations.
      head.fillStyle(C.green).fillRoundedRect(-16, -61, 32, 31, 13);
      head.fillStyle(skin).fillRoundedRect(-11, -53, 22, 22, 10);
      head.fillStyle(C.green).fillTriangle(-13, -39, -16, -28, -7, -32);
    } else {
      head.fillStyle(C.hair).fillEllipse(0, -56, 28, 12);
      head.fillStyle(C.hair).fillRoundedRect(-13, -57, 7, variant % 3 === 1 ? 23 : 13, 3);
      if (variant % 3 === 1) head.fillStyle(C.hair).fillRoundedRect(7, -55, 7, 17, 4);
    }
    if (cook) {
      head.fillStyle(C.wallShade).fillRoundedRect(-14, -65, 28, 12, 5);
      head.fillStyle(C.cream).fillCircle(-8, -65, 8).fillCircle(1, -68, 10).fillCircle(10, -64, 7);
      head.fillStyle(C.cream).fillRoundedRect(-12, -62, 24, 9, 3);
      head.lineStyle(1, C.wallShade).lineBetween(-10, -56, 10, -56);
    } else if (cleaner) {
      head.fillStyle(C.greenLight).fillRoundedRect(-14, -62, 28, 10, 5);
      head.fillStyle(C.greenDark).fillRoundedRect(-4, -55, 22, 5, 3);
    } else if (role === 'player') {
      head.fillStyle(C.cream).fillRoundedRect(-14, -57, 28, 6, 3);
      head.fillStyle(C.cream).fillTriangle(-12, -54, -21, -53, -18, -45);
    } else if (variant % 4 === 2) {
      head.fillStyle(C.woodLight).fillRoundedRect(-14, -62, 28, 10, 5);
      head.fillStyle(C.wood).fillRoundedRect(-15, -55, 22, 5, 3);
    }
    this.back = scene.add.graphics().setVisible(false);
    this.back.fillStyle(customer && variant % 4 === 3 ? C.green : C.hair).fillRoundedRect(-12, -51, 24, 20, 9);
    this.face = scene.add.graphics();
    this.face.fillStyle(C.hair).fillEllipse(-4.5, -43, 3, 4).fillEllipse(4.5, -43, 3, 4);
    this.face.fillStyle(C.cream).fillCircle(-4, -44, .8).fillCircle(5, -44, .8);
    this.face.fillStyle(C.coral, .36).fillEllipse(-8, -39, 5, 3).fillEllipse(8, -39, 5, 3);
    this.face.lineStyle(1.2, C.woodDark).beginPath().moveTo(-3, -36).lineTo(0, -35).lineTo(3, -36).strokePath();
    this.torso = scene.add.container(0, 0, [...this.arms, body, head, this.back, this.face]);
    this.visual = scene.add.container(0, 0, [...this.legs, this.torso]);
  }
  update(distance: number, facingX = 0, facingY = 1, seated = false): void {
    this.phase = distance > .01 ? this.phase + Math.min(distance, 20) / V.motion.stride : 0;
    const step = Math.sin(this.phase);
    this.torso.y = seated ? 4 : -Math.abs(step) * V.motion.bob;
    this.legs.forEach((leg, i) => { leg.y = -7 + (seated ? -2 : step * V.motion.lift * (i ? 1 : -1)); });
    this.arms.forEach((arm, i) => { arm.rotation = seated ? 0 : step * .10 * (i ? 1 : -1); });
    this.face.setX(facingX * 1.7).setVisible(facingY > -.65);
    this.back.setVisible(facingY <= -.65);
  }
  moveFrom(previous: Point, next: Point, seated = false): void {
    const dx = next.x - previous.x, dy = next.y - previous.y, distance = Math.hypot(dx, dy);
    this.update(distance, distance ? dx / distance : 0, distance ? dy / distance : 1, seated);
  }
}

import type Phaser from 'phaser';
import { i18n, t } from '../i18n';
import type { Message } from '../i18n';
import { PALETTE as C, VISUAL as V, cssColor } from './theme';

export function label(scene: Phaser.Scene, x: number, y: number, text: string,
  size = 11, color: number = C.ink): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, { fontFamily: V.font, fontSize: size + 'px', color: cssColor(color) })
    .setResolution(V.textResolution);
}
// setText rebuilds Phaser's canvas texture. Each live label owns its subscription.
export function localizedLabel(scene: Phaser.Scene, x: number, y: number, message: Message,
  size = 11, color: number = C.ink, maxWidth?: number): Phaser.GameObjects.Text {
  const text = label(scene, x, y, '', size, color);
  const refresh = (): void => {
    text.setFontSize(size).setText(t(message));
    if (maxWidth && text.width > maxWidth) text.setFontSize(size * maxWidth / text.width);
  };
  refresh();
  const unsubscribe = i18n.subscribe(refresh);
  text.once('destroy', unsubscribe);
  return text;
}
export function softShadow(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  g.fillStyle(C.shadow, V.shadow.outer).fillEllipse(x + 2, y + 2, w + 12, h + 7);
  g.fillStyle(C.shadow, V.shadow.middle).fillEllipse(x + 1, y + 1, w + 6, h + 3);
  g.fillStyle(C.shadow, V.shadow.contact).fillEllipse(x, y, w, h);
}
export function progressBar(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, value: number,
  color: number = C.green): void {
  g.fillStyle(C.cream).fillRoundedRect(x, y, width, 7, 3.5);
  g.fillStyle(C.grout).fillRoundedRect(x + 2, y + 2, width - 4, 3, 1.5);
  if (value > 0) g.fillStyle(color).fillRoundedRect(x + 2, y + 2, Math.max(3, (width - 4) * Math.min(1, value)), 3, 1.5);
}
export function checkmark(g: Phaser.GameObjects.Graphics, x: number, y: number, scale = 1): void {
  g.lineStyle(V.stroke.emphasis, C.cream).beginPath().moveTo(x - 4 * scale, y)
    .lineTo(x - scale, y + 3 * scale).lineTo(x + 5 * scale, y - 4 * scale).strokePath();
}
export function meal(g: Phaser.GameObjects.Graphics, x: number, y: number, scale = 1, dirty = false): void {
  g.fillStyle(C.wallShade).fillEllipse(x, y + 2 * scale, 26 * scale, 14 * scale);
  g.fillStyle(C.cream).fillEllipse(x, y, 26 * scale, 13 * scale);
  g.lineStyle(.8, C.wallShade).strokeEllipse(x, y, 21 * scale, 9 * scale);
  if (dirty) {
    g.fillStyle(C.woodDark).fillEllipse(x - 2 * scale, y, 9 * scale, 4 * scale);
    g.fillStyle(C.coral).fillCircle(x + 5 * scale, y + scale, 1.5 * scale);
  } else {
    g.fillStyle(C.wood).fillEllipse(x, y - scale, 19 * scale, 9 * scale);
    g.fillStyle(C.woodLight).fillEllipse(x - 2 * scale, y - 2 * scale, 14 * scale, 6 * scale);
    g.fillStyle(C.cream).fillEllipse(x + 4 * scale, y - 3 * scale, 10 * scale, 6 * scale);
    g.fillStyle(C.gold).fillCircle(x + 4 * scale, y - 3 * scale, 2 * scale);
    g.fillStyle(C.green).fillEllipse(x - 6 * scale, y - 2 * scale, 4 * scale, 2 * scale);
    g.fillStyle(C.coral).fillCircle(x - scale, y, 1.2 * scale);
  }
}

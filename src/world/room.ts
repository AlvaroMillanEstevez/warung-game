import Phaser from 'phaser';
import { DEBUG, EXTERIOR, ROOM } from '../config';
import { PALETTE as C, VISUAL as V } from '../visuals/theme';
import { localizedLabel, label, softShadow } from '../visuals/drawing';
import { CLEANING_WAIT_POINTS, CUSTOMER_EXTERIOR, CUSTOMER_PUBLIC_Y, OFFICE, QUEUE_POINTS, WALL_SIGN, WELCOME_RUG } from './layout';
import type { Rect } from './layout';

export function drawRoom(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(V.depth.room);
  const { x, y, width: w, height: h } = ROOM, bottom = y + h, right = x + w;
  g.fillStyle(C.shadow, .04).fillRoundedRect(x - 24, 58, w + 56, bottom - 34, 24);
  g.fillStyle(C.wallShade).fillRoundedRect(x - 18, 54, w + 36, bottom - 38, 18);
  g.fillStyle(C.floor).fillRect(x, y, w, h);
  // Quiet, broad wooden boards in the dining room. A sage ceramic floor identifies the kitchen.
  for (let row = 0; row < Math.ceil(h / 70); row++) {
    const py = y + row * 70, length = Math.min(70, bottom - py);
    g.fillStyle(row % 2 ? C.floor : C.tile, .42).fillRect(x, py, w, length);
    g.lineStyle(.8, C.woodDark, .10).lineBetween(x, py, right, py);
    for (let px = x + (row % 2 ? 110 : 220); px < right; px += 220)
      g.lineStyle(.8, C.woodDark, .10).lineBetween(px, py, px, py + length);
  }
  g.fillStyle(C.kitchen).fillRect(x, y, w, CUSTOMER_PUBLIC_Y - y);
  for (let px = x; px < right; px += 92) for (let py = y; py < CUSTOMER_PUBLIC_Y; py += 65) {
    g.lineStyle(1, C.cream, .40).strokeRect(px + 2, py + 2, Math.min(88, right - px - 3), Math.min(61, CUSTOMER_PUBLIC_Y - py - 3));
  }
  g.fillStyle(C.woodLight).fillRect(x, CUSTOMER_PUBLIC_Y - 3, w, 3);
  // Public queue lane is a floor material, not a barrier.
  g.fillStyle(C.cream, .27).fillRoundedRect(650, CUSTOMER_PUBLIC_Y + 8, 183, bottom - CUSTOMER_PUBLIC_Y - 15, 15);
  g.fillStyle(C.wall).fillRoundedRect(x - 8, 58, w + 16, 86, 12);
  g.fillStyle(C.green).fillRect(x, 126, w, 18);
  for (let px = x + 8; px < right; px += 22)
    g.lineStyle(1, C.greenLight, .30).lineBetween(px, 130, px, 142);
  g.fillStyle(C.woodLight).fillRoundedRect(x - 18, 52, w + 36, 10, 5);
  g.fillStyle(C.cream).fillRoundedRect(x - 18, 62, 10, bottom - 62, 4)
    .fillRoundedRect(right + 8, 62, 10, bottom - 62, 4);
  g.fillStyle(C.wallShade).fillRect(x - 8, 68, 8, bottom - 68).fillRect(right, 68, 8, bottom - 68);
  g.fillStyle(C.woodLight).fillRoundedRect(x - 18, bottom, CUSTOMER_EXTERIOR.x - x + 10, 9, 4);
  g.fillStyle(C.cream).fillRect(CUSTOMER_EXTERIOR.x - 8, bottom - 2, right - CUSTOMER_EXTERIOR.x + 8, 14);

  const rug = WELCOME_RUG;
  g.fillStyle(C.greenDark).fillRoundedRect(rug.x, rug.y + 3, rug.width, rug.height, 10);
  g.fillStyle(C.green).fillRoundedRect(rug.x, rug.y, rug.width, rug.height - 2, 10);
  g.lineStyle(1, C.cream, .55).strokeRoundedRect(rug.x + 6, rug.y + 6, rug.width - 12, rug.height - 14, 6);
  for (const rx of [rug.x + 15, rug.x + rug.width - 15]) {
    g.fillStyle(C.gold).fillEllipse(rx, rug.y + 19, 4, 9).fillEllipse(rx, rug.y + 25, 9, 4);
  }
  label(scene, rug.x + rug.width / 2, rug.y + 22, 'Selamat datang', 13, C.cream)
    .setOrigin(.5).setFontStyle('bold').setDepth(V.depth.floorText).setName('welcome-sign');

  const door = OFFICE.doorway, officeRug = OFFICE.rug;
  g.fillStyle(C.greenDark).fillRoundedRect(door.x, door.y, door.width, door.height, 7);
  g.fillStyle(C.shadow, .25).fillRoundedRect(door.x, door.y + 6, 7, door.height - 12, 3);
  g.fillStyle(C.woodLight).fillRoundedRect(door.x - 4, door.y - 4, door.width + 8, 8, 4)
    .fillRoundedRect(door.x - 4, door.y + door.height - 4, door.width + 8, 8, 4);
  g.fillStyle(C.cream).fillRect(ROOM.x - 3, door.y + 4, 10, door.height - 8);
  g.fillStyle(C.greenLight).fillRoundedRect(officeRug.x, officeRug.y, officeRug.width, officeRug.height, 12);
  g.lineStyle(1, C.cream, .6).strokeRoundedRect(officeRug.x + 5, officeRug.y + 5, officeRug.width - 10, officeRug.height - 10, 8);

  // Both lines fit one wall-mounted plaque above the dado. No masks or global text overlays.
  const sign = WALL_SIGN;
  g.fillStyle(C.shadow, .09).fillRoundedRect(sign.x + 2, sign.y + 3, sign.width, sign.height, 14);
  g.fillStyle(C.cream).fillRoundedRect(sign.x, sign.y, sign.width, sign.height, 14);
  g.lineStyle(1, C.woodLight).strokeRoundedRect(sign.x + 4, sign.y + 4, sign.width - 8, sign.height - 8, 10);
  label(scene, sign.x + sign.width / 2, sign.y + 23, 'Warung Kita', 28, C.greenDark)
    .setOrigin(.5).setFontStyle('bold').setDepth(V.depth.floorText).setName('wall-title');
  localizedLabel(scene, sign.x + sign.width / 2, sign.y + 49, 'wall.tagline', 9, C.greenDark, 242)
    .setOrigin(.5).setDepth(V.depth.floorText).setName('wall-subtitle');
  // A restrained four-petal motif echoes a woven cloth, without introducing a usable object.
  for (const cx of [sign.x - 24, sign.x + sign.width + 24]) {
    g.fillStyle(C.coral, .65).fillEllipse(cx, 88, 8, 15).fillEllipse(cx, 103, 8, 15)
      .fillEllipse(cx - 7, 95, 14, 7).fillEllipse(cx + 7, 95, 14, 7);
  }
  g.fillStyle(C.wood).fillRoundedRect(right - 135, 73, 96, 48, 9);
  g.fillStyle(C.kitchen).fillRoundedRect(right - 130, 77, 86, 39, 6);
  g.fillStyle(C.cream, .6).fillTriangle(right - 126, 81, right - 76, 81, right - 126, 110);
  g.fillStyle(C.woodLight).fillRect(right - 90, 77, 4, 39);

  for (const intent of ['dine-in', 'takeaway'] as const) {
    const points = QUEUE_POINTS[intent], head = points[0]!;
    localizedLabel(scene, head.x + (intent === 'takeaway' ? 34 : -34), head.y + 8,
      intent === 'takeaway' ? 'queue.takeaway' : 'queue.dineIn', 10, C.muted, 65)
      .setOrigin(intent === 'takeaway' ? 0 : 1, 0).setLineSpacing(2).setDepth(V.depth.floorText);
    if (DEBUG.customerMarkers) for (const p of points)
      g.lineStyle(1, C.green, .45).strokeEllipse(p.x, p.y, 27, 13);
  }
  if (DEBUG.customerMarkers) for (const p of Object.values(CLEANING_WAIT_POINTS))
    g.lineStyle(1, C.coral, .65).strokeEllipse(p.x, p.y, 26, 13);
}

export function drawExterior(g: Phaser.GameObjects.Graphics, bounds: Rect): void {
  g.clear().fillStyle(C.grass).fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  const bottom = ROOM.y + ROOM.height, right = ROOM.x + ROOM.width;
  const street = CUSTOMER_EXTERIOR.y + CUSTOMER_EXTERIOR.height + 40;
  g.fillStyle(C.pavement).fillRect(bounds.x, street, bounds.width, 134);
  g.fillStyle(C.muted).fillRect(bounds.x, street + 18, bounds.width, 98);
  for (let x = Math.floor(bounds.x / 90) * 90; x < bounds.x + bounds.width; x += 90)
    g.fillStyle(C.cream, .5).fillRoundedRect(x, street + 64, 42, 3, 1.5);
  g.fillStyle(C.shadow, .045).fillRoundedRect(10, 24, right + 66, bottom + 42, 30);
  g.fillStyle(C.pavement).fillRoundedRect(16, 24, right + 50, bottom + 26, 24);
  g.lineStyle(2, C.cream, .6).strokeRoundedRect(24, 32, right + 34, bottom + 10, 20);
  g.fillStyle(C.pavement).fillRect(CUSTOMER_EXTERIOR.x - 8, bottom, CUSTOMER_EXTERIOR.width + 16, CUSTOMER_EXTERIOR.height - 20);
  for (let y = bottom + 30; y < street - 40; y += 78)
    g.lineStyle(1, C.grout, .5).lineBetween(CUSTOMER_EXTERIOR.x, y, CUSTOMER_EXTERIOR.x + CUSTOMER_EXTERIOR.width, y);
  const spacing = EXTERIOR.treeSpacing;
  for (let y = Math.floor(bounds.y / spacing) * spacing; y < bounds.y + bounds.height; y += spacing) {
    for (let x = Math.floor(bounds.x / spacing) * spacing; x < bounds.x + bounds.width; x += spacing) {
      if ((x > -60 && x < right + 130 && y > -50 && y < bottom + 250) ||
          (y > street - 40 && y < street + 180) ||
          (x > CUSTOMER_EXTERIOR.x - 60 && x < CUSTOMER_EXTERIOR.x + CUSTOMER_EXTERIOR.width + 60 && y > bottom - 40 && y < street)) continue;
      if (Math.abs(Math.round(x / spacing + y / spacing)) % 3 === 0) continue;
      softShadow(g, x + 5, y + 13, 58, 22);
      g.fillStyle(C.woodDark).fillRoundedRect(x - 4, y - 12, 8, 30, 4);
      g.fillStyle(C.greenLight).fillEllipse(x, y - 20, 62, 60);
      g.fillStyle(C.grassLight, .6).fillEllipse(x - 8, y - 30, 40, 36);
      g.fillStyle(C.green, .20).fillEllipse(x + 15, y - 12, 22, 36);
    }
  }
}

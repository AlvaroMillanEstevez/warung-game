import Phaser from 'phaser';
import { COLORS as C, DEBUG, EXTERIOR, PLAYER, ROOM, WORLD } from '../config';
import { CLEANING_WAIT_POINTS, CUSTOMER_EXTERIOR, OFFICE, QUEUE_POINTS } from './layout';
import type { Rect } from './layout';

export function drawRoom(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(-100);
  const { x, y, width: w, height: h } = ROOM, bottom = y + h, right = x + w;
  g.fillStyle(C.background).fillRect(0, 0, WORLD.width, WORLD.height);
  // Open-front dollhouse; every dimension follows the fixed playable layout.
  g.fillStyle(C.shadow, 0.12).fillRoundedRect(x - 14, 78, w + 40, bottom - 54, 12);
  g.fillStyle(C.woodDark).fillRoundedRect(x - 18, 56, w + 36, bottom - 46, 6);
  g.fillStyle(C.floor).fillRect(x, y, w, h);
  const tile = 47;
  for (let row = 0; row < Math.ceil(h / tile); row++) for (let col = 0; col < Math.ceil(w / tile); col++) {
    const px = x + col * tile, py = y + row * tile;
    g.fillStyle((row + col) % 2 === 0 ? C.tile : C.floor)
      .fillRect(px + 1, py + 1, Math.min(tile, right - px) - 2, Math.min(tile, bottom - py) - 2);
    if (px + tile < right && py + tile < bottom) g.fillStyle(C.grout, .6).fillCircle(px + tile, py + tile, 2);
  }
  g.fillStyle(C.wall).fillRect(x, 64, w, 80);
  g.fillStyle(C.wallShade).fillRect(x, 134, w, 10);
  g.fillStyle(C.green).fillRect(x, 115, w, 20);
  for (let px = x + 1; px < right; px += 24) g.lineStyle(1, C.greenLight, .55).lineBetween(px, 116, px, 135);
  g.fillStyle(C.woodLight).fillRect(x - 18, 54, w + 36, 10);
  g.fillStyle(C.wallShade).fillRect(x - 17, 65, 17, bottom - 65).fillRect(right, 65, 17, bottom - 65);
  g.fillStyle(C.cream).fillRect(x - 17, 65, 6, bottom - 65).fillRect(right + 11, 65, 6, bottom - 65);
  g.fillStyle(C.woodLight).fillRect(x - 18, bottom, CUSTOMER_EXTERIOR.x - x + 10, 9);
  g.fillStyle(C.tile).fillRect(CUSTOMER_EXTERIOR.x - 8, bottom - 2, right - CUSTOMER_EXTERIOR.x + 8, 14);
  g.fillStyle(C.green, .84).fillRoundedRect(PLAYER.spawn.x - 35, bottom - 44, 70, 39, 5);
  g.lineStyle(1, C.gold, .65).strokeRoundedRect(PLAYER.spawn.x - 29, bottom - 38, 58, 27, 3);
  scene.add.text(PLAYER.spawn.x, bottom - 25, 'SELAMAT DATANG', {
    fontFamily: 'Arial, sans-serif', fontSize: '8px', color: '#fff7e7', letterSpacing: 1,
  }).setOrigin(.5).setDepth(-90);
  const door = OFFICE.doorway, rug = OFFICE.rug;
  // A recessed opening cuts across the side wall, with the same threshold and rug as the entry.
  g.fillStyle(C.greenDark).fillRect(door.x, door.y, door.width, door.height);
  g.fillStyle(C.shadow).fillRect(door.x, door.y + 6, 7, door.height - 12);
  g.fillStyle(C.woodLight).fillRect(door.x - 3, door.y - 4, door.width + 7, 7)
    .fillRect(door.x - 3, door.y + door.height - 3, door.width + 7, 7);
  g.fillStyle(C.tile).fillRect(ROOM.x - 4, door.y + 4, 12, door.height - 8);
  g.fillStyle(C.green, .9).fillRoundedRect(rug.x, rug.y, rug.width, rug.height, 5);
  g.lineStyle(1, C.gold, .8).strokeRoundedRect(rug.x + 5, rug.y + 5, rug.width - 10, rug.height - 10, 3);
  for (const intent of ['dine-in', 'takeaway'] as const) {
    const points = QUEUE_POINTS[intent], head = points[0]!;
    if (DEBUG.customerMarkers) for (const p of points)
      g.lineStyle(1, intent === 'takeaway' ? C.coral : C.green, .45).strokeEllipse(p.x, p.y, 27, 13);
    scene.add.text(head.x + (intent === 'takeaway' ? 35 : -35), head.y - 5, intent === 'takeaway' ? 'PARA\nLLEVAR' : 'COMER\nAQUÍ', {
      fontFamily: 'Arial, sans-serif', fontSize: '10px', color: intent === 'takeaway' ? '#995336' : '#315e50',
    }).setOrigin(intent === 'takeaway' ? 0 : 1, 0).setDepth(-90);
  }
  if (DEBUG.customerMarkers) for (const p of Object.values(CLEANING_WAIT_POINTS))
    g.lineStyle(1, C.coral, .65).strokeEllipse(p.x, p.y, 26, 13);
  g.fillStyle(C.woodDark).fillRoundedRect(right - 156, 72, 126, 46, 3);
  g.fillStyle(0xb3c9ad).fillRect(right - 150, 77, 114, 35);
  g.fillStyle(0xdce4c1).fillTriangle(right - 150, 77, right - 87, 77, right - 150, 112);
  g.fillStyle(C.woodLight).fillRect(right - 96, 77, 5, 35).fillRect(right - 150, 93, 114, 4);
  g.fillStyle(C.woodDark).fillRoundedRect(265, 85, 112, 5, 2);
  for (const px of [282, 315, 349]) {
    g.lineStyle(2, C.woodDark).lineBetween(px, 89, px, 102);
    g.fillStyle(px === 315 ? C.woodDark : C.metal).fillEllipse(px, 108, px === 315 ? 21 : 8, 13);
  }
  scene.add.text(510, 90, 'WARUNG KITA', { fontFamily: 'Georgia, serif', fontSize: '23px', fontStyle: 'bold', color: '#315e50', letterSpacing: 2 }).setOrigin(.5).setDepth(-90);
  scene.add.text(510, 114, 'DAPUR KECIL · CERITA BESAR', { fontFamily: 'Arial, sans-serif', fontSize: '8px', color: '#66745a', letterSpacing: 1.3 }).setOrigin(.5).setDepth(-90);
}

export function drawExterior(g: Phaser.GameObjects.Graphics, bounds: Rect): void {
  g.clear().fillStyle(0xa9b981).fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  const bottom = ROOM.y + ROOM.height, right = ROOM.x + ROOM.width;
  const street = CUSTOMER_EXTERIOR.y + CUSTOMER_EXTERIOR.height + 40;
  g.fillStyle(0xbdbca9).fillRect(bounds.x, street, bounds.width, 134);
  g.fillStyle(0x777f77).fillRect(bounds.x, street + 18, bounds.width, 98);
  for (let x = Math.floor(bounds.x / 90) * 90; x < bounds.x + bounds.width; x += 90)
    g.fillStyle(C.cream, .6).fillRect(x, street + 64, 42, 4);
  g.fillStyle(0xd5d0b9).fillRoundedRect(12, 24, right + 52, bottom + 26, 12);
  g.lineStyle(2, 0xb7baa1).strokeRoundedRect(20, 32, right + 36, bottom + 10, 10);
  g.fillStyle(C.tile).fillRect(CUSTOMER_EXTERIOR.x - 8, bottom, CUSTOMER_EXTERIOR.width + 16, CUSTOMER_EXTERIOR.height - 20);
  for (const x of [CUSTOMER_EXTERIOR.x - 5, CUSTOMER_EXTERIOR.x + CUSTOMER_EXTERIOR.width])
    g.lineStyle(2, C.greenLight, .4).lineBetween(x, bottom + 4, x, street - 45);
  for (let y = bottom + 20; y < street - 40; y += 52)
    g.lineStyle(1, C.grout, .5).lineBetween(CUSTOMER_EXTERIOR.x, y, CUSTOMER_EXTERIOR.x + CUSTOMER_EXTERIOR.width - 4, y);
  const spacing = EXTERIOR.treeSpacing;
  for (let y = Math.floor(bounds.y / spacing) * spacing; y < bounds.y + bounds.height; y += spacing) {
    for (let x = Math.floor(bounds.x / spacing) * spacing; x < bounds.x + bounds.width; x += spacing) {
      if ((x > -60 && x < right + 130 && y > -50 && y < bottom + 250) ||
          (y > street - 40 && y < street + 180) ||
          (x > CUSTOMER_EXTERIOR.x - 60 && x < CUSTOMER_EXTERIOR.x + CUSTOMER_EXTERIOR.width + 60 && y > bottom - 40 && y < street)) continue;
      g.fillStyle(C.shadow, .12).fillEllipse(x + 9, y + 15, 57, 26);
      g.fillStyle(C.woodDark).fillRect(x - 4, y - 9, 8, 27);
      g.fillStyle(C.green).fillCircle(x - 13, y - 14, 22).fillCircle(x + 13, y - 13, 21);
      g.fillStyle(C.greenLight).fillCircle(x, y - 29, 25);
    }
  }
}

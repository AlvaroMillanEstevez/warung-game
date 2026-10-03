import Phaser from 'phaser';
import { COLORS as C, DEBUG, EXTERIOR, ROOM, WORLD } from '../config';
import { CLEANING_WAIT_POINTS, CUSTOMER_EXTERIOR, QUEUE_POINTS } from './layout';
import type { Rect } from './layout';

export function drawRoom(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(-100);
  g.fillStyle(C.background).fillRect(0, 0, WORLD.width, WORLD.height);
  // An open-front dollhouse. All decoration outside ROOM is non-walkable.
  g.fillStyle(C.shadow, 0.12).fillRoundedRect(50, 78, 792, 546, 12);
  g.fillStyle(C.woodDark).fillRoundedRect(46, 56, 788, 554, 6);
  g.fillStyle(C.floor).fillRect(64, 144, 752, 456);
  const tile = 47;
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 16; col++) {
      const x = ROOM.x + col * tile;
      const y = ROOM.y + row * tile;
      const height = Math.min(tile, ROOM.y + ROOM.height - y);
      if (height <= 0) continue;
      g.fillStyle((row + col) % 2 === 0 ? C.tile : C.floor).fillRect(x + 1, y + 1, tile - 2, height - 2);
      g.fillStyle(C.grout, 0.6).fillCircle(x + tile, y + tile, 2);
    }
  }
  g.fillStyle(C.wall).fillRect(64, 64, 752, 80);
  g.fillStyle(C.wallShade).fillRect(64, 134, 752, 10);
  g.fillStyle(C.green).fillRect(64, 115, 752, 20);
  for (let x = 65; x < 816; x += 24) {
    g.lineStyle(1, C.greenLight, 0.55).lineBetween(x, 116, x, 135);
  }
  g.fillStyle(C.woodLight).fillRect(46, 54, 788, 10);
  g.fillStyle(C.wallShade).fillRect(47, 65, 17, 535).fillRect(816, 65, 17, 535);
  g.fillStyle(C.cream).fillRect(47, 65, 6, 535).fillRect(827, 65, 6, 535);
  g.fillStyle(C.woodLight).fillRect(46, 600, 330, 9).fillRect(505, 600, 110, 9);
  g.fillStyle(C.wood).fillRect(380, 600, 122, 9);
  g.fillStyle(C.tile).fillRect(615, 598, 201, 14);
  g.lineStyle(1, C.woodDark).lineBetween(384, 605, 498, 605);
  // Welcome mat and small floor route marks.
  g.fillStyle(C.green, 0.84).fillRoundedRect(343, 556, 70, 39, 5);
  g.lineStyle(1, C.gold, 0.65).strokeRoundedRect(349, 562, 58, 27, 3);
  scene.add.text(378, 575, 'SELAMAT DATANG', { fontFamily: 'Arial, sans-serif', fontSize: '8px', color: '#fff7e7', letterSpacing: 1 }).setOrigin(0.5).setDepth(-90);
  // Explicit waiting positions are visual guides, never character collision bodies.
  for (const intent of ['dine-in', 'takeaway'] as const) {
    const points = QUEUE_POINTS[intent];
    if (DEBUG.customerMarkers) for (const point of points) g.lineStyle(1, intent === 'takeaway' ? C.coral : C.green, 0.45).strokeEllipse(point.x, point.y, 27, 13);
    const middle = points[0]!;
    scene.add.text(middle.x + (intent === 'takeaway' ? 35 : -35), middle.y - 5, intent === 'takeaway' ? 'PARA\nLLEVAR' : 'COMER\nAQUÍ', {
      fontFamily: 'Arial, sans-serif', fontSize: '10px', color: intent === 'takeaway' ? '#995336' : '#315e50',
    }).setOrigin(intent === 'takeaway' ? 0 : 1, 0).setDepth(-90);
  }
  if (DEBUG.customerMarkers) for (const point of Object.values(CLEANING_WAIT_POINTS)) {
    g.lineStyle(1, C.coral, 0.65).strokeEllipse(point.x, point.y, 26, 13);
  }
  // Wall window.
  g.fillStyle(C.woodDark).fillRoundedRect(660, 72, 126, 46, 3);
  g.fillStyle(0xb3c9ad).fillRect(666, 77, 114, 35);
  g.fillStyle(0xdce4c1).fillTriangle(666, 77, 729, 77, 666, 112);
  g.fillStyle(C.woodLight).fillRect(720, 77, 5, 35).fillRect(666, 93, 114, 4);
  // Hanging kitchen rail.
  g.fillStyle(C.woodDark).fillRoundedRect(265, 85, 112, 5, 2);
  for (const x of [282, 315, 349]) {
    g.lineStyle(2, C.woodDark).lineBetween(x, 89, x, 102);
    g.fillStyle(x === 315 ? C.woodDark : C.metal).fillEllipse(x, 108, x === 315 ? 21 : 8, 13);
  }
  scene.add.text(464, 90, 'WARUNG KITA', { fontFamily: 'Georgia, serif', fontSize: '23px', fontStyle: 'bold', color: '#315e50', letterSpacing: 2 }).setOrigin(0.5).setDepth(-90);
  scene.add.text(465, 114, 'DAPUR KECIL · CERITA BESAR', { fontFamily: 'Arial, sans-serif', fontSize: '8px', color: '#66745a', letterSpacing: 1.3 }).setOrigin(0.5).setDepth(-90);
  // A little foliage above the sill, outside the playable floor.
  g.fillStyle(C.coral).fillRoundedRect(751, 101, 18, 14, 2);
  g.fillStyle(C.green).fillEllipse(752, 97, 14, 8).fillEllipse(769, 92, 14, 8).fillEllipse(760, 86, 8, 20);
}

export function drawExterior(g: Phaser.GameObjects.Graphics, bounds: Rect): void {
  g.clear().fillStyle(0xa9b981).fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  // Decorative only: ROOM remains the sole movement boundary.
  g.fillStyle(0xbdbca9).fillRect(bounds.x, 1540, bounds.width, 134);
  g.fillStyle(0x777f77).fillRect(bounds.x, 1558, bounds.width, 98);
  for (let x = Math.floor(bounds.x / 90) * 90; x < bounds.x + bounds.width; x += 90) {
    g.fillStyle(C.cream, 0.6).fillRect(x, 1604, 42, 4);
  }
  g.fillStyle(0xd5d0b9).fillRoundedRect(12, 24, 856, 626, 12);
  g.lineStyle(2, 0xb7baa1).strokeRoundedRect(20, 32, 840, 610, 10);
  // A pedestrian forecourt carries the two queues and a separate exit lane.
  g.fillStyle(C.tile).fillRect(CUSTOMER_EXTERIOR.x - 8, 600, CUSTOMER_EXTERIOR.width + 16, CUSTOMER_EXTERIOR.height - 20);
  g.lineStyle(2, C.greenLight, .4).lineBetween(615, 604, 615, 1495).lineBetween(806, 604, 806, 1495);
  for (let y = 620; y < 1500; y += 52) g.lineStyle(1, C.grout, .5).lineBetween(620, y, 802, y);
  const spacing = EXTERIOR.treeSpacing;
  for (let y = Math.floor(bounds.y / spacing) * spacing; y < bounds.y + bounds.height; y += spacing) {
    for (let x = Math.floor(bounds.x / spacing) * spacing; x < bounds.x + bounds.width; x += spacing) {
      if ((x > -60 && x < 950 && y > -50 && y < 850) || (y > 1500 && y < 1720) || (x > 560 && x < 866 && y > 560 && y < 1550)) continue;
      g.fillStyle(C.shadow, 0.12).fillEllipse(x + 9, y + 15, 57, 26);
      g.fillStyle(C.woodDark).fillRect(x - 4, y - 9, 8, 27);
      g.fillStyle(C.green).fillCircle(x - 13, y - 14, 22).fillCircle(x + 13, y - 13, 21);
      g.fillStyle(C.greenLight).fillCircle(x, y - 29, 25);
    }
  }
}

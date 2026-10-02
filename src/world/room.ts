import Phaser from 'phaser';
import { COLORS as C, ROOM, WORLD } from '../config';
import { QUEUE_POINTS, TABLE_POSITIONS } from './layout';

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
  g.fillStyle(C.woodLight).fillRect(46, 600, 330, 9).fillRect(505, 600, 329, 9);
  g.fillStyle(C.wood).fillRect(380, 600, 122, 9);
  g.lineStyle(1, C.woodDark).lineBetween(384, 605, 498, 605);
  // Welcome mat and small floor route marks.
  g.fillStyle(C.green, 0.84).fillRoundedRect(390, 556, 100, 39, 5);
  g.lineStyle(1, C.gold, 0.65).strokeRoundedRect(396, 562, 88, 27, 3);
  scene.add.text(440, 575, 'SELAMAT DATANG', { fontFamily: 'Arial, sans-serif', fontSize: '8px', color: '#fff7e7', letterSpacing: 1 }).setOrigin(0.5).setDepth(-90);
  // Explicit waiting positions are visual guides, never character collision bodies.
  for (const intent of ['dine-in', 'takeaway'] as const) {
    const points = QUEUE_POINTS[intent];
    for (const point of points) g.lineStyle(1, intent === 'takeaway' ? C.coral : C.green, 0.45).strokeEllipse(point.x, point.y, 27, 13);
    const middle = points[intent === 'dine-in' ? 2 : 1]!;
    scene.add.text(middle.x, middle.y + 17, intent === 'takeaway' ? 'FILA · LLEVAR' : 'FILA · COMER AQUÍ', {
      fontFamily: 'Arial, sans-serif', fontSize: '10px', color: intent === 'takeaway' ? '#995336' : '#315e50',
    }).setOrigin(0.5, 0).setDepth(-90);
  }
  for (const { seat, waiting } of Object.values(TABLE_POSITIONS)) {
    g.fillStyle(C.woodDark).fillRoundedRect(seat.x - 11, seat.y - 5, 22, 10, 3);
    g.fillStyle(C.woodLight).fillEllipse(seat.x, seat.y - 8, 28, 15);
    g.lineStyle(1, C.coral, 0.3).strokeEllipse(waiting.x, waiting.y, 23, 11);
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

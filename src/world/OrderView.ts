import type Phaser from 'phaser';
import { PALETTE as C, VISUAL as V } from '../visuals/theme';
import { ORDER_BOARD, PACKING_STATION } from './layout';
import type { BulkOrders } from '../simulation/BulkOrders';

// Wall board and one restrained learning cue, independent of collisions and task selection.
export class OrderView {
  private readonly board: Phaser.GameObjects.Graphics;
  private readonly cue: Phaser.GameObjects.Graphics;
  private key = '';
  constructor(scene: Phaser.Scene) {
    const { x, y, width: w, height: h } = ORDER_BOARD.plaque;
    this.board = scene.add.graphics().setDepth(V.depth.floorText);
    const g = this.board;
    g.fillStyle(C.shadow, .08).fillRoundedRect(x + 2, y + 3, w, h, 7);
    g.fillStyle(C.woodDark).fillRoundedRect(x, y, w, h, 7);
    g.fillStyle(C.woodLight).fillRoundedRect(x + 4, y + 4, w - 8, h - 8, 5);
    g.fillStyle(C.cream).fillRoundedRect(x + 10, y + 10, w - 20, 30, 3);
    g.fillStyle(C.coral).fillCircle(x + w / 2, y + 11, 3);
    g.lineStyle(2, C.metal).lineBetween(x + 17, y + 22, x + w - 17, y + 22)
      .lineBetween(x + 17, y + 29, x + w - 22, y + 29);
    this.cue = scene.add.graphics().setDepth(V.depth.rearMarker);
  }
  update(orders: BulkOrders): void {
    const state = orders.state, key = state.phase + ':' + orders.firstCompleted;
    if (key === this.key) return; this.key = key;
    const g = this.cue.clear();
    if (state.phase === 'offer') {
      const x = ORDER_BOARD.plaque.x + ORDER_BOARD.plaque.width, y = ORDER_BOARD.plaque.y;
      g.fillStyle(C.gold).fillCircle(x, y, 8);
      g.fillStyle(C.greenDark).fillRoundedRect(x - 1, y - 5, 2, 6, 1).fillCircle(x, y + 4, 1.3);
    }
    if (state.phase === 'active' && !orders.firstCompleted) {
      const x = PACKING_STATION.footprint.x - 5, y = PACKING_STATION.footprint.y - 18;
      g.fillStyle(C.gold).fillTriangle(x - 10, y - 7, x, y, x - 10, y + 7);
    }
  }
  destroy(): void { this.board.destroy(); this.cue.destroy(); }
}

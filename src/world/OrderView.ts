import type Phaser from 'phaser';
import { t } from '../i18n';
import { PALETTE as C, VISUAL as V } from '../visuals/theme';
import { localizedLabel } from '../visuals/drawing';
import { ORDER_BOARD, PACKING_STATION } from './layout';
import type { BulkOrders } from '../simulation/BulkOrders';

// Specific, presentation-only guidance for the existing board and packing station.
export class OrderView {
  private readonly board: Phaser.GameObjects.Graphics;
  private readonly cue: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly requirement: Phaser.GameObjects.Text;
  private readonly direction = document.querySelector<HTMLElement>('#order-direction')!;
  private readonly arrow = document.querySelector<HTMLElement>('#order-direction-arrow')!;
  private readonly directionLabel = document.querySelector<HTMLElement>('#order-direction-label')!;
  private key = '';
  private visible=true;
  constructor(scene: Phaser.Scene) {
    const { x, y, width: w, height: h } = ORDER_BOARD.plaque;
    this.board = scene.add.graphics().setDepth(V.depth.floorText);
    const g = this.board;
    g.fillStyle(C.shadow, .12).fillRoundedRect(x + 2, y + 3, w, h, 7);
    g.fillStyle(C.woodDark).fillRoundedRect(x, y, w, h, 7);
    g.fillStyle(C.woodLight).fillRoundedRect(x + 4, y + 4, w - 8, h - 8, 5);
    g.fillStyle(C.cream).fillRoundedRect(x + 7, y + 4, w - 14, 14, 3);
    // Two order sheets and a parcel icon distinguish the board from decorative wall art.
    g.fillStyle(C.cream).fillRoundedRect(x + 10, y + 21, 20, 16, 2)
      .fillRoundedRect(x + 27, y + 19, 20, 18, 2);
    g.fillStyle(C.coral).fillCircle(x + 20, y + 22, 1.8).fillCircle(x + 37, y + 20, 1.8);
    g.lineStyle(1, C.metal).lineBetween(x + 14, y + 28, x + 25, y + 28)
      .lineBetween(x + 31, y + 26, x + 42, y + 26).lineBetween(x + 31, y + 31, x + 40, y + 31);
    g.fillStyle(C.woodDark).fillRoundedRect(x + 51, y + 22, 16, 15, 2);
    g.fillStyle(C.cream).fillRect(x + 57, y + 22, 4, 15);
    this.title = localizedLabel(scene, x + w / 2, y + 5, 'station.board', 11, C.greenDark, w - 16)
      .setOrigin(.5, 0).setFontStyle('bold').setDepth(V.depth.floorText).setName('order-board-title');
    this.requirement = localizedLabel(scene, x + w / 2, y + h - 13, 'bulk.boardLocked', 8.5, C.greenDark, w - 10)
      .setOrigin(.5, 0).setDepth(V.depth.floorText).setName('order-board-requirement');
    this.cue = scene.add.graphics().setDepth(V.depth.rearMarker);
  }
  setVisible(visible:boolean):void {if(this.visible===visible)return;this.visible=visible;this.key='';this.board.setVisible(visible);this.title.setVisible(visible);this.requirement.setVisible(visible);this.cue.setVisible(visible);if(!visible)this.hideDirection();}
  hideDirection(): void { this.direction.hidden = true; }
  update(orders: BulkOrders, camera: Phaser.Cameras.Scene2D.Camera, hideDirection: boolean): void {
    const state = orders.state, key = state.phase + ':' + orders.firstCompleted + ':' + orders.packingVisited;
    if (key !== this.key) {
      this.key = key;
      this.requirement.setVisible(state.phase === 'locked');
      const g = this.cue.clear();
      if (state.phase === 'offer' || state.phase === 'ready') {
        if (state.phase === 'ready') {
          const plaque = ORDER_BOARD.plaque;
          g.fillStyle(C.gold, .25).fillRoundedRect(plaque.x - 5, plaque.y - 5, plaque.width + 10, plaque.height + 10, 9);
          g.lineStyle(2, C.gold, .9).strokeRoundedRect(plaque.x - 5, plaque.y - 5, plaque.width + 10, plaque.height + 10, 9);
        }
        const x = ORDER_BOARD.plaque.x + ORDER_BOARD.plaque.width, y = ORDER_BOARD.plaque.y;
        g.fillStyle(C.gold).fillCircle(x, y, 8);
        g.fillStyle(C.greenDark).fillRoundedRect(x - 1, y - 5, 2, 6, 1).fillCircle(x, y + 4, 1.3);
      }
      if (state.phase === 'active' && !orders.firstCompleted && !orders.packingVisited) {
        const x = PACKING_STATION.footprint.x - 5, y = PACKING_STATION.footprint.y - 18;
        g.fillStyle(C.gold).fillTriangle(x - 10, y - 7, x, y, x - 10, y + 7);
      }
    }
    const guide = orders.guidance;
    if (!guide || hideDirection) { this.hideDirection(); return; }
    const target = guide === 'board' ? ORDER_BOARD.plaque : PACKING_STATION.footprint;
    const point = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
    const view = camera.worldView;
    if (point.x >= view.x + 24 && point.x <= view.right - 24 && point.y >= view.y + 24 && point.y <= view.bottom - 24) {
      this.hideDirection(); return;
    }
    this.direction.hidden = false;
    const text = t(guide === 'board' ? state.phase === 'ready' ? 'bulk.returnBoard' : 'bulk.findBoard' : 'bulk.findPacking');
    if (this.directionLabel.textContent !== text) this.directionLabel.textContent = text;
    this.arrow.style.transform = 'rotate(' + Math.atan2(point.y - view.centerY, point.x - view.centerX) + 'rad)';
  }
  destroy(): void {
    this.board.destroy(); this.cue.destroy(); this.title.destroy(); this.requirement.destroy(); this.hideDirection();
  }
}

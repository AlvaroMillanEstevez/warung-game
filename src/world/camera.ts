import Phaser from 'phaser';
import { CAMERA } from '../config';
import type { Point, Rect } from './layout';
import { viewportGeometry } from './viewport';

export function frameRestaurant(camera: Phaser.Cameras.Scene2D.Camera, width: number, height: number, player: Point): Rect {
  const { zoom, exterior } = viewportGeometry(width, height);
  camera.setSize(width, height).setZoom(zoom);
  camera.removeBounds(); // ROOM limits movement only, never the camera.
  camera.startFollow(player, false, 1, 1, 0, CAMERA.headOffset);
  camera.centerOn(player.x, player.y - CAMERA.headOffset);
  return exterior;
}

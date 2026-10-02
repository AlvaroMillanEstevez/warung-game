import Phaser from 'phaser';
import { CAMERA } from '../config';
import type { Point } from './layout';

export function frameRestaurant(camera: Phaser.Cameras.Scene2D.Camera, width: number, height: number, player: Point): void {
  const bounds = CAMERA.bounds;
  // Uniform cover: show only the furnished room, with no empty bands. Portrait follows horizontally.
  const zoom = Math.max(width / bounds.width, height / bounds.height, CAMERA.minimumZoom);
  camera.setSize(width, height).setZoom(zoom);
  camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
  camera.startFollow(player, false, CAMERA.followLerp, CAMERA.followLerp, 0, CAMERA.headOffset);
  camera.centerOn(player.x, player.y - CAMERA.headOffset);
}

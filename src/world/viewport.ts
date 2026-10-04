import { CAMERA, EXTERIOR, ROOM } from '../config.ts';
import type { Rect } from './layout.ts';

export function viewportGeometry(width: number, height: number): { zoom: number; exterior: Rect } {
  const zoom = Math.max(width / CAMERA.viewSize.width, height / CAMERA.viewSize.height, CAMERA.minimumZoom) * CAMERA.zoomMultiplier;
  // Cover the union of all camera views reachable within ROOM, plus drawing overscan.
  const marginX = width / zoom / 2 + EXTERIOR.padding;
  const marginY = height / zoom / 2 + EXTERIOR.padding + Math.abs(CAMERA.headOffset);
  return { zoom, exterior: { x: ROOM.x - marginX, y: ROOM.y - marginY,
    width: ROOM.width + 2 * marginX, height: ROOM.height + 2 * marginY } };
}

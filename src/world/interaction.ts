import { INTERACTION, PLAYER } from '../config.ts';
import { expandRect, segmentHitsRect } from './collision.ts';
import type { InteractionZone, Point, Rect } from './layout.ts';

export function closestZone(position: Point, zones: readonly InteractionZone[], obstacles: readonly Rect[]): InteractionZone | null {
  let nearest: InteractionZone | null = null;
  let distance: number = INTERACTION.radius;
  for (const zone of zones) {
    const candidate = Math.hypot(position.x - zone.position.x, position.y - zone.position.y);
    if (candidate > distance) continue;
    if (obstacles.some(rect => segmentHitsRect(position, zone.position, expandRect(rect, PLAYER.halfWidth, PLAYER.halfHeight)))) continue;
    nearest = zone; distance = candidate;
  }
  return nearest;
}

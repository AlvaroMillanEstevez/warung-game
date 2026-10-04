import { INTERACTION, PLAYER } from '../config.ts';
import { expandRect, segmentHitsRect } from './collision.ts';
import type { InteractionZone, Point, Rect } from './layout.ts';

export function canInteract(position: Point, zone: InteractionZone, obstacles: readonly Rect[]): boolean {
  if (Math.hypot(position.x - zone.position.x, position.y - zone.position.y) > INTERACTION.radius) return false;
  const area = zone.access;
  if (area && (position.x < area.x || position.x > area.x + area.width || position.y < area.y || position.y > area.y + area.height)) return false;
  return !obstacles.some(rect => segmentHitsRect(position, zone.position, expandRect(rect, PLAYER.halfWidth, PLAYER.halfHeight)));
}

export function closestZone(position: Point, zones: readonly InteractionZone[], obstacles: readonly Rect[]): InteractionZone | null {
  let nearest: InteractionZone | null = null;
  let distance: number = INTERACTION.radius;
  for (const zone of zones) {
    const candidate = Math.hypot(position.x - zone.position.x, position.y - zone.position.y);
    if (candidate > distance) continue;
    if (!canInteract(position, zone, obstacles)) continue;
    nearest = zone; distance = candidate;
  }
  return nearest;
}

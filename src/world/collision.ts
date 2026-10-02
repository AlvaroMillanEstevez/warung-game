import { PLAYER, ROOM } from '../config.ts';
import type { Point, Rect } from './layout.ts';

export function expandRect(rect: Rect, x: number, y: number): Rect {
  return { x: rect.x - x, y: rect.y - y, width: rect.width + x * 2, height: rect.height + y * 2 };
}

export function canStand(point: Point, obstacles: readonly Rect[]): boolean {
  if (point.x < ROOM.x + PLAYER.halfWidth || point.x > ROOM.x + ROOM.width - PLAYER.halfWidth ||
      point.y < ROOM.y + PLAYER.halfHeight || point.y > ROOM.y + ROOM.height - PLAYER.halfHeight) return false;
  return obstacles.every((obstacle) => {
    const rect = expandRect(obstacle, PLAYER.halfWidth, PLAYER.halfHeight);
    return point.x <= rect.x || point.x >= rect.x + rect.width || point.y <= rect.y || point.y >= rect.y + rect.height;
  });
}

export function moveWithCollisions(position: Point, dx: number, dy: number, obstacles: readonly Rect[]): Point {
  const next = { ...position };
  // Short substeps prevent tunnelling even after a slow frame. Resolve each axis to slide along edges.
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / PLAYER.collisionStep));
  for (let i = 0; i < steps; i++) {
    if (canStand({ x: next.x + dx / steps, y: next.y }, obstacles)) next.x += dx / steps;
    if (canStand({ x: next.x, y: next.y + dy / steps }, obstacles)) next.y += dy / steps;
  }
  return next;
}

// Segment vs. AABB (slab method). Used for line of sight to an interaction point.
export function segmentHitsRect(from: Point, to: Point, rect: Rect): boolean {
  let near = 0;
  let far = 1;
  for (const axis of ['x', 'y'] as const) {
    const size = axis === 'x' ? rect.width : rect.height;
    const delta = to[axis] - from[axis];
    if (Math.abs(delta) < 0.000001) {
      if (from[axis] < rect[axis] || from[axis] > rect[axis] + size) return false;
    } else {
      const a = (rect[axis] - from[axis]) / delta;
      const b = (rect[axis] + size - from[axis]) / delta;
      near = Math.max(near, Math.min(a, b));
      far = Math.min(far, Math.max(a, b));
      if (near > far) return false;
    }
  }
  return true;
}

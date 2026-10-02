import { PLAYER } from '../config.ts';
import { canStand, expandRect, segmentHitsRect } from './collision.ts';
import type { Point, Rect } from './layout.ts';

// A tiny visibility graph around the same furniture footprints used by the player.
// No character-character obstacles: queues have distinct destinations instead.
export function findPath(start: Point, goal: Point, obstacles: readonly Rect[]): Point[] | null {
  if (!canStand(start, obstacles) || !canStand(goal, obstacles)) return null;
  const inflated = obstacles.map(r => expandRect(r, PLAYER.halfWidth + 1, PLAYER.halfHeight + 1));
  const clear = (a: Point, b: Point): boolean => !inflated.some(r => segmentHitsRect(a, b, r));
  if (clear(start, goal)) return [{ ...goal }];
  const nodes: Point[] = [{ ...start }, { ...goal }];
  for (const r of inflated) {
    for (const x of [r.x - 1, r.x + r.width + 1]) {
      for (const y of [r.y - 1, r.y + r.height + 1]) {
        const point = { x, y };
        if (canStand(point, obstacles)) nodes.push(point);
      }
    }
  }
  const distance = nodes.map(() => Infinity);
  const previous = nodes.map(() => -1);
  const visited = new Set<number>();
  distance[0] = 0;
  while (visited.size < nodes.length) {
    let current = -1;
    for (let i = 0; i < nodes.length; i++) {
      if (!visited.has(i) && (current === -1 || distance[i]! < distance[current]!)) current = i;
    }
    if (current < 0 || !Number.isFinite(distance[current])) return null;
    if (current === 1) break;
    visited.add(current);
    for (let i = 0; i < nodes.length; i++) {
      if (visited.has(i) || !clear(nodes[current]!, nodes[i]!)) continue;
      const length = Math.hypot(nodes[i]!.x - nodes[current]!.x, nodes[i]!.y - nodes[current]!.y);
      const candidate = distance[current]! + length;
      if (candidate < distance[i]!) { distance[i] = candidate; previous[i] = current; }
    }
  }
  if (!Number.isFinite(distance[1])) return null;
  const path: Point[] = [];
  for (let index = 1; index !== 0; index = previous[index]!) {
    if (index < 0) return null;
    path.unshift({ ...nodes[index]! });
  }
  return path;
}

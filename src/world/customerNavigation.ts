import { PLAYER, ROOM } from '../config.ts';
import { CUSTOMER_EXTERIOR, CUSTOMER_EXIT_LANE, CUSTOMER_EXIT_TURN, CUSTOMER_LAYOUT } from './layout.ts';
import type { Point, Rect } from './layout.ts';
import { canStand } from './collision.ts';
import { findPath } from './navigation.ts';

// Only clients may use this exterior walkway. Player/staff navigation remains inside ROOM.
export function canStandCustomer(point: Point, obstacles: readonly Rect[]): boolean {
  return canStand(point, obstacles) || (point.x >= CUSTOMER_EXTERIOR.x + PLAYER.halfWidth &&
    point.x <= CUSTOMER_EXTERIOR.x + CUSTOMER_EXTERIOR.width - PLAYER.halfWidth &&
    point.y >= CUSTOMER_EXTERIOR.y + PLAYER.halfHeight && point.y <= CUSTOMER_EXTERIOR.y + CUSTOMER_EXTERIOR.height - PLAYER.halfHeight);
}
export function findCustomerPath(start: Point, goal: Point, obstacles: readonly Rect[]): Point[] | null {
  if (!canStandCustomer(start, obstacles) || !canStandCustomer(goal, obstacles)) return null;
  const outside = (p: Point) => p.y > ROOM.y + ROOM.height - PLAYER.halfHeight;
  if (outside(start) && outside(goal)) return [{ ...goal }];
  const startGate = outside(start) ? { x: start.x, y: CUSTOMER_LAYOUT.inside.y } : start;
  const goalGate = outside(goal) ? { x: goal.x, y: CUSTOMER_LAYOUT.inside.y } : goal;
  // Paid customers exit through a third lane, north of both queue heads.
  if (goal.x === CUSTOMER_LAYOUT.exit.x && goal.y === CUSTOMER_LAYOUT.exit.y && !outside(start)) {
    // Replanning a paid client already on the exit lane must not send them back to its start.
    if (start.x === CUSTOMER_EXIT_LANE.x && start.y >= CUSTOMER_EXIT_LANE.y)
      return [goalGate, { ...goal }];
    const turn = { x: start.x > CUSTOMER_EXTERIOR.x ? start.x : CUSTOMER_EXIT_TURN.x, y: CUSTOMER_EXIT_TURN.y };
    const route = findPath(start, turn, obstacles);
    return route ? [...route, { ...CUSTOMER_EXIT_LANE }, goalGate, { ...goal }] : null;
  }
  const inside = findPath(startGate, goalGate, obstacles);
  return inside ? [...(outside(start) ? [startGate] : []), ...inside, ...(outside(goal) ? [{ ...goal }] : [])] : null;
}

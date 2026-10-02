import { CONTROLS } from '../config.ts';
import type { Point } from '../world/layout.ts';

// CSS screen coordinates only: fixed origin, no camera/world transform or event accumulation.
export function dragVector(origin: Point, contact: Point): Point {
  const dx = contact.x - origin.x, dy = contact.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= CONTROLS.dragDeadZone) return { x: 0, y: 0 };
  const fraction = Math.min(1, (distance - CONTROLS.dragDeadZone) / (CONTROLS.dragMaxDistance - CONTROLS.dragDeadZone));
  const power = fraction ** CONTROLS.responseExponent;
  return { x: dx / distance * power, y: dy / distance * power };
}

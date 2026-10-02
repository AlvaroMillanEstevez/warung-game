import { INTERACTION, PLAYER } from '../config';
import { expandRect, segmentHitsRect } from './collision';
import type { Point, StationData } from './layout';

export function closestStation(position: Point, stations: readonly StationData[]): StationData | null {
  let nearest: StationData | null = null;
  let nearestDistance: number = INTERACTION.radius;
  for (const station of stations) {
    if (station.kind === 'table') continue;
    const distance = Math.hypot(position.x - station.interaction.x, position.y - station.interaction.y);
    if (distance > nearestDistance) continue;
    // Include the target furniture too: being close through its back does not count.
    const blocked = stations.some((other) => segmentHitsRect(position, station.interaction,
      expandRect(other.footprint, PLAYER.halfWidth, PLAYER.halfHeight)));
    if (!blocked) {
      nearest = station;
      nearestDistance = distance;
    }
  }
  return nearest;
}

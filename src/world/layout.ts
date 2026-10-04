import { CUSTOMERS, ROOM } from '../config.ts';

export interface Point { x: number; y: number }
export interface Rect extends Point { width: number; height: number }
export type StationKind = 'fridge' | 'stove' | 'counter' | 'table' | 'bin';
export interface StationData {
  id: string; name: string; kind: StationKind;
  footprint: Rect; height: number; interaction: Point;
}
export interface InteractionZone {
  id: string; stationId: string; name: string;
  role: 'production' | 'deposit' | 'checkout' | 'table' | 'bin' | 'office';
  position: Point;
  access?: Rect;
}

// Footprints occupy the floor; height only projects the drawing upwards.
const tables: StationData[] = Array.from({ length: 6 }, (_, index) => {
  const x = 225 + (index % 2) * 200, y = 365 + Math.floor(index / 2) * 140;
  return { id: 'table-' + (index + 1), name: 'Limpiar', kind: 'table',
    footprint: { x, y, width: 106, height: 65 }, height: 34, interaction: { x: x + 53, y: y + 90 } };
});
export const EXTRA_TABLES: readonly StationData[] = tables.slice(2);
export const EXTRA_STOVE: StationData = {
  id: 'stove-2', name: 'Hornillo', kind: 'stove', footprint: { x: 420, y: 204, width: 100, height: 58 },
  height: 45, interaction: { x: 470, y: 288 },
};
export const CHECKOUT_PLAYER = { x: 715, y: 200 } as const;
export const DEPOSIT_POINT = { x: 575, y: 282 } as const;
export const CUSTOMER_SERVICE_POINTS = { 'dine-in': { x: 690, y: 375 }, takeaway: { x: 770, y: 375 } } as const;
export const CUSTOMER_PUBLIC_Y = 340;
// The doorway belongs to the wall; only its rug is a walkable interaction zone.
export const OFFICE = {
  doorway: { x: ROOM.x - 18, y: 438, width: 18, height: 80 },
  rug: { x: 78, y: 446, width: 70, height: 64 },
  interaction: { x: 113, y: 478 },
} as const;
export const STATIONS: readonly StationData[] = [
  { id: 'fridge', name: 'Frigorífico', kind: 'fridge', footprint: { x: 110, y: 202, width: 90, height: 60 }, height: 92, interaction: { x: 155, y: 288 } },
  { id: 'stove', name: 'Hornillo', kind: 'stove', footprint: { x: 270, y: 204, width: 100, height: 58 }, height: 45, interaction: { x: 320, y: 288 } },
  { id: 'counter', name: 'Mostrador', kind: 'counter', footprint: { x: 610, y: 250, width: 210, height: 66 }, height: 43, interaction: CHECKOUT_PLAYER },
  ...tables.slice(0, 2),
  { id: 'bin', name: 'Papelera', kind: 'bin', footprint: { x: 112, y: 591, width: 52, height: 43 }, height: 43, interaction: { x: 190, y: 613 } },
];
export function stationZone(station: StationData): InteractionZone {
  return { id: station.id, stationId: station.id, name: station.name,
    role: station.kind === 'table' ? 'table' : station.kind === 'bin' ? 'bin' : 'production',
    position: station.interaction };
}
export const INTERACTION_ZONES: readonly InteractionZone[] = [
  ...STATIONS.filter(s => s.kind !== 'counter').map(stationZone),
  { id: 'office', stationId: 'office', name: 'Oficina', role: 'office', position: OFFICE.interaction },
  { id: 'deposit', stationId: 'counter', name: 'Depositar', role: 'deposit', position: DEPOSIT_POINT },
  { id: 'checkout', stationId: 'counter', name: 'Caja', role: 'checkout', position: CHECKOUT_PLAYER,
    access: { x: 673, y: 160, width: 84, height: 72 } },
];
export const CUSTOMER_LAYOUT = {
  entry: { x: 690, y: 1500 }, inside: { x: 690, y: ROOM.y + ROOM.height - 15 }, exit: { x: 870, y: 1500 },
} as const;
export const CUSTOMER_EXIT_TURN = { x: 570, y: CUSTOMER_PUBLIC_Y } as const;
export const CUSTOMER_EXIT_LANE = { x: 870, y: CUSTOMER_PUBLIC_Y } as const;
// Two separate public queues. Paid clients use a third lane on the right.
export const QUEUE_PATHS = {
  'dine-in': [CUSTOMER_SERVICE_POINTS['dine-in'], { x: 690, y: 1500 }],
  takeaway: [CUSTOMER_SERVICE_POINTS.takeaway, { x: 770, y: 1500 }],
} as const;
export const QUEUE_SPACING = 52;
export function positionsAlong(path: readonly Point[], count: number, spacing: number): Point[] {
  const points: Point[] = [];
  for (let index = 0; index < count; index++) {
    let remaining = index * spacing;
    for (let segment = 1; segment < path.length; segment++) {
      const a = path[segment - 1]!, b = path[segment]!, length = Math.hypot(b.x - a.x, b.y - a.y);
      if (remaining <= length) {
        const t = remaining / length;
        points.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); break;
      }
      remaining -= length;
    }
  }
  if (points.length !== count) throw new Error('El recorrido no contiene todas las plazas de la fila.');
  return points;
}
export const QUEUE_POINTS = {
  'dine-in': positionsAlong(QUEUE_PATHS['dine-in'], CUSTOMERS.queueLimits['dine-in'], QUEUE_SPACING),
  takeaway: positionsAlong(QUEUE_PATHS.takeaway, CUSTOMERS.queueLimits.takeaway, QUEUE_SPACING),
};
export const CUSTOMER_ENTRIES = { 'dine-in': QUEUE_PATHS['dine-in'].at(-1)!, takeaway: QUEUE_PATHS.takeaway.at(-1)! };
export const CUSTOMER_EXTERIOR = { x: 660, y: ROOM.y + ROOM.height - 20, width: 226, height: 800 } as const;
export const TABLE_POSITIONS: Readonly<Record<string, { seat: Point }>> = Object.fromEntries(
  tables.map(t => [t.id, { seat: { x: t.footprint.x - 25, y: t.footprint.y + 32 } }]),
);
// Six distinct public waiting spots, away from the service points and work area.
export const CLEANING_WAIT_POINTS: Readonly<Record<string, Point>> = Object.fromEntries(
  tables.map((t, index) => [t.id, { x: 560 + (index % 2) * 60, y: 375 + Math.floor(index / 2) * 60 }]),
);
export const STAFF_POSITIONS = { cook: { x: 225, y: 300 }, 'cook-2': { x: 530, y: 330 }, cleaner: { x: 115, y: 735 } } as const;

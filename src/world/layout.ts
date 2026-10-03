import { CUSTOMERS } from '../config.ts';

export interface Point { x: number; y: number }
export interface Rect extends Point { width: number; height: number }
export type StationKind = 'fridge' | 'stove' | 'counter' | 'table' | 'bin';
export interface StationData {
  id: string;
  name: string;
  kind: StationKind;
  footprint: Rect;
  height: number;
  interaction: Point;
}

// Footprints describe the floor, not the upward projection of each piece.
// Interaction points sit outside these footprints, on the usable side.
export const STATIONS: readonly StationData[] = [
  { id: 'fridge', name: 'Frigorífico', kind: 'fridge', footprint: { x: 110, y: 202, width: 90, height: 60 }, height: 92, interaction: { x: 155, y: 288 } },
  { id: 'stove', name: 'Hornillo', kind: 'stove', footprint: { x: 270, y: 204, width: 100, height: 58 }, height: 45, interaction: { x: 320, y: 288 } },
  { id: 'counter', name: 'Mostrador', kind: 'counter', footprint: { x: 555, y: 208, width: 190, height: 66 }, height: 43, interaction: { x: 650, y: 301 } },
  { id: 'table-1', name: 'Mesa 1', kind: 'table', footprint: { x: 225, y: 345, width: 106, height: 65 }, height: 34, interaction: { x: 278, y: 435 } },
  { id: 'table-2', name: 'Mesa 2', kind: 'table', footprint: { x: 425, y: 345, width: 106, height: 65 }, height: 34, interaction: { x: 478, y: 435 } },
  { id: 'bin', name: 'Papelera', kind: 'bin', footprint: { x: 112, y: 461, width: 52, height: 43 }, height: 43, interaction: { x: 190, y: 482 } },
];

export interface InteractionZone {
  id: string;
  stationId: string;
  name: string;
  role: 'production' | 'deposit' | 'checkout' | 'table' | 'bin';
  position: Point;
}

// Deposit and checkout keep their original positions; customers collect meals at checkout.
export const INTERACTION_ZONES: readonly InteractionZone[] = [
  ...STATIONS.filter(s => s.kind !== 'counter').map(s => ({
    id: s.id, stationId: s.id, name: s.name,
    role: (s.kind === 'table' ? 'table' : s.kind === 'bin' ? 'bin' : 'production') as InteractionZone['role'],
    position: s.interaction,
  })),
  { id: 'deposit', stationId: 'counter', name: 'Depositar', role: 'deposit', position: { x: 520, y: 238 } },
  { id: 'checkout', stationId: 'counter', name: 'Caja', role: 'checkout', position: { x: 650, y: 301 } },
];
export const CUSTOMER_LAYOUT = {
  entry: { x: 650, y: 1460 }, inside: { x: 650, y: 585 }, exit: { x: 790, y: 1460 },
} as const;
// Head-to-tail paths. Entries approach from beyond the tail, never through the head.
export const CUSTOMER_EXIT_TURN = { x: 580, y: 310 } as const;
export const CUSTOMER_EXIT_LANE = { x: 790, y: 310 } as const;
export const QUEUE_PATHS = {
  'dine-in': [{ x: 650, y: 350 }, { x: 650, y: 1460 }],
  takeaway: [{ x: 730, y: 350 }, { x: 730, y: 1460 }],
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
export const CUSTOMER_EXTERIOR = { x: 620, y: 580, width: 186, height: 920 } as const;
export const TABLE_POSITIONS: Readonly<Record<string, { seat: Point }>> = {
  'table-1': { seat: { x: 200, y: 377 } },
  'table-2': { seat: { x: 400, y: 377 } },
  'table-3': { seat: { x: 200, y: 517 } },
  'table-4': { seat: { x: 400, y: 517 } },
};

// One distinct waiting position per reservable table, beside checkout and outside both queues.
export const CLEANING_WAIT_POINTS: Readonly<Record<string, Point>> = {
  'table-1': { x: 480, y: 185 },
  'table-2': { x: 400, y: 185 },
  'table-3': { x: 480, y: 292 },
  'table-4': { x: 400, y: 292 },
};

export const EXTRA_TABLES: readonly StationData[] = [
  { id: 'table-3', name: 'Mesa 3', kind: 'table', footprint: { x: 225, y: 485, width: 106, height: 65 }, height: 34, interaction: { x: 278, y: 575 } },
  { id: 'table-4', name: 'Mesa 4', kind: 'table', footprint: { x: 425, y: 485, width: 106, height: 65 }, height: 34, interaction: { x: 478, y: 575 } },
];
export const STAFF_POSITIONS = { cook: { x: 225, y: 300 }, cleaner: { x: 115, y: 565 } } as const;
export function tableZone(table: StationData): InteractionZone {
  return { id: table.id, stationId: table.id, name: table.name, role: 'table', position: table.interaction };
}

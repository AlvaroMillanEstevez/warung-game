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
  { id: 'table-1', name: 'Mesa 1', kind: 'table', footprint: { x: 263, y: 405, width: 106, height: 78 }, height: 34, interaction: { x: 316, y: 510 } },
  { id: 'table-2', name: 'Mesa 2', kind: 'table', footprint: { x: 579, y: 405, width: 106, height: 78 }, height: 34, interaction: { x: 632, y: 510 } },
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
  entry: { x: 426, y: 592 }, inside: { x: 444, y: 555 }, exit: { x: 476, y: 592 },
} as const;
export const QUEUE_POINTS = {
  'dine-in': [{ x: 570, y: 350 }, { x: 520, y: 350 }, { x: 470, y: 350 }],
  takeaway: [{ x: 694, y: 350 }, { x: 742, y: 350 }, { x: 790, y: 350 }],
} as const;
export const TABLE_POSITIONS: Readonly<Record<string, { seat: Point }>> = {
  'table-1': { seat: { x: 395, y: 438 } },
  'table-2': { seat: { x: 716, y: 438 } },
};

// One distinct waiting position per reservable table, beside checkout and outside both queues.
export const CLEANING_WAIT_POINTS: Readonly<Record<string, Point>> = {
  'table-1': { x: 780, y: 185 },
  'table-2': { x: 780, y: 278 },
};

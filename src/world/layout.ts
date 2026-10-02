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

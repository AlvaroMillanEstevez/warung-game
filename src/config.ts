// World units never change with the screen size. The viewport and camera adapt.
export const WORLD = { width: 880, height: 650 } as const;
export const ROOM = { x: 64, y: 144, width: 752, height: 456 } as const;
export const PLAYER = {
  speed: 185,
  halfWidth: 10,
  halfHeight: 7,
  spawn: { x: 444, y: 518 },
  maxFrameSeconds: 0.1,
  collisionStep: 4,
} as const;
export const INTERACTION = { radius: 48, dwellMs: 1500, messageDuration: 3200 } as const;
export const PRODUCTION = { cookingMs: 4000, stoveSlots: 4, inventory: { ingredients: 8, meals: 8, waste: 8 } } as const;
export const CUSTOMERS = {
  arrivalMs: 8000, dineInChance: 0.5, maxCustomers: 10, maxQueueLength: 3,
  speed: 90, eatingMs: 6000, price: 10,
} as const;
export const CONTROLS = { dragDeadZone: 12, dragMaxDistance: 76, responseExponent: 1.25 } as const;
export const EXTERIOR = { padding: 64, treeSpacing: 170 } as const;
export const CARGO_FEEDBACK = { durationMs: 650, rise: 14 } as const;
export const CAMERA = {
  viewSize: { width: 788, height: 554 }, // Framing scale, not movement or camera bounds.
  minimumZoom: 1.15,
  headOffset: 24,
} as const;
export const COLORS = {
  background: 0xe7e4d5, wall: 0xf7efd9, wallShade: 0xe7d6b5,
  floor: 0xe5d8bc, tile: 0xeee4ce, grout: 0xd6c8a9,
  green: 0x315e50, greenLight: 0x6b9580, greenDark: 0x244a40,
  wood: 0xcc9158, woodDark: 0x975f3f, woodLight: 0xe0b37b,
  cream: 0xfff7e7, ink: 0x344b40, shadow: 0x263e32,
  coral: 0xc56346, gold: 0xe8bb68, metal: 0xabc4b4,
  skin: 0xd9996c, hair: 0x423326, highlight: 0x428b68,
} as const;

export const DEBUG = { customerMarkers: false } as const;
export const STAFF = { actionMs: 1500, speed: 110, capacity: 4, cookStockTarget: 12 } as const;
export const UPGRADES = {
  cook: { prices: [100] },
  cleaner: { prices: [80] },
  transport: { prices: [60, 120], capacities: [8, 12, 16] },
  actionSpeed: { prices: [80, 160], durationsMs: [1500, 1200, 900] },
  stoveSpeed: { prices: [100, 200], durationsMs: [4000, 3000, 2000] },
  'table-3': { prices: [80] },
  'table-4': { prices: [140] },
} as const;
export type UpgradeId = keyof typeof UPGRADES;

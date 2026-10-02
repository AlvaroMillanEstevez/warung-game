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
export const PRODUCTION = { cookingMs: 4000, stoveSlots: 4, inventory: { ingredients: 4, meals: 4, waste: 4 } } as const;
export const CUSTOMERS = {
  arrivalMs: 8000, dineInChance: 0.5, maxCustomers: 10, maxQueueLength: 3,
  speed: 90, eatingMs: 6000, price: 10,
} as const;
export const CONTROLS = { dragDeadZone: 10, dragMaxDistance: 58, stationaryTolerance: 0.06 } as const;
export const CAMERA = {
  bounds: { x: 46, y: 56, width: 788, height: 554 },
  minimumZoom: 1.15,
  followLerp: 0.12,
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

// World units never change with the screen size. The viewport and camera adapt.
export const WORLD = { width: 960, height: 830 } as const;
export const ROOM = { x: 64, y: 144, width: 832, height: 636 } as const;
export const PLAYER = {
  speed: 185,
  halfWidth: 10,
  halfHeight: 7,
  spawn: { x: 378, y: 735 },
  maxFrameSeconds: 0.1,
  collisionStep: 4,
} as const;
export const INTERACTION = { radius: 48, dwellMs: 800, panelDwellMs: 1500, messageDuration: 3200 } as const;
export const PRODUCTION = { cookingMs: 4000, stoveSlots: 4, inventory: { ingredients: 8, meals: 8, waste: 8 } } as const;
export const ECONOMY = {
  initialCoins: 30, initialIngredients: 0, initialDebt: 0, initialCash: 0,
  supplyQuantity: 10, cashPrice: 30, creditPrice: 33,
  largeSupplyQuantity: 50, largeSupplyPrice: 150, largeSupplyUnlockSpending: 500, repaymentRatio: .5, lowStockThreshold: 3,
} as const;
export const CUSTOMERS = {
  arrivalMs: 8000, dineInChance: 0.65, maxCustomers: 48,
  queueLimits: { 'dine-in': 20, takeaway: 10 },
  speed: 90, eatingMs: 6000, price: 10,
} as const;
export const CONTROLS = { dragDeadZone: 12, dragMaxDistance: 76, responseExponent: 1.25 } as const;
export const EXTERIOR = { padding: 64, treeSpacing: 170 } as const;
export const CARGO_FEEDBACK = { durationMs: 650, rise: 14 } as const;
export const CAMERA = {
  viewSize: { width: 788, height: 554 }, // Framing scale, not movement or camera bounds.
  minimumZoom: 1.15,
  zoomMultiplier: 0.85,
  headOffset: 24,
} as const;
export { PALETTE as COLORS } from './visuals/theme.ts';

export const DEMAND = {
  firstArrivalDelayMs: 8000,
  tiers: [{ spending: 0, frequency: 0.8 }, { spending: 300, frequency: 1.2 }, { spending: ECONOMY.largeSupplyUnlockSpending, frequency: 2 }, { spending: 1000, frequency: 2.4 }],
} as const;
export const COMMENTS = {
  thresholdMinMs: 10000, thresholdMaxMs: 15000, checkIntervalMs: 1000,
  participationChance: 0.65, durationMs: 2500, cooldownMs: 20000, maxVisible: 2,
  phrases: ['comment.hungry', 'comment.wait', 'comment.queue', 'comment.worth'],
} as const;
export const BULK_ORDERS = {
  introQuantities: [4, 6, 9], quantities: [6, 9], bonusRatio: .5, bonusMs: 90000, nextOfferMs: 45000, packingHintMs: 8000,
} as const;
export const DEBUG = { customerMarkers: false, maxStartingCoins: 100000 } as const;
export const STAFF = { speed: 110, cookStockTarget: 12, cookBatchSize: 4 } as const;
export const UPGRADES = {
  cook: { prices: [100, 220] },
  cleaner: { prices: [80] },
  cashier: { prices: [150] },
  transport: { enabled: false, prices: [60, 120], capacities: [8, 12, 16] },
  actionSpeed: { prices: [80, 160], durationsMs: [800, 600, 400] },
  stoveSpeed: { prices: [100, 200], durationsMs: [4000, 3000, 2000] },
  tables: { prices: [80, 140, 220, 320] },
  stove: { prices: [180] },
} as const;
export type UpgradeId = keyof typeof UPGRADES;

export const PROGRESSION = { prices: { office: 50, orders: 50 }, tablePrices: [40, 60, 80, 140, 220, 320] } as const;

export const OPENING = { initialCoins:150, firstArrivalMs:2000, saveIntervalMs:5000,
  prices:{repair:20,fridge:30,stove:40,counter:30} } as const;

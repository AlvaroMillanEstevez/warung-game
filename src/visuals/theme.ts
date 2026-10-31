// Visual tokens only. Simulation balance and world geometry stay in config/layout.
export const PALETTE = {
  background: 0xdce3d7, wall: 0xfff5e5, wallShade: 0xe8dcc8,
  floor: 0xe6d4bb, tile: 0xf0e3d0, grout: 0xd9c7af, kitchen: 0xdbe7dd,
  green: 0x267568, greenLight: 0x6ca995, greenDark: 0x194f48,
  wood: 0xc79061, woodDark: 0x926447, woodLight: 0xe9bd8d,
  cream: 0xfffcf2, ink: 0x293f39, muted: 0x62716a, shadow: 0x273f38,
  coral: 0xd87860, gold: 0xe7b95b, metal: 0xb6ccbf,
  skin: 0xdca77d, hair: 0x493b32, highlight: 0x267568,
  grass: 0xc5d3bb, grassLight: 0xd4deca, pavement: 0xe9e4d7,
  ready: 0x267568, cooking: 0xc18b39, dirty: 0xb35f4b,
} as const;
export const CHARACTER_COLORS = {
  skins: [PALETTE.skin, 0xbd835d, 0xe8b998, 0xcc9471],
  shirts: [0x8aa9b1, PALETTE.coral, 0xc4ac7c, 0x9fada0],
} as const;
export const VISUAL = {
  font: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
  heading: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
  textResolution: 3,
  stroke: { fine: 1, normal: 1.5, emphasis: 2.5 },
  radius: { small: 5, control: 12, furniture: 12, panel: 24 },
  shadow: { outer: .035, middle: .055, contact: .10 },
  depth: { exterior: -200, room: -100, floorText: -90, groundShadow: -2, marker: -.25, rearMarker: 1000, feedback: 2000 },
  marker: { checkoutOffsetY: -100, checkoutLabelOffsetY: -12, boardOffsetY: 0 },
  cargo: { side: 46, spacing: 6, baseY: -17, width: 52 },
  comment: { halfWidth: 70, top: 120, bottom: 79 },
  motion: { stride: 11, bob: 1.2, lift: 2, settleMs: 180 },
} as const;
export const cssColor = (color: number): string => '#' + color.toString(16).padStart(6, '0');
export function applyUITheme(): void {
  const root = document.documentElement.style;
  for (const [key, value] of Object.entries(PALETTE)) root.setProperty('--' + key, cssColor(value));
  root.setProperty('--font-ui', VISUAL.font);
  root.setProperty('--font-heading', VISUAL.heading);
  root.setProperty('--radius-control', VISUAL.radius.control + 'px');
  root.setProperty('--radius-panel', VISUAL.radius.panel + 'px');
  root.setProperty('--outline', VISUAL.stroke.normal + 'px');
  const shadow = cssColor(PALETTE.shadow);
  root.setProperty('--shadow-hud', '0 3px 0 ' + shadow + '10, 0 6px 16px ' + shadow + '0d');
  root.setProperty('--shadow-panel', '0 20px 70px ' + shadow + '40');
  root.setProperty('--shadow-notice', '0 6px 24px ' + shadow + '17');
  root.setProperty('--backdrop', cssColor(PALETTE.greenDark) + '6b');
  root.setProperty('--drag-border', cssColor(PALETTE.green) + '55');
  root.setProperty('--drag-fill', cssColor(PALETTE.cream) + '35');
}

import Phaser from 'phaser';
import { COLORS, WORLD } from './config';
import { RestaurantScene } from './scenes/RestaurantScene';
import './style.css';

const parent = document.querySelector<HTMLDivElement>('#game')!;
export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: WORLD.width,
  height: WORLD.height,
  backgroundColor: COLORS.background,
  antialias: true,
  // Pointer controls use DOM Pointer Events; no physics plugin or third-party joystick is needed.
  input: { keyboard: false },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [RestaurantScene],
  banner: false,
});

// Parent layout may change independently of the window (mobile browser bars, container sizing).
const observer = new ResizeObserver(() => game.scale.refresh());
observer.observe(parent);
const preventContextMenu = (event: Event): void => event.preventDefault();
parent.addEventListener('contextmenu', preventContextMenu);
const focusGame = (): void => parent.focus({ preventScroll: true });
parent.addEventListener('pointerdown', focusGame);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    observer.disconnect();
    parent.removeEventListener('contextmenu', preventContextMenu);
    parent.removeEventListener('pointerdown', focusGame);
    game.destroy(true);
  });
}

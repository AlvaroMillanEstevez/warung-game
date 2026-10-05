import Phaser from 'phaser';
import { COLORS } from './config';
import { RestaurantScene } from './scenes/RestaurantScene';
import './style.css';
import { applyUITheme } from './visuals/theme';
import { initializeLanguage } from './i18n';
applyUITheme();
const stopLocalizing = initializeLanguage();

const parent = document.querySelector<HTMLDivElement>('#game')!;
export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: parent.clientWidth,
  height: parent.clientHeight,
  backgroundColor: COLORS.floor,
  antialias: true,
  pixelArt: false,
  roundPixels: false,
  // Controls owns all DOM input, including cancellation and pointer capture.
  input: { keyboard: false, mouse: false, touch: false },
  scale: { mode: Phaser.Scale.RESIZE },
  scene: [RestaurantScene],
  banner: false,
});

// The canvas changes size; furniture coordinates and collision footprints never do.
const observer = new ResizeObserver(() => game.scale.resize(parent.clientWidth, parent.clientHeight));
observer.observe(parent);
const preventContextMenu = (event: Event): void => event.preventDefault();
parent.addEventListener('contextmenu', preventContextMenu);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopLocalizing();
    observer.disconnect();
    parent.removeEventListener('contextmenu', preventContextMenu);
    game.destroy(true);
  });
}

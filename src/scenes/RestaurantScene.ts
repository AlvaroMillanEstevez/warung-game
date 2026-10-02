import Phaser from 'phaser';
import { INTERACTION, PLAYER } from '../config';
import { Controls } from '../entities/Controls';
import { Player } from '../entities/Player';
import { Production } from '../simulation/Production';
import { DwellInteraction } from '../simulation/DwellInteraction';
import { closestStation } from '../world/interaction';
import { STATIONS } from '../world/layout';
import type { StationData } from '../world/layout';
import { frameRestaurant } from '../world/camera';
import { drawRoom } from '../world/room';
import { Station } from '../world/Station';

function setText(element: HTMLElement, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}

export class RestaurantScene extends Phaser.Scene {
  private player!: Player;
  private controls!: Controls;
  private stations: Station[] = [];
  private selected: StationData | null = null;
  private readonly production = new Production();
  private readonly dwell = new DwellInteraction();
  private messageRemainingMs = 0;
  private discardNextDelta = true;
  private readonly obstacles = STATIONS.map((station) => station.footprint);
  private readonly nameElement = document.querySelector<HTMLElement>('#station-name')!;
  private readonly hintElement = document.querySelector<HTMLElement>('#interaction-hint')!;
  private readonly messageElement = document.querySelector<HTMLElement>('#interaction-message')!;
  private readonly carriedElement = document.querySelector<HTMLElement>('#carried-status')!;
  private readonly stoveElement = document.querySelector<HTMLElement>('#stove-status')!;
  private readonly counterElement = document.querySelector<HTMLElement>('#counter-status')!;
  private readonly resetButton = document.querySelector<HTMLButtonElement>('#reset-test')!;

  constructor() { super('Restaurant'); }

  create(): void {
    drawRoom(this);
    this.stations = STATIONS.map((data) => new Station(this, data));
    this.player = new Player(this);
    this.controls = new Controls(this.game.canvas, (discardFrame) => {
      this.dwell.cancel();
      for (const station of this.stations) station.setProgress(0);
      if (discardFrame) this.discardNextDelta = true;
    });
    this.production.reset();
    this.dwell.reset();
    this.resizeCamera();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizeCamera, this);
    this.resetButton.addEventListener('click', this.resetTest);
    const cleanup = (): void => {
      this.controls.destroy();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.resizeCamera, this);
      this.resetButton.removeEventListener('click', this.resetTest);
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
    this.renderState();
  }

  update(_time: number, delta: number): void {
    if (this.controls.paused || document.hidden) {
      this.dwell.cancel();
      this.discardNextDelta = true;
      return;
    }
    // Discard the first frame after resuming. Never charge either timer for time spent hidden.
    const activeDelta = this.discardNextDelta ? 0 : Math.min(Math.max(0, delta), PLAYER.maxFrameSeconds * 1000);
    this.discardNextDelta = false;
    const previousStove = this.production.stove;
    this.production.update(activeDelta);
    if (previousStove.status === 'cooking' && this.production.stove.status === 'ready') this.showMessage('El nasi goreng está listo para recoger.');
    this.player.update(this.controls.movement, activeDelta, this.obstacles);
    this.selected = closestStation(this.player.position, STATIONS);
    const available = this.selected ? this.production.availableAt(this.selected.kind) : null;
    const inside = STATIONS.filter((station) => station.kind !== 'table' &&
      Math.hypot(this.player.position.x - station.interaction.x, this.player.position.y - station.interaction.y) <= INTERACTION.radius).map((station) => station.id);
    const command = this.dwell.update(
      this.selected ? { id: this.selected.id, action: available?.action ?? null } : null,
      inside, this.controls.tryingToMove, activeDelta,
    );
    if (command) {
      // Production rechecks source/destination at commit time. No separate keyboard/touch action path.
      const message = this.production.perform(command);
      if (message) this.showMessage(message);
    }
    if (this.messageRemainingMs > 0) {
      this.messageRemainingMs = Math.max(0, this.messageRemainingMs - activeDelta);
      this.messageElement.hidden = this.messageRemainingMs === 0;
    }
    this.renderState();
  }

  private readonly resetTest = (): void => {
    this.controls.reset();
    this.production.reset();
    this.dwell.reset();
    this.selected = null;
    Object.assign(this.player.position, PLAYER.spawn);
    this.player.update({ x: 0, y: 0 }, 0, this.obstacles);
    this.resizeCamera();
    this.showMessage('Prueba reiniciada: manos, hornillo y mostrador vacíos.');
    this.renderState();
    document.querySelector<HTMLElement>('#game')!.focus({ preventScroll: true });
  };

  private resizeCamera(): void {
    if (!this.player) return;
    this.controls.reset();
    frameRestaurant(this.cameras.main, this.scale.width, this.scale.height, this.player.position);
  }

  private showMessage(message: string): void {
    setText(this.messageElement, message);
    this.messageElement.hidden = false;
    this.messageRemainingMs = INTERACTION.messageDuration;
  }

  private renderState(): void {
    this.player.setCarried(this.production.carried);
    for (const station of this.stations) {
      station.setSelected(station.data === this.selected);
      station.setProgress(station.data === this.selected ? this.dwell.progress : 0);
      station.showProduction(this.production);
    }
    setText(this.carriedElement, this.production.carried === 'ingredients' ? 'Ingredientes' : this.production.carried === 'meal' ? 'Nasi goreng' : 'Vacías');
    const state = this.production.stove;
    setText(this.stoveElement, state.status === 'empty' ? 'Vacío' : state.status === 'ready' ? '¡Listo!' :
      'Cocinando · ' + Math.max(0, (this.production.cookingMs - state.elapsedMs) / 1000).toFixed(1) + ' s');
    this.stoveElement.parentElement!.classList.toggle('ready', state.status === 'ready');
    setText(this.counterElement, this.production.portions + ' / ' + this.production.capacity + (this.production.complete ? ' · completo' : ''));
    this.counterElement.parentElement!.classList.toggle('ready', this.production.complete);
    const selected = this.selected;
    const available = selected ? this.production.availableAt(selected.kind) : null;
    let hint: string;
    if (available && !available.action) hint = available.reason;
    else if (selected && this.dwell.needsExit(selected.id)) hint = 'Sal de la zona y vuelve para realizar otra acción.';
    else if (available?.action) hint = available.label + ' · quédate quieto ' + INTERACTION.dwellMs / 1000 + ' s.';
    else hint = this.production.complete ? 'Mostrador lleno. Circuito de prueba completado.' :
      (matchMedia('(pointer: coarse)').matches ? 'Arrastra para moverte; quédate quieto junto a una estación.' : 'WASD o flechas para moverte; quédate quieto junto a una estación.');
    setText(this.nameElement, selected?.name ?? (this.production.complete ? '¡Primera tanda completada!' : 'Frigorífico → hornillo → mostrador'));
    setText(this.hintElement, hint);
  }
}

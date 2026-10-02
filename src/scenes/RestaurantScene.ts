import Phaser from 'phaser';
import { INTERACTION } from '../config';
import { Controls } from '../entities/Controls';
import { Player } from '../entities/Player';
import { closestStation } from '../world/interaction';
import { STATIONS } from '../world/layout';
import type { StationData } from '../world/layout';
import { drawRoom } from '../world/room';
import { Station } from '../world/Station';

export class RestaurantScene extends Phaser.Scene {
  private player!: Player;
  private controls!: Controls;
  private stations: Station[] = [];
  private selected: StationData | null = null;
  private messageTimer: Phaser.Time.TimerEvent | null = null;
  private readonly obstacles = STATIONS.map((station) => station.footprint);
  private readonly nameElement = document.querySelector<HTMLElement>('#station-name')!;
  private readonly hintElement = document.querySelector<HTMLElement>('#interaction-hint')!;
  private readonly messageElement = document.querySelector<HTMLElement>('#interaction-message')!;
  private readonly button = document.querySelector<HTMLButtonElement>('#interact-button')!;

  constructor() { super('Restaurant'); }

  create(): void {
    drawRoom(this);
    this.stations = STATIONS.map((data) => new Station(this, data));
    this.player = new Player(this);
    this.controls = new Controls();
    this.selected = null;
    this.showSelection();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.controls.destroy();
      this.messageTimer?.remove();
    });
  }

  update(_time: number, delta: number): void {
    this.player.update(this.controls.movement, this.controls.paused ? 0 : delta, this.obstacles);
    const nearest = closestStation(this.player.position, STATIONS);
    if (nearest !== this.selected) {
      this.selected = nearest;
      this.showSelection();
    }
    if (this.controls.consumeInteraction() && this.selected) {
      this.messageTimer?.remove();
      this.messageElement.textContent = this.selected.name + ': interacción preparada';
      this.messageElement.classList.add('success');
      this.messageTimer = this.time.delayedCall(INTERACTION.messageDuration, () => {
        this.messageElement.textContent = 'Sigue explorando. Cada estación tiene su lugar.';
        this.messageElement.classList.remove('success');
      });
    }
  }

  private showSelection(): void {
    for (const station of this.stations) station.setSelected(station.data === this.selected);
    this.nameElement.textContent = this.selected?.name ?? 'Conoce tu warung';
    this.hintElement.textContent = this.selected ? 'Pulsa E o toca Interactuar para probar.' : 'Acércate a los puntos junto a los muebles.';
    this.button.disabled = this.selected === null;
    this.button.setAttribute('aria-label', this.selected ? 'Interactuar con ' + this.selected.name : 'Acércate a una estación para interactuar');
  }
}

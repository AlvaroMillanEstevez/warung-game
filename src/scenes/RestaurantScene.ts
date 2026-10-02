import Phaser from 'phaser';
import { INTERACTION, PLAYER } from '../config';
import { Controls } from '../entities/Controls';
import { Player } from '../entities/Player';
import { CustomerView } from '../entities/CustomerView';
import { Restaurant, actionKey } from '../simulation/Restaurant';
import type { Offer, RestaurantAction } from '../simulation/Restaurant';
import { DwellInteraction } from '../simulation/DwellInteraction';
import { closestZone } from '../world/interaction';
import { INTERACTION_ZONES, STATIONS } from '../world/layout';
import type { InteractionZone } from '../world/layout';
import { frameRestaurant } from '../world/camera';
import { drawRoom } from '../world/room';
import { Station } from '../world/Station';
import { InteractionMarker } from '../world/InteractionMarker';

function setText(element: HTMLElement, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}

export class RestaurantScene extends Phaser.Scene {
  private player!: Player;
  private controls!: Controls;
  private stations: Station[] = [];
  private markers: InteractionMarker[] = [];
  private readonly customerViews = new Map<string, CustomerView>();
  private selected: InteractionZone | null = null;
  private pending: { zoneId: string; command: RestaurantAction; label: string } | null = null;
  private readonly restaurant = new Restaurant();
  private readonly dwell = new DwellInteraction();
  private messageRemainingMs = 0;
  private discardNextDelta = true;
  private readonly obstacles = STATIONS.map(station => station.footprint);
  private readonly nameElement = document.querySelector<HTMLElement>('#station-name')!;
  private readonly hintElement = document.querySelector<HTMLElement>('#interaction-hint')!;
  private readonly messageElement = document.querySelector<HTMLElement>('#interaction-message')!;
  private readonly carriedElement = document.querySelector<HTMLElement>('#carried-status')!;
  private readonly stoveElement = document.querySelector<HTMLElement>('#stove-status')!;
  private readonly counterElement = document.querySelector<HTMLElement>('#counter-status')!;
  private readonly moneyElement = document.querySelector<HTMLElement>('#money-status')!;
  private readonly queueElement = document.querySelector<HTMLElement>('#queue-status')!;
  private readonly resetButton = document.querySelector<HTMLButtonElement>('#reset-test')!;

  constructor() { super('Restaurant'); }

  create(): void {
    drawRoom(this);
    this.stations = STATIONS.map(data => new Station(this, data));
    this.markers = INTERACTION_ZONES.map(data => new InteractionMarker(this, data));
    this.player = new Player(this);
    this.controls = new Controls(this.game.canvas, discardFrame => {
      this.cancelInteraction();
      if (discardFrame) this.discardNextDelta = true;
    });
    this.restaurant.reset();
    this.dwell.reset();
    this.resizeCamera();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizeCamera, this);
    this.resetButton.addEventListener('click', this.resetTest);
    const cleanup = (): void => {
      this.controls.destroy();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.resizeCamera, this);
      this.resetButton.removeEventListener('click', this.resetTest);
      this.customerViews.clear();
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
    this.renderState();
  }

  update(_time: number, delta: number): void {
    if (this.controls.paused || document.hidden) {
      this.cancelInteraction();
      this.discardNextDelta = true;
      return;
    }
    // Every restaurant timer receives only active time, including arrivals and consumption.
    const activeDelta = this.discardNextDelta ? 0 : Math.min(Math.max(0, delta), PLAYER.maxFrameSeconds * 1000);
    this.discardNextDelta = false;
    const previousReady = this.restaurant.production.stoveSummary.ready;
    this.restaurant.update(activeDelta);
    if (this.restaurant.production.stoveSummary.ready > previousReady) this.showMessage('El nasi goreng está listo para recoger.');
    this.player.update(this.controls.movement, activeDelta, this.obstacles);
    this.selected = closestZone(this.player.position, INTERACTION_ZONES, this.obstacles);
    if (this.pending && (this.pending.zoneId !== this.selected?.id || this.controls.tryingToMove ||
        this.restaurant.validate(this.pending.command))) {
      this.pending = null;
      this.dwell.cancel();
    }
    if (!this.pending && this.selected && !this.controls.tryingToMove) {
      const offer = this.restaurant.offer(this.selected);
      if (offer.command) this.pending = { zoneId: this.selected.id, command: offer.command, label: offer.label };
    }
    // The command (including the exact customer/table) stays fixed throughout the dwell.
    // Invalid commands lose all progress before a fresh command is selected.
    const valid = this.pending && !this.restaurant.validate(this.pending.command);
    const inside = INTERACTION_ZONES.filter(zone =>
      Math.hypot(this.player.position.x - zone.position.x, this.player.position.y - zone.position.y) <= INTERACTION.radius).map(zone => zone.id);
    const completed = this.dwell.update(
      this.selected ? { id: this.selected.id, action: valid ? actionKey(this.pending!.command) : null } : null,
      inside, this.controls.tryingToMove, activeDelta,
    );
    if (completed && this.pending) {
      const message = this.restaurant.perform(this.pending.command);
      if (message) this.showMessage(message);
      this.pending = null;
    }
    if (this.messageRemainingMs > 0) {
      this.messageRemainingMs = Math.max(0, this.messageRemainingMs - activeDelta);
      this.messageElement.hidden = this.messageRemainingMs === 0;
    }
    this.renderState();
  }

  private cancelInteraction(): void {
    this.pending = null;
    this.dwell.cancel();
    for (const marker of this.markers) marker.update(false, 0);
  }

  private readonly resetTest = (): void => {
    this.controls.reset();
    this.restaurant.reset();
    this.dwell.reset();
    this.pending = null;
    this.selected = null;
    this.discardNextDelta = true;
    Object.assign(this.player.position, PLAYER.spawn);
    this.player.update({ x: 0, y: 0 }, 0, this.obstacles);
    this.resizeCamera();
    this.showMessage('Restaurante reiniciado. Todo listo para empezar.');
    this.renderState();
    document.querySelector<HTMLElement>('#game')!.focus({ preventScroll: true });
  };

  private resizeCamera(): void {
    if (!this.player) return;
    this.controls.reset();
    frameRestaurant(this.cameras.main, this.scale.width, this.scale.height, this.player.position);
  }

  private showMessage(message: string): void {
    if (!this.messageElement.hidden && this.messageElement.textContent === message) return;
    setText(this.messageElement, message);
    this.messageElement.hidden = false;
    this.messageRemainingMs = INTERACTION.messageDuration;
  }

  private currentOffer(): Offer | null {
    if (!this.selected) return null;
    if (!this.pending) return this.restaurant.offer(this.selected);
    const problem = this.restaurant.validate(this.pending.command);
    return problem ? { command: null, reason: problem } :
      { command: this.pending.command, label: this.pending.label };
  }

  private renderState(): void {
    const restaurant = this.restaurant;
    const production = restaurant.production;
    this.player.setInventory(production.inventory);
    for (const station of this.stations) {
      station.setSelected(station.data.id === this.selected?.stationId);
      station.showState(restaurant);
    }
    for (const marker of this.markers) marker.update(marker.zone === this.selected, marker.zone === this.selected ? this.dwell.progress : 0);
    const customers = restaurant.customers;
    const live = new Set(customers.map(customer => customer.id));
    for (const [id, view] of this.customerViews) if (!live.has(id)) { view.destroy(); this.customerViews.delete(id); }
    for (const customer of customers) {
      let view = this.customerViews.get(customer.id);
      if (!view) { view = new CustomerView(this, customer); this.customerViews.set(customer.id, view); }
      view.update(customer);
    }
    const inventory = production.inventory;
    const assigned = inventory.orderMeals.map(id => {
      const order = restaurant.order(id)!;
      return '#' + order.number + '→M' + order.tableId!.slice(-1);
    }).join(', ');
    setText(this.carriedElement, 'Ingredientes ' + inventory.ingredients + '/' + inventory.limits.ingredients +
      ' · Platos ' + inventory.meals + '/' + inventory.limits.meals +
      ' · Residuos ' + inventory.waste + '/' + inventory.limits.waste + (assigned ? ' · ' + assigned : ''));
    const state = production.stoveSummary;
    setText(this.stoveElement, state.cooking + ' cocinando · ' + state.ready + ' listas');
    this.stoveElement.parentElement!.classList.toggle('ready', state.ready > 0);
    setText(this.counterElement, production.availablePortions + ' libre · ' + production.reservedPortions + ' reserv.');
    this.counterElement.parentElement!.classList.toggle('ready', production.availablePortions > 0);
    setText(this.moneyElement, restaurant.money + ' monedas');
    setText(this.queueElement, 'En fila · aquí ' + restaurant.queue('dine-in').length + ' · llevar ' + restaurant.queue('takeaway').length);
    const available = this.currentOffer();
    let hint: string;
    if (available && !available.command) hint = available.reason;
    else if (available?.command) hint = available.label + ' · quédate quieto ' + INTERACTION.dwellMs / 1000 + ' s.';
    else hint = matchMedia('(pointer: coarse)').matches ? 'Arrastra para moverte; quédate quieto en los puntos de acción.' : 'WASD o flechas; quédate quieto en los puntos de acción.';
    setText(this.nameElement, this.selected?.name ?? 'Cocina · cobra · sirve · limpia');
    setText(this.hintElement, hint);
  }
}

import { SessionPanel } from '../ui/SessionPanel';
import { TutorialView } from '../world/TutorialView';
import { LocalSave } from '../persistence/Save';
import type { SaveData } from '../persistence/Save';
import type { BuildId } from '../simulation/Opening';
import Phaser from 'phaser';
import { i18n, t } from '../i18n';
import type { Message } from '../i18n';
import { INTERACTION, PLAYER } from '../config';
import { PALETTE as C, VISUAL as V, cssColor } from '../visuals/theme';
import { label } from '../visuals/drawing';
import { advancedSession, startingCoins } from '../dev/startup';
import { Controls } from '../entities/Controls';
import { Player } from '../entities/Player';
import { EmployeeView } from '../entities/EmployeeView';
import { CustomerView } from '../entities/CustomerView';
import { UpgradePanel } from '../ui/UpgradePanel';
import { SupplierPanel } from '../ui/SupplierPanel';
import { OrderPanel } from '../ui/OrderPanel';
import { OrderView } from '../world/OrderView';
import { DebugPanel } from '../ui/DebugPanel';
import { Restaurant, actionKey } from '../simulation/Restaurant';
import type { RestaurantAction } from '../simulation/Restaurant';
import { DwellInteraction } from '../simulation/DwellInteraction';
import { canInteract, closestZone } from '../world/interaction';
import type { InteractionZone } from '../world/layout';
import { frameRestaurant } from '../world/camera';
import { drawExterior, drawRoom } from '../world/room';
import { Station } from '../world/Station';
import { InteractionMarker } from '../world/InteractionMarker';

export class RestaurantScene extends Phaser.Scene {
  private player!: Player;
  private session!: SessionPanel;
  private tutorial!: TutorialView;
  private roomObjects:Phaser.GameObjects.GameObject[]=[];
  private roomKey='';
  private layoutKey='';
  private specialNeedsExit:string|null=null;
  private saved:SaveData|null=null;
  private readyToSave=false;
  private readonly advanced=advancedSession(location.search,location.hostname,import.meta.env.DEV);
  private readonly saveStore=new LocalSave(()=>window.localStorage,this.advanced?'advanced':'opening');
  private exterior!: Phaser.GameObjects.Graphics;
  private controls!: Controls;
  private upgrades!: UpgradePanel;
  private debug!: DebugPanel;
  private ordersPanel!: OrderPanel;
  private supplierPanel!: SupplierPanel;
  private orderView!: OrderView;
  private notice!: Phaser.GameObjects.Text;
  private stations: Station[] = [];
  private markers: InteractionMarker[] = [];
  private readonly customerViews = new Map<string, CustomerView>();
  private readonly employeeViews = new Map<string, EmployeeView>();
  private selected: InteractionZone | null = null;
  private pending: { zoneId: string; command: RestaurantAction } | null = null;
  private readonly restaurant = new Restaurant({}, Math.random, startingCoins(location.search, location.hostname, import.meta.env.DEV),this.advanced?'advanced':'opening');
  private readonly dwell = new DwellInteraction();
  private messageRemainingMs = 0;
  private noticeMessage: Message | null = null;
  private lastContext = '';
  private discardNextDelta = true;
  private officeNeedsExit = false;
  private boardNeedsExit = false;
  private supplierNeedsExit = false;
  private get obstacles() { return this.restaurant.obstacles; }
  private readonly moneyElement = document.querySelector<HTMLElement>('#money-status')!;
  private readonly resetButton = document.querySelector<HTMLButtonElement>('#reset-test')!;

  constructor() { super('Restaurant'); }

  create(): void {
    this.restaurant.reset(); this.officeNeedsExit = false; this.boardNeedsExit = false; this.supplierNeedsExit = false;
    this.exterior = this.add.graphics().setDepth(V.depth.exterior);
    this.redrawRoom();
    this.orderView = new OrderView(this);this.orderView.setVisible(this.advanced);
    this.tutorial=new TutorialView(this);
    this.syncLayout();
    this.player = new Player(this);
    this.notice = label(this, 0, 0, '', 11, C.cream).setStyle({
      backgroundColor: cssColor(C.greenDark), padding: { x: 9, y: 6 },
      wordWrap: { width: 180 }, align: 'center' }).setOrigin(.5, 1).setDepth(V.depth.feedback).setVisible(false);
    this.controls = new Controls(this.game.canvas, discardFrame => {
      this.cancelInteraction();
      if (discardFrame) this.discardNextDelta = true;
    });
    const onToggle = (open: boolean): void => {
      this.controls.setBlocked(open); this.cancelInteraction(); this.discardNextDelta = true;
      if (open) this.orderView.hideDirection();
      this.tutorial.update(this.restaurant,this.cameras.main,open);
    };
    this.upgrades = new UpgradePanel(this.restaurant, () => this.player.position, onToggle, () => {
      this.syncLayout();this.redrawRoom();
      if (this.restaurant.takeDemandNotice()) this.showMessage('notice.demand');
      if (this.restaurant.takeBulkUnlockedNotice()) this.showMessage('bulk.unlocked');
      this.renderState();this.persist(true);
    });
    this.ordersPanel = new OrderPanel(this.restaurant, onToggle, accepted => {
      if (accepted && this.restaurant.bulkOrders.guidance === 'packing') this.showMessage('bulk.packingHint');
      this.renderState();this.persist(true);
    });
    this.supplierPanel = new SupplierPanel(this.restaurant, onToggle, () => {this.renderState();this.persist(true);});
    this.session=new SessionPanel(this.restaurant,()=>this.player.position,onToggle,()=>{
      if(this.specialNeedsExit==='build-office'&&this.restaurant.progression.office)this.officeNeedsExit=true;
      if(this.specialNeedsExit==='build-orders'&&this.restaurant.progression.orders)this.boardNeedsExit=true;
      this.syncLayout();this.redrawRoom();this.renderState();this.persist(true);},()=>{
      this.resetInternal();this.readyToSave=true;this.reportSave(this.saveStore.replaceConfirmed(this.restaurant,this.player.position));
      if(!this.advanced)this.session.show('intro');
    },()=>{
      if(!this.saved)return;this.restaurant.restore(this.saved.restaurant);Object.assign(this.player.position,this.saved.player);
      this.player.update({x:0,y:0},0,this.obstacles);this.syncLayout();this.redrawRoom();this.resizeCamera();this.renderState();
      this.readyToSave=true;this.saved=null;if(!this.advanced&&!this.restaurant.opening.introSeen)this.session.show('intro');
    },import.meta.env.DEV);
    document.querySelector('#session-menu')!.addEventListener('click',this.openSettings);
    document.addEventListener('visibilitychange',this.backgroundSave);window.addEventListener('pagehide',this.backgroundSave);
    this.debug = new DebugPanel(this.restaurant, onToggle);
    this.resizeCamera();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizeCamera, this);
    this.resetButton.addEventListener('click', this.resetTest);
    const unsubscribeLanguage = i18n.subscribe(() => {
      if (this.noticeMessage) this.notice.setText(t(this.noticeMessage));
      this.player.refreshLanguage();
      this.renderState();this.persist(true);
    });
    const cleanup = (): void => {
      this.persist(true);unsubscribeLanguage();this.session.destroy();this.tutorial.destroy();
      document.querySelector('#session-menu')!.removeEventListener('click',this.openSettings);
      document.removeEventListener('visibilitychange',this.backgroundSave);window.removeEventListener('pagehide',this.backgroundSave);
      this.upgrades.destroy(); this.ordersPanel.destroy(); this.supplierPanel.destroy(); this.orderView.destroy(); this.debug.destroy(); this.controls.destroy();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.resizeCamera, this);
      this.resetButton.removeEventListener('click', this.resetTest);
      this.customerViews.clear(); this.employeeViews.clear(); this.stations = []; this.markers = [];
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
    this.renderState();
    const loaded=this.saveStore.load();
    if(loaded.kind==='valid'){this.saved=loaded.data;this.session.show('continue');}
    else if(loaded.kind==='invalid')this.session.show('invalid');
    else {this.readyToSave=true;if(loaded.kind==='unavailable')this.reportSave(false);else this.persist(true);
      if(!this.advanced)this.session.show('intro');}
  }

  update(_time: number, delta: number): void {
    if (this.controls.paused || document.hidden || this.upgrades.isOpen || this.ordersPanel.isOpen || this.supplierPanel.isOpen || this.debug.isOpen || this.session.isOpen) {
      this.cancelInteraction(); this.orderView.hideDirection(); this.discardNextDelta = true; return;
    }
    const activeDelta = this.discardNextDelta ? 0 : Math.min(Math.max(0, delta), PLAYER.maxFrameSeconds * 1000);
    this.discardNextDelta = false;
    this.messageRemainingMs = Math.max(0, this.messageRemainingMs - activeDelta);
    this.notice.setVisible(this.messageRemainingMs > 0);
    const economyBefore=this.economyKey();
    this.restaurant.update(activeDelta);
    const beforeMovement = { ...this.player.position };
    this.player.update(this.controls.movement, activeDelta, this.obstacles);
    this.restaurant.playerMoved(beforeMovement, this.player.position);
    this.selected = closestZone(this.player.position, this.restaurant.interactionZones, this.obstacles);
    if (this.pending && (this.pending.zoneId !== this.selected?.id || this.controls.tryingToMove ||
        this.restaurant.validate(this.pending.command))) this.cancelInteraction();
    const inside = this.restaurant.interactionZones.filter(zone => canInteract(this.player.position, zone, this.obstacles)).map(zone => zone.id);
    if(this.specialNeedsExit&&!inside.includes(this.specialNeedsExit))this.specialNeedsExit=null;
    if (!inside.includes('office')) this.officeNeedsExit = false;
    if (!inside.includes('board')) this.boardNeedsExit = false;
    if (!inside.includes('supplier')) this.supplierNeedsExit = false;
    const special=this.selected?.role==='construction'||this.selected?.role==='opening';
    const office = this.selected?.role === 'office', board = this.selected?.role === 'board', supplier = this.selected?.role === 'supplier';
    if (this.selected?.role === 'packing') this.restaurant.bulkOrders.visitPacking();
    if (!this.pending && this.selected && !office && !board && !supplier && !special && !this.controls.tryingToMove) {
      const offer = this.restaurant.offer(this.selected);
      if (offer.command && this.restaurant.beginAction(offer.command))
        this.pending = { zoneId: this.selected.id, command: offer.command };
      const context = this.selected.id + ':' + (offer.command ? '' : offer.reason);
      if (context !== this.lastContext && !offer.command && this.messageRemainingMs === 0) this.showMessage(offer.reason);
      this.lastContext = context;
    }
    if (!this.selected) this.lastContext = '';
    const valid = this.pending && !this.restaurant.validate(this.pending.command);
    const completed = this.dwell.update(
      this.selected ? { id: this.selected.id, action: special && this.selected.id!==this.specialNeedsExit ? this.selected.role==='construction'?'build':'open-business' : supplier && !this.supplierNeedsExit ? 'open-supplier' : office && !this.officeNeedsExit ? 'open-upgrades' : board && !this.boardNeedsExit ? 'open-orders' : valid ? actionKey(this.pending!.command) : null } : null,
      inside, this.controls.tryingToMove, activeDelta, office || board || supplier || special ? INTERACTION.panelDwellMs : this.restaurant.teamActionMs,
    );
    if(completed==='build'&&this.selected){this.specialNeedsExit=this.selected.id;this.session.show('build',this.selected.id.slice(6) as BuildId);return;}
    if(completed==='open-business'){this.specialNeedsExit='open-business';if(this.restaurant.openBusiness()){this.showMessage('opening.opened');this.persist(true);}this.syncLayout();}
    if (completed === 'open-supplier') {
      this.supplierNeedsExit = true; this.supplierPanel.open(); this.renderState(); return;
    }
    if (completed === 'open-orders') {
      this.boardNeedsExit = true;
      if (this.restaurant.bulkOrders.state.phase === 'locked') this.showMessage('bulk.locked');
      else this.ordersPanel.open();
      this.renderState(); return;
    }
    if (completed === 'open-upgrades') {
      this.officeNeedsExit = true;
      this.upgrades.open(); this.renderState(); return;
    }
    if (completed && this.pending) {
      const before = this.restaurant.production.inventory;
      const command = this.pending.command, result = this.restaurant.perform(command);
      this.player.showTransfer(before, this.restaurant.production.inventory);
      if (result && command.kind === 'collect-cash') this.showMessage(result);
      if (result && command.kind === 'pack' && this.restaurant.bulkOrders.state.phase === 'ready') this.showMessage(result);
      this.pending = null;this.persist(true);
    }
    if (this.messageRemainingMs === 0) {
      const notice = this.restaurant.takeDemandNotice() ? 'notice.demand' : this.restaurant.takeBulkUnlockedNotice() ? 'bulk.unlocked' : this.restaurant.takeEconomyNotice();
      if (notice) { this.showMessage(notice); this.persist(true); }
    }
    const camera = this.cameras.main.worldView;
    const loads = [this.player.cargoBounds, ...this.restaurant.staff.employees.map(worker => {
      const height = Math.max(0, ...Object.values(worker.inventory.state).filter((n): n is number => typeof n === 'number')) * V.cargo.spacing;
      return height ? { x: worker.position.x + V.cargo.side - V.cargo.width / 2, y: worker.position.y + V.cargo.baseY - height, width: V.cargo.width, height: height + 12 } : null;
    })].filter(rect => rect !== null);
    const visible = new Set(this.restaurant.customers.filter(c =>
      c.position.x > camera.x + V.comment.halfWidth && c.position.x < camera.right - V.comment.halfWidth &&
      c.position.y > camera.y + V.comment.top && c.position.y < camera.bottom &&
      !loads.some(rect => c.position.x + V.comment.halfWidth > rect.x && c.position.x - V.comment.halfWidth < rect.x + rect.width &&
        c.position.y - V.comment.bottom > rect.y && c.position.y - V.comment.top < rect.y + rect.height)).map(c => c.id));
    this.restaurant.comments.update(this.restaurant.elapsedMs, this.restaurant.customers, visible);
    this.syncLayout();this.renderState();
    this.persist(economyBefore!==this.economyKey(),activeDelta);
  }
  private economyKey():string {const r=this.restaurant;return [r.money,r.pendingCash,r.supplierDebt,r.totalSpent,r.bulkOrders.state.phase].join(':');}
  private reportSave(result:boolean|null):void {if(result!==null)document.querySelector<HTMLElement>('#save-warning')!.hidden=result;}
  private persist(force=false,delta=0):void {if(this.readyToSave&&this.player)this.reportSave(this.saveStore.write(this.restaurant,this.player.position,force,delta));}
  private readonly backgroundSave=():void=>{this.persist(true);};
  private readonly openSettings=():void=>{if(!document.querySelector('dialog[open]')){this.persist(true);this.session.show('settings');}};
  private redrawRoom():void {
    const key=[this.restaurant.mode,this.restaurant.opening.repaired,this.restaurant.progression.office,this.restaurant.tableCount>0].join(':');if(key===this.roomKey)return;this.roomKey=key;
    for(const object of this.roomObjects)object.destroy();const before=new Set(this.children.list);
    drawRoom(this,this.restaurant.progression.office,this.restaurant.opening.repaired,this.restaurant.tableCount>0);this.roomObjects=this.children.list.filter(o=>!before.has(o));
  }

  private cancelInteraction(): void {
    this.restaurant.cancelAction(); this.pending = null; this.dwell.cancel();
    for (const marker of this.markers) marker.update(false, 0);
  }
  private readonly resetTest=():void=>{if(this.advanced){this.resetInternal();this.readyToSave=true;this.reportSave(this.saveStore.replaceConfirmed(this.restaurant,this.player.position));}
    else {this.debug.close();this.session.show('new');}};
  private readonly resetInternal = (): void => {
    this.upgrades.close(); this.ordersPanel.close(); this.supplierPanel.close(); this.debug.close(); this.controls.reset(); this.restaurant.reset();
    this.specialNeedsExit=null;this.syncLayout();this.redrawRoom(); this.player.clearFeedback(); this.dwell.reset();
    this.pending = null; this.selected = null; this.lastContext = ''; this.discardNextDelta = true; this.officeNeedsExit = false; this.boardNeedsExit = false; this.supplierNeedsExit = false;
    this.messageRemainingMs = 0; this.noticeMessage = null; this.notice.setVisible(false);
    Object.assign(this.player.position, PLAYER.spawn);
    this.player.update({ x: 0, y: 0 }, 0, this.obstacles);
    this.resizeCamera(); this.renderState();
    document.querySelector<HTMLElement>('#game')!.focus({ preventScroll: true });
  };
  private resizeCamera(): void {
    if (!this.player) return;
    this.controls.reset();
    drawExterior(this.exterior, frameRestaurant(this.cameras.main, this.scale.width, this.scale.height, this.player.position));
  }
  private showMessage(message: Message): void {
    this.noticeMessage = message;
    this.notice.setText(t(message)).setVisible(true); this.messageRemainingMs = INTERACTION.messageDuration;
  }
  private syncLayout(): void {
    const key=this.restaurant.stations.map(s=>s.id).join(',')+'|'+this.restaurant.interactionZones.map(z=>z.id).join(',');
    if(key===this.layoutKey)return;this.layoutKey=key;
    this.cancelInteraction(); this.selected = null;
    for (const station of this.stations) station.destroy();
    for (const marker of this.markers) marker.destroy();
    this.stations = this.restaurant.stations.map(data => new Station(this, data));
    this.markers = this.restaurant.interactionZones.map(data => new InteractionMarker(this, data));
  }
  private renderState(): void {
    const r = this.restaurant;
    this.ordersPanel?.update();
    this.orderView.setVisible(r.progression.orders);
    if(r.progression.orders)this.orderView.update(r.bulkOrders, this.cameras.main, this.controls.dragging || this.controls.paused || document.hidden ||
      this.upgrades.isOpen || this.ordersPanel.isOpen || this.supplierPanel.isOpen || this.debug.isOpen || this.session?.isOpen);
    this.tutorial.update(r,this.cameras.main,this.controls.dragging||this.controls.paused||!!document.querySelector('dialog[open]'));
    this.player.setInventory(r.production.inventory);
    this.notice?.setPosition(this.player.position.x, this.player.position.y - Math.max(100, this.player.cargoHeight + 58));
    for (const station of this.stations) {
      station.setSelected(station.data.id === this.selected?.stationId); station.showState(r);
    }
    for (const marker of this.markers) marker.update(marker.zone.id === this.selected?.id, marker.zone.id === this.selected?.id ? this.dwell.progress : 0);
    const live = new Set(r.customers.map(c => c.id));
    for (const [id, view] of this.customerViews) if (!live.has(id)) { view.destroy(); this.customerViews.delete(id); }
    for (const customer of r.customers) {
      let view = this.customerViews.get(customer.id);
      if (!view) { view = new CustomerView(this, customer); this.customerViews.set(customer.id, view); }
      const comment = r.comments.text(customer.id);
      view.update(customer, comment ? t(comment) : null);
    }
    const staffIds = new Set<string>(r.staff.employees.map(w => w.id));
    for (const [id, view] of this.employeeViews) if (!staffIds.has(id)) { view.destroy(); this.employeeViews.delete(id); }
    for (const worker of r.staff.employees) {
      let view = this.employeeViews.get(worker.id);
      if (!view) { view = new EmployeeView(this, worker); this.employeeViews.set(worker.id, view); }
      view.update(worker);
    }
    const money = t('app.money', { count: r.money });
    if (this.moneyElement.textContent !== money) this.moneyElement.textContent = money;
  }
}

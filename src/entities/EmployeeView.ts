import Phaser from 'phaser';
import { COLORS as C, STAFF } from '../config';
import type { Employee } from '../simulation/Staff';

export class EmployeeView {
  private readonly visual: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly cargo: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  constructor(scene: Phaser.Scene, worker: Employee) {
    const cook = worker.id === 'cook';
    const body = scene.add.graphics();
    body.fillStyle(C.greenDark).fillRoundedRect(-10, -12, 8, 14, 3).fillRoundedRect(2, -12, 8, 14, 3);
    body.fillStyle(cook ? C.cream : 0x82afaa).fillRoundedRect(-16, -31, 32, 24, 8);
    body.fillStyle(cook ? C.gold : C.green).fillRoundedRect(-10, -28, 20, 23, 3);
    body.fillStyle(C.skin).fillCircle(0, -39, 12).fillCircle(-17, -15, 4).fillCircle(17, -15, 4);
    body.fillStyle(C.hair).fillEllipse(0, -47, 26, 13).fillCircle(-4, -39, 1.5).fillCircle(4, -39, 1.5);
    body.fillStyle(cook ? C.cream : 0x82afaa).fillRoundedRect(-14, -54, 28, 9, 4);
    if (cook) body.fillCircle(-7, -56, 7).fillCircle(3, -58, 8).fillCircle(10, -55, 6);
    this.cargo = scene.add.graphics();
    this.label = scene.add.text(0, -70, '', { fontFamily: 'Arial, sans-serif', fontSize: '10px',
      color: '#244a40', backgroundColor: '#fff7e7e8', padding: { x: 4, y: 3 }, align: 'center' }).setOrigin(0.5, 1);
    this.visual = scene.add.container(worker.position.x, worker.position.y, [body, this.cargo, this.label]);
    this.shadow = scene.add.ellipse(worker.position.x, worker.position.y + 2, 32, 13, C.shadow, 0.17).setDepth(-1);
  }
  update(worker: Employee): void {
    this.visual.setPosition(worker.position.x, worker.position.y).setDepth(worker.position.y);
    this.shadow.setPosition(worker.position.x, worker.position.y + 2);
    const inventory = worker.inventory.state;
    const cook = worker.id === 'cook';
    const progress = worker.task && worker.route.length === 0 ? worker.task.elapsedMs / STAFF.actionMs : 0;
    const g = this.cargo;
    g.clear();
    for (let i = 0; i < inventory.ingredients; i++) g.fillStyle(C.woodLight).fillRoundedRect(20, -12 - i * 6, 12, 7, 2);
    for (let i = 0; i < inventory.meals; i++) g.fillStyle(C.cream).fillEllipse(35, -13 - i * 4, 17, 8);
    for (let i = 0; i < inventory.waste; i++) g.fillStyle(C.greenDark).fillRoundedRect(22, -12 - i * 6, 12, 8, 3);
    if (progress > 0) {
      g.fillStyle(C.cream).fillRoundedRect(-20, 8, 40, 5, 2);
      g.fillStyle(C.highlight).fillRect(-18, 9, 36 * Math.min(1, progress), 3);
    }
    const cargo = cook ? 'I ' + inventory.ingredients + '/' + STAFF.capacity + ' · P ' + inventory.meals + '/' + STAFF.capacity : 'R ' + inventory.waste + '/' + STAFF.capacity;
    this.label.setText((cook ? 'Cocinero' : 'Limpieza') + ' · ' + cargo);
  }
  destroy(): void { this.visual.destroy(); this.shadow.destroy(); }
}

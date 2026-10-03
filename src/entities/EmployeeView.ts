import Phaser from 'phaser';
import { COLORS as C } from '../config';
import { CargoView } from './CargoView';
import type { Employee } from '../simulation/Staff';

export class EmployeeView {
  private readonly visual: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly cargo: CargoView;
  private readonly progress: Phaser.GameObjects.Graphics;
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
    this.cargo = new CargoView(scene);
    this.progress = scene.add.graphics();
    this.label = scene.add.text(0, -70, '', { fontFamily: 'Arial, sans-serif', fontSize: '10px',
      color: '#244a40', backgroundColor: '#fff7e7e8', padding: { x: 4, y: 3 }, align: 'center' }).setOrigin(1, 1);
    this.visual = scene.add.container(worker.position.x, worker.position.y, [body, this.cargo.visual, this.progress, this.label]);
    this.shadow = scene.add.ellipse(worker.position.x, worker.position.y + 2, 32, 13, C.shadow, 0.17).setDepth(-1);
  }
  update(worker: Employee): void {
    this.visual.setPosition(worker.position.x, worker.position.y).setDepth(worker.position.y);
    this.shadow.setPosition(worker.position.x, worker.position.y + 2);
    this.cargo.update(worker.inventory.state);
    const progress = worker.task && worker.route.length === 0 && worker.task.durationMs ?
      worker.task.elapsedMs / worker.task.durationMs : 0;
    const g = this.progress.clear();
    if (progress > 0) {
      g.fillStyle(C.cream).fillRoundedRect(-20, 8, 40, 5, 2);
      g.fillStyle(C.highlight).fillRect(-18, 9, 36 * Math.min(1, progress), 3);
    }
    this.label.setText(worker.id === 'cook' ? 'Cocinero' : 'Limpieza');
  }
  destroy(): void { this.visual.destroy(); this.shadow.destroy(); }
}

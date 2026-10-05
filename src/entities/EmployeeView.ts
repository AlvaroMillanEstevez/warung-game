import Phaser from 'phaser';
import { CargoView } from './CargoView';
import { PALETTE as C, VISUAL as V, cssColor } from '../visuals/theme';
import { CharacterArt } from '../visuals/CharacterArt';
import { localizedLabel, softShadow, progressBar } from '../visuals/drawing';
import type { Employee } from '../simulation/Staff';

export class EmployeeView {
  private readonly visual: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Graphics;
  private readonly body: CharacterArt;
  private readonly cargo: CargoView;
  private readonly progress: Phaser.GameObjects.Graphics;
  private lastProgress = -1;
  constructor(scene: Phaser.Scene, worker: Employee) {
    this.body = new CharacterArt(scene, worker.role, worker.id === 'cook-2' ? 1 : 0);
    this.cargo = new CargoView(scene);
    this.progress = scene.add.graphics();
    const badge = localizedLabel(scene, -21, worker.id === 'cook-2' ? -100 : -80,
      worker.role === 'cook' ? { key: 'staff.cook', params: { number: worker.id === 'cook-2' ? 2 : 1 } } : 'staff.cleaner', 10, C.greenDark, 90)
      .setStyle({ backgroundColor: cssColor(C.cream), padding: { x: 5, y: 3 } }).setOrigin(1, 1);
    this.visual = scene.add.container(worker.position.x, worker.position.y, [this.body.visual, this.cargo.visual, this.progress, badge]);
    this.shadow = scene.add.graphics().setDepth(V.depth.groundShadow); softShadow(this.shadow, 0, 2, 29, 11);
  }
  update(worker: Employee): void {
    this.body.moveFrom(this.visual, worker.position);
    this.visual.setPosition(worker.position.x, worker.position.y).setDepth(worker.position.y);
    this.shadow.setPosition(worker.position.x, worker.position.y);
    this.cargo.update(worker.inventory.state);
    const progress = worker.task && worker.route.length === 0 && worker.task.durationMs ?
      worker.task.elapsedMs / worker.task.durationMs : 0;
    const bucket = Math.round(progress * 100);
    if (bucket !== this.lastProgress) {
      this.lastProgress = bucket; this.progress.clear();
      if (progress > 0) progressBar(this.progress, -20, 9, 40, progress);
    }
  }
  destroy(): void { this.visual.destroy(); this.shadow.destroy(); }
}

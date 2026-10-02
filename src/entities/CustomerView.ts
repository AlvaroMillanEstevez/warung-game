import Phaser from 'phaser';
import { COLORS as C } from '../config';
import type { Customer } from '../simulation/Restaurant';

export class CustomerView {
  private readonly visual: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly label: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Graphics;
  private lastPhase = '';

  constructor(scene: Phaser.Scene, customer: Readonly<Customer>) {
    this.shadow = scene.add.ellipse(0, 0, 28, 12, C.shadow, 0.16).setDepth(-1);
    this.body = scene.add.graphics();
    this.label = scene.add.text(0, -53, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#fff7e7',
      backgroundColor: customer.intent === 'takeaway' ? '#995336' : '#315e50',
      padding: { x: 4, y: 3 }, align: 'center',
    }).setOrigin(0.5, 1);
    this.visual = scene.add.container(0, 0, [this.body, this.label]);
    this.update(customer);
  }

  update(customer: Readonly<Customer>): void {
    const { x, y } = customer.position;
    this.visual.setPosition(x, y).setDepth(y);
    this.shadow.setPosition(x, y + 2);
    if (this.lastPhase === customer.phase) return;
    this.lastPhase = customer.phase;
    const seated = customer.phase === 'eating';
    const g = this.body.clear();
    g.fillStyle(C.woodDark).fillRoundedRect(-9, -10, 7, 12, 3).fillRoundedRect(2, -10, 7, 12, 3);
    g.fillStyle(customer.intent === 'takeaway' ? C.coral : C.green).fillRoundedRect(-13, -30, 26, seated ? 27 : 23, 7);
    g.fillStyle(C.skin).fillCircle(-13, -15, 4).fillCircle(13, -15, 4).fillCircle(0, -37, 11);
    g.fillStyle(C.hair).fillEllipse(0, -44, 23, 13);
    g.fillStyle(C.hair).fillCircle(-4, -37, 1.3).fillCircle(4, -37, 1.3);
    if (customer.intent === 'takeaway' && customer.phase === 'leaving') {
      g.fillStyle(C.cream).fillRoundedRect(8, -17, 14, 17, 2);
      g.lineStyle(2, C.wood).strokeRoundedRect(11, -21, 8, 7, 2);
    }
    if (customer.carryingMeal) {
      g.fillStyle(C.cream).fillEllipse(14, -13, 23, 12);
      g.fillStyle(C.woodLight).fillEllipse(14, -14, 17, 8);
      g.fillStyle(C.cream).fillEllipse(16, -15, 8, 5);
      g.fillStyle(C.gold).fillCircle(16, -15, 2);
    }
    const status = customer.phase === 'waiting-cleaning' || customer.phase === 'walking-to-cleaning-wait' ? '\nEspera limpieza' :
      customer.phase === 'eating' ? '\nComiendo' : '';
    this.label.setText((customer.intent === 'takeaway' ? 'LLEVAR\n#' : 'AQUÍ #') + customer.number + status);
  }

  destroy(): void { this.visual.destroy(); this.shadow.destroy(); }
}

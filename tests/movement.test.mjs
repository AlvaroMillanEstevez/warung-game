import test from 'node:test';
import assert from 'node:assert/strict';
import { dragVector } from '../src/entities/drag.ts';
import { viewportGeometry } from '../src/world/viewport.ts';
import { moveWithCollisions } from '../src/world/collision.ts';
import { CAMERA, CONTROLS, PLAYER, ROOM } from '../src/config.ts';

test('Arrastre relativo: zona muerta, respuesta progresiva, vector limitado y sin aceleración diagonal', () => {
  const origin = { x: 100, y: 220 };
  for (const offset of [0, 1, CONTROLS.dragDeadZone]) {
    assert.deepEqual(dragVector(origin, { x: origin.x + offset, y: origin.y }), { x: 0, y: 0 });
  }
  let previous = 0;
  for (let distance = CONTROLS.dragDeadZone + 1; distance < 180; distance++) {
    const vector = dragVector(origin, { x: origin.x + distance, y: origin.y });
    assert.ok(vector.x >= previous && vector.x <= 1); assert.equal(vector.y, 0); previous = vector.x;
  }
  const diagonal = dragVector(origin, { x: origin.x + 500, y: origin.y - 500 });
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-10);
  assert.ok(diagonal.x > 0 && diagonal.y < 0);
});
test('El mismo desplazamiento no acumula eventos ni depende del origen absoluto; FPS conserva velocidad', () => {
  const vector = dragVector({ x: 0, y: 0 }, { x: 40, y: 40 });
  for (let i = 0; i < 100; i++) {
    assert.deepEqual(dragVector({ x: 1000, y: 800 }, { x: 1040, y: 840 }), vector);
  }
  const ends = [];
  for (const fps of [20, 30, 60, 120]) {
    let position = { x: 444, y: 350 };
    for (let frame = 0; frame < fps / 2; frame++) {
      position = moveWithCollisions(position, vector.x * PLAYER.speed / fps, vector.y * PLAYER.speed / fps, []);
    }
    ends.push(position);
  }
  for (const end of ends) assert.ok(Math.hypot(end.x - ends[0].x, end.y - ends[0].y) < 1e-8);
});
test('Exterior contiene la vista centrada en todas las esquinas para escritorio, móvil y orientación', () => {
  for (const [width, height] of [[320,568],[390,844],[568,320],[844,390],[1440,1000],[2560,1080],[7680,2160]]) {
    const { zoom, exterior } = viewportGeometry(width, height);
    assert.ok(zoom >= CAMERA.minimumZoom);
    for (const x of [ROOM.x, ROOM.x + ROOM.width]) for (const y of [ROOM.y, ROOM.y + ROOM.height]) {
      const left = x - width / zoom / 2, top = y - CAMERA.headOffset - height / zoom / 2;
      assert.ok(left >= exterior.x && top >= exterior.y);
      assert.ok(left + width / zoom <= exterior.x + exterior.width);
      assert.ok(top + height / zoom <= exterior.y + exterior.height);
    }
  }
});

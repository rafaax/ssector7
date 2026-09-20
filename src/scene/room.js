import { BufferGeometry, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, Vector3 } from 'three';
import { config } from '../config.js';

export function createRoom() {
  const { height, aspect: range, corner } = config.room;

  const object = new Group();
  object.name = 'room';
  object.position.set(0, 0, -config.room.distance);

  const geometry = new BufferGeometry();
  const material = new LineBasicMaterial({ name: 'room:frame' });
  const frame = new LineSegments(geometry, material);
  object.add(frame);

  const halfY = height * 0.5;
  let halfX = (height * range.max) * 0.5;

  function build() {
    const points = [];
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const x = sx * halfX;
        const y = sy * halfY;
        points.push(x, y, 0, x - sx * corner, y, 0);
        points.push(x, y, 0, x, y - sy * corner, 0);
      }
    }

    geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
    geometry.computeBoundingSphere();
  }

  build();

  const scratch = new Vector3();

  return {
    object,
    focus: frame,

    setAspect(viewportAspect) {
      const clamped = Math.min(Math.max(viewportAspect, range.min), range.max);
      const next = height * clamped * 0.5;
      if (Math.abs(next - halfX) < 1e-4) return;

      halfX = next;
      build();
    },

    applyTheme(preset) {
      material.color.setHex(preset.ui.dim);
    },

    projectTo(camera, width, height) {
      object.updateMatrixWorld();

      const toScreen = (x, y) => {
        scratch.set(x, y, 0);
        object.localToWorld(scratch).project(camera);
        return { x: (scratch.x * 0.5 + 0.5) * width, y: (-scratch.y * 0.5 + 0.5) * height };
      };

      const center = toScreen(0, 0);
      const right = toScreen(halfX, 0);
      const top = toScreen(0, halfY);

      return {
        x: center.x,
        y: center.y,
        halfWidth: Math.abs(right.x - center.x),
        halfHeight: Math.abs(top.y - center.y),
      };
    },

    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

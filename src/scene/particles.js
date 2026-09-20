import {
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  SRGBColorSpace,
} from 'three';
import { config } from '../config.js';
import { createTween } from '../tween.js';

export function createParticles({ stage }) {
  const { count, size, spread, fade } = config.particles;

  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    let x;
    let y;
    let z;
    do {
      x = (Math.random() * 2 - 1) * spread.x;
      y = (Math.random() * 2 - 1) * spread.y;
      z = spread.zFar + Math.random() * (spread.zNear - spread.zFar);
    } while (insideRoom(x, y, z));

    positions.set([x, y, z], i * 3);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

  const sprite = dotTexture();
  const material = new PointsMaterial({
    name: 'particles',
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    map: sprite,
    depthWrite: false,
  });

  const object = new Points(geometry, material);
  object.name = 'particles';

  let peak = 0.5;

  const intensity = createTween({
    stage,
    duration: fade,
    onUpdate: paint,
  });

  function paint() {
    material.opacity = intensity.value * peak;
    object.visible = material.opacity > 0.001;
  }

  return {
    object,

    applyTheme(preset) {
      material.color.setHex(preset.ui.particle);
      peak = preset.ui.particleOpacity;
      paint();
    },

    setIntensity(next) {
      intensity.to(Math.min(Math.max(next, 0), 1));
    },

    dispose() {
      intensity.dispose();
      geometry.dispose();
      material.dispose();
      sprite.dispose();
    },
  };

  function insideRoom(x, y, z) {
    const { distance, height, aspect } = config.room;
    return (
      Math.abs(x) < height * aspect.max * 0.55 &&
      Math.abs(y) < height * 0.55 &&
      z > -distance - 1.2 &&
      z < -distance + 1.2
    );
  }
}

function dotTexture(resolution = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;

  const context = canvas.getContext('2d');
  const half = resolution / 2;
  const gradient = context.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, resolution, resolution);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

import { config } from './config.js';

const TWO_PI = Math.PI * 2;
const CENTER = 500;
const RADIUS = 340;
const BREATHE = 0.015;
const WOBBLE = 0.16;

export function createLoaderGlobe({ reducedMotion = false } = {}) {
  const backPath = document.getElementById('globe-back');
  const frontPath = document.getElementById('globe-front');
  const ring = document.getElementById('loader-progress');

  if (!backPath || !frontPath) return { setProgress() {}, stop() {} };


  const { density, period, samples, fps } = config.loader;

  const circles = buildCircles(density);
  const cosT = new Float64Array(samples + 1);
  const sinT = new Float64Array(samples + 1);
  for (let i = 0; i <= samples; i += 1) {
    const t = (i / samples) * TWO_PI;
    cosT[i] = Math.cos(t);
    sinT[i] = Math.sin(t);
  }

  const back = [];
  const front = [];
  const u = [0, 0, 0];
  const v = [0, 0, 0];

  function draw(spin) {
    const wobble = Math.sin(spin) * WOBBLE;
    const radius = RADIUS * (1 + Math.sin(spin) * BREATHE);

    const cy = Math.cos(spin);
    const sy = Math.sin(spin);
    const cx = Math.cos(wobble);
    const sx = Math.sin(wobble);

    back.length = 0;
    front.length = 0;

    for (const circle of circles) {
      turn(circle.u, cy, sy, cx, sx, u);
      turn(circle.v, cy, sy, cx, sx, v);

      let wasFront = null;
      let lastX = 0;
      let lastY = 0;

      for (let i = 0; i <= samples; i += 1) {
        const c = cosT[i];
        const s = sinT[i];

        const x = (CENTER + radius * (u[0] * c + v[0] * s) + 0.5) | 0;
        const y = (CENTER - radius * (u[1] * c + v[1] * s) + 0.5) | 0;
        const isFront = u[2] * c + v[2] * s >= 0;

        if (wasFront === null) {
          (isFront ? front : back).push('M', x, ' ', y);
        } else if (isFront !== wasFront) {
          (wasFront ? front : back).push('L', x, ' ', y);
          (isFront ? front : back).push('M', lastX, ' ', lastY, 'L', x, ' ', y);
        } else {
          (isFront ? front : back).push('L', x, ' ', y);
        }

        wasFront = isFront;
        lastX = x;
        lastY = y;
      }
    }

    backPath.setAttribute('d', back.join(''));
    frontPath.setAttribute('d', front.join(''));
  }

  draw(0);

  let raf = null;

  if (!reducedMotion && period > 0) {
    const minStep = fps > 0 ? 1000 / fps : 0;
    let origin = null;
    let previous = -Infinity;

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (origin === null) origin = now;
      if (now - previous < minStep) return;

      previous = now;
      draw(((now - origin) / 1000 / period) * TWO_PI);
    };

    raf = requestAnimationFrame(tick);
  }

  return {
    setProgress(value) {
      const done = Math.min(Math.max(value, 0), 1) * 100;
      ring?.setAttribute('stroke-dashoffset', String(100 - done));
    },

    stop() {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
    },
  };
}

function buildCircles(density) {
  const [meridians, tilted] = { sparse: [5, 3], regular: [7, 5], dense: [10, 7] }[density] ?? [7, 5];

  const normals = [];
  for (let i = 0; i < meridians; i += 1) {
    const a = (i / meridians) * Math.PI;
    normals.push(normalize([Math.cos(a), 0, Math.sin(a)]));
  }
  for (const lean of [0.62, -0.62]) {
    for (let i = 0; i < tilted; i += 1) {
      normals.push(normalize(rotateY(rotateX([0, 1, 0], lean), (i / tilted) * Math.PI)));
    }
  }

  return normals.map((n) => {
    const reference = Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = normalize(cross(n, reference));
    return { u, v: normalize(cross(n, u)) };
  });
}

function turn(source, cy, sy, cx, sx, out) {
  const x = source[0] * cy + source[2] * sy;
  const y = source[1];
  const z = -source[0] * sy + source[2] * cy;

  out[0] = x;
  out[1] = y * cx - z * sx;
  out[2] = y * sx + z * cx;
  return out;
}

function normalize(v) {
  const m = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / m, v[1] / m, v[2] / m];
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function rotateX(v, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
}

function rotateY(v, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}

import { config } from './config.js';

/**
 * O globo de arames da tela de carregamento.
 *
 * Porte do desenho feito no Claude Design (globe-scene.jsx): circulos maximos
 * projetados ortograficamente, separados em arcos da frente e do fundo pelo
 * sinal de z. O original roda em React recomputando as paths a cada frame; aqui
 * o que interessa e nao roubar o processador de quem esta baixando 1,4 MB de
 * modelo, entao:
 *
 *   - as bases u/v de cada circulo saem prontas uma vez, no inicio;
 *   - o seno e o cosseno de cada amostra tambem, num Float64Array;
 *   - a rotacao do frame e aplicada as DUAS bases, nao aos 2380 pontos - a
 *     projecao e linear, entao girar a base equivale a girar cada ponto;
 *   - os 17 circulos viram apenas duas paths (uma do fundo, uma da frente),
 *     em vez de 34 elementos no DOM;
 *   - o desenho e limitado a config.loader.fps.
 *
 * O contorno da esfera e o anel de progresso ficam estaticos no index.html, e
 * por isso aparecem no primeiro paint, antes deste modulo existir.
 */
const TWO_PI = Math.PI * 2;
const CENTER = 500;
const RADIUS = 340;
const BREATHE = 0.015; // variacao do raio ao longo da volta
const WOBBLE = 0.16; // inclinacao do eixo, em radianos

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
          // A costura entre frente e fundo: o arco que termina vai ate o ponto
          // atual e o que comeca parte do anterior, senao fica um furo visivel
          // na silhueta a cada troca de lado.
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
    /** @param {number} value 0..1 */
    setProgress(value) {
      // o anel tem pathLength="100", entao o offset e o quanto ainda falta
      const done = Math.min(Math.max(value, 0), 1) * 100;
      ring?.setAttribute('stroke-dashoffset', String(100 - done));
    },

    stop() {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
    },
  };
}

/**
 * As familias de circulos maximos: meridianos mais duas familias inclinadas em
 * sentidos opostos, que e o que da a trama tecida em vez de uma gaiola comum.
 * Cada circulo e guardado pela sua base ortonormal (u, v) no plano dele.
 */
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

/** Gira em Y e depois em X, com os senos e cossenos ja calculados. */
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

import WebGL from 'three/addons/capabilities/WebGL.js';
import { createStage } from './renderer.js';
import { setupEnvironment } from './environment.js';
import { loadLogo } from './loadLogo.js';
import { config } from './config.js';
import './style.css';

const MODEL_URL = `${import.meta.env.BASE_URL}models/logo.glb`;

const container = document.getElementById('stage');
const loaderEl = document.getElementById('loader');
const loaderFill = document.getElementById('loader-fill');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

main();

async function main() {
  if (!WebGL.isWebGL2Available()) {
    showFallback('seu navegador nao suporta webgl 2');
    return;
  }

  const stage = createStage(container);
  setupEnvironment(stage.renderer, stage.scene);

  let logo;
  try {
    logo = await loadLogo(MODEL_URL, (progress) => {
      loaderFill.style.width = `${Math.round(progress * 100)}%`;
    });
  } catch (error) {
    console.error('[ssector7] falha ao carregar o modelo', error);
    stage.dispose();
    showFallback('nao foi possivel carregar o modelo 3d');
    return;
  }

  stage.scene.add(logo);
  stage.frameObject(logo);

  registerIntro(stage, logo);
  registerAutoRotation(stage, logo);

  loaderFill.style.width = '100%';
  loaderEl.classList.add('is-hidden');
  container.classList.add('is-ready');
}

/** Entrada: escala e giro convergindo para o repouso, com ease-out. */
function registerIntro(stage, logo) {
  const { duration, fromScale, fromSpin } = config.intro;

  if (prefersReducedMotion) {
    logo.scale.setScalar(1);
    return;
  }

  let elapsed = 0;
  logo.scale.setScalar(fromScale);
  logo.rotation.y = fromSpin;

  const stop = stage.registerUpdate((delta) => {
    elapsed = Math.min(elapsed + delta, duration);
    const t = easeOutCubic(elapsed / duration);

    logo.scale.setScalar(fromScale + (1 - fromScale) * t);
    logo.rotation.y = fromSpin * (1 - t);

    if (elapsed >= duration) stop();
  });
}

/**
 * Rotacao automatica no eixo Y + oscilacao sutil no X.
 * Pausa enquanto o usuario arrasta e volta depois de `resumeDelay` parado.
 */
function registerAutoRotation(stage, logo) {
  if (prefersReducedMotion) return;

  const { speed, tiltAmplitude, tiltPeriod, resumeDelay } = config.autoRotate;
  const introEnd = config.intro.duration;

  let idleFor = resumeDelay;
  let interacting = false;

  stage.controls.addEventListener('start', () => {
    interacting = true;
    idleFor = 0;
  });
  stage.controls.addEventListener('end', () => {
    interacting = false;
    idleFor = 0;
  });

  stage.registerUpdate((delta, elapsed) => {
    if (elapsed < introEnd) return; // deixa a animacao de entrada terminar

    if (interacting) {
      idleFor = 0;
    } else {
      idleFor = Math.min(idleFor + delta, resumeDelay);
    }

    // volta a girar suavemente em vez de ligar de uma vez
    const weight = easeOutCubic(idleFor / resumeDelay);
    logo.rotation.y += speed * weight * delta;
    logo.rotation.x = Math.sin((elapsed / tiltPeriod) * Math.PI * 2) * tiltAmplitude * weight;
  });
}

/** Sem WebGL ou sem o modelo: mostra o logo 2D e diz o porque. */
function showFallback(message) {
  loaderEl.classList.add('is-hidden');

  const fallback = document.createElement('div');
  fallback.className = 'fallback';

  const image = document.createElement('img');
  image.src = `${import.meta.env.BASE_URL}logo.png`;
  image.alt = 'SSECTOR7';

  const note = document.createElement('p');
  note.className = 'fallback__note';
  note.textContent = message;

  fallback.append(image, note);
  document.body.appendChild(fallback);
  console.warn(`[ssector7] ${message}`);
}

function easeOutCubic(t) {
  const clamped = Math.min(Math.max(t, 0), 1);
  return 1 - Math.pow(1 - clamped, 3);
}

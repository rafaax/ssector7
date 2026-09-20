import WebGL from 'three/addons/capabilities/WebGL.js';
import { createStage } from './renderer.js';
import { setupLights } from './environment.js';
import { createWorld } from './world.js';
import { createPicker } from './picking.js';
import { createNavigator } from './navigation.js';
import { createOverlay } from './overlay.js';
import { createLoaderGlobe } from './loader.js';
import { config } from './config.js';
import { applyThemeToDocument, resolveThemeName, startTheme } from './theme.js';
import './style.css';

const container = document.getElementById('stage');
const loaderEl = document.getElementById('loader');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

applyThemeToDocument(resolveThemeName());

const loader = createLoaderGlobe({ reducedMotion: prefersReducedMotion });

main();

async function main() {
  if (!WebGL.isWebGL2Available()) {
    showFallback('seu navegador nao suporta webgl 2');
    return;
  }

  const stage = createStage(container);
  setupLights(stage.scene);

  let world;
  try {
    world = await createWorld({
      stage,
      onProgress: (progress) => loader.setProgress(progress),
    });
  } catch (error) {
    console.error('[ssector7] falha ao carregar o modelo', error);
    stage.dispose();
    showFallback('nao foi possivel carregar o modelo 3d');
    return;
  }

  stage.scene.add(world.root);

  const themeController = startTheme({ stage, world });

  let navigator;
  let overlay;

  const picker = createPicker({
    stage,
    interactives: world.interactives,
    onActivate: (item) => navigator.navigate(item.object.userData.target),
  });

  navigator = createNavigator({
    stage,
    world,
    reducedMotion: prefersReducedMotion,
    onExit: (id) => {
      picker.setEnabled(false);
      overlay?.exit(id);
      world.particles.setIntensity(1);
    },
    onEnter: (id) => {
      picker.setEnabled(true);
      overlay?.enter(id);
      world.particles.setIntensity(world.stations[id].ambience ?? 0);
    },
  });

  overlay = createOverlay({
    stage,
    world,
    picker,
    navigate: (id) => navigator.navigate(id),
  });
  overlay.enter(navigator.current());

  registerIntro(stage, world.home);

  if (import.meta.env.DEV) {
    window.__ssector7 = { stage, world, config, theme: themeController, navigator, picker };
  }

  loader.setProgress(1);
  hideLoader();
  container.classList.add('is-ready');
}

function registerIntro(stage, target) {
  const { duration, fromScale, fromSpin } = config.intro;

  if (prefersReducedMotion || duration <= 0) {
    target.scale.setScalar(1);
    return;
  }

  let elapsed = 0;
  target.scale.setScalar(fromScale);
  target.rotation.y = fromSpin;

  const stop = stage.registerUpdate((delta) => {
    elapsed = Math.min(elapsed + delta, duration);
    const t = easeOutCubic(elapsed / duration);

    target.scale.setScalar(fromScale + (1 - fromScale) * t);
    target.rotation.y = fromSpin * (1 - t);

    if (elapsed >= duration) stop();
  });
}

function showFallback(message) {
  hideLoader();

  document.querySelector('.ui')?.remove();

  const fallback = document.createElement('div');
  fallback.className = 'fallback';

  const { fallbackImage } = config.themes[resolveThemeName()];
  const image = document.createElement('img');
  image.src = `${import.meta.env.BASE_URL}${fallbackImage}`;
  image.alt = 'SSECTOR7';

  const note = document.createElement('p');
  note.className = 'fallback__note';
  note.textContent = message;

  fallback.append(image, note);
  document.body.appendChild(fallback);
  console.warn(`[ssector7] ${message}`);
}

function hideLoader() {
  loaderEl.classList.add('is-hidden');

  const stop = () => loader.stop();
  loaderEl.addEventListener('transitionend', stop, { once: true });
  setTimeout(stop, 1200);
}

function easeOutCubic(t) {
  const clamped = Math.min(Math.max(t, 0), 1);
  return 1 - Math.pow(1 - clamped, 3);
}

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

// Antes de qualquer coisa, para a tela de carregamento ja nascer na cor certa.
applyThemeToDocument(resolveThemeName());

// O globo comeca a girar antes de qualquer coisa: e ele quem ocupa a espera
// pelo modelo, que e o download pesado da pagina.
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

  // Aplica o tema (materiais, environment, tonemapping) e, no modo 'auto',
  // agenda a virada para a proxima fronteira de horario.
  const themeController = startTheme({ stage, world });

  // As tres pecas se conhecem em circulo - o clique chama a navegacao, a
  // navegacao avisa o overlay, o overlay chama a navegacao de volta - entao a
  // ligacao e feita depois da criacao, com as variaveis ja no escopo.
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
    // Durante o voo nao ha o que clicar: evita empilhar navegacoes e evita o
    // hover acender um rotulo que esta passando voando pela tela.
    onExit: (id) => {
      picker.setEnabled(false);
      overlay?.exit(id);
      // a poeira so aparece em movimento: e ela que da o paralaxe da travessia
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
  // O primeiro onEnter aconteceu dentro do createNavigator, antes do overlay
  // existir; num link direto para #/about e essa linha que mostra o texto.
  overlay.enter(navigator.current());

  registerIntro(stage, world.home);

  // Handle de depuracao: so existe em `npm run dev`, nao vai para o build.
  if (import.meta.env.DEV) {
    window.__ssector7 = { stage, world, config, theme: themeController, navigator, picker };
  }

  loader.setProgress(1);
  hideLoader();
  container.classList.add('is-ready');
}

/**
 * Entrada: escala e giro convergindo para o repouso, com ease-out.
 * Roda uma vez e se remove; depois disso o logo so se mexe pelo mouse.
 */
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

/** Sem WebGL ou sem o modelo: mostra o logo 2D e diz o porque. */
function showFallback(message) {
  hideLoader();

  // Sem cena 3D nao ha para onde navegar: a camada de overlay some junto, senao
  // sobrariam botoes invisiveis que o Tab alcanca e que nao fazem nada.
  document.querySelector('.ui')?.remove();

  const fallback = document.createElement('div');
  fallback.className = 'fallback';

  // um png por tema: traco branco sobre preto, ou preto sobre branco
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

/** Some com a tela de carregamento e para o giro - nada anima escondido. */
function hideLoader() {
  loaderEl.classList.add('is-hidden');

  // Para o giro quando a tela terminar de sumir. O timer e a rede de seguranca:
  // transitionend nao dispara se a transicao estiver desligada ou se a aba
  // estiver em segundo plano, e um rAF girando para sempre sob a cena e um
  // vazamento silencioso. stop() e idempotente.
  const stop = () => loader.stop();
  loaderEl.addEventListener('transitionend', stop, { once: true });
  setTimeout(stop, 1200);
}

function easeOutCubic(t) {
  const clamped = Math.min(Math.max(t, 0), 1);
  return 1 - Math.pow(1 - clamped, 3);
}

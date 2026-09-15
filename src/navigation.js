import { QuadraticBezierCurve3, Vector3 } from 'three';
import { config } from './config.js';

/**
 * A viagem entre estacoes.
 *
 * A camera percorre uma curva de Bezier em vez de uma reta: o ponto de controle
 * (config.flight.arc) levanta o meio do caminho, entao ela sobe, passa por cima
 * da borda do logo e desce do outro lado. Em linha reta seria um zoom, e ainda
 * atravessaria a geometria bem no near plane.
 *
 * Durante o voo os limites de orbita sao afrouxados: o OrbitControls roda o
 * update() todo frame mesmo desabilitado, e as distancias minima/maxima da
 * estacao de origem recortariam a trajetoria pela metade. Quem reorienta a
 * camera para o alvo continua sendo ele - so a posicao e escrita aqui.
 *
 * A rota vive no hash da URL. Isso da de graca o botao voltar do navegador e um
 * link direto para cada lugar.
 */
export function createNavigator({ stage, world, onEnter, onExit, reducedMotion = false }) {
  const { camera, controls } = stage;
  const baseFov = camera.fov;
  const arc = new Vector3(config.flight.arc.x, config.flight.arc.y, config.flight.arc.z);

  let current = null;
  let cancel = null;

  function limitsOf(station) {
    return { ...config.controls, ...station.controls };
  }

  function poseFor(station) {
    return stage.computeFrame(station.focus, {
      direction: station.direction,
      fitOffset: station.fitOffset,
    });
  }

  /** Assenta a camera na estacao e devolve os controles ao usuario. */
  function settle(station) {
    const limits = limitsOf(station);
    // recalculado na chegada, nao no inicio: a janela pode ter sido
    // redimensionada no meio do voo e o enquadramento depende do aspect
    stage.applyFrame(poseFor(station), limits);
    stage.setFramedObject(station.focus, limits);
  }

  function goTo(id, { animate = true } = {}) {
    const station = world.stations[id];
    if (!station || id === current) return;

    cancel?.();

    if (current) onExit?.(current);

    current = id;
    station.prepare?.();

    const instant = !animate || reducedMotion || config.flight.duration <= 0;
    if (instant) {
      arrive(station);
      return;
    }

    stage.setFramedObject(null); // um resize no meio do voo nao teleporta a camera
    controls.enabled = false;
    stage.releaseControlLimits();

    const start = camera.position.clone();
    const startTarget = controls.target.clone();
    const end = poseFor(station);

    const middle = start.clone().lerp(end.position, 0.5).add(arc);
    const curve = new QuadraticBezierCurve3(start, middle, end.position);

    const { duration, fovPunch } = config.flight;
    let elapsed = 0;

    const stop = stage.registerUpdate((delta) => {
      elapsed = Math.min(elapsed + delta, duration);
      const t = easeInOutCubic(elapsed / duration);

      curve.getPoint(t, camera.position);
      controls.target.lerpVectors(startTarget, end.target, t);

      if (fovPunch) {
        camera.fov = baseFov + fovPunch * Math.sin(Math.PI * t);
        camera.updateProjectionMatrix();
      }

      stage.invalidate();
      if (elapsed >= duration) {
        cancel = null;
        stop();
        arrive(station);
      }
    });

    cancel = () => {
      cancel = null;
      stop();
      resetFov();
    };
  }

  function arrive(station) {
    resetFov();
    settle(station);

    // So agora o lugar de onde viemos some: durante o voo ele ainda esta em
    // campo. Varrer todas as estacoes (em vez de so a anterior) tambem cobre o
    // link direto, que chega sem passar por lugar nenhum.
    for (const other of Object.values(world.stations)) {
      if (other !== station) other.dismiss?.();
    }

    controls.enabled = true;
    stage.invalidate();
    onEnter?.(station.id);
  }

  function resetFov() {
    if (camera.fov === baseFov) return;
    camera.fov = baseFov;
    camera.updateProjectionMatrix();
  }

  function idFromHash() {
    const raw = location.hash.replace(/^#\/?/, '').trim();
    return world.stations[raw] ? raw : 'home';
  }

  function onHashChange() {
    goTo(idFromHash());
  }
  window.addEventListener('hashchange', onHashChange);

  // A primeira estacao entra sem voo, inclusive num link direto para #/about.
  goTo(idFromHash(), { animate: false });

  return {
    /**
     * Navegacao vinda do usuario: escreve no hash e deixa o evento conduzir,
     * para o historico do navegador registrar o passo.
     */
    navigate(id) {
      const hash = id === 'home' ? '#/' : `#/${id}`;
      if (location.hash === hash) goTo(id);
      else location.hash = hash;
    },
    goTo,
    current: () => current,
    dispose() {
      cancel?.();
      window.removeEventListener('hashchange', onHashChange);
    },
  };
}

function easeInOutCubic(t) {
  const x = Math.min(Math.max(t, 0), 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

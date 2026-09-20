import { QuadraticBezierCurve3, Vector3 } from 'three';
import { config } from './config.js';

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

  function settle(station) {
    const limits = limitsOf(station);
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

    stage.setFramedObject(null);
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

  goTo(idFromHash(), { animate: false });

  return {
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

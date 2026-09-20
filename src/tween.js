export function createTween({ stage, duration, onUpdate, value: initial = 0 }) {
  let value = initial;
  let from = initial;
  let to = initial;
  let elapsed = 0;
  let stop = null;

  function tick(delta) {
    elapsed = Math.min(elapsed + delta, duration);
    const t = duration > 0 ? elapsed / duration : 1;

    value = from + (to - from) * easeOutCubic(t);
    onUpdate(value);
    stage.invalidate();

    if (elapsed >= duration) {
      value = to;
      onUpdate(value);
      stop();
      stop = null;
    }
  }

  return {
    get value() {
      return value;
    },

    to(next) {
      if (next === to) return;
      from = value;
      to = next;
      elapsed = 0;
      if (!stop) stop = stage.registerUpdate(tick);
    },

    set(next) {
      stop?.();
      stop = null;
      value = from = to = next;
      onUpdate(value);
    },

    dispose() {
      stop?.();
      stop = null;
    },
  };
}

function easeOutCubic(t) {
  const x = Math.min(Math.max(t, 0), 1);
  return 1 - Math.pow(1 - x, 3);
}

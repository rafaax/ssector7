/**
 * Um valor que caminha ate outro em tempo determinado.
 *
 * Existe porque perseguicao exponencial (`value += (target - value) * step`)
 * nunca chega: com uma constante de 0.8s ela ainda estava a caminho 4 segundos
 * depois, e enquanto um update esta registrado o renderer desenha todo frame.
 * A cena inteira foi construida para nao gastar GPU parada, entao uma animacao
 * precisa ter fim marcado, nao assintota.
 *
 * O update so fica registrado durante a animacao, e se remove ao terminar.
 *
 * @param {object} params
 * @param {object} params.stage
 * @param {number} params.duration        segundos
 * @param {(value: number) => void} params.onUpdate
 * @param {number} [params.value]         valor inicial
 */
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

    /** Anima ate `next`. Chamar de novo no meio redireciona a partir de onde esta. */
    to(next) {
      if (next === to) return;
      from = value;
      to = next;
      elapsed = 0;
      if (!stop) stop = stage.registerUpdate(tick);
    },

    /** Vai direto, sem animar. */
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

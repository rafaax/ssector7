import { ACESFilmicToneMapping, NoToneMapping } from 'three';
import { config } from './config.js';
import { applyEnvironment } from './environment.js';

/**
 * `?theme=dark` ou `?theme=light` na URL veste esse tema e trava a virada
 * automatica - util pra link de preview e pra tirar print sem esperar o
 * relogio. `?theme=auto` (ou nenhum parametro) devolve o comportamento
 * normal. So le a URL, nao escreve nela: navegar dentro do site preserva a
 * query string porque o roteamento vive no hash (src/navigation.js).
 */
export function themeOverrideFromURL() {
  const forced = new URLSearchParams(location.search).get('theme');
  return forced in config.themes ? forced : null;
}

/**
 * Qual tema vale num dado instante.
 *
 * Com `config.theme: 'auto'` quem decide e o relogio local do visitante - nao
 * o do servidor - entao alguem em Tokyo ve o tema claro no horario de Tokyo.
 * Sem geolocalizacao e sem pedir permissao nenhuma.
 */
export function resolveThemeName(now = new Date()) {
  const forced = themeOverrideFromURL();
  if (forced) return forced;

  if (config.theme !== 'auto') return config.theme;

  const [from, to] = boundaries();
  const hour = hourOf(now);
  return hour >= from && hour < to ? 'light' : 'dark';
}

/** Milissegundos ate a proxima virada de tema. */
export function msUntilNextChange(now = new Date()) {
  const bounds = boundaries();
  const hour = hourOf(now);
  const next = bounds.find((b) => b > hour);

  const target = new Date(now);
  if (next === undefined) {
    // ja passou das duas fronteiras hoje: a proxima e a primeira de amanha
    target.setDate(target.getDate() + 1);
    setHour(target, bounds[0]);
  } else {
    setHour(target, next);
  }

  // o minimo de 1s evita um laco de timers caso a conta de zero
  return Math.max(1000, target.getTime() - now.getTime());
}

/** Escreve o tema no <html> e na meta theme-color. */
export function applyThemeToDocument(name) {
  const preset = config.themes[name];
  document.documentElement.dataset.theme = name;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = `#${preset.background.toString(16).padStart(6, '0')}`;
}

/**
 * Aplica o tema agora e, no modo 'auto', reprograma a troca para a proxima
 * fronteira de horario - a pagina vira sozinha se ficar aberta.
 *
 * @returns {{ setTheme: (name: string) => void, current: () => string, stop: () => void }}
 */
export function startTheme({ stage, world }) {
  let currentName = null;
  let timer = null;

  function setTheme(name) {
    if (name === currentName) return;
    currentName = name;

    const preset = config.themes[name];
    applyThemeToDocument(name);

    // 'none' mantem as cores literais (o branco emissivo sai 255, como no png);
    // 'aces' da o rolloff filmico, melhor quando a cena tem brilho e reflexo.
    stage.renderer.toneMapping =
      preset.toneMapping === 'aces' ? ACESFilmicToneMapping : NoToneMapping;

    applyEnvironment(stage.renderer, stage.scene, preset);
    world.applyTheme(preset);

    // a cena so desenha quando algo muda - sem isto a troca nao apareceria
    stage.invalidate();
  }

  function schedule() {
    clearTimeout(timer);
    // forcado pela URL ou tema fixo no config: nao ha fronteira de horario
    // para agendar, o tema so muda se um dos dois mudar - e isso so acontece
    // navegando para outra URL, que recarrega a pagina.
    if (config.theme !== 'auto' || themeOverrideFromURL()) return;
    timer = setTimeout(tick, msUntilNextChange());
  }

  function tick() {
    setTheme(resolveThemeName());
    schedule();
  }

  // Timers de aba em segundo plano sao estrangulados pelo navegador, e o
  // relogio pode ter pulado horas (maquina suspensa). Revalidar quando a aba
  // volta cobre os dois casos.
  function onVisible() {
    if (document.visibilityState === 'visible') tick();
  }
  document.addEventListener('visibilitychange', onVisible);

  tick();

  return {
    setTheme,
    current: () => currentName,
    stop() {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    },
  };
}

function boundaries() {
  const { lightFrom, lightTo } = config.autoTheme;
  return [lightFrom, lightTo].sort((a, b) => a - b);
}

function hourOf(date) {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

function setHour(date, hour) {
  date.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
}

import { ACESFilmicToneMapping, NoToneMapping } from 'three';
import { config } from './config.js';
import { applyEnvironment } from './environment.js';

export function themeOverrideFromURL() {
  const forced = new URLSearchParams(location.search).get('theme');
  return forced in config.themes ? forced : null;
}

export function resolveThemeName(now = new Date()) {
  const forced = themeOverrideFromURL();
  if (forced) return forced;

  if (config.theme !== 'auto') return config.theme;

  const [from, to] = boundaries();
  const hour = hourOf(now);
  return hour >= from && hour < to ? 'light' : 'dark';
}

export function msUntilNextChange(now = new Date()) {
  const bounds = boundaries();
  const hour = hourOf(now);
  const next = bounds.find((b) => b > hour);

  const target = new Date(now);
  if (next === undefined) {
    target.setDate(target.getDate() + 1);
    setHour(target, bounds[0]);
  } else {
    setHour(target, next);
  }

  return Math.max(1000, target.getTime() - now.getTime());
}

export function applyThemeToDocument(name) {
  const preset = config.themes[name];
  document.documentElement.dataset.theme = name;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = `#${preset.background.toString(16).padStart(6, '0')}`;
}

export function startTheme({ stage, world }) {
  let currentName = null;
  let timer = null;

  function setTheme(name) {
    if (name === currentName) return;
    currentName = name;

    const preset = config.themes[name];
    applyThemeToDocument(name);

    stage.renderer.toneMapping =
      preset.toneMapping === 'aces' ? ACESFilmicToneMapping : NoToneMapping;

    applyEnvironment(stage.renderer, stage.scene, preset);
    world.applyTheme(preset);

    stage.invalidate();
  }

  function schedule() {
    clearTimeout(timer);
    if (config.theme !== 'auto' || themeOverrideFromURL()) return;
    timer = setTimeout(tick, msUntilNextChange());
  }

  function tick() {
    setTheme(resolveThemeName());
    schedule();
  }

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

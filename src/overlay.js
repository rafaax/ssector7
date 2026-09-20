import { config } from './config.js';

export function createOverlay({ stage, world, picker, navigate }) {
  const reserve =
    (config.room.back.inset + config.room.back.size * 1.6) / config.room.height;

  const MIN_FIT = 0.55;

  const about = document.getElementById('room-about');
  const navToggle = document.getElementById('nav-toggle');
  const navToggleTexts = navToggle ? [...navToggle.querySelectorAll('.nav-link__text')] : [];
  const buttons = [...document.querySelectorAll('[data-station]')];

  const mirrors = new Map(
    buttons.map((button) => [
      button,
      world.interactives.find((item) => item.object.userData.target === button.dataset.station),
    ]),
  );

  for (const [button, item] of mirrors) {
    button.addEventListener('click', () => navigate(button.dataset.station));
    if (!item) continue;
    button.addEventListener('focus', () => picker.setFocus(item, true));
    button.addEventListener('blur', () => picker.setFocus(item, false));
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') navigate('home');
  }
  window.addEventListener('keydown', onKeyDown);

  function place() {
    if (!about.classList.contains('is-active')) return frame();

    const box = frame();
    about.style.left = `${box.x}px`;
    about.style.top = `${box.y - box.halfHeight * reserve}px`;
    about.style.width = `${box.halfWidth * 2}px`;
    return box;
  }

  function frame() {
    return world.room.projectTo(stage.camera, window.innerWidth, window.innerHeight);
  }

  function fit() {
    if (!about.classList.contains('is-active')) return;

    const box = place();
    const available = box.halfHeight * 2 * (1 - reserve);

    about.style.setProperty('--fit', '1');
    const content = about.scrollHeight;

    const scale = available / content;
    about.style.setProperty('--fit', scale < 1 ? String(Math.max(scale, MIN_FIT)) : '1');
  }

  function setNavToggle(id) {
    if (!navToggle) return;
    const toAbout = id !== 'about';
    navToggle.dataset.station = toAbout ? 'about' : 'home';
    for (const text of navToggleTexts) text.textContent = toAbout ? 'about us' : 'home';
  }

  stage.controls.addEventListener('change', place);
  window.addEventListener('resize', fit);

  return {
    enter(id) {
      setNavToggle(id);
      if (id !== 'about') return;
      about.classList.add('is-active');
      about.removeAttribute('inert');
      fit();
    },

    exit(id) {
      if (id !== 'about') return;
      about.classList.remove('is-active');
      about.setAttribute('inert', '');
    },

    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', fit);
      stage.controls.removeEventListener('change', place);
    },
  };
}

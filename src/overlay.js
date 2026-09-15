
/**
 * A camada de HTML por cima da cena.
 *
 * Duas funcoes:
 *
 * 1. O texto do about. Ele e HTML, e nao geometria, porque precisa ser
 *    selecionavel, legivel por leitor de tela, indexavel e nitido em qualquer
 *    zoom. Para ele pertencer ao lugar em vez de flutuar sobre a cena, o bloco
 *    e posicionado onde a moldura 3D cai na tela - se a camera se mexe, o texto
 *    acompanha.
 *
 * 2. Os espelhos acessiveis dos rotulos 3D. Um <button> de verdade, focavel
 *    pelo Tab, que dispara a mesma navegacao; receber foco acende o rotulo em
 *    3D, que e o indicador visual. Sem isso, a pagina inteira seria inalcancavel
 *    sem mouse.
 */
export function createOverlay({ stage, world, picker, navigate }) {
  const about = document.getElementById('room-about');
  const buttons = [...document.querySelectorAll('[data-station]')];

  // cada botao do DOM aponta para o rotulo 3D que ele representa
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

  /** Cola o bloco de texto na moldura 3D. */
  function place() {
    if (!about.classList.contains('is-active')) return;

    const { x, y, halfWidth } = world.room.projectTo(
      stage.camera,
      window.innerWidth,
      window.innerHeight,
    );

    about.style.left = `${x}px`;
    about.style.top = `${y}px`;
    about.style.width = `${halfWidth * 2}px`;
  }

  stage.controls.addEventListener('change', place);
  window.addEventListener('resize', place);

  return {
    enter(id) {
      if (id !== 'about') return;
      about.classList.add('is-active');
      about.removeAttribute('inert');
      place();
    },

    exit(id) {
      if (id !== 'about') return;
      about.classList.remove('is-active');
      about.setAttribute('inert', '');
    },

    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', place);
      stage.controls.removeEventListener('change', place);
    },
  };
}

import { config } from './config.js';

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
  /**
   * Faixa da moldura, embaixo, ocupada pelo rotulo 3D de voltar. O texto nao
   * entra nela - e sobe meia faixa, para continuar centrado no espaco que
   * sobrou em vez de no quadro inteiro. Reservar dos dois lados jogaria fora um
   * oitavo da altura util, que no celular e justamente o que falta.
   */
  const reserve =
    (config.room.back.inset + config.room.back.size * 1.6) / config.room.height;

  /**
   * Piso do encolhimento. Abaixo disso o texto para de encolher e passa a
   * transbordar da moldura: um paragrafo ilegivel dentro do quadro e pior que
   * um paragrafo legivel que escapa dele. O tamanho minimo em px vive no CSS,
   * com max() - este valor so evita margens negativas.
   */
  const MIN_FIT = 0.55;

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

  /** Cola o bloco de texto na moldura 3D. Roda a cada movimento de camera. */
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

  /**
   * Encolhe a tipografia ate o texto caber dentro da moldura.
   *
   * O bloco tem largura fixa (a da moldura) e altura ditada pelo conteudo, e
   * quem escreve o texto nao deveria precisar contar linhas: um paragrafo a
   * mais nao pode vazar por cima do "voltar" nem para fora do quadro.
   *
   * So precisa rodar ao chegar e ao redimensionar. Zoom nao conta: fonte e
   * altura disponivel sao ambas proporcionais a largura projetada, entao a
   * razao entre elas nao muda - e medir layout a cada frame de orbita seria
   * caro.
   */
  function fit() {
    if (!about.classList.contains('is-active')) return;

    const box = place();
    const available = box.halfHeight * 2 * (1 - reserve);

    about.style.setProperty('--fit', '1');
    const content = about.scrollHeight; // forca o layout, ja com --fit em 1

    const scale = available / content;
    about.style.setProperty('--fit', scale < 1 ? String(Math.max(scale, MIN_FIT)) : '1');
  }

  stage.controls.addEventListener('change', place);
  window.addEventListener('resize', fit);

  return {
    enter(id) {
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

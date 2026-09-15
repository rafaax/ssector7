import {
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  SRGBColorSpace,
} from 'three';
import { config } from '../config.js';
import { createTween } from '../tween.js';

/**
 * O campo de pontos que da referencia de movimento ao voo.
 *
 * Sem ele a travessia lia como um fade: nada no quadro se desloca em relacao a
 * nada. Com paralaxe, o cerebro entende que a camera andou.
 *
 * Duas regras:
 *
 * 1. Na home a intensidade e zero - a pagina inicial continua exatamente como
 *    sempre foi, o logo sozinho no vazio. Os pontos so existem em movimento e
 *    numa presenca minima dentro da sala, para o lugar nao parecer morto.
 *
 * 2. O update so fica registrado enquanto a intensidade esta mudando. O loop do
 *    renderer desenha sempre que ha algum update ativo, entao um updater
 *    permanente aqui custaria um frame por segundo pelo resto da sessao - o
 *    oposto do que a cena inteira foi construida para fazer.
 */
export function createParticles({ stage }) {
  const { count, size, spread, fade } = config.particles;

  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    let x;
    let y;
    let z;
    do {
      x = (Math.random() * 2 - 1) * spread.x;
      y = (Math.random() * 2 - 1) * spread.y;
      z = spread.zFar + Math.random() * (spread.zNear - spread.zFar);
    } while (insideRoom(x, y, z));

    positions.set([x, y, z], i * 3);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

  const sprite = dotTexture();
  const material = new PointsMaterial({
    name: 'particles',
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    // Sem mascara o PointsMaterial desenha quadrados, e com sizeAttenuation os
    // pontos que passam perto da camera viram blocos enormes no meio da tela.
    // O degrade radial transforma esses em bokeh, que e o que a passagem rapida
    // deveria parecer.
    map: sprite,
    // sem depthWrite os pontos nao recortam o que vem depois deles; sao poeira,
    // nao geometria
    depthWrite: false,
  });

  const object = new Points(geometry, material);
  object.name = 'particles';

  let peak = 0.5; // vem do tema

  const intensity = createTween({
    stage,
    duration: fade,
    onUpdate: paint,
  });

  function paint() {
    material.opacity = intensity.value * peak;
    object.visible = material.opacity > 0.001;
  }

  return {
    object,

    applyTheme(preset) {
      material.color.setHex(preset.ui.particle);
      peak = preset.ui.particleOpacity;
      paint();
    },

    /** 0 = invisivel, 1 = cheio. A navegacao acende no voo e baixa na chegada. */
    setIntensity(next) {
      intensity.to(Math.min(Math.max(next, 0), 1));
    },

    dispose() {
      intensity.dispose();
      geometry.dispose();
      material.dispose();
      sprite.dispose();
    },
  };

  /**
   * Abre um vazio em volta do texto do about: um ponto atras da moldura, no
   * eixo do olhar, vira sujeira em cima da leitura.
   */
  function insideRoom(x, y, z) {
    const { distance, height, aspect } = config.room;
    // a moldura muda de proporcao com a janela; o vazio e cavado pela maior
    // largura possivel, para nao depender do tamanho da tela de quem abre
    return (
      Math.abs(x) < height * aspect.max * 0.55 &&
      Math.abs(y) < height * 0.55 &&
      z > -distance - 1.2 &&
      z < -distance + 1.2
    );
  }
}

/** Disco com borda suave, desenhado em canvas - nenhum arquivo a baixar. */
function dotTexture(resolution = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;

  const context = canvas.getContext('2d');
  const half = resolution / 2;
  const gradient = context.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, resolution, resolution);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

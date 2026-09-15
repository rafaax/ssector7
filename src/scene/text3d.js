import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import fontData from '../assets/font.json';

/**
 * Texto extrudado, feito da mesma chapa que o logo.
 *
 * A fonte e o recorte gerado por scripts/build-font.mjs - 16 KB de glifos, nao
 * os 335 KB do TTF. O parse e caro o suficiente para valer o cache: uma vez por
 * sessao, mesmo que apareca meia duzia de rotulos.
 */
let parsedFont = null;

function getFont() {
  if (!parsedFont) parsedFont = new FontLoader().parse(fontData);
  return parsedFont;
}

/**
 * @param {string} text
 * @param {object} [options]
 * @param {number} [options.size]      altura em unidades de mundo
 * @param {number} [options.depth]     espessura da extrusao
 * @param {number} [options.tracking]  espacamento entre letras, em multiplos de size
 * @param {{x: number, y: number}} [options.padding]  folga da area clicavel,
 *   por padrao proporcional a `size` (alvo de toque confortavel no celular)
 * @returns {{ object: Group, mesh: Mesh, target: Mesh, applyTheme: Function, setHighlight: Function, dispose: Function }}
 */
export function createText3D(text, options = {}) {
  const {
    size = 0.09,
    depth = 0.024,
    tracking = 0.18,
    curveSegments = 8,
    // proporcional ao tamanho da letra: o alvo cresce junto com o rotulo, em
    // vez de engolir a tela quando o texto e pequeno
    padding = { x: size * 0.7, y: size * 1.3 },
    name = 'text3d',
  } = options;

  const geometry = layout(text, { size, depth, tracking, curveSegments });

  // As tampas sao MeshBasicMaterial de proposito: a cor precisa ser exata para
  // o repouso e o hover serem dois valores previsiveis, e material sem luz e
  // imune a mudanca de iluminacao entre temas. As paredes ficam com
  // MeshStandardMaterial, iguais as do logo, para a peca ganhar volume quando o
  // usuario gira a cena - e sumirem no fundo quando ele nao gira.
  const face = new MeshBasicMaterial({ name: `${name}:face` });
  const side = new MeshStandardMaterial({ name: `${name}:side` });

  const mesh = new Mesh(geometry, [face, side]);
  mesh.name = `${name}:mesh`;

  // Area clicavel separada da letra.
  //
  // Mirar nos glifos nao funciona: o raio passa pelos buracos e - pior - o
  // centro geometrico de "about us" cai bem no espaco entre as duas palavras,
  // entao o ponto mais obvio para o usuario apontar era justamente o unico que
  // nao acertava nada. O retangulo tambem e o que da um alvo de toque decente
  // no celular, onde nao existe mira fina.
  //
  // material.visible = false: o renderer pula o desenho, mas o raycaster nao
  // olha essa propriedade - que e exatamente o que se quer aqui.
  const box = geometry.boundingBox;
  const hitGeometry = new PlaneGeometry(
    box.max.x - box.min.x + padding.x * 2,
    box.max.y - box.min.y + padding.y * 2,
  );
  const hitMaterial = new MeshBasicMaterial({ name: `${name}:hit`, visible: false });
  const target = new Mesh(hitGeometry, hitMaterial);
  target.name = `${name}:hit`;
  target.position.z = depth * 0.5;

  const object = new Group();
  object.name = name;
  object.add(mesh, target);

  const rest = new Color();
  const active = new Color();
  let highlight = 0;

  function paint() {
    face.color.copy(rest).lerp(active, highlight);
  }

  return {
    object,
    mesh,
    /** O que o raycaster testa. */
    target,

    applyTheme(preset) {
      rest.setHex(preset.ui.dim);
      active.setHex(preset.ui.line);
      paint();

      side.color.setHex(preset.body.color);
      side.emissive.setHex(preset.body.emissive);
      side.emissiveIntensity = preset.body.emissiveIntensity;
      side.metalness = preset.body.metalness;
      side.roughness = preset.body.roughness;
      side.envMapIntensity = preset.body.envMapIntensity;
      side.needsUpdate = true;
    },

    /** 0 = repouso, 1 = aceso. O picker anima esse valor. */
    setHighlight(amount) {
      highlight = Math.min(Math.max(amount, 0), 1);
      paint();
    },

    dispose() {
      geometry.dispose();
      hitGeometry.dispose();
      face.dispose();
      side.dispose();
      hitMaterial.dispose();
    },
  };
}

/**
 * Monta a linha letra por letra para poder abrir o espacamento.
 *
 * TextGeometry so aceita a string inteira e usa as metricas da fonte, sem
 * tracking - e o site inteiro e escrito com letter-spacing largo (style.css).
 * Cada glifo vira uma geometria propria, deslocada no X; depois tudo funde em
 * uma so, para o botao custar um draw call por material em vez de um por letra.
 *
 * mergeGeometries(geoms, true) nao serve aqui: ele numera os grupos pela ordem
 * das geometrias, o que jogaria fora a separacao entre tampa (0) e parede (1)
 * que o ExtrudeGeometry produz. Por isso os grupos sao remontados na mao.
 */
function layout(text, { size, depth, tracking, curveSegments }) {
  const font = getFont();
  const unit = size / font.data.resolution;
  const spaceAdvance = font.data.glyphs[' '].ha * unit;

  const parts = [];
  let cursor = 0;

  for (const char of text) {
    const glyph = font.data.glyphs[char];
    if (!glyph) {
      console.warn(`[ssector7] glifo ausente na fonte: "${char}" (rode npm run build:font)`);
      cursor += spaceAdvance + tracking * size;
      continue;
    }

    if (char.trim() !== '') {
      const geometry = new TextGeometry(char, {
        font,
        size,
        depth,
        curveSegments,
        bevelEnabled: false,
      });
      geometry.translate(cursor, 0, 0);
      parts.push(geometry);
    }

    cursor += glyph.ha * unit + tracking * size;
  }

  const groups = [];
  let offset = 0;
  for (const geometry of parts) {
    for (const group of geometry.groups) {
      groups.push([offset + group.start, group.count, group.materialIndex]);
    }
    offset += geometry.attributes.position.count;
  }

  const merged = mergeGeometries(parts, false);
  for (const geometry of parts) geometry.dispose();
  for (const group of groups) merged.addGroup(...group);

  merged.center();
  merged.computeBoundingBox();
  return merged;
}

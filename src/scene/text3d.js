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

let parsedFont = null;

function getFont() {
  if (!parsedFont) parsedFont = new FontLoader().parse(fontData);
  return parsedFont;
}

export function createText3D(text, options = {}) {
  const {
    size = 0.09,
    depth = 0.024,
    tracking = 0.18,
    curveSegments = 8,
    padding = { x: size * 0.7, y: size * 1.3 },
    name = 'text3d',
  } = options;

  const geometry = layout(text, { size, depth, tracking, curveSegments });

  const face = new MeshBasicMaterial({ name: `${name}:face` });
  const side = new MeshStandardMaterial({ name: `${name}:side` });

  const mesh = new Mesh(geometry, [face, side]);
  mesh.name = `${name}:mesh`;

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

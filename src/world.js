import { Group } from 'three';
import { loadLogo, applyMaterials } from './loadLogo.js';
import { createText3D } from './scene/text3d.js';
import { createRoom } from './scene/room.js';
import { createParticles } from './scene/particles.js';
import { config } from './config.js';
import modelUrl from './assets/logo.glb?url';

export async function createWorld({ stage, onProgress } = {}) {
  const root = new Group();
  root.name = 'world';

  const themed = [];
  const disposers = [];
  const interactives = [];

  const home = new Group();
  home.name = 'home';
  root.add(home);

  const logo = await loadLogo(modelUrl, onProgress);
  home.add(logo);
  themed.push((preset) => applyMaterials(logo, preset));
  disposers.push(() => disposeTree(logo));

  const particles = createParticles({ stage });
  root.add(particles.object);
  themed.push((preset) => particles.applyTheme(preset));
  disposers.push(() => particles.dispose());

  const room = createRoom();
  room.object.visible = false;
  room.setAspect(stage.camera.aspect);
  stage.registerResize((width, height) => room.setAspect(width / height));
  root.add(room.object);
  themed.push((preset) => room.applyTheme(preset));
  disposers.push(() => room.dispose());

  const backLabel = label(
    config.room.back.label,
    { x: 0, y: -config.room.height * 0.5 + config.room.back.inset, z: 0 },
    'home',
    config.room.back.size,
  );
  room.object.add(backLabel.object);

  const stations = {
    home: {
      id: 'home',
      focus: home,
      direction: config.camera.direction,
      ambience: 0,
      prepare: () => {
        home.visible = true;
      },
      dismiss: () => {
        home.visible = false;
      },
    },

    about: {
      id: 'about',
      focus: room.focus,
      direction: { x: 0, y: 0, z: 1 },
      get fitOffset() {
        const { narrow, wide } = config.room.fitOffset;
        const { min, max } = config.room.aspect;
        const t = Math.min(Math.max((stage.camera.aspect - min) / (max - min), 0), 1);
        return narrow + (wide - narrow) * t;
      },
      ambience: 0.14,
      controls: {
        minPolarAngle: Math.PI / 2 - 0.3,
        maxPolarAngle: Math.PI / 2 + 0.3,
        minAzimuthAngle: -0.3,
        maxAzimuthAngle: 0.3,
        minDistanceFactor: 0.7,
        maxDistanceFactor: 1.4,
      },
      prepare: () => {
        room.object.visible = true;
      },
      dismiss: () => {
        room.object.visible = false;
      },
    },
  };

  return {
    root,
    logo,
    home,
    room,
    particles,
    stations,
    interactives,

    applyTheme(preset) {
      for (const apply of themed) apply(preset);
    },

    dispose() {
      for (const dispose of disposers) dispose();
    },
  };

  function label(text, position, target, size = config.button.size) {
    const item = createText3D(text, {
      size,
      depth: config.button.depth,
      tracking: config.button.tracking,
      name: `label:${target}`,
    });

    item.object.position.set(position.x, position.y, position.z);
    item.object.userData.target = target;

    themed.push((preset) => item.applyTheme(preset));
    disposers.push(() => item.dispose());
    interactives.push(item);

    return item;
  }
}

export function disposeTree(object) {
  object.traverse((node) => {
    node.geometry?.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) material?.dispose();
  });
}

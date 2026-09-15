import { Group } from 'three';
import { loadLogo, applyMaterials } from './loadLogo.js';
import { createText3D } from './scene/text3d.js';
import { createRoom } from './scene/room.js';
import { createParticles } from './scene/particles.js';
import { config } from './config.js';
import modelUrl from './assets/logo.glb?url';

/**
 * Monta a cena e e a unica dona dela.
 *
 * Tudo que existe em 3D entra aqui, e cada peca se registra em duas listas:
 *   - `themed`       - recebe o preset a cada troca de tema
 *   - `interactives` - o que o raycaster testa (e so isso: o logo tem 89 mil
 *                      triangulos e nunca deve entrar nessa lista)
 *
 * As estacoes sao os lugares navegaveis, e sao dado, nao codigo: acrescentar
 * uma secao no futuro e acrescentar uma estacao aqui e um rotulo que aponte
 * para ela - a navegacao nao muda. Cada uma pode trazer
 *   `direction` - de onde a camera olha
 *   `controls`  - limites de orbita proprios, mesclados sobre config.controls
 *   `prepare`   - roda quando o voo para la comeca
 *   `dismiss`   - roda quando outro lugar e alcancado
 *
 * @returns {Promise<object>}
 */
export async function createWorld({ stage, onProgress } = {}) {
  const root = new Group();
  root.name = 'world';

  const themed = [];
  const disposers = [];
  const interactives = [];

  // --- home: o logo e o rotulo que leva ao about ---------------------------

  // A home e um grupo, nao o logo direto: o botao entra aqui tambem, e o
  // enquadramento da estacao precisa considerar os dois juntos.
  const home = new Group();
  home.name = 'home';
  root.add(home);

  const logo = await loadLogo(modelUrl, onProgress);
  home.add(logo);
  themed.push((preset) => applyMaterials(logo, preset));
  disposers.push(() => disposeTree(logo));

  const aboutLabel = label(config.button.label, config.button.position, 'about');
  home.add(aboutLabel.object);

  const particles = createParticles({ stage });
  root.add(particles.object);
  themed.push((preset) => particles.applyTheme(preset));
  disposers.push(() => particles.dispose());

  // --- about: a sala atras do logo ----------------------------------------

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
      // a home e o vazio: nenhuma poeira em repouso
      ambience: 0,
      prepare: () => {
        home.visible = true;
      },
      // Fora da home o logo esta atras da camera: esconder economiza 89 mil
      // triangulos por frame enquanto o visitante le o texto.
      dismiss: () => {
        home.visible = false;
      },
    },

    about: {
      id: 'about',
      focus: room.focus,
      direction: { x: 0, y: 0, z: 1 },
      fitOffset: config.room.fitOffset,
      ambience: 0.14,
      // A sala e chapada e de frente: orbitar por tras dela nao mostraria nada.
      // Um pouco de folga mantem a cena viva sem quebrar a leitura.
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

    /** Reaplica o tema em todas as pecas registradas. */
    applyTheme(preset) {
      for (const apply of themed) apply(preset);
    },

    dispose() {
      for (const dispose of disposers) dispose();
    },
  };

  /** Rotulo 3D clicavel que leva a uma estacao. */
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

/** Libera geometrias e materiais de uma subarvore. */
export function disposeTree(object) {
  object.traverse((node) => {
    node.geometry?.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) material?.dispose();
  });
}

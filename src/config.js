// Todos os numeros ajustaveis da cena ficam aqui.

export const config = {
  // 'auto' decide pelo relogio local do visitante; 'dark' ou 'light' fixam um.
  //   dark  - reproduz o logo.png: fundo preto, letra preta (o miolo da letra
  //           nao e geometria, e o fundo aparecendo) e contorno branco.
  //   light - o inverso: fundo branco, letra branca, contorno preto.
  theme: 'auto',

  // Faixa do tema claro, em horas locais (aceita fracao: 6.5 = 06:30).
  // Fora dela vale o tema escuro.
  autoTheme: {
    lightFrom: 6,
    lightTo: 18,
  },

  toneMappingExposure: 1.0,

  camera: {
    fov: 35,
    near: 0.01,
    far: 100,
    // multiplicador do raio da bounding box ao enquadrar o modelo
    fitOffset: 1.12,
    // direcao de onde a camera olha o modelo (normalizada no uso)
    direction: { x: 0, y: 0.28, z: 1 },
  },

  controls: {
    dampingFactor: 0.06,
    minPolarAngle: 0.35,
    maxPolarAngle: 2.45,
    minDistanceFactor: 0.45, // x distancia de enquadramento
    maxDistanceFactor: 2.5,
  },

  // Animacao de entrada, roda uma vez no load. duration: 0 desliga.
  intro: {
    duration: 1.6,
    fromScale: 0.82,
    fromSpin: -0.9, // radianos a mais no inicio da animacao de entrada
  },

  lights: {
    // Luz baixa de proposito: as paredes devem ficar quase na cor do fundo,
    // como a letra preta do logo.png. So o contorno emissivo salta.
    key: { color: 0xffffff, intensity: 1.6, position: { x: 2, y: 3, z: 2.5 } },
    rim: { color: 0xffffff, intensity: 1.2, position: { x: -2.5, y: 1.2, z: -2 } },
    fill: { color: 0xffffff, intensity: 0.2 },
  },

  /**
   * Cada tema descreve os dois papeis da malha:
   *   outline - as faces da frente e de tras da extrusao (material chrome_face
   *             no GLB). Vistas de frente, sao exatamente o contorno do logo.
   *   body    - as paredes laterais da extrusao (material steel_edge). Ficam
   *             na cor do fundo, para a peca ler como massa chapada e so o
   *             contorno saltar, como no logo.png.
   * `background` alimenta a meta theme-color; o fundo visivel vem do CSS.
   */
  themes: {
    dark: {
      background: 0x07090c,
      // Sem environment map: o RoomEnvironment e claro demais e lava a parede
      // escura (mesmo a 8% de intensidade ela subia de 1 para 29/255).
      // Aqui o visual e grafico e chapado, quem ilumina sao so as luzes.
      environment: false,
      // Sem tonemapping o branco emissivo sai exatamente 255, como no png.
      toneMapping: 'none',
      outline: {
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 1.0,
        metalness: 0.0,
        roughness: 0.4,
        envMapIntensity: 0.3,
      },
      body: {
        color: 0x0b0d10,
        emissive: 0x000000,
        emissiveIntensity: 0.0,
        metalness: 0.0,
        roughness: 0.95,
        envMapIntensity: 0.08,
      },
    },

    // Fase 2: fundo branco, letra branca, contorno preto.
    light: {
      background: 0xf7f7f8,
      // No tema claro a massa e branca: o environment ajuda a modelar a forma.
      environment: true,
      toneMapping: 'aces',
      outline: {
        color: 0x000000,
        emissive: 0x000000,
        emissiveIntensity: 0.0,
        metalness: 0.0,
        roughness: 0.5,
        envMapIntensity: 0.1,
      },
      body: {
        color: 0xf2f3f5,
        emissive: 0x000000,
        emissiveIntensity: 0.0,
        metalness: 0.0,
        roughness: 0.9,
        envMapIntensity: 0.35,
      },
    },
  },
};


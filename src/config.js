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

  /**
   * Padroes dos rotulos 3D clicaveis (hoje so o "back" dentro da sala - o
   * "about us" da home virou o header em HTML, veja src/style.css). Tudo em
   * unidades de mundo, com o logo centrado na origem medindo 1.87 de largura
   * por 0.64 de altura. `depth` e a espessura do logo (0.0236), para o rotulo
   * parecer recortado da mesma chapa; `tracking` acompanha o letter-spacing
   * largo do CSS.
   */
  button: {
    size: 0.072,
    depth: 0.0236,
    tracking: 0.24,
    // quanto o rotulo cresce no hover, e em quanto tempo
    hover: { scale: 1.08, duration: 0.18 },
  },

  /**
   * A sala do about: um lugar atras do logo, no eixo Z.
   * `distance` e o quanto ela fica atras do plano do logo (que esta em z=0).
   */
  room: {
    distance: 5,
    height: 0.95,
    /**
     * A moldura acompanha a proporcao da janela, dentro desses limites. Uma
     * moldura deitada fixa viraria uma tarja no meio da tela num celular em pe,
     * com o texto derramando para fora dela.
     */
    aspect: { min: 0.62, max: 1.6 },
    corner: 0.16, // comprimento de cada bracete de canto
    // o rotulo de volta, dentro da moldura, rente a borda de baixo
    back: { label: 'back', size: 0.026, inset: 0.075 },
    /**
     * Folga ao redor da moldura, interpolada pela proporcao da janela.
     * No desktop sobra tela, entao os bracetes respiram longe da borda. Num
     * celular em pe cada pixel de altura conta: a moldura quase encosta nas
     * bordas, e e isso que faz um paragrafo a mais caber sem encolher a letra.
     */
    fitOffset: { narrow: 1.06, wide: 1.32 },
  },

  /**
   * O voo entre estacoes.
   * `arc` desloca o ponto de controle da curva: e ele que faz a camera subir e
   * passar por cima do logo (borda em y=0.32) em vez de atravessar a geometria
   * em linha reta - nada de clipping contra o near plane. Zerar o Y faz a
   * camera furar a peca, se um dia essa for a leitura desejada.
   * `fovPunch` e um empurrao de campo de visao no meio do trajeto: custa nada e
   * e o que faz a travessia parecer velocidade em vez de um corte.
   */
  flight: {
    duration: 1.8,
    arc: { x: 0, y: 0.9, z: 0 },
    fovPunch: 6,
  },

  /**
   * A tela de carregamento: um globo de arames girando (src/loader.js).
   * `samples` e quantos pontos desenham cada circulo - abaixo de ~100 a
   * silhueta facetiza; `fps` limita o redesenho, porque durante o carregamento
   * o processador e de quem esta baixando o modelo, nao da animacao.
   */
  loader: {
    density: 'regular', // sparse | regular | dense
    period: 10, // segundos por volta completa
    samples: 140,
    fps: 30,
  },

  /**
   * Poeira no corredor entre a home e a sala. `zNear`/`zFar` cobrem a
   * trajetoria inteira (o logo esta em z=0 e a sala em z=-5); `fade` e o tempo
   * de acender e apagar.
   */
  particles: {
    count: 2800,
    size: 0.021,
    spread: { x: 2.8, y: 1.8, zNear: 2.5, zFar: -8.5 },
    fade: 0.8,
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
   * `fallbackImage` e o png mostrado quando nao ha WebGL ou o modelo falha -
   * um por tema, porque o traco precisa contrastar com o fundo.
   * `favicon` troca o icone da aba junto com o tema.
   */
  themes: {
    dark: {
      background: 0x07090c,
      fallbackImage: 'logo.png',
      favicon: {
        png: 'favicons/files/favicon-dark-192.png',
        pngSizes: '192x192',
        apple: 'favicons/files/favicon-dark-180.png',
      },
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
      /**
       * Papel `ui`: tudo que nao e o logo - o botao, a moldura da sala e as
       * particulas.
       *   dim  - cor de repouso do texto interativo. E o mesmo --fg do CSS,
       *          para o 3D e o HTML falarem com a mesma voz.
       *   line - cor no hover/foco. O salto de dim para line e o feedback.
       * O logo fica sozinho no branco puro emissivo: e ele o heroi, o botao e
       * subordinado.
       */
      ui: {
        line: 0xffffff,
        dim: 0x8b99a6,
        particle: 0xffffff,
        particleOpacity: 0.8,
      },
    },

    // Fase 2: fundo branco, letra branca, contorno preto.
    light: {
      background: 0xf7f7f8,
      fallbackImage: 'logo_light.png',
      // so existe o 512 na versao clara; o navegador reduz sem problema
      favicon: {
        png: 'favicons/files/favicon-light-512.png',
        pngSizes: '512x512',
        apple: 'favicons/files/favicon-light-512.png',
      },
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
      ui: {
        line: 0x000000,
        dim: 0x6b7480,
        particle: 0x2b3038,
        particleOpacity: 0.4,
      },
    },
  },
};


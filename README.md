# SSECTOR7

Visualizador web do logo 3D da SSECTOR7, em [three.js](https://threejs.org/) + [Vite](https://vite.dev/).

## Rodando

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # gera dist/ estatico
npm run preview    # serve o dist/
```

## Estrutura

```
source/             arquivos originais do logo (nao vao para a web)
  logo.obj/.mtl     export em texto, 45 MB
  logo.glb          export original, 9.6 MB
public/
  models/logo.glb   versao otimizada servida ao browser, 1.4 MB
  logo.png          logo 2D: favicon, og:image e fallback sem WebGL
src/
  main.js           bootstrap: carrega o modelo e registra as animacoes
  renderer.js       renderer, camera, OrbitControls, resize e render loop
  environment.js    environment map (RoomEnvironment) e luzes
  loadLogo.js       GLTFLoader + Meshopt, recentraliza e ajusta materiais
  config.js         todos os numeros da cena (cores, materiais, velocidades)
scripts/
  optimize-model.sh pipeline de compressao do GLB
```

## Otimizacao do modelo

`npm run optimize:model` regenera `public/models/logo.glb` a partir de
`source/logo.glb`, usando `gltf-transform`:

| etapa | efeito |
| --- | --- |
| `prune --keep-attributes false` | remove as UVs (o modelo nao tem textura nenhuma) |
| `weld` | funde vertices duplicados |
| `join` | 32 primitives viram 2 (uma por material) |
| `dedup` | remove accessors repetidos |
| `meshopt --level medium` | quantiza + `EXT_meshopt_compression` |

Resultado: **9.6 MB -> 1.4 MB**, com os 89.112 triangulos e a bounding box
preservados. Comparando o render do original com o do otimizado, 0,5% dos
pixels diferem em mais de 8/255 e a silhueta muda em 0,1% - visualmente igual.

O `simplify` ficou de fora de proposito: a malha e um contorno extrudado fino e
a decimacao come justamente a silhueta, que e o logo.

## Animacoes

O render loop expoe um ponto de extensao unico, em `src/renderer.js`:

```js
const stop = stage.registerUpdate((delta, elapsed) => {
  logo.rotation.y += 0.2 * delta;
});
// stop() remove o update
```

Hoje existem dois updates, ambos em `src/main.js`: a animacao de entrada
(`registerIntro`) e a rotacao automatica que pausa enquanto o usuario arrasta
(`registerAutoRotation`). Qualquer animacao nova entra pelo mesmo caminho, sem
mexer no renderer. Os parametros ficam em `src/config.js`.

`prefers-reduced-motion: reduce` desliga a entrada e a rotacao automatica.

## Deploy

O `dist/` e estatico e sobe em GitHub Pages, Vercel, Cloudflare Pages ou
Netlify sem alteracao. Se for GitHub Pages em subcaminho (`usuario.github.io/ssector7/`),
ajuste `base: '/ssector7/'` no `vite.config.js`.

import { defineConfig } from 'vite';

/**
 * Injeta no <head> o preload do modelo 3D com o nome ja hasheado pelo build.
 * O preload nao pode ser escrito a mao no index.html porque o nome do arquivo
 * muda a cada versao do modelo - e e ele que faz o download de 1,3 MB comecar
 * junto com o JS, em vez de so depois que o bundle roda.
 */
function preloadModel() {
  let base = '/';

  return {
    name: 'ssector7:preload-model',
    apply: 'build',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml(html, ctx) {
      const model = Object.keys(ctx.bundle ?? {}).find((file) => file.endsWith('.glb'));
      if (!model) return html;

      return {
        html,
        tags: [
          {
            tag: 'link',
            attrs: { rel: 'preload', as: 'fetch', crossorigin: '', href: `${base}${model}` },
            injectTo: 'head',
          },
        ],
      };
    },
  };
}

export default defineConfig({
  // Se um dia publicar em GitHub Pages sob /ssector7/, troque para base: '/ssector7/'.
  base: '/',
  assetsInclude: ['**/*.glb'],
  plugins: [preloadModel()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
});

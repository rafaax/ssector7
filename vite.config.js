import { defineConfig } from 'vite';

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
  base: '/',
  assetsInclude: ['**/*.glb'],
  plugins: [preloadModel()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
});

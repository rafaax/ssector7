import { defineConfig } from 'vite';

export default defineConfig({
  // Se um dia publicar em GitHub Pages sob /ssector7/, troque para base: '/ssector7/'.
  base: '/',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
});

import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// file:// 双击可玩专用：IIFE + 普通 script 标签
const deModule = {
  name: 'de-module',
  enforce: 'post',
  transformIndexHtml(html) {
    return html
      .replace(/<script type="module"( crossorigin)?>/g, '<script>')
      .replace(/<script type="module" src="([^"]*)"><\/script>/g, (m, s) => '<script src="' + s + '"><\/script>');
  },
};

export default defineConfig({
  base: './',
  resolve: { alias: { 'virtual:pwa-register': '/tools/pwa-stub.js' } },
  plugins: [viteSingleFile(), deModule],
  build: {
    outDir: 'dist-offline',
    sourcemap: false,
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } },
  },
});

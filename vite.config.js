import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // 部署到 GitHub Pages 子路径时由 CI 传 --base=/cat-match/；本地预览/开发走根
  base: process.env.CAT_MATCH_BASE || '/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '小猫咪消消乐',
        short_name: '猫咪消消乐',
        description: 'Vite + Phaser 猫咪消消乐 H5 小游戏',
        start_url: '/',
        display: 'standalone',
        background_color: '#faf6ef',
        theme_color: '#faf6ef',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,json,ico,svg,woff2}'],
        navigateFallback: '/index.html',
      },
      devOptions: { enabled: false },
    }),
  ],
  build: { outDir: 'dist', sourcemap: false },
  server: { host: '0.0.0.0', port: 5173 },
  preview: { host: '0.0.0.0', port: 4173 },
});

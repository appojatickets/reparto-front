import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/** La versión que se está viendo: el commit que Vercel publicó (para saber si la app ya se actualizó). */
const version = (process.env['VERCEL_GIT_COMMIT_SHA'] ?? 'local').slice(0, 7);

export default defineConfig({
  define: { __VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // El registro lo hace main.tsx (con recarga automática al haber una versión nueva).
      injectRegister: false,
      manifest: {
        name: 'Reparto',
        short_name: 'Reparto',
        lang: 'es-CL',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { navigateFallback: '/index.html' },
    }),
  ],
});

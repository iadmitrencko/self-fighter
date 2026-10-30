import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import symfony from 'vite-plugin-symfony';

// The browser reaches the dev server through the port published by Docker.
const publicPort = Number(process.env.VITE_PUBLIC_PORT ?? 5173);

export default defineConfig({
  plugins: [
    react(),
    symfony({
      originOverride: `http://localhost:${publicPort}`,
      refresh: ['../backend/templates'],
    }),
  ],
  build: {
    outDir: '../backend/public/build',
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        app: './src/app/main.tsx',
        site: './src/site/main.ts',
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: { clientPort: publicPort },
  },
});

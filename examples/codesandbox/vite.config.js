import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// CodeSandbox devbox previews proxy to this dev server with a *.csb.app /
// *.csb.run Host header, and Vite 6 rejects foreign hosts by default.
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: ['.csb.app', '.csb.run'],
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        card: resolve(__dirname, 'card.html'),
        address: resolve(__dirname, 'address.html'),
        'express-checkout': resolve(__dirname, 'express-checkout.html'),
      },
    },
  },
});

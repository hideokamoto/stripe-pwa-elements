import { defineConfig } from 'vite';

// CodeSandbox devbox previews proxy to this dev server with a *.csb.app /
// *.csb.run Host header, and Vite 6 rejects foreign hosts by default.
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: ['.csb.app', '.csb.run'],
  },
});

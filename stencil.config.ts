import { Config } from '@stencil/core';
import { sass } from '@stencil/sass';

export const config: Config = {
  namespace: 'stripe-elements',
  outputTargets: [
    {
      type: 'dist',
      esmLoaderPath: '../loader',
    },
    {
      type: 'dist-custom-elements',
      // Auto-register each component on import so consumers can use a bare
      // `import 'stripe-pwa-elements/dist/components/<tag>';` in bundler-based
      // setups (Vite/webpack/Rollup, Capacitor). This avoids the runtime
      // dynamic-import the lazy `dist` loader relies on, which can fail with
      // "Failed to fetch dynamically imported module" under Vite.
      customElementsExportBehavior: 'auto-define-custom-elements',
    },
    {
      type: 'docs-readme',
    },
    {
      type: 'www',
      serviceWorker: null, // disable service workers
    },
  ],
  plugins: [sass()],
};

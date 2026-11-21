import { fileURLToPath } from 'node:url';
import { defineVitestConfig } from '@stencil/vitest/config';
import { stencilVitestPlugin } from '@stencil/vitest/plugin';
import type { Plugin } from 'vite';

const junitOutput = process.env.VITEST_JUNIT_OUTPUT_FILE ?? process.env.JEST_JUNIT_OUTPUT_FILE;

/**
 * Stencil's `componentExport: 'customelement'` registers the tag but does not
 * emit a named export. Unit tests still do `new StripeModal()`, so re-export
 * the compiled class after the plugin transform.
 */
const stencilPlugin = (): Plugin => {
  const plugin = stencilVitestPlugin() as Plugin;
  const original = plugin.transform;

  plugin.transform = async function (this: unknown, code: string, id: string, options?: unknown) {
    const transform =
      typeof original === 'function'
        ? original
        : original && typeof original === 'object' && 'handler' in original
          ? (original as { handler: typeof original }).handler
          : undefined;

    const result = transform ? await (transform as Function).call(this, code, id, options) : null;

    if (result == null || typeof result === 'string') {
      return result;
    }

    const transformed = result.code;
    const match = transformed?.match(/const (\w+) = class extends HTMLElement/);

    if (transformed && match && !transformed.includes(`export { ${match[1]} }`)) {
      return {
        ...result,
        code: `${transformed}\nexport { ${match[1]} };\n`,
      };
    }

    return result;
  };

  return plugin;
};

const stencilTest = {
  environment: 'stencil' as const,
  environmentOptions: {
    stencil: {
      // mock-doc matches the previous Stencil Jest runner (snapshots / toEqualHtml).
      domEnvironment: 'mock-doc' as const,
    },
  },
  setupFiles: ['./src/utils/test-setup.ts'],
  exclude: ['**/node_modules/**', '**/e2e/**', '**/*.e2e.ts', '**/*.pw.ts'],
};

export default defineVitestConfig({
  stencilConfig: './stencil.config.ts',
  plugins: [stencilPlugin()],
  resolve: {
    alias: {
      // Spec tests keep `import { newSpecPage } from '@stencil/core/testing'`.
      '@stencil/core/testing': fileURLToPath(new URL('./src/testing/spec-page.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    maxWorkers: process.env.CI ? 1 : undefined,
    reporters: junitOutput ? ['default', ['junit', { outputFile: junitOutput }]] : ['default'],
    projects: [
      {
        test: {
          ...stencilTest,
          name: 'unit',
          include: ['src/utils/**/*.spec.ts', 'src/services/**/*.spec.ts', 'src/**/*.unit.spec.ts', 'packages/hono-stripe-elements/src/**/*.spec.ts'],
        },
      },
      {
        test: {
          ...stencilTest,
          name: 'component',
          include: ['src/**/*.spec.tsx'],
        },
      },
    ],
  },
});

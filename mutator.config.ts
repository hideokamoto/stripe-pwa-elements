import { defineConfig } from '@mizchi/mutator';

export default defineConfig({
  include: ['src/services/**/*.ts', 'src/utils/**/*.ts'],
  exclude: ['**/*.spec.ts', '**/*.unit.spec.ts', 'src/utils/test-setup.ts', 'src/testing/**'],
  runner: 'vitest',
  vitestConfig: 'vitest.config.mts',
  reporters: ['text', 'json'],
  reportDir: '.mutator/report',
});

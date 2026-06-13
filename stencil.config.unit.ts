import { Config } from '@stencil/core';
import { config as baseConfig } from './stencil.config';

/**
 * Stencil configuration for unit tests
 * Matches: src/utils/, src/services/, and *.unit.spec.ts files
 */
export const config: Config = {
  ...baseConfig,
  testing: {
    ...baseConfig.testing,
    testRegex: '(src/(utils|services)/.*\\.spec\\.ts$|\\.unit\\.spec\\.ts$)',

    // Coverage collection — restrict to the main src/ tree so worktrees and
    // generated files are excluded from the report.
    collectCoverage: true,
    collectCoverageFrom: [
      'src/**/*.{ts,tsx}',
      '!src/**/*.spec.{ts,tsx}',
      '!src/**/*.e2e.{ts,tsx}',
      '!src/**/test/**',
      '!src/components.d.ts',
      '!src/index.ts',
    ],
    coverageReporters: ['text', 'lcov', 'json-summary'],
    coverageDirectory: 'coverage',

    // Thresholds set at current measured levels (services ~85%, utils ~91%,
    // components 22-58% — overall unit-test baseline).
    // Target: ratchet toward 80% across all metrics over time.
    // Current overall per-category:
    //   services: ~85% stmts / ~78% branch / ~87% funcs / ~85% lines
    //   utils:    ~91% stmts / ~83% branch / ~97% funcs / ~89% lines
    //   components (unit tests): ~22-58% — lower because component tests focus
    //     on integration; pure unit coverage of components is limited by design.
    // The global threshold below reflects the blended actual baseline; bump it
    // upward as more component unit tests are added toward the 80% target.
    coverageThreshold: {
      global: {
        statements: 45,
        branches: 35,
        functions: 45,
        lines: 45,
      },
      // Services and utils have stronger unit test coverage — enforce higher
      // thresholds for those directories to catch regressions in well-tested code.
      './src/services/': {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
      './src/utils/': {
        statements: 85,
        branches: 75,
        functions: 90,
        lines: 85,
      },
    },
  },
};

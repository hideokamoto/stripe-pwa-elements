import { Config } from '@stencil/core';
import { config as baseConfig } from './stencil.config';

/**
 * Coverage is opt-in via the COVERAGE env var. The default CI unit job runs
 * with CircleCI Smarter Testing, which splits the suite across parallel
 * containers (each runs only a slice via --testPathPattern). Enforcing global
 * coverage thresholds on a partial slice would always fail, so coverage is
 * collected only in the dedicated full-suite `coverage` job (and locally via
 * `COVERAGE=true pnpm run test:unit`).
 */
const coverageEnabled = process.env.COVERAGE === 'true';

/**
 * Stencil configuration for unit tests
 * Matches: src/utils/, src/services/, and *.unit.spec.ts files
 */
export const config: Config = {
  ...baseConfig,
  testing: {
    ...baseConfig.testing,
    testRegex: '(src/(utils|services)/.*\\.spec\\.ts$|\\.unit\\.spec\\.ts$)',

    ...(coverageEnabled
      ? {
          // Coverage scope — restrict to the code this unit job actually
          // exercises: services/ and utils/. Components are covered by the
          // component test job, so including them here would report ~0% and
          // skew the totals.
          collectCoverage: true,
          collectCoverageFrom: [
            'src/services/**/*.{ts,tsx}',
            'src/utils/**/*.{ts,tsx}',
            '!src/**/*.spec.{ts,tsx}',
            '!src/**/*.e2e.{ts,tsx}',
            '!src/**/test/**',
          ],
          coverageReporters: ['text', 'lcov', 'json-summary'],
          coverageDirectory: 'coverage',

          // Thresholds set just below the current measured baseline so
          // regressions fail CI while leaving a little headroom. Scoped to
          // services/ + utils/ (see collectCoverageFrom above).
          // Current measured (services + utils blended):
          //   ~87% stmts / ~79% branch / ~90% funcs / ~86% lines
          //   services: ~85% stmts / ~78% branch / ~87% funcs / ~85% lines
          //   utils:    ~91% stmts / ~83% branch / ~97% funcs / ~89% lines
          coverageThreshold: {
            global: {
              statements: 80,
              branches: 70,
              functions: 85,
              lines: 80,
            },
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
        }
      : {}),
  },
};

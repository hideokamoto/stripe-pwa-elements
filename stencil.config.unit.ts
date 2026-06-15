import { Config } from '@stencil/core';
import { config as baseConfig } from './stencil.config';

// When CIRCLECI_COVERAGE is set, activate the CircleCI Smarter Testing coverage
// environment and reporter so the test runner collects per-test file coverage
// and writes it to the path specified by the env var. This is a no-op in all
// other environments (local dev, CI without the var, component test runs).
const circleciCoverageEnabled = Boolean(process.env.CIRCLECI_COVERAGE);

const coverageOverrides: Config['testing'] = circleciCoverageEnabled
  ? {
      // Extends Stencil's own environment to keep its DOM/global setup intact
      // while adding V8 coverage collection. Uses a relative path so Stencil
      // resolves it to an absolute path from the config file's directory.
      testEnvironment: './src/testing/circleci-stencil-environment.cjs',
      reporters: [
        ...((baseConfig.testing?.reporters as unknown[]) ?? ['default']),
        '@jsr/circleci__jest-circleci-coverage/reporter',
      ],
    }
  : {};

/**
 * Stencil configuration for unit tests
 * Matches: src/utils/, src/services/, and *.unit.spec.ts files
 */
export const config: Config = {
  ...baseConfig,
  testing: {
    ...baseConfig.testing,
    testRegex: '(src/(utils|services)/.*\\.spec\\.ts$|\\.unit\\.spec\\.ts$)',
    ...coverageOverrides,
  },
};

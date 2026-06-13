import { Config } from '@stencil/core';
import path from 'path';
import { config as baseConfig } from './stencil.config';

/**
 * Stencil configuration for unit tests
 * Matches: src/utils/, src/services/, and *.unit.spec.ts files
 *
 * When CIRCLECI_COVERAGE is set (by .circleci/test-suites.yml), activates the
 * local CircleCI coverage plugin so Smarter Testing's Test Impact Analysis
 * receives test↔source mapping data.  Without that env var the config is
 * identical to before — zero impact on local/non-coverage runs.
 */

const coverageDir = path.join(__dirname, 'src', 'testing', 'circleci-coverage');
const coverageEnabled = !!process.env.CIRCLECI_COVERAGE;

// Build the coverage-aware additions only when the env var is present.
// Spread into testing below so the keys are simply absent when disabled.
const coverageTesting: Config['testing'] = coverageEnabled
  ? {
      testEnvironment: path.join(coverageDir, 'environment-node.js'),
      reporters: [
        ...(Array.isArray(baseConfig.testing?.reporters) ? baseConfig.testing.reporters : ['default']),
        path.join(coverageDir, 'reporter.js'),
      ],
    }
  : {};

export const config: Config = {
  ...baseConfig,
  testing: {
    ...baseConfig.testing,
    testRegex: '(src/(utils|services)/.*\\.spec\\.ts$|\\.unit\\.spec\\.ts$)',
    ...coverageTesting,
  },
};

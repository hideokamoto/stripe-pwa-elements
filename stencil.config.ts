import { Config } from '@stencil/core';
import { sass } from '@stencil/sass';

// When running inside CircleCI (CI=true) register the jest-junit reporter so
// store_test_results can ingest JUnit XML for Smarter Testing (timing data,
// impact analysis, failed-test reruns).
//
// The output path is NOT set here; .circleci/test-suites.yml passes the full
// path as JEST_JUNIT_OUTPUT_FILE="<< outputs.junit >>" in the `run` command,
// and jest-junit reads that env var automatically.
const ciReporters: Config['testing'] = process.env.CI
  ? {
      reporters: [
        'default',
        ['jest-junit', { addFileAttribute: true }],
      ],
    }
  : {};

export const config: Config = {
  namespace: 'stripe-elements',
  outputTargets: [
    {
      type: 'dist',
      esmLoaderPath: '../loader',
    },
    {
      type: 'dist-custom-elements',
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
  testing: {
    testPathIgnorePatterns: ['node_modules'],
    setupFilesAfterEnv: ['<rootDir>/src/utils/test-setup.ts'],
    ...ciReporters,
  },
};

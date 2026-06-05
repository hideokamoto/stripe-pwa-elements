import { Config } from '@stencil/core';
import { sass } from '@stencil/sass';

// When running inside CircleCI (CI=true) emit JUnit XML so that
// store_test_results can ingest timing data for smarter test splitting.
const ciReporters: Config['testing'] = process.env.CI
  ? {
      reporters: [
        'default',
        [
          'jest-junit',
          {
            // JEST_JUNIT_OUTPUT_DIR is set per-job in .circleci/config.yml
            // so unit and component results land in separate directories.
            outputDirectory: process.env.JEST_JUNIT_OUTPUT_DIR ?? './test-results',
            outputName: 'results.xml',
            addFileAttribute: 'true',
          },
        ],
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

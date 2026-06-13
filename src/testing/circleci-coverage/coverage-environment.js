'use strict';
// Local port of @circleci/jest-circleci-coverage's coverage-environment module.
// Creates a Jest environment subclass that wraps any base environment with
// per-test V8 coverage collection when CIRCLECI_COVERAGE is set.

const { mkdirSync, writeFileSync } = require('node:fs');
const { basename, resolve } = require('node:path');
const { V8CoverageCollector } = require('./v8-coverage-collector.js');
const { ENV_VAR, TMP_COVERAGE_DIR } = require('./constants.js');

/**
 * Returns a Jest environment class that adds V8 coverage collection to any
 * base environment (e.g. jest-environment-node).
 *
 * When CIRCLECI_COVERAGE is not set the class is a transparent pass-through;
 * it adds zero overhead to normal local runs.
 *
 * @param {new(config, context): object} Base - jest environment constructor
 * @returns {new(config, context): object}
 */
function createJestCircleCICoverageEnvironment(Base) {
  class JestCircleCICoverageEnvironment extends Base {
    constructor(config, context) {
      super(config, context);
      this.collector = new V8CoverageCollector();
      this.initialized = false;
      this.enabled = process.env[ENV_VAR] !== undefined;
      this.testPath = context.testPath;
      this.cwd = process.cwd();
      this.coverage = {};
    }

    async setup() {
      await super.setup();
      if (!this.enabled) return;
      await this.collector.connect();
      this.initialized = true;
    }

    async teardown() {
      if (this.initialized) {
        await this.collector.disconnect();
        this.initialized = false;

        // Build the per-suite coverage map: { sourceFile: { testKey: [1] } }
        // The [1] placeholder satisfies CircleCI's parser (it just needs ≥1 line).
        const output = {};
        for (const [testKey, paths] of Object.entries(this.coverage)) {
          for (const filePath of paths) {
            if (!output[filePath]) {
              output[filePath] = {};
            }
            if (!output[filePath][testKey]) {
              output[filePath][testKey] = [1];
            }
          }
        }

        mkdirSync(TMP_COVERAGE_DIR, { recursive: true });
        const testFileName = basename(this.testPath);
        const outFile = resolve(TMP_COVERAGE_DIR, `${testFileName}.json`);
        writeFileSync(outFile, JSON.stringify(output));
      }

      await super.teardown();
    }

    getVmContext() {
      return super.getVmContext();
    }

    async handleTestEvent(event) {
      if (!this.initialized) return;

      if (event.name === 'test_fn_start') {
        await this.collector.resetCoverage();
      }

      if (event.name === 'test_fn_success' || event.name === 'test_fn_failure') {
        const result = await this.collector.collectCoverage(this.cwd, this.testPath, event.test.name);
        this.coverage[result.testKey] = result.coveredFiles;
      }
    }
  }

  return JestCircleCICoverageEnvironment;
}

module.exports = { createJestCircleCICoverageEnvironment };

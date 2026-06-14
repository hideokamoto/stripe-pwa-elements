'use strict';
// Jest test environment that extends Stencil's own environment with
// per-test V8 coverage collection for CircleCI Smarter Testing.
// Only active when CIRCLECI_COVERAGE is set; otherwise behaves identically
// to Stencil's default jest-environment.js.
//
// This replicates the logic from @jsr/circleci__jest-circleci-coverage's
// environment and @jsr/circleci__v8-coverage-collector using only Node.js
// built-ins (node:inspector) so that no ESM/CJS interop is required at
// environment load time (Jest 29 loads environments via require()).

const StencilEnvironment = require('@stencil/core/testing/jest-environment.js');
const inspector = require('node:inspector');
const { promisify } = require('node:util');
const { mkdirSync, writeFileSync } = require('node:fs');
const { join, resolve, relative } = require('node:path');
const { tmpdir } = require('node:os');
const { fileURLToPath } = require('node:url');

const ENV_VAR = 'CIRCLECI_COVERAGE';
// Must match the value used by @jsr/circleci__jest-circleci-coverage/reporter
const TMP_COVERAGE_DIR =
  process.env.TMP_COVERAGE_DIR ||
  join(tmpdir(), 'circleci-coverage', require('node:path').basename(process.cwd()));

class CircleCIStencilEnvironment extends StencilEnvironment {
  constructor(config, context) {
    super(config, context);
    this._enabled = process.env[ENV_VAR] !== undefined;
    this._testPath = context.testPath;
    this._cwd = process.cwd();
    this._coverage = {};
    this._initialized = false;
    this._session = null;
    this._post = null;
  }

  async setup() {
    await super.setup();
    if (!this._enabled) return;

    this._session = new inspector.Session();
    this._post = promisify(this._session.post.bind(this._session));
    this._session.connect();
    await this._post('Profiler.enable');
    await this._post('Profiler.startPreciseCoverage', { callCount: true, detailed: false });
    this._initialized = true;
  }

  async teardown() {
    if (this._initialized && this._session && this._post) {
      await this._post('Profiler.stopPreciseCoverage');
      await this._post('Profiler.disable');
      this._session.disconnect();
      this._initialized = false;

      const output = {};
      for (const [testKey, paths] of Object.entries(this._coverage)) {
        for (const filePath of paths) {
          if (!output[filePath]) output[filePath] = {};
          if (!output[filePath][testKey]) output[filePath][testKey] = [1];
        }
      }

      mkdirSync(TMP_COVERAGE_DIR, { recursive: true });
      // Use full relative path as slug to avoid collisions between spec files
      // in different directories that share the same basename.
      const slug = relative(this._cwd, this._testPath).replace(/[/\\]/g, '_');
      const testCoverageFile = resolve(TMP_COVERAGE_DIR, `${slug}.json`);
      writeFileSync(testCoverageFile, JSON.stringify(output));
    }
    await super.teardown();
  }

  getVmContext() {
    return super.getVmContext();
  }

  async handleTestEvent(event) {
    // Delegate to Stencil's own handleTestEvent first (screenshot support)
    if (super.handleTestEvent) {
      await super.handleTestEvent(event);
    }

    if (!this._initialized || !this._post) return;

    if (event.name === 'test_fn_start') {
      // Drain accumulated coverage so next collect() reflects only this test
      await this._post('Profiler.takePreciseCoverage');
    }

    if (event.name === 'test_fn_success' || event.name === 'test_fn_failure') {
      const result = await this._post('Profiler.takePreciseCoverage');
      const testFile = relative(this._cwd, this._testPath);
      const testName = event.test.name;
      const testKey = `${testFile}!!${testName}|run`;

      const coveredFiles = result.result
        .map(s => s.url)
        .filter(url => {
          try {
            const u = new URL(url);
            return u.protocol === 'file:' && !u.pathname.includes('node_modules');
          } catch {
            return false;
          }
        })
        .map(url => relative(this._cwd, fileURLToPath(url)));

      this._coverage[testKey] = coveredFiles;
    }
  }
}

module.exports = CircleCIStencilEnvironment;

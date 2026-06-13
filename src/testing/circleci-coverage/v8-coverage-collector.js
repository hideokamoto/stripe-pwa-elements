'use strict';
// Local port of @circleci/v8-coverage-collector.
// Uses Node.js's built-in inspector API (CDP Profiler domain) to collect
// per-test V8 precise coverage — which lines each test actually executed.
// No external dependencies; works on Node.js 18+.

const inspector = require('node:inspector');
const { promisify } = require('node:util');
const { relative } = require('node:path');
const { fileURLToPath } = require('node:url');

class V8CoverageCollector {
  constructor() {
    this.session = new inspector.Session();
    this.post = promisify(this.session.post.bind(this.session));
  }

  /** Open the inspector session and start precise coverage. */
  async connect() {
    this.session.connect();
    await this.post('Profiler.enable');
    await this.post('Profiler.startPreciseCoverage', { callCount: true, detailed: false });
  }

  /** Stop precise coverage and close the inspector session. */
  async disconnect() {
    await this.post('Profiler.stopPreciseCoverage');
    await this.post('Profiler.disable');
    this.session.disconnect();
  }

  /** Reset the execution counters between tests (discard accumulated data). */
  async resetCoverage() {
    await this.post('Profiler.takePreciseCoverage');
  }

  /**
   * Take a coverage snapshot and return the testKey + list of covered source
   * files (relative to wd, node_modules excluded).
   *
   * @param {string} wd  - working directory (process.cwd())
   * @param {string} testFile - absolute path of the test file
   * @param {...string} scopes - additional segments (e.g. test name)
   */
  async collectCoverage(wd, testFile, ...scopes) {
    const result = await this.post('Profiler.takePreciseCoverage');
    const scripts = result.result;
    return {
      testKey: this._testKey(wd, testFile, ...scopes),
      coveredFiles: this._coveredFiles(wd, scripts),
    };
  }

  _testKey(wd, testFile, ...scopes) {
    return `${[relative(wd, testFile), ...scopes].join('!!')}|run`;
  }

  _coveredFiles(wd, scripts) {
    return scripts
      .map(s => s.url)
      .filter(url => {
        let parsed;
        try {
          parsed = new URL(url);
        } catch {
          return false;
        }
        return parsed.protocol === 'file:' && !parsed.pathname.includes('node_modules');
      })
      .map(url => relative(wd, fileURLToPath(url)));
  }
}

module.exports = { V8CoverageCollector };

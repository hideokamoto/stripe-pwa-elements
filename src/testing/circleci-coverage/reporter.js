'use strict';
// Local port of @circleci/jest-circleci-coverage/reporter.
// Merges the per-suite JSON files written by coverage-environment into a
// single output file at the path given by CIRCLECI_COVERAGE.

const {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} = require('node:fs');
const { dirname, resolve } = require('node:path');
const { ENV_VAR, TMP_COVERAGE_DIR } = require('./constants.js');

class JestCircleCICoverageReporter {
  constructor() {
    this.outputFile = process.env[ENV_VAR];
  }

  async onRunStart() {
    if (!this.outputFile) return;
    if (!existsSync(TMP_COVERAGE_DIR)) return;
    process.stdout.write('jest-circleci-coverage: generating CircleCI coverage JSON...\n');
  }

  async onRunComplete() {
    if (!this.outputFile) return;
    if (!existsSync(TMP_COVERAGE_DIR)) return;

    const coverageFiles = readdirSync(TMP_COVERAGE_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => resolve(TMP_COVERAGE_DIR, f));

    if (coverageFiles.length === 0) return;

    const merged = {};
    for (const coverageFile of coverageFiles) {
      const coverage = JSON.parse(readFileSync(coverageFile, 'utf-8'));
      for (const [sourceFile, tests] of Object.entries(coverage)) {
        if (!merged[sourceFile]) {
          merged[sourceFile] = {};
        }
        for (const [testKey, lines] of Object.entries(tests)) {
          if (!merged[sourceFile][testKey]) {
            merged[sourceFile][testKey] = lines;
          }
        }
      }
    }

    rmSync(TMP_COVERAGE_DIR, { recursive: true });
    mkdirSync(dirname(this.outputFile), { recursive: true });
    writeFileSync(this.outputFile, JSON.stringify(merged));

    if (Object.entries(merged).length === 0) {
      process.stdout.write('jest-circleci-coverage: warning: no coverage data collected\n');
    }
    process.stdout.write(`jest-circleci-coverage: wrote ${this.outputFile}\n`);
  }
}

module.exports = JestCircleCICoverageReporter;

'use strict';
// Constants mirroring @circleci/jest-circleci-coverage's internal constants.
// ENV_VAR is the environment variable that enables coverage collection and
// specifies the output path.  TMP_COVERAGE_DIR is where per-suite JSON files
// are written before the reporter merges them.

const { basename, join } = require('node:path');
const { tmpdir } = require('node:os');

const ENV_VAR = 'CIRCLECI_COVERAGE';

const TMP_COVERAGE_DIR =
  process.env.TMP_COVERAGE_DIR ||
  join(tmpdir(), 'circleci-coverage', basename(process.cwd()));

module.exports = { ENV_VAR, TMP_COVERAGE_DIR };

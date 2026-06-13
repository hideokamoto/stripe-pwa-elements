'use strict';
// Jest environment for unit tests: jest-environment-node base + CircleCI V8
// coverage instrumentation.  Mirrors @circleci/jest-circleci-coverage/environment-node.
//
// Stencil's setupFilesAfterEnv (jest-setuptestframework.js) still runs after
// this environment loads, calling setupGlobal() which installs mock-doc on the
// global — so unit tests that use `document` continue to work without change.

const { TestEnvironment } = require('jest-environment-node');
const { createJestCircleCICoverageEnvironment } = require('./coverage-environment.js');

module.exports = createJestCircleCICoverageEnvironment(TestEnvironment);

#!/bin/bash
# Vitest runner for CircleCI Smarter Testing.
#
# `circleci tests run` replaces {test_names} with space-separated file paths
# as positional arguments. Vitest accepts those paths directly.
#
# Usage: run-vitest.sh <project> [test-file1 test-file2 ...]
set -euo pipefail

PROJECT="${1:?First argument must be a Vitest project (unit or component)}"
shift

if [ "$#" -eq 0 ]; then
  echo "No test files assigned to this container, skipping."
  exit 0
fi

echo "Container ${CIRCLE_NODE_INDEX:-0}/${CIRCLE_NODE_TOTAL:-1}: running ${#} file(s) (project=${PROJECT})"

exec pnpm exec vitest run --project "${PROJECT}" "$@"

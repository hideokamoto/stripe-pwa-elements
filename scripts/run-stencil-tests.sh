#!/bin/bash
# Stencil test runner for CircleCI Smarter Testing.
#
# `circleci tests run` replaces {test_names} with space-separated file paths
# as positional arguments. Stencil/Jest does not accept file paths positionally,
# so this script converts them into a --testPathPattern regex.
#
# Usage: run-stencil-tests.sh <stencil-config> [test-file1 test-file2 ...]
set -euo pipefail

CONFIG="${1:?First argument must be a Stencil config file (e.g. stencil.config.unit.ts)}"
shift

if [ "$#" -eq 0 ]; then
  echo "No test files assigned to this container, skipping."
  exit 0
fi

# Escape dots so path components are treated as literals, then join with | to
# form a Jest testPathPattern that matches any of the assigned files.
PATTERN=$(printf '%s\n' "$@" | sed 's/\./\\./g' | tr '\n' '|' | sed 's/|$//')

echo "Container ${CIRCLE_NODE_INDEX:-0}/${CIRCLE_NODE_TOTAL:-1}: running ${#} file(s)"
echo "  testPathPattern: ${PATTERN}"

exec pnpm exec stencil test \
  --spec \
  --config="${CONFIG}" \
  --testPathPattern="${PATTERN}"

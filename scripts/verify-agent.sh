#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

QUICK=0
STRIPE_E2E=0

for arg in "$@"; do
  case "$arg" in
    --quick) QUICK=1 ;;
    --stripe-e2e) STRIPE_E2E=1 ;;
    -h|--help)
      echo "Usage: $0 [--quick] [--stripe-e2e]"
      echo "  default: lint, tsc, test:unit, test:component, build"
      echo "  --quick: lint + test:unit"
      echo "  --stripe-e2e: also run Playwright Stripe tests (network + test mode)"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

run() {
  echo ">> $*" >&2
  "$@"
}

run pnpm run lint
run pnpm exec tsc --noEmit

if [[ "$QUICK" -eq 1 ]]; then
  run pnpm run test:unit
  exit 0
fi

run pnpm run test:unit
run pnpm run test:component
run pnpm run build

if [[ "$STRIPE_E2E" -eq 1 ]]; then
  echo ">> Stripe Playwright e2e needs network access to js.stripe.com and the docs demo API." >&2
  run pnpm run test:e2e:stripe
fi
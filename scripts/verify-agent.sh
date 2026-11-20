#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

QUICK=0
STRIPE_E2E=0

for arg in "$@"; do
  case "$arg" in
    --) ;;
    --quick) QUICK=1 ;;
    --stripe-e2e) STRIPE_E2E=1 ;;
    -h|--help)
      echo "Usage: $0 [--quick] [--stripe-e2e]"
      echo "  default: lint, tsc, test:unit, test:component, build"
      echo "  --quick: lint + test:unit only (cannot combine with --stripe-e2e)"
      echo "  --stripe-e2e: after default steps, run Playwright Stripe tests (network + test mode)"
      echo ""
      echo "pnpm passes extra args after '--', e.g. pnpm run verify:agent -- --quick"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

if [[ "$QUICK" -eq 1 && "$STRIPE_E2E" -eq 1 ]]; then
  echo "error: --quick and --stripe-e2e cannot be used together (use default verify:agent, then --stripe-e2e)." >&2
  exit 1
fi

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
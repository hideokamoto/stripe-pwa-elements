#!/usr/bin/env node
/**
 * CI security-audit gate, scoped to the published library.
 *
 * Background
 * ----------
 * `pnpm audit` always scans the whole pnpm workspace, and this repo's workspace
 * includes the `docs` site (Astro/Starlight) as a member. An advisory in the
 * docs site's build tooling (e.g. astro > esbuild) therefore turns the library
 * CI red even though those packages are never published to npm (the library
 * only ships `dist/` and `loader/`). `pnpm audit` has no per-package filter, so
 * we post-process its JSON output here instead.
 *
 * Behaviour
 * ---------
 * - Runs `pnpm audit --json --prod`.
 * - Considers advisories at `moderate` severity or above.
 * - An advisory BLOCKS CI (exit 1) if any of its dependency paths reaches the
 *   published library (i.e. a path that is not solely inside the `docs`
 *   workspace).
 * - An advisory that comes ONLY from the `docs` workspace is reported as a
 *   non-blocking warning so the maintainer still sees it, but it does not stop
 *   unrelated work.
 *
 * This keeps the supply-chain gate on everything that actually ships, while
 * letting docs-tooling advisories be handled on their own schedule.
 */
import { execSync } from 'node:child_process';

const BLOCKING_SEVERITIES = new Set(['moderate', 'high', 'critical']);
// Workspace members whose advisories must not block the library CI.
const NON_BLOCKING_WORKSPACE_PREFIXES = ['docs>'];
const NON_BLOCKING_WORKSPACE_EXACT = new Set(['docs']);

function isDocsOnlyPath(path) {
  return NON_BLOCKING_WORKSPACE_EXACT.has(path) || NON_BLOCKING_WORKSPACE_PREFIXES.some(prefix => path.startsWith(prefix));
}

let raw = '';
try {
  raw = execSync('pnpm audit --json --prod', { encoding: 'utf8' });
} catch (error) {
  // `pnpm audit` exits non-zero when advisories exist; the JSON report is still
  // written to stdout, so recover it from the thrown error.
  raw = error.stdout ? error.stdout.toString() : '';
  if (!raw.trim()) {
    console.error('ci-audit: `pnpm audit` produced no output.');
    if (error.stderr) {
      console.error(error.stderr.toString());
    }
    process.exit(1);
  }
}

let report;
try {
  report = JSON.parse(raw);
} catch (error) {
  console.error('ci-audit: failed to parse `pnpm audit --json` output:', error.message);
  process.exit(1);
}

const advisories = report.advisories || {};
const blocking = [];
const ignored = [];

for (const id of Object.keys(advisories)) {
  const advisory = advisories[id];
  if (!BLOCKING_SEVERITIES.has(advisory.severity)) {
    continue;
  }

  const paths = (advisory.findings || []).flatMap(finding => finding.paths || []);
  const reachesLibrary = paths.some(path => !isDocsOnlyPath(path));
  const label = `${advisory.severity.toUpperCase()}  ${advisory.module_name}  ${advisory.url || `advisory ${id}`}`;

  if (reachesLibrary) {
    blocking.push(`${label}\n      paths: ${paths.join(', ')}`);
  } else {
    ignored.push(label);
  }
}

if (ignored.length > 0) {
  console.log('Non-blocking advisories (docs workspace tooling only — not published to npm):');
  for (const entry of ignored) {
    console.log(`  - ${entry}`);
  }
  console.log('');
}

if (blocking.length > 0) {
  console.error('Blocking advisories affecting the published library:');
  for (const entry of blocking) {
    console.error(`  - ${entry}`);
  }
  console.error(`\nci-audit: ${blocking.length} moderate+ advisory(ies) affect shipped code. Failing CI.`);
  process.exit(1);
}

console.log(`ci-audit: no moderate+ advisories affect the published library (${ignored.length} docs-only advisory(ies) ignored). OK.`);
process.exit(0);

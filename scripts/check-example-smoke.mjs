#!/usr/bin/env node
/**
 * After `pnpm run example:copy`, verify example pages and their bundle references exist.
 * No network; does not start a server.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const repoRoot = join(import.meta.dirname, '..');
const exampleDir = join(repoRoot, 'example');

const REQUIRED_BUNDLE = ['example/stripe-elements/stripe-elements.esm.js'];

const htmlFiles = readdirSync(exampleDir).filter(name => name.endsWith('.html'));

const errors = [];

for (const rel of REQUIRED_BUNDLE) {
  if (!existsSync(join(repoRoot, rel))) {
    errors.push(`missing bundle: ${rel} (run pnpm run example:copy after build)`);
  }
}

const scriptSrcPattern = /src="(\/[^"]+)"/g;

for (const html of htmlFiles) {
  const full = join(exampleDir, html);
  if (!existsSync(full)) {
    errors.push(`missing example page: example/${html}`);
    continue;
  }
  const text = readFileSync(full, 'utf8');
  for (const match of text.matchAll(scriptSrcPattern)) {
    const urlPath = match[1];
    if (!urlPath.startsWith('/stripe-elements/')) {
      continue;
    }
    if (urlPath.endsWith('.js') && !urlPath.endsWith('.esm.js')) {
      continue;
    }
    const diskPath = join(exampleDir, urlPath.slice(1));
    if (!existsSync(diskPath)) {
      errors.push(`example/${html}: script ${urlPath} not found at ${relative(repoRoot, diskPath)}`);
    }
  }
}

const featureMap = join(exampleDir, 'FEATURE_MAP.md');
if (!existsSync(featureMap)) {
  errors.push('missing example/FEATURE_MAP.md');
}

if (errors.length > 0) {
  console.error('check-example-smoke: failed\n' + errors.map(e => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log(`check-example-smoke: ok (${htmlFiles.length} html, bundles present)`);
#!/usr/bin/env node
/**
 * Blocks new references to deprecated custom elements in examples and hand-written docs.
 * Legacy demo pages are allowlisted so we do not expand copy-paste patterns.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const repoRoot = join(import.meta.dirname, '..');

const DEPRECATED_TAGS = ['stripe-payment-request-button'];

/** Example HTML files that may still reference deprecated tags (grandfathered). */
const EXAMPLE_ALLOWLIST = new Set(['example/index.html']);

/** Doc paths that intentionally mention deprecated tags (migration guides). */
const DOC_ALLOWLIST_PATTERNS = [
  /migrate-payment-request-button-to-express-checkout\.md$/,
  /\/components\/stripe-payment-request-button\.md$/,
  /\/en\/components\/stripe-payment-request-button\.md$/,
];

function walkHtmlAndMd(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') {
        continue;
      }
      walkHtmlAndMd(full, acc);
    } else if (/\.(html|md)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

function isDeprecatedReference(text, tag) {
  const patterns = [
    new RegExp(`<${tag}[\\s>]`, 'i'),
    new RegExp(`createElement\\(['"]${tag}['"]\\)`, 'i'),
    new RegExp(`whenDefined\\(['"]${tag}['"]\\)`, 'i'),
  ];
  return patterns.some(re => re.test(text));
}

const errors = [];

for (const file of walkHtmlAndMd(join(repoRoot, 'example'))) {
  const rel = relative(repoRoot, file).replaceAll('\\', '/');
  if (EXAMPLE_ALLOWLIST.has(rel)) {
    continue;
  }
  const text = readFileSync(file, 'utf8');
  for (const tag of DEPRECATED_TAGS) {
    if (isDeprecatedReference(text, tag)) {
      errors.push(`${rel}: references deprecated <${tag}> (use express-checkout; see migration guide)`);
    }
  }
}

for (const file of walkHtmlAndMd(join(repoRoot, 'docs', 'src', 'content'))) {
  const rel = relative(repoRoot, file).replaceAll('\\', '/');
  if (DOC_ALLOWLIST_PATTERNS.some(re => re.test(rel))) {
    continue;
  }
  const text = readFileSync(file, 'utf8');
  for (const tag of DEPRECATED_TAGS) {
    if (isDeprecatedReference(text, tag)) {
      errors.push(`${rel}: references deprecated <${tag}> outside migration docs`);
    }
  }
}

if (errors.length > 0) {
  console.error('check-deprecated-usage: failed\n' + errors.map(e => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log('check-deprecated-usage: ok');
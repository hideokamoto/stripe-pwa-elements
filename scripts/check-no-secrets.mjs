#!/usr/bin/env node
/**
 * Fails when likely live or secret Stripe keys appear under src/ or example/.
 * Placeholders such as pk_test_xxxxx are allowed.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const repoRoot = join(import.meta.dirname, '..');

const SCAN_ROOTS = ['src', 'example'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.html', '.md', '.scss', '.css']);

/** Match sk_/rk_/pk_live_ unless clearly a placeholder (xxxx or dots only). */
const SECRET_PATTERNS = [
  /\bsk_live_[0-9a-zA-Z]{10,}\b/,
  /\bsk_test_[0-9a-zA-Z]{10,}\b/,
  /\brk_live_[0-9a-zA-Z]{10,}\b/,
  /\brk_test_[0-9a-zA-Z]{10,}\b/,
  /\bpk_live_[0-9a-zA-Z]{10,}\b/,
];

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '__snapshots__') {
        continue;
      }
      walk(full, acc);
    } else {
      const dot = name.lastIndexOf('.');
      const ext = dot >= 0 ? name.slice(dot) : '';
      if (EXTENSIONS.has(ext)) {
        acc.push(full);
      }
    }
  }
  return acc;
}

const errors = [];

for (const root of SCAN_ROOTS) {
  const base = join(repoRoot, root);
  for (const file of walk(base)) {
    const rel = relative(repoRoot, file).replaceAll('\\', '/');
    const text = readFileSync(file, 'utf8');
    for (const pattern of SECRET_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        errors.push(`${rel}: disallowed key pattern (${match[0].slice(0, 12)}…)`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('check-no-secrets: failed\n' + errors.map(e => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log('check-no-secrets: ok');
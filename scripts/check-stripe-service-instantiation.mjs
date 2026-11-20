#!/usr/bin/env node
/**
 * StripeServiceClass must only be constructed via ServiceFactory (factory.ts).
 * Specs may instantiate the class directly for unit testing.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const repoRoot = join(import.meta.dirname, '..');
const srcRoot = join(repoRoot, 'src');

const ALLOWED = new Set(['src/services/factory.ts', 'src/services/stripe-service.ts']);

function walkTs(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkTs(full, acc);
    } else if (/\.tsx?$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

const needle = 'new StripeServiceClass';
const errors = [];

for (const file of walkTs(srcRoot)) {
  const rel = relative(repoRoot, file).replaceAll('\\', '/');
  if (!readFileSync(file, 'utf8').includes(needle)) {
    continue;
  }
  if (ALLOWED.has(rel)) {
    continue;
  }
  if (rel.endsWith('.spec.ts') || rel.endsWith('.unit.spec.ts') || rel.endsWith('.spec.tsx')) {
    continue;
  }
  errors.push(`${rel}: use serviceFactory.createStripeService() instead of ${needle}`);
}

if (errors.length > 0) {
  console.error('check-stripe-service-instantiation: failed\n' + errors.map(e => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log('check-stripe-service-instantiation: ok');
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const componentsRoot = join(__dirname, '..', 'components');

const SHADOW_TRUE = /shadow:\s*true/;
const COMPONENT_FILE = /^\s*tag:\s*'([^']+)'/;

/**
 * Only stripe-modal uses shadow DOM; other components rely on light DOM styling.
 */
describe('component shadow DOM policy', () => {
  const violations: string[] = [];

  beforeAll(() => {
    for (const dir of readdirSync(componentsRoot)) {
      const tsx = join(componentsRoot, dir, `${dir}.tsx`);
      if (!existsSync(tsx)) {
        continue;
      }
      const source = readFileSync(tsx, 'utf8');
      if (!SHADOW_TRUE.test(source)) {
        continue;
      }
      const tag = source.match(COMPONENT_FILE)?.[1] ?? dir;
      if (tag !== 'stripe-modal') {
        violations.push(`${dir} (${tag}) sets shadow: true`);
      }
    }
  });

  it('allows shadow: true only on stripe-modal', () => {
    expect(violations).toEqual([]);
  });
});
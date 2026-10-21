// Make this file a module so the declarations below stay local to it
export {};

// The repo has no @types/node; Jest runs specs as CommonJS, so `require` and `__dirname` exist at runtime.
declare const require: (id: string) => any;
declare const __dirname: string;

const { readFileSync } = require('fs');
const { join } = require('path');

/**
 * Style contract for stripe-modal.
 *
 * Spec tests run on Stencil's mock DOM, which neither applies stylesheets nor computes layout,
 * so they cannot show that tall content scrolls. This test pins the declarations that make it scroll
 * (the panel is capped at the viewport height and scrolls its own overflow); the real scrolling behaviour
 * was verified in Chromium at 390x844 and 1280x720.
 */
const scss: string = readFileSync(join(__dirname, '..', 'stripe-modal.scss'), 'utf8');

/**
 * Returns the declarations of a top-level (unindented) rule, without `//` comments.
 */
const topLevelRule = (selector: string): string[] => {
  const lines = scss.split('\n');
  const start = lines.findIndex(line => line === `${selector} {`);

  if (start === -1) {
    throw new Error(`Rule "${selector}" not found in stripe-modal.scss`);
  }

  const end = lines.findIndex((line, index) => index > start && line === '}');

  return lines
    .slice(start + 1, end)
    .map(line => line.replace(/\/\/.*$/, '').trim())
    .filter(line => line !== '');
};

describe('stripe-modal styles', () => {
  describe('content taller than the viewport', () => {
    const panel = topLevelRule('.modal-child');

    it('caps the panel at the viewport height, with a vh fallback before dvh', () => {
      const vh = panel.indexOf('max-height: 100vh;');
      const dvh = panel.indexOf('max-height: 100dvh;');

      expect(vh).toBeGreaterThanOrEqual(0);
      expect(dvh).toBeGreaterThan(vh);
    });

    it('lets the panel scroll its own overflow', () => {
      expect(panel).toContain('overflow-y: auto;');
    });
  });

  it('keeps the open overlay fixed to the viewport so the panel cap is relative to it', () => {
    const overlay = topLevelRule('.modal-row.open');

    expect(overlay).toContain('position: fixed;');
    expect(overlay).toContain('height: 100%;');
  });
});

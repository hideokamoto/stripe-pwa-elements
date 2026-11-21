import { expect } from 'vitest';
import { serializeNodeToHtml } from '@stencil/core/mock-doc';

const TAG_RE = /<\/?([A-Za-z][\w:-]*)((?:\s+[^\s=/>]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)\s*>/g;
const ATTR_RE = /\s+([^\s=]+)(?:=("([^"]*)"|'([^']*)'|[^\s>]+))?/g;

const parseAndSortAttrs = (raw: string): string => {
  const attrs: Array<{ name: string; value: string }> = [];

  ATTR_RE.lastIndex = 0;
  let match: RegExpExecArray | null = ATTR_RE.exec(raw);

  while (match != null) {
    const name = match[1].toLowerCase();
    const value = match[3] ?? match[4] ?? match[2] ?? '';

    if (name === 'class') {
      const classes = value
        .split(/\s+/)
        .filter(cls => cls !== '' && cls !== 'hydrated')
        .sort();

      if (classes.length > 0) {
        attrs.push({ name, value: classes.join(' ') });
      }
    } else {
      attrs.push({ name, value });
    }

    match = ATTR_RE.exec(raw);
  }

  attrs.sort((a, b) => a.name.localeCompare(b.name));

  return attrs.map(attr => (attr.value === '' ? ` ${attr.name}` : ` ${attr.name}="${attr.value}"`)).join('');
};

/**
 * Compare HTML the way Stencil Jest did: ignore attribute order, empty `=""`,
 * SVG tag case, and the `hydrated` class added by `@stencil/vitest` render().
 */
export const normalizeComparableHtml = (html: string): string => {
  const collapsed = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<template([^>]*shadowrootmode="open"[^>]*)>/gi, '<mock:shadow-root>')
    .replace(/<\/template>/gi, '</mock:shadow-root>')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();

  return collapsed.replace(TAG_RE, (full, tag: string, rawAttrs: string, slash: string) => {
    const name = tag.toLowerCase();

    if (full.startsWith('</')) {
      return `</${name}>`;
    }

    return `<${name}${parseAndSortAttrs(rawAttrs)}${slash !== '' ? ' /' : ''}>`;
  });
};

const serializeReceived = (received: unknown): string => {
  if (typeof received !== 'object' || received == null) {
    return String(received);
  }

  return serializeNodeToHtml(received as Node, {
    prettyHtml: false,
    outerHtml: true,
    serializeShadowRoot: true,
    excludeTags: ['body'],
  });
};

function toEqualHtml(received: unknown, expected: string) {
  if (received == null) {
    throw new Error(`expect.toEqualHtml() received value is "${received}"`);
  }

  const receivedHtml = normalizeComparableHtml(serializeReceived(received));
  const expectedHtml = normalizeComparableHtml(expected);
  const pass = receivedHtml === expectedHtml;

  return {
    pass,
    message: () => (pass ? `Expected HTML not to equal:\n${expectedHtml}` : `Expected HTML to equal:\n${expectedHtml}\n\nReceived:\n${receivedHtml}`),
  };
}

export const installHtmlMatchers = () => {
  expect.extend({ toEqualHtml });
};

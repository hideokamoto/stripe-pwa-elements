import { normalizeComparableHtml } from './html-matchers';

describe('normalizeComparableHtml', () => {
  it('keeps greater-than characters inside quoted attribute values', () => {
    expect(normalizeComparableHtml('<div title="a>b" class="hydrated foo"></div>')).toBe('<div class="foo" title="a>b"></div>');
  });

  it('drops empty comments and boolean empty attributes', () => {
    expect(normalizeComparableHtml('<stripe-modal showclosebutton=""><!----></stripe-modal>')).toBe('<stripe-modal showclosebutton></stripe-modal>');
  });

  it('keeps consecutive spaces inside non-class attributes', () => {
    expect(normalizeComparableHtml('<div title="a  b"></div>')).toBe('<div title="a  b"></div>');
  });
});

describe('toEqualHtml', () => {
  it('treats character references in expected HTML as equal to serialized attributes', () => {
    const el = document.createElement('div');

    el.setAttribute('title', 'A&B');

    expect(el).toEqualHtml('<div title="A&B"></div>');
  });

  it('does not treat different attribute spacing as equal', () => {
    const el = document.createElement('div');

    el.setAttribute('title', 'a  b');

    expect(el).not.toEqualHtml('<div title="a b"></div>');
  });
});

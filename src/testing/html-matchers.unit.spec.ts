import { normalizeComparableHtml } from './html-matchers';

describe('normalizeComparableHtml', () => {
  it('keeps greater-than characters inside quoted attribute values', () => {
    expect(normalizeComparableHtml('<div title="a>b" class="hydrated foo"></div>')).toBe('<div class="foo" title="a>b"></div>');
  });

  it('drops empty comments and boolean empty attributes', () => {
    expect(normalizeComparableHtml('<stripe-modal showclosebutton=""><!----></stripe-modal>')).toBe('<stripe-modal showclosebutton></stripe-modal>');
  });
});

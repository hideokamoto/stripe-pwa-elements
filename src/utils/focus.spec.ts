import { getDeepActiveElement, getTabbableElements, isTabbable } from './focus';

describe('focus utilities', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('isTabbable', () => {
    it.each([
      ['<button>ok</button>', true],
      ['<button disabled>off</button>', false],
      ['<input />', true],
      ['<input type="hidden" />', false],
      ['<a href="#">link</a>', true],
      ['<a>no href</a>', false],
      ['<iframe></iframe>', true],
      ['<div tabindex="0">x</div>', true],
      ['<div tabindex="-1">x</div>', false],
      ['<button hidden>x</button>', false],
      ['<div>plain</div>', false],
    ])('%s -> %s', (html, expected) => {
      document.body.innerHTML = html;
      expect(isTabbable(document.body.firstElementChild)).toBe(expected);
    });

    it('excludes elements inside an inert subtree', () => {
      document.body.innerHTML = '<div inert><button>x</button></div>';
      expect(isTabbable(document.querySelector('button'))).toBe(false);
    });
  });

  describe('getTabbableElements', () => {
    it('returns tabbable elements in DOM order, including nested ones', () => {
      document.body.innerHTML = '<div id="root"><input id="a" /><div><button id="b">b</button><span>c</span></div><iframe id="c"></iframe></div>';

      expect(getTabbableElements(document.getElementById('root')).map(el => el.id)).toEqual(['a', 'b', 'c']);
    });

    it('enters open shadow roots and follows slotted content', () => {
      document.body.innerHTML = '<div id="root"><div id="host"><button id="slotted">s</button></div></div>';
      const host = document.getElementById('host');
      const shadow = host.attachShadow({ mode: 'open' });

      shadow.innerHTML = '<button id="before">b</button><slot></slot><button id="after">a</button>';

      expect(getTabbableElements(document.getElementById('root')).map(el => el.id)).toEqual(['before', 'slotted', 'after']);
    });
  });

  describe('getDeepActiveElement', () => {
    it('returns null when nothing is focused', () => {
      const doc = { activeElement: null } as unknown as Document;

      expect(getDeepActiveElement(doc)).toBeNull();
    });

    it('descends into shadow roots', () => {
      const inner = { shadowRoot: null };
      const host = { shadowRoot: { activeElement: inner } };
      const doc = { activeElement: host } as unknown as Document;

      expect(getDeepActiveElement(doc)).toBe(inner);
    });
  });
});

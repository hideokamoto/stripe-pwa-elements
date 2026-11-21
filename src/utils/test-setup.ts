/// <reference types="vitest/globals" />
import '@stencil/vitest';
import { MockKeyboardEvent, MockMouseEvent } from '@stencil/core/mock-doc';
import { installHtmlMatchers } from '../testing/html-matchers';
import { i18n } from './i18n';

const MockEvent = Object.getPrototypeOf(MockKeyboardEvent) as typeof Event;
const patchedListeners = new WeakSet<object>();

const NATIVE_EVENT_TYPES = new Set([
  'abort',
  'animationend',
  'animationiteration',
  'animationstart',
  'blur',
  'cancel',
  'change',
  'click',
  'close',
  'compositionend',
  'compositionstart',
  'compositionupdate',
  'contextmenu',
  'copy',
  'cut',
  'dblclick',
  'error',
  'focus',
  'focusin',
  'focusout',
  'input',
  'invalid',
  'keydown',
  'keypress',
  'keyup',
  'load',
  'mousedown',
  'mouseenter',
  'mouseleave',
  'mousemove',
  'mouseout',
  'mouseover',
  'mouseup',
  'paste',
  'pointercancel',
  'pointerdown',
  'pointerenter',
  'pointerleave',
  'pointermove',
  'pointerout',
  'pointerover',
  'pointerup',
  'reset',
  'resize',
  'scroll',
  'submit',
  'touchcancel',
  'touchend',
  'touchmove',
  'touchstart',
  'transitionend',
  'wheel',
]);

const normalizeEventType = (type: unknown) => {
  if (typeof type !== 'string') {
    return type;
  }

  const lower = type.toLowerCase();

  return NATIVE_EVENT_TYPES.has(lower) ? lower : type;
};

/**
 * Stencil's custom-element compile registers Host listeners as camelCase (`keyDown`).
 * Browsers and mock-doc dispatch lowercase types (`keydown`), so normalize on register.
 */
const patchEventListenerCase = (target: { addEventListener?: Function; removeEventListener?: Function } | null | undefined) => {
  if (target == null || typeof target.addEventListener !== 'function' || patchedListeners.has(target)) {
    return;
  }

  patchedListeners.add(target);
  const originalAdd = target.addEventListener;
  const originalRemove = target.removeEventListener;

  target.addEventListener = function (this: unknown, type: string, handler: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
    return originalAdd.call(this, normalizeEventType(type), handler, options);
  };

  if (typeof originalRemove === 'function') {
    target.removeEventListener = function (this: unknown, type: string, handler: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) {
      return originalRemove.call(this, normalizeEventType(type), handler, options);
    };
  }
};

const installMockDocEvents = () => {
  const win = globalThis.window as Window & typeof globalThis;

  win.Event = MockEvent;
  win.KeyboardEvent = MockKeyboardEvent as unknown as typeof KeyboardEvent;
  win.MouseEvent = MockMouseEvent as unknown as typeof MouseEvent;
  globalThis.Event = MockEvent;
  globalThis.KeyboardEvent = MockKeyboardEvent as unknown as typeof KeyboardEvent;
  globalThis.MouseEvent = MockMouseEvent as unknown as typeof MouseEvent;

  const walkAndPatch = (start: object | null | undefined) => {
    let proto: object | null | undefined = start;

    while (proto && proto !== Object.prototype) {
      if (Object.prototype.hasOwnProperty.call(proto, 'addEventListener')) {
        patchEventListenerCase(proto as { addEventListener?: Function; removeEventListener?: Function });
      }

      proto = Object.getPrototypeOf(proto);
    }
  };

  walkAndPatch(win.HTMLElement?.prototype);
  walkAndPatch(win.Element?.prototype);
  walkAndPatch(win.Node?.prototype);
  walkAndPatch(win.Document?.prototype);
  walkAndPatch(win.DocumentFragment?.prototype);
  walkAndPatch(document.createElement('div'));
  patchEventListenerCase(win);
};

const installHtmlElementMatcher = () => {
  const ctor = globalThis.HTMLElement;

  if (typeof ctor !== 'function') {
    return;
  }

  Object.defineProperty(ctor, Symbol.hasInstance, {
    configurable: true,
    value(value: unknown) {
      return value != null && typeof value === 'object' && (value as Node).nodeType === 1;
    },
  });
};

const installDefaultLocation = () => {
  const loc = globalThis.window?.location;

  if (loc == null || loc.href !== '') {
    return;
  }

  loc.href = 'http://localhost:3000/';
};

installMockDocEvents();
installHtmlElementMatcher();
installDefaultLocation();
installHtmlMatchers();

beforeEach(() => {
  installMockDocEvents();
  installHtmlElementMatcher();
  installDefaultLocation();
});

// Keep snapshot/component tests deterministic regardless of host OS locale.
beforeAll(async () => {
  await i18n.changeLanguage('en');
});

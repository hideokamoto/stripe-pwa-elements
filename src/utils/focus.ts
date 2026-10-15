const TABBABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

/**
 * Whether the element can be reached with the Tab key.
 * Elements hidden with `display: none` / `visibility: hidden` are excluded when the browser supports `checkVisibility()`.
 */
export const isTabbable = (element: Element): element is HTMLElement => {
  if (!element.matches(TABBABLE_SELECTOR)) {
    return false;
  }

  const tabindex = element.getAttribute('tabindex');

  if (tabindex !== null && Number(tabindex) < 0) {
    return false;
  }

  if (element.hasAttribute('hidden') || element.closest('[inert]') !== null) {
    return false;
  }

  const { checkVisibility } = element as HTMLElement & { checkVisibility?: (options?: { visibilityProperty?: boolean }) => boolean };

  if (typeof checkVisibility === 'function' && !checkVisibility.call(element, { visibilityProperty: true })) {
    return false;
  }

  return true;
};

const getComposedChildren = (node: Element | ShadowRoot): Element[] => {
  if (node instanceof Element && node.tagName === 'SLOT') {
    const slot = node as HTMLSlotElement;
    const assigned = typeof slot.assignedElements === 'function' ? slot.assignedElements({ flatten: true }) : [];

    // Fall back to the slot's default content when nothing is assigned
    return assigned.length > 0 ? assigned : Array.from(slot.children);
  }

  if (node instanceof Element && node.shadowRoot != null) {
    return Array.from(node.shadowRoot.children);
  }

  return Array.from(node.children);
};

/**
 * Collect tabbable elements under `root` in DOM order, following the composed (flattened) tree:
 * open shadow roots are entered and `<slot>` elements are replaced by their assigned elements.
 * Positive `tabindex` ordering is not taken into account.
 */
export const getTabbableElements = (root: Element | ShadowRoot): HTMLElement[] => {
  const result: HTMLElement[] = [];
  const walk = (node: Element | ShadowRoot) => {
    for (const child of getComposedChildren(node)) {
      if (isTabbable(child)) {
        result.push(child);
      }

      walk(child);
    }
  };

  walk(root);

  return result;
};

/**
 * Return the focused element, descending into open shadow roots.
 */
export const getDeepActiveElement = (doc: Document = document): Element | null => {
  let active: Element | null = doc.activeElement ?? null;

  while (active?.shadowRoot?.activeElement != null) {
    active = active.shadowRoot.activeElement;
  }

  return active;
};

import { render } from '@stencil/vitest';
import type { NewSpecPageOptions, SpecPage } from '@stencil/core/internal';

const findComponent = (from: ParentNode | null | undefined): HTMLElement | undefined => {
  if (from == null) {
    return undefined;
  }

  const queue: Element[] = from instanceof Element ? [from] : Array.from(from.children);

  while (queue.length > 0) {
    const el = queue.shift();

    if (el == null) {
      continue;
    }

    if (el.tagName.includes('-')) {
      return el as HTMLElement;
    }

    queue.push(...Array.from(el.children));
  }

  return from instanceof Element ? (from as HTMLElement) : (from.firstElementChild as HTMLElement | undefined);
};

/**
 * Vitest-compatible stand-in for Stencil's Jest `newSpecPage`.
 * Spec tests keep the previous import path via a Vite alias.
 */
export async function newSpecPage(opts: NewSpecPageOptions): Promise<SpecPage> {
  if (opts.template != null) {
    throw new Error('newSpecPage: `template` is not supported by the Vitest shim; pass `html`');
  }

  if (opts.html == null) {
    throw new Error('newSpecPage requires `html`');
  }

  const bind = (result: Awaited<ReturnType<typeof render>>) => {
    const root = findComponent(result.root.parentElement) ?? result.root;

    return {
      root,
      waitForChanges: () => result.waitForChanges(),
    };
  };

  let current = bind(await render(opts.html));

  const page: SpecPage = {
    get root() {
      return current.root;
    },
    // Custom-element compile puts @Method() on the host; $lazyInstance$ is not the class instance.
    get rootInstance() {
      return current.root;
    },
    body: document.body as HTMLBodyElement,
    doc: document,
    win: window,
    waitForChanges: () => current.waitForChanges(),
    setContent: async (html: string) => {
      current = bind(await render(html));
      await current.waitForChanges();
    },
    build: {} as SpecPage['build'],
    flushLoadModule: async () => undefined,
    flushQueue: () => current.waitForChanges(),
    styles: new Map(),
  };

  return page;
}

export type { SpecPage };

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
  if (opts.html == null && opts.template == null) {
    throw new Error('newSpecPage requires `html` or `template`');
  }

  const result = await render(opts.html ?? '');
  const root = findComponent(result.root.parentElement) ?? result.root;
  const waitForChanges = () => result.waitForChanges();

  return {
    root,
    // Custom-element compile puts @Method() on the host; $lazyInstance$ is not the class instance.
    rootInstance: root,
    body: document.body as HTMLBodyElement,
    doc: document,
    win: window,
    waitForChanges,
    setContent: async (html: string) => {
      document.body.innerHTML = html;
      await waitForChanges();
    },
    build: {} as SpecPage['build'],
    flushLoadModule: async () => undefined,
    flushQueue: waitForChanges,
    styles: new Map(),
  };
}

export type { SpecPage };

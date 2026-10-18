import { initialSheetState, intentKindFromClientSecret, intentKindOf, transition } from '../payment-sheet-state';
import type { IntentKind, SecretSource, SheetEffect, SheetEvent, SheetState } from '../payment-sheet-state';

const PI_SECRET = 'pi_3Mtw_secret_abc';
const SETI_SECRET = 'seti_1Mm8_secret_xyz';
const UNKNOWN_SECRET = 'cs_test_a1_secret_zzz';
/** Stripe does not document the format of a Checkout Session client secret, so the test value is deliberately arbitrary */
const CHECKOUT_SECRET = 'cs_test_a1_secret_zzz';

/**
 * Apply events in order, collecting every effect.
 */
const run = (events: SheetEvent[], from: SheetState = initialSheetState) => {
  return events.reduce(
    (acc, event) => {
      const { state, effects } = transition(acc.state, event);

      return { state, effects: [...acc.effects, ...effects] };
    },
    { state: from, effects: [] as SheetEffect[] },
  );
};

/** State right after a successful load of a PaymentIntent secret */
const readyState = () =>
  run([
    { type: 'secretChanged', clientSecret: PI_SECRET, source: 'intent' },
    { type: 'loadSucceeded', generation: 1 },
  ]).state;
const presentedState = () => run([{ type: 'presentRequested' }], readyState()).state;
const confirmingState = () => run([{ type: 'submitted' }], presentedState()).state;

describe('intentKindFromClientSecret', () => {
  it('detects a PaymentIntent client secret', () => {
    expect(intentKindFromClientSecret(PI_SECRET)).toBe('payment');
  });

  it('detects a SetupIntent client secret', () => {
    expect(intentKindFromClientSecret(SETI_SECRET)).toBe('setup');
  });

  it.each([UNKNOWN_SECRET, '', 'pi_3Mtw', 'seti_', 'xpi_1_secret_a'])('returns undefined for %p', secret => {
    expect(intentKindFromClientSecret(secret)).toBeUndefined();
  });
});

describe('intentKindOf', () => {
  it('uses the prefix for the intent-client-secret attribute', () => {
    expect(intentKindOf(PI_SECRET, 'intent')).toBe('payment');
    expect(intentKindOf(SETI_SECRET, 'intent')).toBe('setup');
    expect(intentKindOf(UNKNOWN_SECRET, 'intent')).toBeUndefined();
  });

  it.each([CHECKOUT_SECRET, PI_SECRET, SETI_SECRET, 'anything'])('treats %p from the checkout-session-client-secret attribute as a Checkout Session', secret => {
    expect(intentKindOf(secret, 'checkoutSession')).toBe('checkoutSession');
  });
});

describe('payment sheet state transitions', () => {
  describe('loading', () => {
    it('starts loading with the intent kind derived from the secret', () => {
      const { state, effects } = transition(initialSheetState, { type: 'secretChanged', clientSecret: SETI_SECRET, source: 'intent' });

      expect(state.phase).toBe('loading');
      expect(effects).toContainEqual({ type: 'load', generation: 1, clientSecret: SETI_SECRET, intentKind: 'setup' });
    });

    it('fails to load immediately when the secret prefix is unknown', () => {
      const { state, effects } = transition(initialSheetState, { type: 'secretChanged', clientSecret: UNKNOWN_SECRET, source: 'intent' });

      expect(state.phase).toBe('loadFailed');
      expect(effects).toContainEqual({ type: 'emit', event: 'paymentSheetFailedToLoad' });
      expect(effects.some(e => e.type === 'load')).toBe(false);
    });

    it('ignores an empty secret', () => {
      expect(transition(initialSheetState, { type: 'secretChanged', clientSecret: '', source: 'intent' })).toEqual({ state: initialSheetState, effects: [] });
    });

    it('becomes ready and emits paymentSheetLoaded when the current load succeeds', () => {
      const { state, effects } = run([
        { type: 'secretChanged', clientSecret: PI_SECRET, source: 'intent' },
        { type: 'loadSucceeded', generation: 1 },
      ]);

      expect(state.phase).toBe('ready');
      expect(effects).toContainEqual({ type: 'emit', event: 'paymentSheetLoaded' });
    });

    it('ignores the result of a superseded load', () => {
      const { state } = run([
        { type: 'secretChanged', clientSecret: PI_SECRET, source: 'intent' },
        { type: 'secretChanged', clientSecret: SETI_SECRET, source: 'intent' },
        { type: 'loadFailed', generation: 1 },
      ]);

      expect(state.phase).toBe('loading');
      expect(state.intentKind).toBe('setup');
    });

    it('emits paymentSheetFailedToLoad when the current load fails', () => {
      const { state, effects } = run([
        { type: 'secretChanged', clientSecret: PI_SECRET, source: 'intent' },
        { type: 'loadFailed', generation: 1 },
      ]);

      expect(state.phase).toBe('loadFailed');
      expect(effects).toContainEqual({ type: 'emit', event: 'paymentSheetFailedToLoad' });
    });
  });

  describe('present()', () => {
    it('opens the sheet when ready', () => {
      const { state, effects } = transition(readyState(), { type: 'presentRequested' });

      expect(state.phase).toBe('presented');
      expect(state.pendingPresent).toBe(true);
      expect(effects).toContainEqual({ type: 'show' });
    });

    it('opens the sheet once loading finishes when called before the load', () => {
      const { state, effects } = run([
        { type: 'presentRequested' },
        { type: 'secretChanged', clientSecret: PI_SECRET, source: 'intent' },
        { type: 'loadSucceeded', generation: 1 },
      ]);

      expect(state.phase).toBe('presented');
      expect(state.pendingPresent).toBe(true);
      expect(effects).toContainEqual({ type: 'show' });
    });

    it('resolves with paymentSheetFailed when the load it waits for fails', () => {
      const { state, effects } = run([{ type: 'secretChanged', clientSecret: PI_SECRET, source: 'intent' }, { type: 'presentRequested' }, { type: 'loadFailed', generation: 1 }]);

      expect(state.pendingPresent).toBe(false);
      expect(effects).toContainEqual({ type: 'resolvePresent', result: 'paymentSheetFailed' });
    });

    it('does not create a second pending presentation while one is pending', () => {
      const { state, effects } = transition(presentedState(), { type: 'presentRequested' });

      expect(state).toEqual(presentedState());
      expect(effects).toEqual([]);
    });

    it.each(['loadFailed', 'completed', 'errored'] as const)('resolves with paymentSheetFailed right away in %s', phase => {
      const { state, effects } = transition({ ...initialSheetState, phase }, { type: 'presentRequested' });

      expect(state.pendingPresent).toBe(false);
      expect(effects).toContainEqual({ type: 'resolvePresent', result: 'paymentSheetFailed' });
    });
  });

  describe('closing', () => {
    it('closes and resolves with paymentSheetCanceled', () => {
      const { state, effects } = transition(presentedState(), { type: 'closeRequested' });

      expect(state.phase).toBe('ready');
      expect(state.pendingPresent).toBe(false);
      expect(effects).toEqual(
        expect.arrayContaining([{ type: 'hide' }, { type: 'emit', event: 'paymentSheetCanceled' }, { type: 'resolvePresent', result: 'paymentSheetCanceled' }]),
      );
    });

    it('cannot be closed while confirming', () => {
      const { state, effects } = transition(confirmingState(), { type: 'closeRequested' });

      expect(state).toEqual(confirmingState());
      expect(effects).toEqual([]);
    });

    it('opens via the open attribute without a pending presentation', () => {
      const { state, effects } = transition(readyState(), { type: 'openRequested' });

      expect(state.phase).toBe('presented');
      expect(state.pendingPresent).toBe(false);
      expect(effects).toContainEqual({ type: 'show' });
    });
  });

  describe('confirming', () => {
    it('confirms with the method matching the secret', () => {
      const { state, effects } = transition(presentedState(), { type: 'submitted' });

      expect(state.phase).toBe('confirming');
      expect(effects).toContainEqual({ type: 'confirm', generation: 1, intentKind: 'payment' });
    });

    it('completes, emits and resolves on success', () => {
      const { state, effects } = transition(confirmingState(), { type: 'confirmSucceeded', generation: 1 });

      expect(state.phase).toBe('completed');
      expect(effects).toEqual(
        expect.arrayContaining([{ type: 'hide' }, { type: 'emit', event: 'paymentSheetCompleted' }, { type: 'resolvePresent', result: 'paymentSheetCompleted' }]),
      );
    });

    it('stays open and shows the error on a recoverable error', () => {
      const { state, effects } = transition(confirmingState(), { type: 'confirmDeclined', generation: 1, message: 'Your card was declined.' });

      expect(state.phase).toBe('presented');
      expect(state.pendingPresent).toBe(true);
      expect(effects).toEqual([{ type: 'showError', message: 'Your card was declined.' }]);
    });

    it('fails, emits and resolves on an unrecoverable error', () => {
      const { state, effects } = transition(confirmingState(), { type: 'confirmFailed', generation: 1, message: 'boom' });

      expect(state.phase).toBe('errored');
      expect(effects).toEqual(expect.arrayContaining([{ type: 'hide' }, { type: 'emit', event: 'paymentSheetFailed' }, { type: 'resolvePresent', result: 'paymentSheetFailed' }]));
    });
  });

  describe('secret changes', () => {
    it('cancels an open sheet before reloading', () => {
      const { state, effects } = transition(presentedState(), { type: 'secretChanged', clientSecret: SETI_SECRET, source: 'intent' });

      expect(state.phase).toBe('loading');
      expect(effects).toEqual(
        expect.arrayContaining([{ type: 'hide' }, { type: 'emit', event: 'paymentSheetCanceled' }, { type: 'resolvePresent', result: 'paymentSheetCanceled' }]),
      );
    });

    it('defers a secret change until the running confirmation finishes', () => {
      const deferred = transition(confirmingState(), { type: 'secretChanged', clientSecret: SETI_SECRET, source: 'intent' });

      expect(deferred.state.phase).toBe('confirming');
      expect(deferred.effects).toEqual([]);

      const { state, effects } = transition(deferred.state, { type: 'confirmSucceeded', generation: 1 });

      expect(effects).toContainEqual({ type: 'emit', event: 'paymentSheetCompleted' });
      expect(effects).toContainEqual({ type: 'load', generation: 2, clientSecret: SETI_SECRET, intentKind: 'setup' });
      expect(state.phase).toBe('loading');
    });
  });
});

describe('Checkout Session', () => {
  const checkoutReady = () =>
    run([
      { type: 'secretChanged', clientSecret: CHECKOUT_SECRET, source: 'checkoutSession' },
      { type: 'loadSucceeded', generation: 1 },
    ]).state;

  it('loads a Checkout Session secret without looking at its format', () => {
    const { state, effects } = transition(initialSheetState, { type: 'secretChanged', clientSecret: CHECKOUT_SECRET, source: 'checkoutSession' });

    expect(state.phase).toBe('loading');
    expect(state.intentKind).toBe('checkoutSession');
    expect(effects).toEqual([{ type: 'load', generation: 1, clientSecret: CHECKOUT_SECRET, intentKind: 'checkoutSession' }]);
  });

  it('ignores an empty Checkout Session secret', () => {
    expect(transition(initialSheetState, { type: 'secretChanged', clientSecret: '', source: 'checkoutSession' })).toEqual({ state: initialSheetState, effects: [] });
  });

  it('confirms through the Checkout Session even when the secret looks like a PaymentIntent secret', () => {
    const { effects } = run([
      { type: 'secretChanged', clientSecret: PI_SECRET, source: 'checkoutSession' },
      { type: 'loadSucceeded', generation: 1 },
      { type: 'presentRequested' },
      { type: 'submitted' },
    ]);

    expect(effects).toContainEqual({ type: 'confirm', generation: 1, intentKind: 'checkoutSession' });
  });

  it('completes, emits and resolves on success', () => {
    const { state, effects } = run([{ type: 'presentRequested' }, { type: 'submitted' }, { type: 'confirmSucceeded', generation: 1 }], checkoutReady());

    expect(state.phase).toBe('completed');
    expect(effects).toEqual(
      expect.arrayContaining([{ type: 'hide' }, { type: 'emit', event: 'paymentSheetCompleted' }, { type: 'resolvePresent', result: 'paymentSheetCompleted' }]),
    );
  });

  it('switches from an intent to a Checkout Session, canceling the open sheet', () => {
    const { state, effects } = transition(presentedState(), { type: 'secretChanged', clientSecret: CHECKOUT_SECRET, source: 'checkoutSession' });

    expect(state.phase).toBe('loading');
    expect(state.intentKind).toBe('checkoutSession');
    expect(effects).toEqual(
      expect.arrayContaining([
        { type: 'hide' },
        { type: 'emit', event: 'paymentSheetCanceled' },
        { type: 'resolvePresent', result: 'paymentSheetCanceled' },
        { type: 'load', generation: 2, clientSecret: CHECKOUT_SECRET, intentKind: 'checkoutSession' },
      ]),
    );
  });

  it('keeps the attribute a deferred secret came from', () => {
    const deferred = transition(confirmingState(), { type: 'secretChanged', clientSecret: CHECKOUT_SECRET, source: 'checkoutSession' });

    expect(deferred.effects).toEqual([]);

    const { state, effects } = transition(deferred.state, { type: 'confirmDeclined', generation: 1, message: 'declined' });

    expect(state.intentKind).toBe('checkoutSession');
    expect(effects).toContainEqual({ type: 'load', generation: 2, clientSecret: CHECKOUT_SECRET, intentKind: 'checkoutSession' });
  });
});

/**
 * Regression tests for the counterexamples the Quint model found in the v1 interface draft.
 */
describe('v1 counterexamples', () => {
  it('a SetupIntent secret is never confirmed with confirmPayment', () => {
    const { effects } = run([
      { type: 'secretChanged', clientSecret: SETI_SECRET, source: 'intent' },
      { type: 'loadSucceeded', generation: 1 },
      { type: 'presentRequested' },
      { type: 'submitted' },
    ]);

    expect(effects).toContainEqual({ type: 'confirm', generation: 1, intentKind: 'setup' });
  });

  it('a payment that succeeds after a secret change is still reported as completed', () => {
    const { effects } = run(
      [
        { type: 'secretChanged', clientSecret: PI_SECRET, source: 'intent' },
        { type: 'confirmSucceeded', generation: 1 },
      ],
      confirmingState(),
    );

    expect(effects).toContainEqual({ type: 'emit', event: 'paymentSheetCompleted' });
  });

  it('present() before loading does not wait forever', () => {
    const { state } = run([{ type: 'presentRequested' }, { type: 'secretChanged', clientSecret: PI_SECRET, source: 'intent' }, { type: 'loadSucceeded', generation: 1 }]);

    expect(state.phase).toBe('presented');
  });
});

/**
 * Exhaustive check: enumerate every event order up to MAX_DEPTH and assert the same
 * properties that the Quint model (sheet_v3.qnt) verifies.
 */
describe('payment sheet properties over every event order', () => {
  /** `cs` is a Checkout Session secret, set through the checkout-session-client-secret attribute */
  type SecretKind = 'pi' | 'seti' | 'other' | 'cs';
  type World = {
    state: SheetState;
    secretKind?: SecretKind;
    secretChanges: number;
    loads: number[];
    confirms: { generation: number; intentKind: IntentKind; secretKind: SecretKind }[];
    created: number;
    resolved: number;
    stripeSucceeded: number;
    completedEmitted: number;
    completedGeneration?: number;
    visible: boolean;
  };

  const MAX_DEPTH = 7;
  const MAX_SECRET_CHANGES = 2;
  const SECRETS: Record<SecretKind, { clientSecret: string; source: SecretSource }> = {
    pi: { clientSecret: PI_SECRET, source: 'intent' },
    seti: { clientSecret: SETI_SECRET, source: 'intent' },
    other: { clientSecret: UNKNOWN_SECRET, source: 'intent' },
    // Same string as `other`: only the attribute decides that it is a Checkout Session
    cs: { clientSecret: UNKNOWN_SECRET, source: 'checkoutSession' },
  };
  /** The only confirmation method that can succeed for each secret (unknown intent secrets must never be confirmed) */
  const EXPECTED_METHOD: Record<SecretKind, IntentKind | undefined> = { pi: 'payment', seti: 'setup', other: undefined, cs: 'checkoutSession' };

  const initialWorld: World = {
    state: initialSheetState,
    secretChanges: 0,
    loads: [],
    confirms: [],
    created: 0,
    resolved: 0,
    stripeSucceeded: 0,
    completedEmitted: 0,
    visible: false,
  };

  type Step = { event: SheetEvent; secretKind?: SecretKind; stripeSucceeds?: boolean };

  const enabledSteps = (world: World): Step[] => {
    const steps: Step[] = [{ event: { type: 'presentRequested' } }, { event: { type: 'openRequested' } }, { event: { type: 'closeRequested' } }, { event: { type: 'submitted' } }];

    if (world.secretChanges < MAX_SECRET_CHANGES) {
      (Object.keys(SECRETS) as SecretKind[]).forEach(kind => steps.push({ event: { type: 'secretChanged', ...SECRETS[kind] }, secretKind: kind }));
    }

    world.loads.forEach(generation => {
      steps.push({ event: { type: 'loadSucceeded', generation } }, { event: { type: 'loadFailed', generation } });
    });

    world.confirms.forEach(confirm => {
      if (confirm.intentKind === EXPECTED_METHOD[confirm.secretKind]) {
        steps.push({ event: { type: 'confirmSucceeded', generation: confirm.generation }, stripeSucceeds: true });
      }

      steps.push(
        { event: { type: 'confirmDeclined', generation: confirm.generation, message: 'declined' } },
        { event: { type: 'confirmFailed', generation: confirm.generation, message: 'failed' } },
      );
    });

    return steps;
  };

  const apply = (world: World, step: Step, trace: string[]): World => {
    const before = world.state;
    // The component creates a new promise only when none is pending
    const created = step.event.type === 'presentRequested' && !before.pendingPresent ? world.created + 1 : world.created;
    const { state, effects } = transition(before, step.event);
    const next: World = {
      ...world,
      state,
      created,
      secretKind: step.secretKind ?? world.secretKind,
      secretChanges: step.secretKind != null ? world.secretChanges + 1 : world.secretChanges,
      loads:
        step.event.type === 'loadSucceeded' || step.event.type === 'loadFailed' ? world.loads.filter(g => g !== (step.event as { generation: number }).generation) : world.loads,
      confirms:
        step.event.type === 'confirmSucceeded' || step.event.type === 'confirmDeclined' || step.event.type === 'confirmFailed'
          ? world.confirms.filter(c => c.generation !== (step.event as { generation: number }).generation)
          : world.confirms,
      stripeSucceeded: step.stripeSucceeds ? world.stripeSucceeded + 1 : world.stripeSucceeded,
    };
    const fail = (message: string) => {
      throw new Error(`${message}\ntrace: ${[...trace, step.event.type].join(' -> ')}`);
    };

    effects.forEach(effect => {
      switch (effect.type) {
        case 'load':
          next.loads = [...next.loads, effect.generation];
          break;
        case 'confirm': {
          const secretKind = next.secretKind as SecretKind;

          if (effect.intentKind !== EXPECTED_METHOD[secretKind]) {
            fail('confirmed with a method that does not match the secret');
          }

          next.confirms = [...next.confirms, { generation: effect.generation, intentKind: effect.intentKind, secretKind }];
          break;
        }
        case 'resolvePresent':
          if (next.created === next.resolved) {
            fail('resolved a presentation that was never requested');
          }

          next.resolved += 1;
          break;
        case 'emit':
          if (effect.event === 'paymentSheetCompleted') {
            next.completedEmitted += 1;
            next.completedGeneration = before.generation;
          }

          if (effect.event === 'paymentSheetCanceled' && next.completedGeneration === before.generation) {
            fail('emitted paymentSheetCanceled after the same payment completed');
          }

          break;
        case 'show':
          next.visible = true;
          break;
        case 'hide':
          next.visible = false;
          break;
      }
    });

    const { phase, pendingPresent, openRequested } = next.state;

    if (next.created !== next.resolved + (pendingPresent ? 1 : 0)) {
      fail('a present() promise lost its resolver');
    }

    if (pendingPresent && !(phase === 'presented' || phase === 'confirming' || ((phase === 'idle' || phase === 'loading') && openRequested))) {
      fail('a present() promise is pending while the sheet cannot be shown');
    }

    if (next.stripeSucceeded !== next.completedEmitted) {
      fail('a payment that succeeded at Stripe was not reported as completed');
    }

    if (next.visible !== (phase === 'presented' || phase === 'confirming')) {
      fail(`the modal visibility (${next.visible}) does not match the phase (${phase})`);
    }

    return next;
  };

  it(`holds for every event order up to ${MAX_DEPTH} steps`, () => {
    let explored = 0;
    let failedReached = false;
    const completedKinds = new Set<IntentKind>();

    const explore = (world: World, depth: number, trace: string[]) => {
      if (depth === MAX_DEPTH) {
        return;
      }

      enabledSteps(world).forEach(step => {
        const next = apply(world, step, trace);

        explored += 1;

        if (next.state.phase === 'errored') {
          failedReached = true;
        }

        if (next.state.phase === 'completed' && next.state.intentKind != null) {
          completedKinds.add(next.state.intentKind);
        }

        explore(next, depth + 1, [...trace, step.event.type]);
      });
    };

    explore(initialWorld, 0, []);

    expect(explored).toBeGreaterThan(100000);
    // paymentSheetFailed must be reachable (it was unreachable in the v1 draft)
    expect(failedReached).toBe(true);
    // Every kind of secret, including a Checkout Session, can complete
    expect([...completedKinds].sort()).toEqual(['checkoutSession', 'payment', 'setup']);
  });
});

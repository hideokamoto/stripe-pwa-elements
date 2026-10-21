/**
 * State machine behind `<stripe-payment-sheet>`.
 *
 * Pure functions only: the component feeds events in and performs the returned effects
 * (loading Stripe.js, showing the modal, confirming, emitting events, resolving `present()`).
 * The same rules are model-checked in Quint; see the exhaustive test next to this file.
 */

/**
 * What a client secret belongs to: a PaymentIntent, a SetupIntent or a Checkout Session
 */
export type IntentKind = 'payment' | 'setup' | 'checkoutSession';

/**
 * Attribute a client secret was set through: `intent-client-secret` or `checkout-session-client-secret`
 */
export type SecretSource = 'intent' | 'checkoutSession';

/**
 * Lifecycle phase of the sheet
 */
export type SheetPhase = 'idle' | 'loading' | 'ready' | 'loadFailed' | 'presented' | 'confirming' | 'completed' | 'errored';

/**
 * DOM events emitted by the sheet (same names as Capacitor's PaymentSheetEventsEnum)
 */
export type PaymentSheetEventName = 'paymentSheetLoaded' | 'paymentSheetFailedToLoad' | 'paymentSheetCompleted' | 'paymentSheetCanceled' | 'paymentSheetFailed';

/**
 * Result of `present()` (same values as Capacitor's PaymentSheetResultInterface)
 */
export type PaymentSheetResult = 'paymentSheetCompleted' | 'paymentSheetCanceled' | 'paymentSheetFailed';

export type SheetState = Readonly<{
  phase: SheetPhase;
  /** Incremented on every accepted secret change so that results of older loads and confirmations are ignored */
  generation: number;
  intentKind?: IntentKind;
  /** Whether a `present()` promise is waiting for a result (at most one) */
  pendingPresent: boolean;
  /** Whether the sheet should open as soon as loading finishes */
  openRequested: boolean;
  /** Secret received while confirming; applied once the confirmation finishes */
  deferredSecret?: { clientSecret: string; source: SecretSource };
}>;

export type SheetEvent =
  | { type: 'secretChanged'; clientSecret: string; source: SecretSource }
  | { type: 'loadSucceeded'; generation: number }
  | { type: 'loadFailed'; generation: number }
  | { type: 'presentRequested' }
  | { type: 'openRequested' }
  | { type: 'closeRequested' }
  | { type: 'submitted' }
  | { type: 'confirmSucceeded'; generation: number }
  | { type: 'confirmDeclined'; generation: number; message: string }
  | { type: 'confirmFailed'; generation: number; message: string };

export type SheetEffect =
  | { type: 'load'; generation: number; clientSecret: string; intentKind: IntentKind }
  | { type: 'show' }
  | { type: 'hide' }
  | { type: 'confirm'; generation: number; intentKind: IntentKind }
  | { type: 'showError'; message: string }
  | { type: 'emit'; event: PaymentSheetEventName }
  | { type: 'resolvePresent'; result: PaymentSheetResult };

export type Transition = { state: SheetState; effects: SheetEffect[] };

export const initialSheetState: SheetState = {
  phase: 'idle',
  generation: 0,
  pendingPresent: false,
  openRequested: false,
};

const CLIENT_SECRET_PATTERNS: Array<[RegExp, 'payment' | 'setup']> = [
  [/^pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/, 'payment'],
  [/^seti_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/, 'setup'],
];

/**
 * Tell whether a client secret belongs to a PaymentIntent or a SetupIntent from its prefix.
 * @param clientSecret - The `client_secret` of a PaymentIntent (`pi_..._secret_...`) or SetupIntent (`seti_..._secret_...`)
 * @returns The intent kind, or undefined when the format is not recognized
 */
export const intentKindFromClientSecret = (clientSecret: string): 'payment' | 'setup' | undefined => {
  const match = CLIENT_SECRET_PATTERNS.find(([pattern]) => pattern.test(clientSecret));

  return match?.[1];
};

/**
 * Tell what a client secret belongs to.
 * A secret from `checkout-session-client-secret` is always a Checkout Session: Stripe does not document the format
 * of a Checkout Session client secret, so it is never inspected. Intent secrets are told apart by their prefix.
 * @param clientSecret - The client secret
 * @param source - The attribute the secret was set through
 * @returns The kind, or undefined when an intent secret has an unknown format
 */
export const intentKindOf = (clientSecret: string, source: SecretSource): IntentKind | undefined => {
  if (source === 'checkoutSession') {
    return 'checkoutSession';
  }

  return intentKindFromClientSecret(clientSecret);
};

const unchanged = (state: SheetState): Transition => ({ state, effects: [] });

/**
 * Resolve the pending `present()` promise, if any.
 */
const resolvePending = (state: SheetState, result: PaymentSheetResult): Transition => {
  if (!state.pendingPresent) {
    return unchanged(state);
  }

  return { state: { ...state, pendingPresent: false }, effects: [{ type: 'resolvePresent', result }] };
};

/**
 * Close the sheet as canceled: hide it, emit the event and resolve `present()`.
 */
const cancel = (state: SheetState): Transition => {
  const resolved = resolvePending({ ...state, openRequested: false }, 'paymentSheetCanceled');
  const visible = state.phase === 'presented' || state.phase === 'confirming';

  return {
    state: resolved.state,
    effects: [...(visible ? [{ type: 'hide' } as SheetEffect] : []), { type: 'emit', event: 'paymentSheetCanceled' }, ...resolved.effects],
  };
};

const changeSecret = (state: SheetState, clientSecret: string, source: SecretSource): Transition => {
  if (clientSecret === '') {
    return unchanged(state);
  }

  // Never drop the result of a running confirmation; apply the new secret once it finishes
  if (state.phase === 'confirming') {
    return unchanged({ ...state, deferredSecret: { clientSecret, source } });
  }

  const canceled = state.phase === 'presented' ? cancel(state) : unchanged(state);
  const generation = state.generation + 1;
  const intentKind = intentKindOf(clientSecret, source);

  if (intentKind == null) {
    const resolved = resolvePending({ ...canceled.state, phase: 'loadFailed', generation, intentKind: undefined, openRequested: false }, 'paymentSheetFailed');

    return {
      state: resolved.state,
      effects: [...canceled.effects, { type: 'emit', event: 'paymentSheetFailedToLoad' }, ...resolved.effects],
    };
  }

  return {
    state: { ...canceled.state, phase: 'loading', generation, intentKind },
    effects: [...canceled.effects, { type: 'load', generation, clientSecret, intentKind }],
  };
};

/**
 * Apply a secret that arrived while confirming.
 */
const applyDeferredSecret = (result: Transition): Transition => {
  const { deferredSecret } = result.state;

  if (deferredSecret == null) {
    return result;
  }

  const next = changeSecret({ ...result.state, deferredSecret: undefined }, deferredSecret.clientSecret, deferredSecret.source);

  return { state: next.state, effects: [...result.effects, ...next.effects] };
};

const isCurrentConfirmation = (state: SheetState, generation: number) => state.phase === 'confirming' && state.generation === generation;

/**
 * Compute the next state and the effects to perform for an event.
 * @param state - Current state
 * @param event - Event to handle
 */
export const transition = (state: SheetState, event: SheetEvent): Transition => {
  switch (event.type) {
    case 'secretChanged':
      return changeSecret(state, event.clientSecret, event.source);

    case 'loadSucceeded': {
      if (event.generation !== state.generation || state.phase !== 'loading') {
        return unchanged(state);
      }

      const open = state.openRequested;

      return {
        state: { ...state, phase: open ? 'presented' : 'ready', openRequested: false },
        effects: [{ type: 'emit', event: 'paymentSheetLoaded' }, ...(open ? [{ type: 'show' } as SheetEffect] : [])],
      };
    }

    case 'loadFailed': {
      if (event.generation !== state.generation || state.phase !== 'loading') {
        return unchanged(state);
      }

      const resolved = resolvePending({ ...state, phase: 'loadFailed', openRequested: false }, 'paymentSheetFailed');

      return { state: resolved.state, effects: [{ type: 'emit', event: 'paymentSheetFailedToLoad' }, ...resolved.effects] };
    }

    case 'presentRequested':
      if (state.pendingPresent) {
        return unchanged(state);
      }

      switch (state.phase) {
        case 'ready':
          return { state: { ...state, phase: 'presented', pendingPresent: true }, effects: [{ type: 'show' }] };
        case 'idle':
        case 'loading':
          return unchanged({ ...state, pendingPresent: true, openRequested: true });
        case 'presented':
        case 'confirming':
          // Already shown through the `open` attribute: wait for its result
          return unchanged({ ...state, pendingPresent: true });
        default:
          // loadFailed / completed / errored: nothing can be shown
          return { state, effects: [{ type: 'resolvePresent', result: 'paymentSheetFailed' }] };
      }

    case 'openRequested':
      if (state.phase === 'ready') {
        return { state: { ...state, phase: 'presented' }, effects: [{ type: 'show' }] };
      }

      if (state.phase === 'idle' || state.phase === 'loading') {
        return unchanged({ ...state, openRequested: true });
      }

      return unchanged(state);

    case 'closeRequested':
      if (state.phase === 'presented') {
        const canceled = cancel(state);

        return { state: { ...canceled.state, phase: 'ready' }, effects: canceled.effects };
      }

      // Closing before the sheet was shown withdraws the request to open it
      if ((state.phase === 'idle' || state.phase === 'loading') && state.openRequested) {
        return cancel(state);
      }

      return unchanged(state);

    case 'submitted':
      if (state.phase !== 'presented' || state.intentKind == null) {
        return unchanged(state);
      }

      return {
        state: { ...state, phase: 'confirming' },
        effects: [{ type: 'confirm', generation: state.generation, intentKind: state.intentKind }],
      };

    case 'confirmSucceeded': {
      if (!isCurrentConfirmation(state, event.generation)) {
        return unchanged(state);
      }

      const resolved = resolvePending({ ...state, phase: 'completed' }, 'paymentSheetCompleted');

      return applyDeferredSecret({
        state: resolved.state,
        effects: [{ type: 'hide' }, { type: 'emit', event: 'paymentSheetCompleted' }, ...resolved.effects],
      });
    }

    case 'confirmDeclined':
      if (!isCurrentConfirmation(state, event.generation)) {
        return unchanged(state);
      }

      return applyDeferredSecret({ state: { ...state, phase: 'presented' }, effects: [{ type: 'showError', message: event.message }] });

    case 'confirmFailed': {
      if (!isCurrentConfirmation(state, event.generation)) {
        return unchanged(state);
      }

      const resolved = resolvePending({ ...state, phase: 'errored' }, 'paymentSheetFailed');

      return applyDeferredSecret({
        state: resolved.state,
        effects: [{ type: 'hide' }, { type: 'emit', event: 'paymentSheetFailed' }, ...resolved.effects],
      });
    }
  }
};

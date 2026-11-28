import type { ProgressStatus } from '../interfaces';
import type { IStripeService } from '../services/interfaces';
import { whenStripeLoaded } from './when-stripe-loaded';

type LoadService = Pick<IStripeService, 'state' | 'onChange'>;

const loadService = (status: ProgressStatus) => {
  const listeners: Array<(status: ProgressStatus) => Promise<void> | void> = [];
  const unsubscribe = vi.fn();
  const service: LoadService = {
    state: {
      loadStripeStatus: status,
      applicationName: 'stripe-pwa-elements',
    },
    onChange: vi.fn((_key: 'loadStripeStatus', callback: (status: ProgressStatus) => void) => {
      listeners.push(callback);
      return unsubscribe;
    }) as IStripeService['onChange'],
  };

  return {
    service,
    unsubscribe,
    emit: (next: ProgressStatus) => {
      service.state.loadStripeStatus = next;
      return Promise.all(listeners.map(listener => listener(next)));
    },
  };
};

describe('whenStripeLoaded', () => {
  it('runs immediately when Stripe.js is already loaded and does not subscribe', async () => {
    const { service } = loadService('success');
    const onChange = vi.spyOn(service, 'onChange');
    let release: () => void = () => undefined;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const onReady = vi.fn(() => gate);

    const pending = whenStripeLoaded(service, onReady);
    let settled = false;
    void pending.then(() => {
      settled = true;
    });

    expect(onReady).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(settled).toBe(false);
    release();
    await pending;
    expect(settled).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores a non-success status and runs once on the following success', async () => {
    const { service, emit, unsubscribe } = loadService('loading');
    const onReady = vi.fn();

    await whenStripeLoaded(service, onReady);
    expect(onReady).not.toHaveBeenCalled();

    await emit('failure');
    expect(onReady).not.toHaveBeenCalled();
    expect(unsubscribe).not.toHaveBeenCalled();

    await emit('');
    expect(onReady).not.toHaveBeenCalled();

    await emit('success');
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('leaves the listener in place when the ready work throws', async () => {
    const { service, emit, unsubscribe } = loadService('');
    const onReady = vi.fn().mockRejectedValue(new Error('mount failed'));

    await whenStripeLoaded(service, onReady);
    await expect(emit('success')).rejects.toThrow(Error);
    expect(unsubscribe).not.toHaveBeenCalled();
  });
});

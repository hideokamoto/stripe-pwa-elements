import type { IStripeService } from '../services/interfaces';

export const whenStripeLoaded = async (service: Pick<IStripeService, 'state' | 'onChange'>, onReady: () => Promise<void> | void): Promise<void> => {
  if (service.state.loadStripeStatus === 'success') {
    await onReady();

    return;
  }

  const unsubscribe = service.onChange('loadStripeStatus', async status => {
    if (status !== 'success') {
      return;
    }

    await onReady();
    unsubscribe();
  });
};

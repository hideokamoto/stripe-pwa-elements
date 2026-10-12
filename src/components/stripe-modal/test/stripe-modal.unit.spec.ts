import { StripeModal } from '../stripe-modal';

/**
 * Unit tests for StripeModal component
 *
 * Following Kent Beck's test pyramid philosophy:
 * - These are pure unit tests that test class logic in isolation
 * - No DOM rendering, no Stencil page context
 * - Fast, isolated, deterministic
 */
describe('stripe-modal unit tests', () => {
  describe('Component Logic', () => {
    describe('#openModal', () => {
      it('open props should change to true when the openModal method was called', async () => {
        const component = new StripeModal();

        component.open = false;
        await component.openModal();
        expect(component.open).toEqual(true);
      });
    });

    describe('#closeModal', () => {
      it('open props should change to false when the closeModal method was called', async () => {
        const component = new StripeModal();

        component.close = {
          emit: jest.fn(),
        };
        await component.closeModal();
        expect(component.open).toEqual(false);
      });

      it('should not emit the close event directly; emission is handled by the open watcher', async () => {
        const component = new StripeModal();

        component.open = true;
        const mockEmitter = jest.fn();

        component.close = {
          emit: mockEmitter,
        };
        await component.closeModal();
        expect(mockEmitter).toBeCalledTimes(0);
      });
    });

    describe('#onOpenChange', () => {
      it('should emit close event once and hide the modal when open becomes false', () => {
        const component = new StripeModal();
        const mockEmitter = jest.fn();

        component.close = {
          emit: mockEmitter,
        };
        component.renderedOpen = true;

        component.onOpenChange(false);

        expect(mockEmitter).toBeCalledTimes(1);
        expect(component.renderedOpen).toBe(false);
      });
    });

    describe('#toggleModal', () => {
      describe('Props open=true', () => {
        let component = new StripeModal();
        let mockEmitter = jest.fn();

        beforeEach(() => {
          component = new StripeModal();
          mockEmitter = jest.fn();
          component.open = true;
          component.close = {
            emit: mockEmitter,
          };
        });

        it('should not emit the close event directly; emission is handled by the open watcher', async () => {
          await component.toggleModal();
          expect(mockEmitter).toBeCalledTimes(0);
        });

        it('Should change the open props to be false', async () => {
          await component.toggleModal();
          expect(component.open).toEqual(false);
        });
      });

      describe('Props open=false', () => {
        let component = new StripeModal();
        let mockEmitter = jest.fn();

        beforeEach(() => {
          component = new StripeModal();
          mockEmitter = jest.fn();
          component.open = false;
          component.close = {
            emit: mockEmitter,
          };
        });

        it('should execute the close event', async () => {
          await component.toggleModal();
          expect(mockEmitter).toBeCalledTimes(0);
        });

        it('Should change the open props to be true', async () => {
          await component.toggleModal();
          expect(component.open).toEqual(true);
        });
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid open/close toggles', async () => {
      const component = new StripeModal();
      component.close = {
        emit: jest.fn(),
      };

      component.open = false;
      await component.toggleModal();
      expect(component.open).toBe(true);

      await component.toggleModal();
      expect(component.open).toBe(false);

      await component.toggleModal();
      expect(component.open).toBe(true);

      await component.toggleModal();
      expect(component.open).toBe(false);
    });

    it('should handle multiple closeModal calls without emitting close directly', async () => {
      const component = new StripeModal();
      const mockEmitter = jest.fn();
      component.close = {
        emit: mockEmitter,
      };

      component.open = true;
      await component.closeModal();
      await component.closeModal();
      await component.closeModal();

      expect(mockEmitter).toBeCalledTimes(0);
      expect(component.open).toBe(false);
    });

    it('should handle multiple openModal calls', async () => {
      const component = new StripeModal();

      component.open = false;
      await component.openModal();
      expect(component.open).toBe(true);

      await component.openModal();
      expect(component.open).toBe(true);

      await component.openModal();
      expect(component.open).toBe(true);
    });
  });

  describe('Default props', () => {
    it('should have default open as false', () => {
      const component = new StripeModal();
      expect(component.open).toBe(false);
    });

    it('should have default showCloseButton as true', () => {
      const component = new StripeModal();
      expect(component.showCloseButton).toBe(true);
    });
  });
});

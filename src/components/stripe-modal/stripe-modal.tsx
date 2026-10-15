import { Component, Host, h, Prop, Method, Element, Event, EventEmitter, State, Watch } from '@stencil/core';
import { checkPlatform } from '../../utils/utils';
import { getDeepActiveElement, getTabbableElements } from '../../utils/focus';
import { i18n } from '../../utils/i18n';

@Component({
  tag: 'stripe-modal',
  styleUrl: 'stripe-modal.scss',
  shadow: true,
})
export class StripeModal {
  @Element() el: HTMLStripeModalElement;

  /**
   * If true, the modal display close button
   */
  @Prop() showCloseButton = true;

  /**
   * Modal state.
   * If true, the modal will open
   */
  @Prop({ mutable: true }) open = false;

  /**
   * Effect `this.open`. This is for animation.
   * Ionic Ref: https://github.com/ionic-team/ionic-framework/blob/main/core/src/components/accordion/accordion.tsx#L83
   */
  @State() renderedOpen = false;

  /**
   * The element that had focus before the modal opened. Focus returns to it when the modal closes.
   */
  private returnFocusElement: HTMLElement | null = null;

  /**
   * Set when the modal opens; the initial focus is moved after the open state has been rendered.
   */
  private shouldFocusOnRender = false;

  private dialogElement?: HTMLElement;

  @Watch('open')
  onOpenChange(open: boolean) {
    if (open) {
      this.rememberFocus();
      this.openModalAnimation();
    } else {
      this.renderedOpen = false;
      this.shouldFocusOnRender = false;
      this.close.emit();
      this.restoreFocus();
    }
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (!this.open || event.key !== 'Escape') {
      return;
    }

    // Prevent an outer modal (or the page) from also reacting to the same key press
    event.preventDefault();
    event.stopPropagation();
    this.closeModal();
  };

  /**
   * Toggle modal state
   */
  @Method()
  public async toggleModal() {
    this.open ? await this.closeModal() : await this.openModal();
  }

  /**
   * Open the modal
   */
  @Method()
  public async openModal() {
    this.open = true;
  }

  /**
   * Close the modal
   */
  @Method()
  public async closeModal() {
    this.open = false;
  }

  /**
   *
   */
  @Event() close: EventEmitter;

  componentDidLoad() {
    const platformName = checkPlatform();

    if (platformName) {
      this.el.classList.add(platformName);
    }

    if (this.open) {
      this.rememberFocus();
      this.openModalAnimation();
    }
  }

  componentDidRender() {
    if (this.shouldFocusOnRender && this.renderedOpen) {
      this.shouldFocusOnRender = false;
      this.focusFirstElement();
    }
  }

  private rememberFocus() {
    if (typeof document === 'undefined') {
      return;
    }

    const active = getDeepActiveElement(document);

    // Ignore focus that is already inside the modal and the default document focus
    if (active === null || active === document.body || this.el.contains(active) || this.el.shadowRoot?.contains(active) === true) {
      return;
    }

    this.returnFocusElement = active as HTMLElement;
  }

  private restoreFocus() {
    const target = this.returnFocusElement;

    this.returnFocusElement = null;
    if (target != null && target.isConnected && typeof target.focus === 'function') {
      target.focus();
    }
  }

  private getTabbableElements(): HTMLElement[] {
    if (this.dialogElement === undefined) {
      return [];
    }

    return getTabbableElements(this.dialogElement).filter(element => !element.classList.contains('focus-guard'));
  }

  private focusFirstElement() {
    const [first] = this.getTabbableElements();

    (first ?? this.dialogElement)?.focus();
  }

  private focusLastElement() {
    const elements = this.getTabbableElements();

    (elements[elements.length - 1] ?? this.dialogElement)?.focus();
  }

  private openModalAnimation() {
    this.shouldFocusOnRender = true;

    if (!this.el.shadowRoot) {
      this.renderedOpen = true;
      return;
    }

    const modalChild = this.el.shadowRoot.querySelector('.modal-child') as HTMLElement;

    modalChild.classList.add('loading');
    modalChild.style.willChange = 'transform';
    modalChild.addEventListener(
      'transitionend',
      () => {
        modalChild.style.willChange = 'auto';
        modalChild.classList.remove('loading');
      },
      { once: true },
    );
    requestAnimationFrame(() => {
      this.renderedOpen = this.open;
    });
  }

  render() {
    const { renderedOpen, showCloseButton } = this;
    const guardTabIndex = renderedOpen ? 0 : -1;

    return (
      <Host role={renderedOpen ? 'dialog' : undefined} aria-modal={renderedOpen ? 'true' : undefined} onKeyDown={this.handleKeyDown}>
        <div class={`modal-row${renderedOpen ? ' open' : ''}`} onClick={() => this.closeModal()}>
          <div class="modal-child" tabindex="-1" ref={el => (this.dialogElement = el)} onClick={e => e.stopPropagation()}>
            <div class="focus-guard" tabindex={guardTabIndex} onFocus={() => this.focusLastElement()}></div>
            {showCloseButton ? (
              <div class="modal-close-button-wrap">
                <button type="button" class="modal-close-button" aria-label={i18n.t('Close')} onClick={() => this.closeModal()}>
                  <ion-icon name="close" size="large" aria-hidden="true"></ion-icon>
                </button>
              </div>
            ) : null}
            <div class="modal-loading">
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 2400">
                <g stroke-width="200" stroke-linecap="round" stroke="currentColor" fill="none" id="spinner">
                  <line x1="1200" y1="600" x2="1200" y2="100" />
                  <line opacity="0.5" x1="1200" y1="2300" x2="1200" y2="1800" />
                  <line opacity="0.917" x1="900" y1="680.4" x2="650" y2="247.4" />
                  <line opacity="0.417" x1="1750" y1="2152.6" x2="1500" y2="1719.6" />
                  <line opacity="0.833" x1="680.4" y1="900" x2="247.4" y2="650" />
                  <line opacity="0.333" x1="2152.6" y1="1750" x2="1719.6" y2="1500" />
                  <line opacity="0.75" x1="600" y1="1200" x2="100" y2="1200" />
                  <line opacity="0.25" x1="2300" y1="1200" x2="1800" y2="1200" />
                  <line opacity="0.667" x1="680.4" y1="1500" x2="247.4" y2="1750" />
                  <line opacity="0.167" x1="2152.6" y1="650" x2="1719.6" y2="900" />
                  <line opacity="0.583" x1="900" y1="1719.6" x2="650" y2="2152.6" />
                  <line opacity="0.083" x1="1750" y1="247.4" x2="1500" y2="680.4" />
                  <animateTransform
                    attributeName="transform"
                    attributeType="XML"
                    type="rotate"
                    keyTimes="0;0.08333;0.16667;0.25;0.33333;0.41667;0.5;0.58333;0.66667;0.75;0.83333;0.91667"
                    values="0 1199 1199;30 1199 1199;60 1199 1199;90 1199 1199;120 1199 1199;150 1199 1199;180 1199 1199;210 1199 1199;240 1199 1199;270 1199 1199;300 1199 1199;330 1199 1199"
                    dur="0.83333s"
                    begin="0s"
                    repeatCount="indefinite"
                    calcMode="discrete"
                  />
                </g>
              </svg>
            </div>
            <div class="modal-content">
              <slot></slot>
            </div>
            <div class="focus-guard" tabindex={guardTabIndex} onFocus={() => this.focusFirstElement()}></div>
          </div>
        </div>
      </Host>
    );
  }
}

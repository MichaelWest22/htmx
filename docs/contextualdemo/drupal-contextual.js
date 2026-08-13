// drupal-contextual.js
//
// <drupal-contextual> — light DOM custom element.
//
// On page load the element is an invisible placeholder containing two hidden
// inputs (ids[] and tokens[]) that hx-include collects for the batch POST.
//
// After the hx-partial swap the inputs are replaced by the server-rendered
// trigger button and contextual-links list. connectedCallback then wires the
// open/close/hover behaviour.
//
// Attributes (set by ContextualModelView equivalent):
//   open   — menu is visible
//   locked — pinned open by toolbar edit mode

class DrupalContextual extends HTMLElement {
  get value() { return this.getAttribute('value'); }

  connectedCallback() {
    if (this.querySelector('.trigger')) this._init();
  }

  _init() {
    const trigger = this.querySelector('.trigger');
    const list    = this.querySelector('.contextual-links');
    const region  = this.closest('.contextual-region');
    if (!trigger || !list) return;

    // Derive accessible title from nearest heading in the region.
    const heading = region?.querySelector('h2, h3');
    const title   = heading?.textContent.trim() ?? '';

    const open = () => {
      this.setAttribute('open', '');
      trigger.setAttribute('aria-pressed', 'true');
      trigger.textContent = `Close ${title} configuration options`.trim();
      list.hidden = false;
    };

    const close = () => {
      this.removeAttribute('open');
      trigger.setAttribute('aria-pressed', 'false');
      trigger.textContent = `Open ${title} configuration options`.trim();
      list.hidden = true;
    };

    close(); // set initial state

    trigger.addEventListener('click', () => {
      this.hasAttribute('open') ? close() : open();
    });

    // Close when focus leaves the component entirely.
    this.addEventListener('focusout', (e) => {
      if (!this.contains(e.relatedTarget)) {
        setTimeout(() => { if (!this.contains(document.activeElement)) close(); }, 150);
      }
    });

    // Show trigger on region hover (desktop only).
    if (!document.body.classList.contains('touchevents')) {
      region?.addEventListener('mouseenter', () => trigger.classList.remove('visually-hidden'));
      region?.addEventListener('mouseleave', () => {
        if (!this.hasAttribute('open') && !this.hasAttribute('locked')) {
          trigger.classList.add('visually-hidden');
        }
        close();
      });
    }

    // Toolbar locked state: show all triggers.
    if (this.hasAttribute('locked')) trigger.classList.remove('visually-hidden');
  }

  static get observedAttributes() { return ['locked']; }

  attributeChangedCallback() {
    const trigger = this.querySelector('.trigger');
    if (!trigger) return;
    if (this.hasAttribute('locked')) {
      trigger.classList.remove('visually-hidden');
    } else {
      trigger.classList.add('visually-hidden');
    }
  }
}

customElements.define('drupal-contextual', DrupalContextual);
customElements.define('drupal-contextual-loader', class extends HTMLElement {});

// drupal-message.js
//
// <drupal-messages> / <drupal-message> custom elements.
//
// <drupal-messages> — persistent container, always present in the page
// template. Stable htmx target. No behaviour — just a named insertion point.
//
// <drupal-message> — individual message item delivered by hx-partial.
// connectedCallback owns exactly:
//   1. Screen-reader announcement via Drupal.announce() (or console.log in demo)
//   2. Close button wiring — self-removes on click
//   3. Auto-dismiss timer if data-auto-dismiss attribute is present

class DrupalMessages extends HTMLElement {}

class DrupalMessage extends HTMLElement {
  connectedCallback() {
    const type = this.getAttribute('type') || 'status';
    const text = this.querySelector('[data-message-content]')?.textContent.trim()
      ?? this.textContent.trim();

    // Announce to screen reader.
    // In a real Drupal page this calls Drupal.announce(text, priority).
    if (text) {
      const priority = type === 'error' || type === 'warning' ? 'assertive' : 'polite';
      // Demo shim — replace with Drupal.announce(text, priority) in core.
      console.log(`[announce:${priority}] ${text}`);
    }

    // Wire close button.
    this.querySelector('[data-message-close]')
      ?.addEventListener('click', () => this.remove());

    // Auto-dismiss.
    if (this.hasAttribute('data-auto-dismiss')) {
      const delay = parseInt(this.getAttribute('data-auto-dismiss'), 10) || 5000;
      this._timer = setTimeout(() => this.remove(), delay);
    }
  }

  disconnectedCallback() {
    clearTimeout(this._timer);
  }
}

customElements.define('drupal-messages', DrupalMessages);
customElements.define('drupal-message', DrupalMessage);

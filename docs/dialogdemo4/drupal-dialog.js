// drupal-dialog.js
//
// <drupal-dialog> custom element.
//
// Light DOM wrapper around a native <dialog>. Owns exactly:
//   1. showModal() / show() on connectedCallback based on data-modal attribute
//   2. closedby="any" backdrop-click polyfill for Safari
//   3. Self-removal from DOM on dialog close (unless data-persist)
//   4. Cleanup when removed by server (htmx delete swap) via disconnectedCallback

const supportsClosedBy = HTMLDialogElement.prototype.hasOwnProperty('closedBy');

class DrupalDialog extends HTMLElement {
  connectedCallback() {
    const dialog = this.querySelector('dialog');
    if (!dialog) return;

    // Backdrop polyfill for closedby="any" on Safari.
    if (!supportsClosedBy && dialog.getAttribute('closedby') === 'any') {
      this._backdropHandler = (e) => {
        if (e.target === dialog) dialog.close();
      };
      dialog.addEventListener('click', this._backdropHandler);
    }

    // Open the dialog — open attribute is the declarative signal from the server.
    // data-modal on <dialog> upgrades to showModal(); plain open = non-modal show().
    if (dialog.hasAttribute('open')) {
      if (dialog.hasAttribute('data-modal')) {
        dialog.close();
        dialog.showModal();
      }
      // non-modal: open attribute is sufficient, leave it
    }

    // Remove self from DOM on close unless data-persist.
    dialog.addEventListener('close', () => {
      if (!this.hasAttribute('data-persist')) this.remove();
    });
  }

  disconnectedCallback() {
    // Server-driven removal path: htmx deleted this element without calling
    // dialog.close(). Clean up and close silently if still open.
    const dialog = this.querySelector('dialog');
    if (!dialog) return;
    if (this._backdropHandler) dialog.removeEventListener('click', this._backdropHandler);
    if (dialog.open) dialog.close();
  }
}

customElements.define('drupal-dialog', DrupalDialog);

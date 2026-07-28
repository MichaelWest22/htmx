// dialog-shim.js
//
// Responsibilities:
//   1. Call showModal() on <dialog data-modal> after htmx swaps them in.
//   2. Polyfill closedby="any" (backdrop click to close) for browsers that
//      don't support it natively yet (mainly Safari).
//
// Remove showModal() shim once command="show-modal" reaches ~95% adoption.
// Remove closedby polyfill once Safari ships support.

// Feature-detect native closedby support once.
const supportsClosedBy = HTMLDialogElement.prototype.hasOwnProperty('closedBy');

function applyDialog(d) {
  if (d.matches('dialog[data-modal]:not([open])')) d.showModal();
  if (!supportsClosedBy && d.getAttribute('closedby') === 'any') {
    d.addEventListener('click', onBackdropClick);
  }
}

function onBackdropClick(e) {
  if (e.target === e.currentTarget) e.currentTarget.close();
}

// Before a beforeend swap lands, remove any existing dialog with the same id
// so we never end up with duplicates in the DOM.
document.addEventListener('htmx:before:swap', (e) => {
  const { ctx } = e.detail;
  if (ctx.swap !== 'beforeend') return;
  const incoming = new DOMParser().parseFromString(ctx.text, 'text/html');
  incoming.querySelectorAll('dialog[id]').forEach((d) => {
    document.getElementById(d.id)?.remove();
  });
});

// Remove dialog from DOM when it closes, unless it has data-persist.
document.addEventListener('close', (e) => {
  if (e.target.tagName === 'DIALOG' && !e.target.hasAttribute('data-persist')) {
    e.target.remove();
  }
}, true);

document.addEventListener('htmx:after:settle', (e) => {
  e.detail.newContent?.forEach((node) => {
    applyDialog(node);
    node.querySelectorAll?.('dialog').forEach(applyDialog);
  });
});

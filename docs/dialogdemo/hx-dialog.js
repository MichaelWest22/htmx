//==========================================================
// hx-dialog.js
//
// An htmx extension for displaying content in a native <dialog>
// element, delivered via <hx-dialog> tags in htmx responses.
//
// htmx converts <hx-dialog> tags in responses to
// <template hx type="dialog"> and calls htmx_process_dialog on the
// registered extension. All work is done directly in that hook —
// no task queue or handle_swap needed.
//
// Attributes on <hx-dialog> — extension-consumed (not copied to <dialog>):
//   modal                - showModal() vs show() (absent = non-modal)
//   id="[string]"        - targets/creates <dialog id="[string]">
//                          (default: "drupal-dialog")
//   close                - close the named dialog instead of opening it
//
// All other attributes are copied directly onto the <dialog> element:
//   class, style, aria-*, dir, lang, data-* — user-owned
//   close-on-backdrop    - copied through; click on backdrop closes dialog
//   persist              - copied through; keeps <dialog> in DOM after close
//
// Excluded (never copied): type, hx, id, modal, close
//
// DOM contract:
//   <dialog id="[id]">           - the native dialog element, created if absent
//     <div data-dialog-titlebar> - heading + close button
//     <div data-dialog-content>  - scrollable content slot
//     <div data-dialog-footer>   - .form-actions land here
//   </dialog>
//
// Close triggers (delegated, work on dynamically added content):
//   [data-dialog-close]  - closes the nearest ancestor <dialog>
//   .dialog-cancel       - same (Drupal compat)
//==========================================================
(() => {
    const t = (typeof Drupal !== 'undefined' && Drupal.t) ? Drupal.t.bind(Drupal) : (s) => s;

    // Constructable stylesheet — same approach as htmx
    // core's indicator CSS. Only adopted when no theme stylesheet is present.
    // Provides the minimum needed for a usable dialog on any page.
    let fallbackSheet = null;
    try {
        fallbackSheet = new CSSStyleSheet();
        fallbackSheet.replaceSync(`
/* Outer shell */
dialog{
  border:0;border-radius:4px;padding:0;
  max-width:min(600px,90vw);max-height:90dvh;
  display:flex;flex-direction:column;
  box-shadow:0 8px 32px rgba(0,0,0,.28),0 2px 8px rgba(0,0,0,.18);
  background:#fff;color:#333;font-family:inherit;font-size:1rem;
}
dialog:not([open]){display:none}
dialog[open]{
  position:fixed;
  inset:0;
  margin:auto;
  width:fit-content;
  height:fit-content;
}
@media(max-width:48em){
  dialog:not([data-dialog-offcanvas]){min-width:92%;max-width:92%}
}
@media(forced-colors:active){
  dialog{border:1px solid transparent}
}
dialog::backdrop{background:rgba(0,0,0,.45)}

/* Title bar — dark band matching Claro's header treatment */
[data-dialog-titlebar]{
  position:relative;
  padding:.75rem 3.5rem .75rem 1.25rem;
  background:#232429;color:#fff;
  border-radius:4px 4px 0 0;
  font-weight:bold;font-size:1rem;line-height:1.5;
  flex-shrink:0;
  overflow:visible;
}
[dir=rtl] [data-dialog-titlebar]{padding-right:1.25rem;padding-left:3.5rem}
[data-dialog-titlebar]:empty{display:none}

/* Close button — SVG × in the titlebar */
[data-dialog-close-btn]{
  position:absolute;inset-block-start:50%;inset-inline-end:0;
  transform:translateY(-50%);
  margin-inline:0.75rem;
  width:2rem;height:2rem;
  background:none;border:none;
  border-radius:3px;cursor:pointer;padding:0;
  display:flex;align-items:center;justify-content:center;
  color:#d3d4d9;
}
[data-dialog-close-btn]:hover{color:#fff}
[data-dialog-close-btn]:focus{outline:none}
[data-dialog-close-btn]:focus-visible{
  outline:2px solid #26a769;outline-offset:2px;
}

/* Scrollable content area */
[data-dialog-content]{
  padding:1.25rem 1.5rem;
  overflow:auto;flex:1 1 auto;
  background:#fff;
}

/* Footer button pane — grey band, buttons right-aligned, matching Claro */
[data-dialog-footer]{
  display:flex;flex-wrap:wrap;gap:.5rem;
  justify-content:flex-end;
  padding:.75rem 1.5rem;
  background:#f3f4f9;
  border-top:1px solid #ddd;
  border-radius:0 0 4px 4px;
  flex-shrink:0;
}
[data-dialog-footer]:empty{display:none}
`);
    } catch {}
    let fallbackSheetAdopted = false;

    function adoptFallbackSheet() {
        if (!fallbackSheetAdopted && fallbackSheet) {
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, fallbackSheet];
            fallbackSheetAdopted = true;
        }
    }

    // Check whether any loaded stylesheet already covers dialog rules so we
    // don't double-style on themed Drupal pages. Matches any rule whose
    // selector contains 'dialog' — bare, qualified, or pseudo (e.g.
    // dialog::backdrop) — rather than requiring an exact 'dialog' match.
    function themeCoversDialog() {
        return [...document.styleSheets].some((sheet) => {
            try {
                return [...sheet.cssRules].some((r) =>
                    r.selectorText?.includes('dialog'),
                );
            } catch {
                return true; // cross-origin sheet — assume theme handles it
            }
        });
    }

    // Attributes consumed by the extension — never forwarded to <dialog>.
    const SKIP_ATTRS = new Set(['type', 'hx', 'id', 'modal', 'close']);

    // Copy all attributes from the <template> onto the <dialog>, except
    // extension-internal ones in SKIP_ATTRS. Resets class/style each swap
    // so stale values don't accumulate.
    function applyAttributes(templateElt, dialog) {
        // Remove all attrs except id and the internal structural ones set by getOrCreateDialog.
        for (const { name } of [...dialog.attributes]) {
            if (name !== 'id') dialog.removeAttribute(name);
        }
        for (const { name, value } of templateElt.attributes) {
            if (!SKIP_ATTRS.has(name)) dialog.setAttribute(name, value);
        }
    }

    function getOrCreateDialog(id) {
        let dialog = document.getElementById(id);
        if (!dialog) {
            dialog = document.createElement('dialog');
            dialog.id = id;

            // Title bar — holds the title text and the close button.
            const titlebar = document.createElement('div');
            titlebar.setAttribute('data-dialog-titlebar', '');
            dialog.appendChild(titlebar);

            // Close button lives inside the titlebar so it is always visible
            // even when there is no title text.
            const closeBtn = document.createElement('button');
            closeBtn.setAttribute('data-dialog-close-btn', '');
            closeBtn.setAttribute('commandfor', id);
            closeBtn.setAttribute('command', 'close');
            closeBtn.setAttribute('data-dialog-close', '');
            closeBtn.setAttribute('aria-label', t('Close'));
            closeBtn.setAttribute('tabindex', '-1');
            // Inline SVG × matching Claro's ui-icon-closethick.
            closeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg">
              <path d="M11 1L1 11M11 11L1 1" stroke="currentColor" stroke-width="1.5"/>
            </svg>`;
            titlebar.appendChild(closeBtn);

            // Scrollable content slot.
            const content = document.createElement('div');
            content.setAttribute('data-dialog-content', '');
            dialog.appendChild(content);

            // Footer button pane — receives .form-actions children.
            const footer = document.createElement('div');
            footer.setAttribute('data-dialog-footer', '');
            dialog.appendChild(footer);

            dialog.addEventListener('click', (e) => {
                if (e.target === dialog && dialog.hasAttribute('close-on-backdrop')) {
                    dialog.close('backdrop');
                }
            });

            document.body.appendChild(dialog);
        }
        return dialog;
    }

    // Distribute incoming nodes into titlebar, content, and footer slots.
    // - First <h1>/<h2> becomes the titlebar label (prepended before close btn).
    // - .form-actions elements move to the footer pane.
    // - Everything else goes into the content slot.
    function distributeContent(dialog, items) {
        const titlebar = dialog.querySelector('[data-dialog-titlebar]');
        const content  = dialog.querySelector('[data-dialog-content]');
        const footer   = dialog.querySelector('[data-dialog-footer]');
        const closeBtn = dialog.querySelector('[data-dialog-close-btn]');

        // Clear previous content but keep the close button in the titlebar.
        titlebar.replaceChildren(closeBtn);
        content.replaceChildren();
        footer.replaceChildren();

        for (const node of items) {
            if (
                node.nodeType === Node.ELEMENT_NODE &&
                (node.matches('h1,h2') && !titlebar.querySelector(':not([data-dialog-close-btn])')
                )
            ) {
                // First heading becomes the visible title — insert before close btn.
                const title = document.createElement('span');
                title.setAttribute('data-dialog-title', '');
                title.textContent = node.textContent;
                titlebar.insertBefore(title, closeBtn);
            } else if (node.nodeType === Node.ELEMENT_NODE && node.matches('.form-actions')) {
                // Move form action buttons into the footer pane.
                footer.appendChild(node);
            } else {
                content.appendChild(node);
            }
        }
    }

    function openDialog(dialog, type, items) {
        const content = dialog.querySelector('[data-dialog-content]');

        htmx.trigger(content, 'htmx:drupal:unload');
        distributeContent(dialog, items);

        // If already open, close first so showModal() doesn't throw
        // InvalidStateError, then reopen in the correct mode.
        if (dialog.open) dialog.close();

        if (type === 'dialog') {
            dialog.show();
        } else {
            dialog.showModal();
        }

        htmx.trigger(content, 'htmx:drupal:load');
    }

    // Flag set before a programmatic close so the 'close' event listener
    // knows behaviors have already been detached and skips the second call.
    let closingProgrammatically = false;

    function closeDialog(id) {
        const dialog = document.getElementById(id);
        if (!dialog) return;

        closingProgrammatically = true;
        htmx.trigger(dialog.querySelector('[data-dialog-content]'), 'htmx:drupal:unload');
        dialog.close();
        closingProgrammatically = false;

        if (!dialog.hasAttribute('persist')) {
            dialog.remove();
        }
    }

    // Delegated close listener — works for content loaded after page init.
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-dialog-close], .dialog-cancel');
        if (!trigger) return;
        const dialog = trigger.closest('dialog');
        if (dialog) {
            e.preventDefault();
            dialog.close('cancel');
        }
    });

    document.addEventListener('close', (e) => {
        if (e.target.tagName !== 'DIALOG') return;
        const dialog = e.target;
        if (!closingProgrammatically) {
            htmx.trigger(dialog.querySelector('[data-dialog-content]'), 'htmx:drupal:unload');
        }
        if (!dialog.hasAttribute('persist')) {
            dialog.remove();
        }
    }, true);

    htmx.registerExtension('drupal-dialog', {
        init() {
            if (!themeCoversDialog()) adoptFallbackSheet();
        },

        // htmx calls htmx_process_<type> for each <hx-<type>> tag it finds in
        // the response fragment, after assets are loaded but before any swap.
        // Doing all work here avoids the tasks/handle_swap indirection entirely.
        htmx_process_dialog(templateElt, { ctx }) {
            const id    = templateElt.getAttribute('id') || 'drupal-dialog';
            const type  = templateElt.hasAttribute('modal') ? 'modal' : 'dialog';
            const items = [...templateElt.content.childNodes].map((n) => n.cloneNode(true));

            if (templateElt.hasAttribute('close')) {
                closeDialog(id);
            } else {
                const dialog = getOrCreateDialog(id);
                applyAttributes(templateElt, dialog);
                openDialog(dialog, type, items);
            }
        },
    });
})();

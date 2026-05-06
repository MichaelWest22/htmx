---
title: "You Already Wrote an Extension"
description: "htmx4 ships with a new extension system that makes extensions trivial to write and free to load. Here's what that unlocks for the problems you actually hit building web applications."
created: 2026-05-07
authors: [ "Michael West" ]
tags: ["guides"]
---

htmx's core does one thing: let any HTML element make HTTP requests and swap the response into the DOM. 10kb with brotli. No dependencies.

But if you've built anything real with htmx, you've hit the edges. You want to stream a response. You want to preload a link. You want a file download that doesn't dump binary garbage into your page. You want your polling endpoint to stop sending identical responses. These aren't exotic requirements — they're Tuesday.

In htmx 2.x, extensions existed to solve these problems, but the extension system itself was a bit of a problem. Extensions had to be activated per-element with `hx-ext` attributes. The runtime walked up the DOM tree on every event to find which extensions were active. Every loaded extension's `onEvent` callback fired on every event, even if it didn't care, then did a string comparison to decide whether to act. It worked, but it was clunky to use and expensive to run.

htmx4 replaces all of that. Extensions now register named hook functions that map directly to lifecycle events. At registration time, each hook is filed into a `Map` keyed by event name. At invocation time, a single `Map.get()` returns only the functions that care about that specific event. No DOM traversal. No string matching. No iteration over extensions that have nothing to do. Ten loaded extensions that don't handle `htmx:before:swap`? One hash lookup returning `undefined`. Cost of zero.

Extensions load by including a script tag after htmx — they apply page-wide, no `hx-ext` attributes anywhere. Extensions that target specific elements use their own attributes to say where they act: `hx-preload` on a link, `hx-ws:connect` on a container, `hx-live` on an output element.

The result is that you can load every extension you might need without worrying about the ones you're not currently using. And writing a new extension is so simple it's dangerous — you sit down to test the hook system and three hours later you've built an Alpine.js compatibility layer.

## So What Does This Actually Solve?

Here's the thing about web development: the same problems come up on every project. Not the interesting domain problems — the boring infrastructure ones that you solve badly the first time, then slightly less badly the next time, then eventually google "htmx file download" at 11pm on a Thursday.

Let's talk about some of them.

---

You're building a chat interface. Or an AI assistant. Or a live dashboard. The server needs to push data to the client as it becomes available. In the old world, you'd reach for `EventSource` — except `EventSource` only supports GET requests, can't send custom headers, and can't send cookies without hacks. So you'd write a bunch of fetch-and-poll logic, or wrestle with WebSocket when all you really wanted was a one-way stream.

What if your regular `hx-post` just... streamed? What if the server could return `Content-Type: text/event-stream` and htmx would automatically parse and swap each chunk as it arrived? That's what the SSE extension does. A form that POSTs to an LLM endpoint and streams the response into a target div is just a normal htmx form. No special attributes beyond loading the extension. For persistent connections, `hx-sse:connect` gives you automatic reconnection with exponential backoff, background tab pausing, and resumable streams via `Last-Event-ID`.

---

Sometimes one-way streaming isn't enough. You need the client to send messages too — a chat room, a collaborative editor, a live auction. You could wire up a WebSocket manually, but then you're back to writing your own message routing, reconnection logic, and DOM manipulation. And if you have multiple components on the page that all need the same socket, you're managing shared connection state by hand.

The WebSocket extension (`hx-ws`) handles all of this. Multiple elements pointing to the same URL share a single socket automatically. Forms with `hx-ws:send` transmit over the socket instead of HTTP. Each message gets an `HX-Request-ID` so the server can route responses back to the specific element that sent the request — a form submission over WebSocket swaps its response exactly like a normal htmx request. When all elements using a connection are removed from the DOM, the connection closes itself.

---

You have a nav bar. Users click links. The page updates. It's fine. But there's this 200ms gap between click and response where nothing happens and the app feels sluggish. You could add loading indicators everywhere, or you could cheat: start fetching the response on mousedown, before the click event even fires. By the time the browser registers the click, the response is already in flight — often already arrived.

That's `hx-preload`. Put it on a parent element and every child link gets this behavior automatically. The `mouseover` variant is even more aggressive — hover for 100ms and the fetch starts. For apps with predictable navigation, pages feel instant. Zero architectural changes. One attribute.

---

You have a button that generates a PDF report. You wire it up with `hx-get`. The response comes back and... your target div is now full of binary garbage. Of course it is — htmx swaps HTML, not files. So you open a new window, or create a hidden iframe, or do the anchor-tag-click hack, and none of them give you progress feedback or play nicely with your loading indicators.

What if htmx just detected `Content-Disposition: attachment` and triggered a proper file download? What if you could say `hx-swap="download"` and get progress events as the file streams in? That's the download extension. It even supports an `HX-Download` response header — the server can swap a "your download has started" message into the page while the file downloads independently in the background.

---

You're polling a news feed every 3 seconds. Most of the time, nothing has changed. But htmx dutifully fetches the full response, parses it, and swaps it in — replacing identical content with identical content, reflowing the page for no reason, and wasting bandwidth on mobile connections.

What if each polling element could send a version tag with its request, and the server could just say "nothing changed" with a 304? That's `hx-ptag`. The server decides what the tag means — a version number, a timestamp, a hash. The extension just shuttles it back and forth. For timestamp-based ptags, the server can return only the delta: new messages since the last poll, not the entire history.

---

You have a list of items. The server knows the current state. You want to refresh the list without blowing away everything and re-rendering — because that causes scroll jumps, kills CSS transitions, and resets any client-side state on those elements. You want items that changed to update, new items to appear, and items that didn't change to stay exactly where they are.

That's `hx-upsert`. Elements with matching IDs update in place. New elements insert. Existing elements not in the response are preserved. Add `sort` and the list reorders itself. It's the entire "live updating list" pattern in a swap style.

---

You're using `hx-boost` for SPA-style navigation. It works great — until you navigate to a page that needs a different stylesheet, or a new script tag, or an updated `<title>`. The body swaps fine but the `<head>` is stale. So you end up with missing styles, or scripts that loaded on the first page but not the second, or a tab title that never updates.

The head-support extension merges `<head>` tags intelligently on every boosted navigation. Matching elements stay. New ones are added. Removed ones are cleaned up. It respects `async` and `defer` on scripts so they execute in the right order. Mark something `hx-head="re-eval"` to force it to re-run on every navigation, or `hx-preserve` to never touch it.

---

Your users navigate forward three pages, expand some accordions, open a sidebar, type half a search query — then hit back. The page re-fetches from the server and all that client-side state is gone. Accordions collapsed. Sidebar closed. Search field empty. The user's context is destroyed.

htmx4's core deliberately ships with no history cache — we spent too long debugging the issues that came from caching DOM snapshots that third-party scripts had mutated. But the history-cache extension adds it back, done right. It snapshots into `sessionStorage`, preserves input values and scroll positions, and restores pages exactly as the user left them. Pair it with head-support and alpine-compat for full state preservation across navigation.

---

You have two inputs and an output that should show their product. In React you'd wire up state and a derived value. In vanilla JS you'd add event listeners to both inputs and update the output manually. In htmx you'd... make a server request every time an input changes? That works but feels heavy for pure client-side computation.

`hx-live` lets you put a JavaScript expression on an element and it re-evaluates automatically whenever the DOM changes or an input fires. `this.textContent = q('#price').valueAsNumber * q('#qty').valueAsNumber` — that's it. One attribute. No event listeners. No framework. The expressions are async, so `await debounce(250)` gives you live search with automatic cancellation of stale requests.

---

You're using Alpine.js alongside htmx. They both want to own the DOM. When htmx swaps content, Alpine's mutation observer fires and tries to initialize elements that htmx is still processing. When htmx morphs, Alpine's reactive data gets blown away. They fight.

The alpine-compat extension makes them cooperate. It defers Alpine's observer during htmx swaps and carries Alpine's data stack across morph operations. Two libraries, one DOM, no conflicts.

---

You want your htmx requests to show the browser's native loading spinner — the one in the tab, the one users already understand means "something is happening." And you want the browser's stop button to actually abort in-flight requests, like it does for normal navigation.

That's `hx-browser-indicator`. Zero CSS. The browser does all the work.

---

You want optimistic UI — show the expected result immediately, then roll back if the server disagrees. The pattern behind every "like" button that responds instantly. The optimistic extension does exactly this: apply the expected DOM change on click, confirm or revert when the response arrives.

---

You have a delete button. When it fires, you need to remove the row from the table, update the item count in the header, and clear the detail panel. Three targets, one request. In htmx 2.x you'd reach for out-of-band swaps and start wrestling with `hx-swap-oob` syntax. Or you'd make three separate requests. Or you'd wrap everything in a giant container and replace the whole thing.

The targets extension (`hx-targets`) lets a single response swap into multiple elements matching a CSS selector. One request, many updates, no OOB gymnastics.

---

You're in a meeting. The self-appointed security expert on your team has run a scanner against your site and is asking pointed questions about why your Content Security Policy includes `unsafe-eval`. You explain that htmx uses `new Function()` for JavaScript expressions in `hx-vals` and `hx-on`. They look at you like you just admitted to storing passwords in plaintext. You spend the rest of the afternoon googling "htmx CSP nonce" and finding Stack Overflow answers that say "just add unsafe-eval."

The nonce extension (`hx-nonce`) makes this go away. It gates htmx attribute processing behind CSP nonces — elements without a matching nonce are stripped inert before htmx touches them. Its `safeEval` mode replaces `new Function()` with nonce-based script injection, so htmx's JS expression features work without `unsafe-eval` in your policy. Fail-closed by design: if no page nonce is found, all htmx processing is blocked. Hand the security person the docs and get back to work.

---

You're migrating from htmx 2.x. You have event listeners on `htmx:afterSwap`. You rely on implicit attribute inheritance. Your error handling assumes 4xx/5xx responses don't swap.

Include `htmx-2-compat`. All of that keeps working. It maps old camelCase events to their htmx4 equivalents, restores implicit inheritance, and re-enables the old no-swap-on-error behavior. It also logs every time implicit inheritance is used, so you can find those patterns and migrate them at your own pace.

---

You've been building your app for a few months now. You have an `hx-on::config:request` on your layout template that adds the CSRF token. You have a `document.body.addEventListener("htmx:after:swap", ...)` in one script file that initializes tooltips. You have another `htmx.on("htmx:before:request", ...)` in a different script file that handles 422 responses by retargeting to the form. There's an `hx-on::after:settle` on a specific page template that wires up a date picker. And half of these break when the element they're attached to gets swapped out — so you've learned to put everything on `document.body`, which means every handler fires on every swap whether it's relevant or not.

It works. But you can't remember which file does what. The CSRF header — is that in `app.js` or is it inline on the body tag? The tooltip initialization — is that the one in `htmx-hooks.js` or the one in `components.js`? You grep for `addEventListener` and find six results across four files. You grep for `hx-on` and find twelve results across eight templates.

This is the same problem, scattered across your entire codebase, in three different syntaxes.

Here's the thing you may not have noticed: you already wrote an extension. All those event listeners? That's all an htmx extension is — functions that run at specific points in the request lifecycle. You just wrote yours the hard way: scattered across files, in three syntaxes, half of them breaking on swap.

So why not do it properly?

```javascript
htmx.registerExtension("my-app", {
    htmx_config_request: (elt, detail) => {
        detail.ctx.request.headers['X-CSRF-Token'] = getMeta('csrf-token');
    },
    htmx_before_swap: (elt, detail) => {
        if (detail.ctx.response.status === 422) {
            detail.ctx.target = elt.closest('form');
        }
    },
    htmx_after_swap: (elt, detail) => {
        initTooltips(detail.ctx.target);
    }
});
```

One object. All your hooks. One file. Same event listeners you were already writing — just organized, named, and registered where htmx can actually find them without walking the DOM or firing every callback on every event.

Concat it onto htmx with the extensions you use, minify it, ship it as one file:

```bash
cat dist/htmx.js dist/ext/hx-sse.js dist/ext/hx-preload.js my-app-ext.js > my-htmx.js
```

One script tag. One HTTP request. Your entire htmx stack — core, extensions, and your custom logic — in a single file. No module bundler required.

---

These aren't hypothetical problems. They're the things you actually hit building web applications. And in htmx4, each one is solved by including a single script tag — an extension that hooks cleanly into the lifecycle, does its job, and gets out of the way. No configuration ceremony. No performance tax on the extensions you're not using. No conflicts between the ones you are.

Including the one you already wrote yourself. 

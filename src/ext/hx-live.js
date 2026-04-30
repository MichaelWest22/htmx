(() => {
    const AF = Object.getPrototypeOf(async function(){}).constructor
    const F  = Function

    const POS = {before:'beforebegin', after:'afterend', start:'afterbegin', end:'beforeend'}
    function proxy(elts) {
        return new Proxy({}, {
            get(_, p) {
                if (p === 'count') return elts.length
                if (p === 'arr') return () => elts.slice()
                if (p === Symbol.iterator) return () => elts.values()
                if (p === 'trigger') return (t, d) => elts.forEach(e => htmx.trigger(e, t, d))
                if (p === 'insert') return (pos, s) => elts.forEach(e => e.insertAdjacentHTML(POS[pos], s))
                if (p === 'take') return (cls, from) => {
                    for (let e of typeof from === 'string' ? document.querySelectorAll(from) : from) e.classList.remove(cls)
                    for (let e of elts) e.classList.add(cls)
                }
                let v = elts[0]?.[p]
                if (v?.call) return (...a) => elts.map(e => e[p](...a))[0]
                if (v && typeof v === 'object') return proxy(elts.map(e => e[p]))
                return v
            },
            set(_, p, v) { elts.forEach(e => e[p] = v); return true }
        })
    }

    function mkq(ctx) {
        return sel => {
            if (typeof sel !== 'string') return proxy(sel.nodeType ? [sel] : [...sel])
            let im = sel.match(/^(.+)\s+in\s+(.+)$/), root = document
            if (im) { sel = im[1]; root = im[2] === 'this' ? ctx : document.querySelector(im[2]) }
            if (!root) return proxy([])
            let m = sel.match(/^(next|prev|closest|first|last)\s+(.+)$/), elts
            if (m) {
                let [, d, s] = m, cdp = e => ctx.compareDocumentPosition(e)
                if (d === 'closest') elts = [ctx.closest(s)].filter(Boolean)
                else {
                    let all = [...root.querySelectorAll(s)]
                    if (d === 'first')      elts = all.slice(0, 1)
                    else if (d === 'last')  elts = all.slice(-1)
                    else if (d === 'next')  elts = [all.find(e => cdp(e) & 4)].filter(Boolean)
                    else                    elts = [all.reverse().find(e => cdp(e) & 2)].filter(Boolean)
                }
            } else elts = [...root.querySelectorAll(sel)]
            return proxy(elts)
        }
    }

    function mkWait(ctx) {
        return x => new Promise(r => typeof x === 'number' ? setTimeout(r, x) : ctx.addEventListener(x, r, {once: true}))
    }

    const DB = Symbol()
    function mkDb() {
        let last = 0, j
        return ms => new Promise((r, rj) => {
            j?.(DB); j = rj
            let id = ++last
            setTimeout(() => id === last && (j = null, r()), ms)
        })
    }

    function makeConstructor(Base) {
        return function(...keysAndBody) {
            let body = keysAndBody.pop()
            let keys = keysAndBody
            return {
                call(thisArg, ...values) {
                    let extra = {q: mkq(thisArg), wait: mkWait(thisArg), debounce: mkDb()}
                    let wrappedBody = `with(event?.detail||{}){${body}}`
                    return new Base(...keys, ...Object.keys(extra), wrappedBody).call(thisArg, ...values, ...Object.values(extra))
                }
            }
        }
    }

    // module-level so htmx_after_process can access without relying on `this`
    let liveFns, recompute

    htmx.registerExtension('hx-live', {

        init(api) {
            api.initSecurity(null, makeConstructor(F), makeConstructor(AF))

            liveFns = new Set()
            let pending = false
            recompute = () => {
                if (pending) return
                pending = true
                queueMicrotask(() => { liveFns.forEach(f => f()); setTimeout(() => pending = false) })
            }

            new MutationObserver(recompute)
                .observe(document.documentElement, {childList: true, subtree: true, characterData: true})
            document.addEventListener('input',  recompute, true)
            document.addEventListener('change', recompute, true)
            document.addEventListener('htmx:after:settle', recompute)
        },

        htmx_after_process(elt) {
            for (let liveElt of [elt, ...elt.querySelectorAll('[hx-live]')]) {
                if (!liveElt.hasAttribute('hx-live') || liveElt._hxLive) continue
                liveElt._hxLive = true
                let attr = liveElt.getAttribute('hx-live')
                let fn = new AF('q', 'wait', 'debounce', attr)
                let run = () => {
                    if (!liveElt.isConnected) { liveFns.delete(run); return }
                    fn.call(liveElt, mkq(liveElt), mkWait(liveElt), mkDb()).catch(() => {})
                }
                liveFns.add(run)
                run()
            }
        },

        htmx_before_on_listener(node, detail) {
            let {handler, evtName} = detail
            let [name, ...mods] = evtName.split('.')
            if (!mods.length) return

            detail.cancelled = true

            let h = handler
            let has = m => mods.includes(m)
            if (has('prevent'))  { let f = h; h = e => { e.preventDefault();  return f(e) } }
            if (has('stop'))     { let f = h; h = e => { e.stopPropagation(); return f(e) } }
            if (has('self'))     { let f = h; h = e => { if (e.target === node) return f(e) } }
            if (has('outside'))  { let f = h; h = e => { if (!node.contains(e.target)) return f(e) }; node = document }
            if (has('init'))     { h(new CustomEvent('init')); return }

            let opts = {capture: has('capture'), passive: has('passive')}
            node.addEventListener(name, h, opts)
            htmx.__htmxProp(node).listeners.push({fromElt: node, eventName: name, handler: h})
        }
    })
})()

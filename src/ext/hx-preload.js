(()=>{
    let api;

    function initializePreload(elt) {
        let preloadSpec = api.attributeValue(elt, "hx-preload");
        if (!preloadSpec && !elt._htmx?.boosted) return;

        let eventName;
        let timeout;
        if (preloadSpec) {
            let specs = api.parseTriggerSpecs(preloadSpec);
            if (specs.length === 0) return;
            let spec = specs[0];
            eventName = spec.name;
            timeout = spec.timeout ? htmx.parseInterval(spec.timeout) : 5000;
        } else {
            eventName = htmx.config?.preload?.boostEvent || "mousedown"
            timeout = htmx.config?.preload?.boostTimeout ? htmx.parseInterval(htmx.config?.preload?.boostTimeout) : 5000;
        }

        let preloadListener = async (evt) => {
            let {method} = api.determineMethodAndAction(elt, evt);
            if (method !== 'GET') return;

            if (elt._htmx?.preload) return;

            let ctx = api.createRequestContext(elt, evt);
            let form = elt.form || elt.closest("form");
            let body = api.collectFormData(elt, form, evt.submitter);
            api.handleHxVals(elt, body);

            let action = ctx.request.action.replace?.(/#.*$/, '');


            let params = new URLSearchParams(body);
            if (params.size) action += (/\?/.test(action) ? "&" : "?") + params;

            let fetchPromise = fetch(action, ctx.request);

            elt._htmx.preload = {
                prefetch: fetchPromise,
                action: action,
                expiresAt: Date.now() + timeout
            };

            fetchPromise.then(response => {
                let html = response.clone().text();
                return html.then(html => {
                    let parser = new DOMParser();
                    let doc = parser.parseFromString(html, 'text/html');
                    let preloadLinks = doc.querySelectorAll('link[rel="preload"][href]');
                    
                    preloadLinks.forEach(link => {
                        let href = new URL(link.getAttribute('href'), action).href;
                        fetch(href, {mode: ctx.request.mode}).catch(() => {});
                    });
                });
            }).catch(() => {
                delete elt._htmx.preload;
            });
        };
        elt.addEventListener(eventName, preloadListener);
        elt._htmx.preloadListener = preloadListener;
        elt._htmx.preloadEvent = eventName;
    }

    htmx.defineExtension('preload', {
        init: (internalAPI) => {
            api = internalAPI;
        },

        htmx_after_init: (elt) => {
            initializePreload(elt);
        },

        htmx_before_request: (elt, detail) => {
            let {ctx} = detail;
            if (elt._htmx?.preload &&
                elt._htmx.preload.action === ctx.request.action &&
                Date.now() < elt._htmx.preload.expiresAt) {
                let prefetch = elt._htmx.preload.prefetch;
                ctx.fetch = () => prefetch;
                delete elt._htmx.preload;
            } else {
                if (elt._htmx) delete elt._htmx.preload;
            }
        },

        htmx_before_cleanup: (elt) => {
            if (elt._htmx?.preloadListener) {
                elt.removeEventListener(elt._htmx.preloadEvent, elt._htmx.preloadListener);
            }
        }
    });
})()
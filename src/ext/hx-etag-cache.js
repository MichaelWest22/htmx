(() => {
    let api;

    htmx.config.etagCacheMaxSize ??= 1024 * 1024; // 1MB default

    const STORE_KEY = 'htmx-etag-cache';
    const store = {
        _data() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') } catch { return {} } },
        get(url) { return this._data()[url] },
        set(url, val) {
            let d = this._data();
            d[url] = val;
            let serialized = JSON.stringify(d);
            while (serialized.length > htmx.config.etagCacheMaxSize && Object.keys(d).length > 0) {
                delete d[Object.keys(d)[0]];
                serialized = JSON.stringify(d);
            }
            localStorage.setItem(STORE_KEY, serialized);
        }
    };

    htmx.registerExtension('hx-etag-cache', {
        init(internalAPI) {
            api = internalAPI;
        },

        htmx_after_request(elt, detail) {
            let ctx = detail.ctx;
            if (!ctx) return;
            let etag = ctx.response?.headers?.get?.('Etag');
            if (etag && ctx.text) {
                store.set(ctx.request.action, { etag, text: ctx.text });
            }
        },

        htmx_config_request(elt, detail) {
            let ctx = detail.ctx;
            if (!ctx) return;
            let entry = store.get(ctx.request.action);
            if (entry?.etag) {
                ctx.request.headers['If-None-Match'] = entry.etag;
            }
        },

        htmx_before_swap(elt, detail) {
            let ctx = detail.ctx;
            if (!ctx || ctx.response?.raw?.status !== 304) return;
            let entry = store.get(ctx.request.action);
            if (!entry?.text) return;
            ctx.text = entry.text;
            ctx.swap = api.attributeValue(ctx.sourceElement, 'hx-swap') || htmx.config.defaultSwap;
        }
    });
})();

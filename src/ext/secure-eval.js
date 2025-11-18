let evalCounter = 0;
let trustedTypesPolicy;
const trustedContexts = new WeakSet();
let cachedPageNonce = null;

function getPageNonce() {
    if (cachedPageNonce) return cachedPageNonce;
    
    const scripts = document.querySelectorAll('script[nonce]');
    if (scripts.length > 0) {
        cachedPageNonce = scripts[0].getAttribute('nonce');
        return cachedPageNonce;
    }
    return null;
}

function executeWithNonce(code, args, thisArg, isAsync) {
    const pageNonce = getPageNonce();
    if (!pageNonce) {
        throw new Error('No page nonce available');
    }
    
    const script = document.createElement('script');
    script.nonce = pageNonce;
    
    const funcVar = `htmx_eval_${++evalCounter}`;
    const params = Object.keys(args).join(',');
    const asyncPrefix = isAsync ? 'async ' : '';
    
    script.textContent = `window.${funcVar} = ${asyncPrefix}function(${params}) { ${code} }`;
    document.head.appendChild(script);
    
    try {
        const result = window[funcVar].call(thisArg, ...Object.values(args));
        if (isAsync) {
            return result.finally(() => {
                delete window[funcVar];
                document.head.removeChild(script);
            });
        }
        return result;
    } finally {
        if (!isAsync) {
            delete window[funcVar];
            document.head.removeChild(script);
        }
    }
}

function initTrustedTypes() {
    if (!window.trustedTypes) return;
    
    try {
        trustedTypesPolicy = trustedTypes.createPolicy('htmx-secure-eval', {
            createHTML: (input) => input,
            createScript: (input) => input
        });
    } catch (e) {
        console.warn('Failed to create Trusted Types policy:', e);
    }
}

function validateElement(elt) {
    const pageNonce = getPageNonce();
    if (!pageNonce) return;
    
    const evalAttrs = [
        'hx-on:', 'data-hx-on:', 'hx-on-', 'data-hx-on-',
        'hx-trigger', 'data-hx-trigger', 'hx-vals', 'data-hx-vals'
    ];
    
    for (const attr of elt.attributes || []) {
        const isEvalAttr = evalAttrs.some(prefix => attr.name.startsWith(prefix));
        if (isEvalAttr && attr.value.includes('/*nonce:') && 
            !attr.value.includes(`/*nonce:${pageNonce}*/`)) {
            elt.removeAttribute(attr.name);
        }
    }
}

htmx.defineExtension('secure-eval', {
    init: (internalAPI) => {
        initTrustedTypes();
        
        htmx.config.Function = (...args) => {
            const code = args.pop();
            const pageNonce = getPageNonce();
            if (!pageNonce || !code.includes(`/*nonce:${pageNonce}*/`)) {
                return Function(...args, 'return true');
            }
            const cleanCode = code.replaceAll(`/*nonce:${pageNonce}*/`, '');
            return function(...callArgs) {
                const argObj = {};
                args.forEach((param, i) => argObj[param] = callArgs[i]);
                return executeWithNonce(cleanCode, argObj, this, false);
            };
        };
        
        htmx.config.AsyncFunction = (...args) => {
            const code = args.pop();
            const pageNonce = getPageNonce();
            if (!pageNonce || !code.includes(`/*nonce:${pageNonce}*/`)) {
                return (async function(){}).constructor(...args, 'return false');
            }
            const cleanCode = code.replaceAll(`/*nonce:${pageNonce}*/`, '');
            return async function(...callArgs) {
                const argObj = {};
                args.forEach((param, i) => argObj[param] = callArgs[i]);
                return await executeWithNonce(cleanCode, argObj, this, true);
            };
        };
        
        const originalMakeFragment = internalAPI.makeFragment;
        const originalParseHTML = this.__parseHTML?.bind(this) || ((resp) => new DOMParser().parseFromString(resp, 'text/html'));
        
        internalAPI.makeFragment = function(ctx) {
            if (!trustedContexts.has(ctx)) {
                return originalMakeFragment.call(this, ctx);
            }
            
            const pageNonce = getPageNonce();
            let text = ctx.text;
            
            // Validate same-origin before extracting server nonce
            let serverNonce = null;
            const responseURL = ctx.response?.url || ctx.xhr?.responseURL;
            if (responseURL) {
                try {
                    const url = new URL(responseURL, window.location.href);
                    if (url.origin !== window.location.origin) {
                        return originalMakeFragment.call(this, ctx);
                    }
                } catch (e) {
                    return originalMakeFragment.call(this, ctx);
                }
            }
            
            // Extract server nonce from CSP header
            const csp = ctx.response?.headers?.get?.('Content-Security-Policy');
            if (csp) {
                const match = csp.match(/script-src[^;]*'nonce-([^']*)'/i);
                if (match) serverNonce = match[1];
            }
            
            // Replace server nonce with page nonce in text for eval use
            if (serverNonce && pageNonce) {
                text = text.replaceAll(`/*nonce:${serverNonce}*/`, `/*nonce:${pageNonce}*/`);
            }
            
            // Replace hx-partial tags
            let response = text.replace(/<hx-partial(\s+|>)/gi, '<template partial$1').replace(/<\/hx-partial>/gi, '</template>');
            
            // Extract title
            let title = '';
            response = response.replace(/<title[^>]*>[\s\S]*?<\/title>/i, m => {
                const doc = trustedTypesPolicy ? originalParseHTML(trustedTypesPolicy.createHTML(m)) : originalParseHTML(m);
                title = doc.title;
                return '';
            });
            
            // Remove head
            let responseWithNoHead = response.replace(/<head(\s[^>]*)?>[\s\S]*?<\/head>/i, '');
            let startTag = responseWithNoHead.match(/<([a-z][^\/>\x20\t\r\n\f]*)/i)?.[1]?.toLowerCase();
            
            // Parse HTML with Trusted Types
            let doc, fragment;
            const parseWithTrustedTypes = (html) => {
                return trustedTypesPolicy ? originalParseHTML(trustedTypesPolicy.createHTML(html)) : originalParseHTML(html);
            };
            
            if (startTag === 'html') {
                doc = parseWithTrustedTypes(response);
                fragment = doc.body;
            } else if (startTag === 'body') {
                doc = parseWithTrustedTypes(responseWithNoHead);
                fragment = doc.body;
            } else {
                doc = parseWithTrustedTypes(`<template>${responseWithNoHead}</template>`);
                fragment = doc.querySelector('template').content;
            }
            
            // Process scripts with nonce
            const scripts = [...fragment.querySelectorAll('script')];
            if (fragment.matches?.('script')) scripts.unshift(fragment);
            
            for (let oldScript of scripts) {
                const scriptNonce = oldScript.getAttribute('nonce');
                const hasServerNonce = serverNonce && scriptNonce === serverNonce;
                
                // Only trust scripts with matching server nonce
                if (hasServerNonce) {
                    const newScript = document.createElement('script');
                    for (let attr of oldScript.attributes) {
                        if (attr.name !== 'nonce') {
                            newScript.setAttribute(attr.name, attr.value);
                        }
                    }
                    if (pageNonce) {
                        newScript.nonce = pageNonce;
                    }
                    if (trustedTypesPolicy) {
                        newScript.textContent = trustedTypesPolicy.createScript(oldScript.textContent);
                    } else {
                        newScript.textContent = oldScript.textContent;
                    }
                    oldScript.replaceWith(newScript);
                } else {
                    // Script has no nonce or wrong nonce, remove it
                    oldScript.remove();
                }
            }
            
            return { fragment, title };
        }.bind(internalAPI);
    },
    
    htmx_before_request: (elt, detail) => {
        const ctx = detail.ctx;
        
        ctx.fetch = async (url, options) => {
            if (options.mode === 'same-origin') {
                trustedContexts.add(ctx);
            }
            return window.fetch(url, options);
        };
    },
    
    
    htmx_before_process: (elt, detail) => {
        validateElement(elt);
        elt.querySelectorAll('*').forEach(validateElement);
    }
});

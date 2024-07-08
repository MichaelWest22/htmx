+++
title = "HX-Nonce Response Header"
+++

This response header can be used to improve the security of the application/web-site and help avoid XSS issues by allowing you to return known trusted inline scripts with full [nonce](https://developer.mozilla.org/docs/Web/HTML/Global_attributes/nonce) support while blocking all other inline scripts via an appropriate [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP). This header should be set with all server responses that may contain inline script tags that you want to allow though the CSP policy via a nonce.

This feature is not a replacement for a good secure backend server implementation where all potential user input strings are sanitized by auto-escaping or a templating engine. This is just another layer of protection you can choose to add on top if needed.  

To implement this feature, you will need to generate a truly random nonce on the server for each initial page load and return this in the CSP header or meta tag.  You must also set the htmx safeInlineScriptNonce config value in the response head via a meta tag.  Then with each server response that may contain a inline scripts you need to generate a new unique random nonce and return this as the value of the HX-Nonce header and apply the same nonce value to all trusted inline scripts you return. When partial AJAX requests are swapped into part of the page the header will be used to update the nonce attribute of only the trusted inline scripts to match the initial page load nonce value which allows just these scripts to execute.

Note It would be ideal to use the existing Content-Security-Policy header instead of a custom HX-Nonce header for this purpose but browsers only process CSP headers on full page loads and not AJAX requests. 

A sample initial page load response:

```html
HX-Nonce: "{random-nonce}"
Content-Security-Policy: "default-src 'self' 'nonce-{random-nonce}'; style-src 'self' 'nonce-{random-nonce}'"
<head>
    <meta name="htmx-config" content='{"safeInlineScriptNonce":"{random-nonce}","inlineStyleNonce":"{random-nonce}"}'>
    <script nonce="{random-nonce}">console.log('safe')</script>
</head>
```

A sample htmx partial ajax page response:

```html
HX-Nonce: "{another-random-nonce}"
<script nonce="{another-random-nonce}">console.log('Also safe')</script>
```
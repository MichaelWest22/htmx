+++
title = "HX-Request-Type Request Header"
+++

This new header returns the type of request being sent so the backend server and caching layers can make a better decision on what kind of response to return. Normally the `HX-Request` header was used for this purpose as this header will only be set to true for requests initiated by HTMX itself and will always be missing for initial and full page requests initiated by the browser. However when using various features like history restore requests, [`hx-boost`](@/attributes/hx-boost.md)  and [`hx-select`](@/attributes/hx-select.md)  the `HX-Request` header alone is not enough and the logic required for checking for optional full/partial responses can vary per application.  

### HX-Request-Type respone values

* `not set` - The header will not be set at all for full page requests initiated by the browser, history restore requets or requests that target the body like most [`hx-boost`](@/attributes/hx-boost.md)  requests
* `partial` - The request is targeting replacment of part of the page so expects a partial page fragment as a response
* `hx-select:<list of selectors>` - The request is expecting a large or full request that should include elements that match the comma seperated list of CSS selectors supplied. All the [`hx-select`](@/attributes/hx-select.md) and [`hx-select-oob`](@/attributes/hx-select-oob.md) selectors from the requesting element will be included.

### How to use

To use this header in your backend to choose between full and partial response just check if the header equals `partial`.
```
if (request.headers['HX-Request-Type'] == 'partial') {
  return partialResponse()
} else {
  return fullPageResponse()
} 
```

You can also set the [`Vary`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching#vary) header of your responses to `HX-Request-Type` to use this header to seperate the caching of your two response types 

## Notes

* You can use the list of selectors returned by `hx-select` to optimize your backend responses to only return the requested elements
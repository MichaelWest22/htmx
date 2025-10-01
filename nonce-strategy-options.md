# Nonce Processing Strategy Options

## Option 1: Strip Nonce + Cache Validation
```html
<!-- Before: -->
<div hx-on:click="nonce:abc123;console.log('trusted')">

<!-- After processing: -->
<div hx-on:click="console.log('trusted')">
```

**Pros:**
- Clean attributes for HTMX processing
- Simple caching with WeakMap
- No attribute pollution

**Cons:**
- **SECURITY RISK**: Clean code looks identical to untrusted code
- Race conditions between validation and execution
- Complex cache management

## Option 2: Replace with Page Nonce
```html
<!-- Before: -->
<div hx-on:click="nonce:abc123;console.log('trusted')">

<!-- After processing: -->
<div hx-on:click="nonce:page456;console.log('trusted')">
```

**Pros:**
- Self-documenting trust status
- No external cache needed
- Clear validation at execution time

**Cons:**
- Attribute still has nonce prefix (HTMX parsing issues?)
- Need to modify HTMX parsing logic

## Option 3: Replace with Lookup Token
```html
<!-- Before: -->
<div hx-on:click="nonce:abc123;console.log('trusted')">

<!-- After processing: -->
<div hx-on:click="__HTMX_VALIDATED_CODE_789__">
```

**Pros:**
- Clear separation of validated vs raw code
- Impossible to confuse with untrusted code
- Secure code storage

**Cons:**
- Requires global code registry
- Attribute values become opaque
- More complex implementation

## Recommended: Option 2 (Replace with Page Nonce)

### Implementation Strategy
```javascript
// Page load processing
function preprocessPageLoadNonces() {
  const pageNonce = getPageLoadNonce()
  
  document.querySelectorAll('[hx-on\\:*]').forEach(elt => {
    Array.from(elt.attributes).forEach(attr => {
      if (attr.name.startsWith('hx-on:')) {
        const nonceMatch = attr.value.match(/^nonce:([^;]+);(.*)$/)
        if (nonceMatch) {
          const [, serverNonce, code] = nonceMatch
          
          if (serverNonce === pageNonce) {
            // Replace server nonce with page nonce
            attr.value = `nonce:${pageNonce};${code}`
          } else {
            // Invalid: remove attribute
            elt.removeAttribute(attr.name)
          }
        } else {
          // No nonce: remove attribute
          elt.removeAttribute(attr.name)
        }
      }
    })
  })
}

// HTMX response processing  
htmx.on('htmx:beforeSwap', function(evt) {
  const serverNonce = evt.detail.xhr.getResponseHeader('HX-Nonce')
  const pageNonce = getPageLoadNonce()
  
  if (!serverNonce) return
  
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = evt.detail.serverResponse
  
  tempDiv.querySelectorAll('[hx-on\\:*]').forEach(elt => {
    Array.from(elt.attributes).forEach(attr => {
      if (attr.name.startsWith('hx-on:')) {
        const nonceMatch = attr.value.match(/^nonce:([^;]+);(.*)$/)
        if (nonceMatch) {
          const [, nonce, code] = nonceMatch
          
          if (nonce === serverNonce) {
            // Replace server nonce with page nonce
            attr.value = `nonce:${pageNonce};${code}`
          } else {
            elt.removeAttribute(attr.name)
          }
        } else {
          elt.removeAttribute(attr.name)
        }
      }
    })
  })
  
  evt.detail.serverResponse = tempDiv.innerHTML
})

// Secure eval execution
function secureEval(elt, code, paramName, param, thisArg, defaultVal) {
  const pageNonce = getPageLoadNonce()
  const nonceMatch = code.match(/^nonce:([^;]+);(.*)$/)
  
  if (nonceMatch) {
    const [, nonce, actualCode] = nonceMatch
    
    if (nonce === pageNonce) {
      // Valid page nonce: execute via script tag
      return executeWithPageNonce(actualCode, paramName, param, thisArg)
    }
  }
  
  // No valid nonce: reject
  triggerErrorEvent(elt, 'htmx:evalSecurityError', {code})
  return defaultVal
}
```

### Why Option 2 is Best

1. **Self-Validating**: Code carries its own trust proof
2. **No External State**: No WeakMaps or registries to manage
3. **Clear Security Model**: Only page nonce allows execution
4. **Simple Implementation**: Minimal changes to HTMX parsing
5. **Debuggable**: Easy to see validation status in DOM

### HTMX Integration Requirement

Need to modify HTMX's attribute parsing to handle nonce prefixes:

```javascript
// In HTMX's addHxOnEventHandler function
function addHxOnEventHandler(elt, eventName, code) {
  // Check for nonce prefix
  const nonceMatch = code.match(/^nonce:([^;]+);(.*)$/)
  if (nonceMatch) {
    const [, nonce, actualCode] = nonceMatch
    code = actualCode // Use actual code for processing
  }
  
  // Rest of existing logic...
  api.maybeEval(elt, code, 'event', e, elt)
}
```

This approach provides the cleanest security model while requiring minimal changes to HTMX's core logic.
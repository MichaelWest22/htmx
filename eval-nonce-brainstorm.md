# HTMX Eval Usage Patterns & Nonce Tracking Strategy

## Eval Usage Patterns in HTMX

### 1. Event Handlers (`hx-on` attributes)
**Location**: `addHxOnEventHandler` function (line ~2820)
**Usage**: `api.maybeEval(elt, code, 'event', e, elt)`
**Timing**: Immediate execution when event fires
**Context**: Element event listeners
**Example**: `<div hx-on:click="console.log('clicked')">`

### 2. Event Filters (trigger conditions)
**Location**: `maybeGenerateConditional` function (line ~2092)
**Usage**: `api.maybeEval(elt, conditionalSource, null, null, null, true)`
**Timing**: During trigger spec parsing (element initialization)
**Context**: Trigger condition evaluation
**Example**: `<div hx-trigger="click[event.ctrlKey]">`

### 3. Variable Expressions (`hx-vars`)
**Location**: `getValuesForElement` function (line ~3850)
**Usage**: `api.maybeEval(elt, 'return (' + str + ')', 'event', event, null, {})`
**Timing**: During request preparation
**Context**: Dynamic variable calculation
**Example**: `<div hx-vars="userId: getCurrentUserId()">`

### 4. Value Expressions (`hx-vals` with js: prefix)
**Location**: `getValuesForElement` function (line ~3850)
**Usage**: Same as hx-vars when `evaluateValue = true`
**Timing**: During request preparation
**Context**: Dynamic value calculation
**Example**: `<div hx-vals="js:{timestamp: Date.now()}">`

### 5. Public API Eval (`htmx._`)
**Location**: `internalEval` function (line ~870)
**Usage**: `api.maybeEval(getDocument().body, str, 'eval')`
**Timing**: User-initiated via `htmx._(code)`
**Context**: Public API access
**Example**: `htmx._('console.log("hello")')`

## Nonce Tracking Strategy

### 1. Nonce Sources & Validation
```javascript
// Server nonce sources (priority order):
1. HX-Nonce response header (existing safe-nonce pattern)
2. Content-Security-Policy response header nonce extraction
3. Cross-domain validation (same-origin only)

// Nonce syntax in attributes:
hx-on:click="nonce:abc123;console.log('safe')"
hx-trigger="click[nonce:def456;event.ctrlKey]"
hx-vars="nonce:ghi789;userId: getCurrentUserId()"
```

### 2. Nonce Storage & Lifecycle Management
```javascript
// Global nonce registry for delayed execution
const nonceRegistry = new Map() // nonce -> {validated: boolean, serverNonce: string}

// Element-level nonce tracking
const elementNonces = new WeakMap() // element -> Set<nonce>

// Response-level nonce tracking  
const responseNonces = new Map() // xhr -> {serverNonce: string, validatedNonces: Set<string>}
```

### 3. Event Process Integration Points

#### A. Response Processing (`transformResponse`)
```javascript
// In safe-nonce extension or new unified extension:
transformResponse: function(text, xhr, elt) {
  const serverNonce = extractNonceFromResponse(xhr)
  if (serverNonce) {
    responseNonces.set(xhr, {serverNonce, validatedNonces: new Set()})
  }
  return text
}
```

#### B. Element Processing (`htmx:afterProcessNode`)
```javascript
// Scan for nonce-prefixed attributes during element initialization
htmx.on('htmx:afterProcessNode', function(evt) {
  const elt = evt.detail.elt
  scanElementForNonces(elt) // Parse and validate nonces in attributes
})
```

#### C. Request Lifecycle (`htmx:beforeRequest`)
```javascript
// Validate all pending nonces before request execution
htmx.on('htmx:beforeRequest', function(evt) {
  const xhr = evt.detail.xhr
  validatePendingNonces(xhr) // Check nonce registry against server nonce
})
```

### 4. Explicit Nonce Requirement

#### Only nonce-prefixed attributes execute eval
```html
<!-- TRUSTED: Has nonce prefix -->
<div hx-on:click="nonce:abc123;console.log('trusted')">

<!-- BLOCKED: No nonce prefix -->
<div hx-on:click="console.log('untrusted')">
```

#### A. Initial Page Load Challenge
```html
<!-- Page loads with nonce-prefixed attributes -->
<div hx-on:click="nonce:abc123;console.log('clicked')">
```
- **Problem**: HTMX processes attributes before we can validate nonces
- **Challenge**: No HTMX response hooks available during initial DOM scan
- **Need**: Pre-process attributes before HTMX sees them

#### B. HTMX Response (Has Event Hooks)
```html
<!-- Server response: HX-Nonce: def456 -->
<div hx-on:click="nonce:def456;console.log('clicked')">
```
- **Advantage**: Multiple HTMX event hooks available
- **Process**: Validate nonce → strip prefix → let HTMX process clean attribute

### 5. Delayed Execution Tracking

#### Problem: Server nonces don't work for delayed eval execution
- **Event handlers**: Execute when user triggers events (potentially hours later)
- **Trigger conditions**: Execute during element initialization (immediate)
- **Variable expressions**: Execute during request preparation (delayed)

#### Solution: Two-Stage Nonce Strategy
```javascript
// During element processing:
### 6. Processing Strategy by Context

#### A. Initial Page Load Processing
```javascript
// Must run BEFORE htmx.process() during page load
function preprocessPageLoadNonces() {
  const pageNonce = getPageLoadNonce()
  
  document.querySelectorAll('[hx-on\\:*]').forEach(elt => {
    Array.from(elt.attributes).forEach(attr => {
      if (attr.name.startsWith('hx-on:')) {
        const nonceMatch = attr.value.match(/^nonce:([^;]+);(.*)$/)
        if (nonceMatch) {
          const [, nonce, code] = nonceMatch
          
          if (nonce === pageNonce) {
            // Valid: strip nonce, mark as validated
            attr.value = code
            markElementCodeValidated(elt, code, attr.name)
          } else {
            // Invalid: remove attribute entirely
            elt.removeAttribute(attr.name)
          }
        } else {
          // No nonce: remove attribute (security policy)
          elt.removeAttribute(attr.name)
        }
      }
    })
  })
}

// Run before HTMX initialization
document.addEventListener('DOMContentLoaded', preprocessPageLoadNonces)
```

#### B. HTMX Response Processing
```javascript
// Use HTMX event hooks for response processing
htmx.on('htmx:beforeSwap', function(evt) {
  const serverNonce = evt.detail.xhr.getResponseHeader('HX-Nonce')
  if (!serverNonce) return
  
  // Parse response HTML and validate nonces
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = evt.detail.serverResponse
  
  tempDiv.querySelectorAll('[hx-on\\:*]').forEach(elt => {
    Array.from(elt.attributes).forEach(attr => {
      if (attr.name.startsWith('hx-on:')) {
        const nonceMatch = attr.value.match(/^nonce:([^;]+);(.*)$/)
        if (nonceMatch) {
          const [, nonce, code] = nonceMatch
          
          if (nonce === serverNonce) {
            // Valid: strip nonce, mark as validated
            attr.value = code
            markElementCodeValidated(elt, code, attr.name)
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
  
  // Update response with cleaned HTML
  evt.detail.serverResponse = tempDiv.innerHTML
})
```

function registerNonceForValidation(elt, nonce, code, context) {
  // Store for validation when server response arrives
  if (!elementNonces.has(elt)) {
    elementNonces.set(elt, new Set())
  }
  elementNonces.get(elt).add({nonce, code, context, validated: false})
}
```

### 5. Validation & Execution Flow

#### A. Server Response Arrives
```javascript
function validateElementNonces(xhr, elt) {
  const responseData = responseNonces.get(xhr)
  if (!responseData) return
  
  const elementNonceSet = elementNonces.get(elt)
  if (!elementNonceSet) return
  
  elementNonceSet.forEach(nonceData => {
    if (nonceData.nonce === responseData.serverNonce) {
      nonceData.validated = true
      responseData.validatedNonces.add(nonceData.nonce)
    }
  })
}
```

#### C. Secure Eval Execution
```javascript
function secureEval(elt, code, paramName, param, thisArg, defaultVal) {
  // Only execute if code was explicitly validated via nonce
  if (isCodeValidated(elt, code)) {
    return executeWithPageNonce(code, paramName, param, thisArg)
  }
  
  // Reject all non-nonce-validated code
  triggerErrorEvent(elt, 'htmx:evalSecurityError', {code})
  return defaultVal
}

function executeWithPageNonce(code, paramName, param, thisArg) {
  const script = document.createElement('script')
  script.nonce = getPageLoadNonce()
  
  // Store result in global variable for retrieval
  const resultVar = 'htmx_eval_result_' + Math.random().toString(36)
  const wrappedCode = `
    window.${resultVar} = (function(${paramName || ''}) {
      return (${code})
    }).call(this, arguments[0])
  `
  
  script.textContent = wrappedCode
  document.head.appendChild(script)
  
  const result = window[resultVar]
  delete window[resultVar]
  document.head.removeChild(script)
  return result
}

function getPageLoadNonce() {
  // Extract from CSP meta tag or script nonce
  const scripts = document.querySelectorAll('script[nonce]')
  return scripts.length > 0 ? scripts[0].nonce : null
}
```

### 6. Integration with Existing Safe-Nonce Extension

#### Unified Extension Architecture
```javascript
htmx.defineExtension('secure-eval', {
  init: function(apiRef) {
    api = apiRef
    originalEval = api.maybeEval
    api.maybeEval = secureEval
    
    // Integrate with existing safe-nonce if present
    if (extensions['safe-nonce']) {
      integrateWithSafeNonce()
    }
  },
  
  transformResponse: function(text, xhr, elt) {
    // Extract and store server nonce
    const serverNonce = extractServerNonce(xhr)
    if (serverNonce) {
      validateAllPendingNonces(xhr, serverNonce)
    }
    return text
  },
  
  isGlobal: true
})
```

### 7. Security Considerations

#### A. Nonce Reuse Prevention
- Each server response must provide unique nonce
- Nonces validated only against same-origin responses
- Expired nonces cleaned up after element removal

#### B. Fallback Behavior
- Invalid/missing nonces: Respect `htmx.config.allowEval` setting
- Development mode: Warning events for debugging
- Production mode: Silent rejection with error events

#### C. Performance Optimization
- WeakMap usage for automatic cleanup
- Minimal overhead for non-nonce attributes
- Batch validation during response processing

### 8. Implementation Phases

#### Phase 1: Page Load Preprocessing
- Implement DOM preprocessing before HTMX initialization
- Validate page load nonces and strip prefixes
- Remove non-nonce attributes (security enforcement)

#### Phase 2: HTMX Response Integration
- Hook into `htmx:beforeSwap` for response processing
- Validate server nonces and clean response HTML
- Integrate with existing safe-nonce nonce extraction

#### Phase 3: Secure Eval Override
- Override `api.maybeEval` to require validation
- Implement script tag execution with page nonce
- Add comprehensive error handling

#### Phase 4: Extension Integration
- Package as unified security extension
- Integrate with existing safe-nonce extension
- Add configuration options and testing

### 9. Key Security Principles

1. **Explicit Nonce Requirement**: Only `nonce:xxx;code` syntax allows eval execution
2. **Context-Aware Processing**: Different strategies for page load vs HTMX responses  
3. **Preprocessing Strategy**: Clean attributes before HTMX processes them
4. **Zero Trust**: Remove all non-nonce attributes by default
5. **CSP Compliance**: Use page nonce for actual execution via script tags

This provides comprehensive nonce-based security that eliminates `unsafe-eval` while maintaining full HTMX functionality.
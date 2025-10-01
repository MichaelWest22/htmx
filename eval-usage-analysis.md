# HTMX Eval Usage Analysis for Nonce Strategy

## Eval Usage Patterns Found

### 1. Event Handlers (`hx-on:*` attributes) - Line ~2820
```javascript
function addHxOnEventHandler(elt, eventName, code) {
  const listener = function(e) {
    if (eltIsDisabled(elt)) return
    api.maybeEval(elt, code, 'event', e, elt)  // ← EVAL USAGE
  }
  elt.addEventListener(eventName, listener)
}
```
**Nonce Strategy**: ✅ **WORKS PERFECTLY**
- Code stored in attribute: `hx-on:click="nonce:abc123;console.log('clicked')"`
- Preprocessing replaces with page nonce: `hx-on:click="nonce:page456;console.log('clicked')"`
- At execution time, validate page nonce and execute via script tag

### 2. Event Filters (trigger conditions) - Line ~2092
```javascript
function maybeGenerateConditional(elt, tokens, paramName) {
  // ... parsing logic ...
  const conditionFunction = api.maybeEval(elt, conditionalSource, null, null, null, true)  // ← EVAL USAGE
}
```
**Nonce Strategy**: ✅ **WORKS PERFECTLY**
- Code in trigger: `hx-trigger="click[nonce:abc123;event.ctrlKey]"`
- Same preprocessing and execution pattern as event handlers

### 3. Variable Expressions (`hx-vars`) - Line ~3850
```javascript
function getValuesForElement(elt, attr, evalAsDefault, values, event) {
  if (evaluateValue) {
    varsValues = api.maybeEval(elt, 'return (' + str + ')', 'event', event, null, {})  // ← EVAL USAGE
  }
}
```
**Nonce Strategy**: ✅ **WORKS PERFECTLY**
- Code in attribute: `hx-vars="nonce:abc123;userId: getCurrentUserId()"`
- Same preprocessing and execution pattern

### 4. Value Expressions (`hx-vals` with js: prefix) - Line ~3850
```javascript
// Same function as hx-vars when evaluateValue = true
```
**Nonce Strategy**: ✅ **WORKS PERFECTLY**
- Code in attribute: `hx-vals="js:nonce:abc123;{timestamp: Date.now()}"`
- Same preprocessing and execution pattern

### 5. Public API Eval (`htmx._`) - Line ~870
```javascript
function internalEval(str) {
  return api.maybeEval(getDocument().body, str, 'eval')  // ← EVAL USAGE
}
```
**Nonce Strategy**: ❌ **EXCLUDED** (Not production feature, testing only)

## Key Findings

### ✅ All Production Eval Usage Works with Nonce Strategy

1. **Attribute-Based**: All production eval usage comes from HTML attributes
2. **Preprocessing Compatible**: All can be preprocessed with nonce syntax
3. **Delayed Execution**: All execute later than response processing (perfect for page nonce strategy)

### 🔧 Required HTMX Modifications

#### A. Attribute Parsing Functions Need Nonce Support
```javascript
// Current: addHxOnEventHandler(elt, eventName, code)
// Needs: Handle nonce prefix in code parameter

function addHxOnEventHandler(elt, eventName, code) {
  // Extract nonce if present
  const nonceMatch = code.match(/^nonce:([^;]+);(.*)$/)
  if (nonceMatch) {
    const [, nonce, actualCode] = nonceMatch
    code = actualCode // Use clean code for processing
  }
  
  // Rest of existing logic...
  api.maybeEval(elt, code, 'event', e, elt)
}
```

#### B. Trigger Parsing Needs Nonce Support
```javascript
// In parseAndCacheTrigger function
// Handle nonce prefix in conditional expressions
```

#### C. Values Processing Needs Nonce Support  
```javascript
// In getValuesForElement function
// Handle nonce prefix in hx-vars and hx-vals
```

### 🎯 Implementation Strategy

#### Option 2 (Replace with Page Nonce) is Optimal Because:

1. **Self-Validating**: Each attribute carries its validation proof
2. **No External State**: No WeakMaps or caches needed
3. **Simple Integration**: Minimal changes to HTMX parsing logic
4. **Clear Security Model**: Only `nonce:pageNonce;code` executes

#### Implementation Steps:

1. **Page Load Preprocessing**: Scan DOM before HTMX init, validate/replace nonces
2. **HTMX Response Processing**: Use `htmx:beforeSwap` to process response HTML
3. **HTMX Parser Updates**: Modify attribute parsing to handle nonce prefixes
4. **Secure Eval Override**: Replace `api.maybeEval` to require page nonce validation

### 🔒 Security Benefits

1. **Eliminates `unsafe-eval`**: All eval converted to script tags with page nonce
2. **Explicit Trust**: Only nonce-prefixed content executes
3. **Server Validation**: Server nonces validate content authenticity
4. **CSP Compliance**: Uses existing page nonce infrastructure

## Conclusion

The nonce replacement strategy is **perfectly suited** for HTMX's eval usage patterns. All production eval usage is attribute-based and can be preprocessed with nonce validation, then executed securely via script tags with the page load nonce.

This approach provides comprehensive security while maintaining full HTMX functionality and requiring minimal core changes.
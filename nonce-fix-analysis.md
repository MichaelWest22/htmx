# Nonce Strategy Fix for hx-vars "return (" Wrapper Issue

## Problem Identified

The current nonce strategy has a critical flaw with `hx-vars` processing:

### Current Flow (BROKEN):
1. **Attribute**: `hx-vars="nonce:abc123;userId: getCurrentUserId()"`
2. **Preprocessing**: `hx-vars="nonce:page456;userId: getCurrentUserId()"`  
3. **getValuesForElement**: `'return (nonce:page456;userId: getCurrentUserId())'`
4. **Result**: Invalid JavaScript syntax

## Root Cause

The `getValuesForElement` function wraps the attribute value with `'return (' + str + ')'` BEFORE nonce extraction, creating invalid syntax when nonce prefix is present.

## Solution: Extract Nonce BEFORE Wrapper

### Modified getValuesForElement Function

```javascript
function getValuesForElement(elt, attr, evalAsDefault, values, event) {
  // ... existing logic ...
  
  if (evaluateValue) {
    // EXTRACT NONCE BEFORE ADDING WRAPPER
    let cleanStr = str;
    let hasValidNonce = false;
    
    const nonceMatch = str.match(/^nonce:([^;]+);(.*)$/);
    if (nonceMatch) {
      const [, nonce, actualCode] = nonceMatch;
      if (nonce === getPageNonce()) {
        cleanStr = actualCode;
        hasValidNonce = true;
      } else {
        // Invalid nonce - reject
        return {};
      }
    }
    
    // NOW add the wrapper to clean code
    const wrappedCode = 'return (' + cleanStr + ')';
    
    // Only eval if nonce is valid (or no nonce required in dev mode)
    if (hasValidNonce || !isNonceRequired()) {
      varsValues = api.maybeEval(elt, wrappedCode, 'event', event, null, {});
    }
  }
}
```

## Implementation Strategy

### Option 1: Pre-process at Attribute Level
Extract nonce in each parsing function before any code transformation:

```javascript
// In addHxOnEventHandler
function addHxOnEventHandler(elt, eventName, code) {
  const {cleanCode, isValid} = extractAndValidateNonce(code);
  if (!isValid) return; // Skip invalid nonce
  
  const listener = function(e) {
    if (eltIsDisabled(elt)) return;
    api.maybeEval(elt, cleanCode, 'event', e, elt);
  };
  elt.addEventListener(eventName, listener);
}

// In getValuesForElement  
function getValuesForElement(elt, attr, evalAsDefault, values, event) {
  if (evaluateValue) {
    const {cleanCode, isValid} = extractAndValidateNonce(str);
    if (!isValid) return {};
    
    const wrappedCode = 'return (' + cleanCode + ')';
    varsValues = api.maybeEval(elt, wrappedCode, 'event', event, null, {});
  }
}
```

### Option 2: Centralized in maybeEval (RECOMMENDED)
Handle nonce extraction inside the secure `maybeEval` replacement:

```javascript
function secureEval(elt, code, paramName, param, thisArg, defaultVal) {
  // Extract nonce from any code string
  const nonceMatch = code.match(/^nonce:([^;]+);(.*)$/);
  
  if (nonceMatch) {
    const [, nonce, actualCode] = nonceMatch;
    if (nonce !== getPageNonce()) {
      console.warn('Invalid nonce in eval code');
      return defaultVal;
    }
    code = actualCode; // Use clean code
  } else if (isNonceRequired()) {
    console.warn('Nonce required but not found in eval code');
    return defaultVal;
  }
  
  // Execute clean code via script tag
  return executeViaScriptTag(code, thisArg, defaultVal);
}
```

## Recommended Fix

**Use Option 2** - centralized nonce handling in `maybeEval` replacement because:

1. **Single Point of Control**: All nonce validation in one place
2. **No Parser Changes**: Existing HTMX parsing logic unchanged  
3. **Consistent Security**: Same validation for all eval contexts
4. **Wrapper Compatible**: Works with any code transformation

### Implementation Steps

1. **Replace api.maybeEval** with secure version that extracts nonce
2. **Validate nonce** against page nonce before execution
3. **Execute clean code** via script tag with page nonce
4. **Reject invalid nonces** with appropriate fallback

## Testing Requirements

### Test Cases Needed

1. **hx-vars with nonce**: `hx-vars="nonce:page123;userId: getCurrentUserId()"`
2. **hx-vals with nonce**: `hx-vals="js:nonce:page123;{timestamp: Date.now()}"`
3. **hx-on with nonce**: `hx-on:click="nonce:page123;handleClick(event)"`
4. **Trigger conditions**: `hx-trigger="click[nonce:page123;event.ctrlKey]"`
5. **Invalid nonces**: Should be rejected safely
6. **Missing nonces**: Should work in dev mode, reject in production

## Security Benefits Maintained

- ✅ **Nonce validation** before any code execution
- ✅ **Script tag execution** with page nonce (no unsafe-eval)
- ✅ **Server trust model** via nonce headers
- ✅ **CSP compliance** with strict nonce policy

## Conclusion

The "return (" wrapper issue is easily solved by extracting nonce **before** any code transformation. The centralized approach in `maybeEval` replacement is cleanest and maintains all security benefits while requiring minimal HTMX core changes.
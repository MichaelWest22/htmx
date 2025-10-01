# HTMX Nonce-Based Security Enhancement

## Problem Statement

HTMX currently uses `unsafe-eval` for features like `hx-on` and event filters, which violates Content Security Policy (CSP) requirements. While HTMX has basic nonce support for server-supplied script tags, it doesn't cover eval-based features and uses a flawed approach of reusing the initial page load nonce.

## Current Issues

1. **Unsafe Eval Usage**: Features like `hx-on`, event filters use `eval()` requiring `unsafe-eval` CSP directive
2. **Improper Nonce Reuse**: HTMX reuses the initial page load nonce for all subsequent partial updates
3. **Limited Protection**: Current nonce implementation only covers server-supplied script tags, not eval features
4. **CSP Violation**: Browser CSP nonce validation only works properly for initial page load scripts

## Solution Overview

Implement a complete nonce-based security system that:
- Eliminates `unsafe-eval` requirement by converting evals to temporary script tags
- Provides proper nonce validation for server-supplied content
- Extends protection to all eval-based HTMX features
- Maintains security equivalent to proper CSP nonce protection

## Implementation Plan

### Phase 1: Core Infrastructure ✅ COMPLETE
- [x] **Centralized Eval Function**: Refactored all eval operations into `maybeEval` function
  - Location: `api.maybeEval` in internal API
  - Parameters: `(elt, code, paramName, param, thisArg, defaultVal)`
  - Used by: `hx-on` handlers, event filters, `hx-vars`, trigger conditions
- [x] **Global Extension System**: Created system for system-wide function proxying
  - `isGlobal: true` property in extension definitions
  - `globalExtensions` array for global extension storage
  - `preEventHook` function for global event interception
  - Extensions can replace/proxy internal API functions
- [x] **Demo Eval Replacement**: Built proof-of-concept using temporary script tags
  - `eval-ext` extension demonstrates script tag approach
  - Converts `eval(code)` to `<script>htmx.evalFunction = function() { code }</script>`
  - Successfully bypasses `unsafe-eval` CSP requirement
  - Uses `htmx.evalFunction` as intermediate storage mechanism

### Phase 2: SafeNonce Extension ✅ COMPLETE
- [x] Implemented `safeNonce` extension that:
  - Listens for CSP nonce in server response headers (`HX-Nonce` or CSP header)
  - Validates server-supplied script tags before nonce replacement
  - Removes scripts without matching nonces from partial responses
  - Updates valid scripts to use page-load nonce for execution
  - Provides equivalent protection to initial page load nonce validation
  - Prevents nonce reuse and cross-domain attacks

### Phase 3: Comprehensive Eval Analysis ✅ COMPLETE
- [x] **All Eval Patterns Identified**: 4 production eval usage patterns documented
  - Event Handlers (`hx-on:*`) - Line ~2820 in `addHxOnEventHandler`
  - Event Filters (trigger conditions) - Line ~2092 in `maybeGenerateConditional`  
  - Variable Expressions (`hx-vars`) - Line ~3850 in `getValuesForElement`
  - Value Expressions (`hx-vals` with js:) - Line ~3850 in `getValuesForElement`
- [x] **Nonce Strategy Selected**: Option 2 (Replace with Page Nonce) chosen as optimal
  - Self-validating attributes carry trust proof
  - No external state management needed
  - Minimal HTMX core changes required
  - Clear security model: only `nonce:pageNonce;code` executes
- [x] **Implementation Architecture**: Complete preprocessing and execution flow designed
  - Page load: validate server nonce → replace with page nonce → HTMX processes
  - HTMX response: validate server nonce → replace with page nonce → swap content
  - Execution: validate page nonce → execute via script tag with page nonce

### Phase 4: Implementation Plan (READY TO START)

#### Week 1: Core Nonce Processing Infrastructure
- **Page Load Nonce Extraction**: Extract nonce from CSP/script tags
- **Nonce Attribute Processing**: Validate and replace nonces in attributes  
- **DOM Preprocessing**: Page load and HTMX response preprocessing functions
- **Security Policy**: Remove non-nonce attributes by default

#### Week 2: HTMX Integration Points  
- **Attribute Parser Updates**: Handle nonce prefixes in all eval contexts
  - `addHxOnEventHandler`: Extract nonce from event handler code
  - `maybeGenerateConditional`: Extract nonce from trigger conditions
  - `getValuesForElement`: Extract nonce from hx-vars/hx-vals
- **Secure Eval Override**: Replace `api.maybeEval` with nonce-validating version
- **Script Tag Execution**: Execute validated code via script tags with page nonce

#### Week 3: Extension Integration
- **Unified Security Extension**: Package as `secure-eval` extension with `isGlobal: true`
- **Safe-Nonce Integration**: Extend existing extension for eval support
- **Configuration & Error Handling**: Security policies, error events, fallback behavior

#### Week 4: Testing & Validation
- **Comprehensive Test Suite**: All eval patterns, security edge cases, integration scenarios
- **Performance Assessment**: Minimal overhead verification
- **Documentation**: Usage guide, migration guide, troubleshooting

### Success Criteria
- **Security**: Eliminate `unsafe-eval`, explicit nonce-based trust, CSP compliance
- **Functionality**: Zero breaking changes, transparent operation, performance maintained
- **Integration**: Safe-nonce compatibility, clean extension architecture

## Technical Architecture

### Core Components

1. **Centralized Eval Handler**: `maybeEval` function replacement
2. **Global Extension System**: Allows system-wide function proxying
3. **Nonce Validator**: Validates nonces from server headers
4. **Script Tag Generator**: Converts eval to temporary scripts
5. **Security Policy Enforcer**: Rejects invalid/missing nonces

### Security Model

```
Server Response → Nonce Validation → Script Generation → Execution
     ↓                    ↓                 ↓              ↓
  Contains nonce    Validate against    Create temp     Execute with
  in header/attr    server header       script tag      page nonce
```

## Benefits

1. **CSP Compliance**: Eliminates need for `unsafe-eval`
2. **Enhanced Security**: Proper nonce validation for all eval features
3. **Server Control**: Server can control which scripts execute via nonce
4. **Backward Compatibility**: Graceful degradation when nonces not provided
5. **Performance**: Minimal overhead for security validation

## Implementation Status

### ✅ Completed Infrastructure (Phases 1-2)
- **Core eval refactoring complete** - `maybeEval` function centralizes all eval operations
- **Global extension system implemented** - Extensions can proxy internal API functions  
- **Basic eval-to-script conversion working** - `eval-ext` demonstrates temporary script approach
- **SafeNonce extension for script tags complete** - Validates server-supplied scripts via nonce headers

### ✅ Completed Analysis & Strategy (Phase 3)
- **Comprehensive eval analysis complete** - All 4 production eval patterns documented and validated
- **Nonce strategy selected** - Option 2 (Replace with Page Nonce) chosen as optimal approach
- **Implementation architecture designed** - Complete preprocessing and execution flow documented
- **Security model defined** - Two-stage nonce validation (server→page nonce) strategy

### 🚀 Ready for Implementation (Phase 4)
- **Week 1**: Core nonce processing infrastructure
- **Week 2**: HTMX integration and secure eval override
- **Week 3**: Extension packaging and safe-nonce integration  
- **Week 4**: Comprehensive testing and documentation

**Target**: Complete nonce-based eval security system eliminating `unsafe-eval` while maintaining full HTMX functionality

## Technical Architecture (IMPLEMENTED)

### Core Components ✅

1. **Centralized Eval Handler**: `api.maybeEval` function in internal API
2. **Global Extension System**: `isGlobal: true` extensions with `preEventHook`
3. **Function Proxying**: Extensions can replace `api.maybeEval` and other internal functions
4. **Script Tag Generator**: `replaceEval` converts eval to temporary scripts
5. **Nonce Validator**: `safe-nonce` extension validates server response headers

### Integration Points ✅

- **hx-on handlers**: Use `api.maybeEval` for event handler execution
- **Event filters**: Use `api.maybeEval` for trigger condition evaluation  
- **hx-vars**: Use `api.maybeEval` for variable expression evaluation
- **Script tags**: Validated by `safe-nonce` extension via response headers
- **Global events**: `preEventHook` allows interception before DOM events fire

## Usage Example

### Complete Security Stack
```html
<!-- CSP Header -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'nonce-page-load-nonce-123' 'strict-dynamic';
  trusted-types htmx-policy;
  require-trusted-types-for 'script';
">

<!-- Initial page with nonce -->
<script nonce="page-load-nonce-123">
  // HTMX initialization with TrustedTypes
</script>

<!-- Server response with nonce header -->
<!-- X-CSP-Nonce: server-nonce-456 -->
<div hx-on:click="nonce:server-nonce-456;handleClick(event)">
  Click me safely
</div>
```

### Security Flow
1. **TrustedTypes**: Only HTMX can inject HTML/scripts
2. **Nonce Validation**: Server controls which scripts execute
3. **Server Escaping**: Backend ensures content safety
4. **Strict CSP**: Blocks all other injection vectors

## TrustedTypes Integration

### Concept
Implement TrustedTypes support to create the strictest possible CSP policy that only allows HTMX to inject HTML content. This leverages HTMX's hypermedia approach where the server is the trusted source of all content.

### Security Model
```
CSP Policy: trusted-types htmx-policy; require-trusted-types-for 'script';
Server Content → HTMX TrustedType → Safe DOM Injection
     ↓               ↓                    ↓
  Escaped by      Validated by         Prevents all
  backend         HTMX policy          other XSS vectors
```

### Implementation Plan

#### TrustedType Policy Creation
```javascript
if (window.trustedTypes) {
  htmx.trustedTypePolicy = trustedTypes.createPolicy('htmx-policy', {
    createHTML: (input) => {
      // HTMX validates server content is safe
      return input;
    },
    createScript: (input) => {
      // For nonce-validated eval content
      return input;
    }
  });
}
```

#### Integration Points
1. **HTML Swapping**: Use `trustedTypePolicy.createHTML()` for all DOM updates
2. **Script Generation**: Use `trustedTypePolicy.createScript()` for eval replacements
3. **Server Trust**: Rely on server-side escaping for content safety
4. **Nonce Validation**: Combine with nonce system for script content

### Benefits
1. **Maximum CSP Protection**: Prevents all non-HTMX HTML injection
2. **Server-Centric Security**: Trusts properly configured backends
3. **XSS Prevention**: Blocks all untrusted script/HTML sources
4. **Hypermedia Alignment**: Reinforces server-as-source-of-truth model

### CSP Policy Example
```
Content-Security-Policy: 
  default-src 'self';
  script-src 'nonce-{page-nonce}' 'strict-dynamic';
  trusted-types htmx-policy;
  require-trusted-types-for 'script';
```

## Future Enhancements

1. **Nonce Rotation**: Support for rotating nonces per request
2. **Hash-Based CSP**: Alternative to nonce-based validation
3. **Extension API**: Allow other extensions to use secure eval
4. **Development Tools**: Debug mode for nonce validation issues
5. **TrustedTypes Fallback**: Graceful degradation for unsupported browsers
6. **Policy Customization**: Allow custom TrustedType validation rules
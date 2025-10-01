// Mock Test for Secure Eval Extension Logic
// Run this in browser console to validate extension behavior

console.log('🧪 Testing Secure Eval Extension Logic');

// Mock HTMX config and functions
const mockHtmx = {
  config: {
    inlineScriptNonce: 'page-nonce-123'
  }
};

// Mock original eval function
function mockOriginalEval(elt, code, paramName, param, thisArg, defaultVal) {
  console.log('📝 Original eval would execute:', code);
  return eval(code);
}

// Core functions from secure-eval.js (simplified for testing)
function getPageLoadNonce() {
  return mockHtmx.config.inlineScriptNonce;
}

function executeWithPageNonce(code, paramName, param, thisArg) {
  console.log('✅ Executing with page nonce:', code);
  // Simulate script tag execution with proper parameter context
  try {
    if (paramName && param !== undefined) {
      // Create function with parameter and call it
      const func = new Function(paramName, code);
      return func.call(thisArg, param);
    } else {
      // Execute as function body
      const func = new Function(code);
      return func.call(thisArg);
    }
  } catch (e) {
    console.error('❌ Execution failed:', e.message);
    return undefined;
  }
}

function secureEval(api, originalEval, elt, code, paramName, param, thisArg, defaultVal) {
  const pageNonce = getPageLoadNonce();
  const noncePrefix = 'nonce:' + pageNonce + ';';
  
  console.log(`🔍 Checking code: "${code}"`);
  console.log(`🔑 Expected nonce prefix: "${noncePrefix}"`);
  
  if (code.includes(noncePrefix)) {
    console.log('✅ Valid nonce found, removing prefix');
    code = code.replace(noncePrefix, '');
    return executeWithPageNonce(code, paramName, param, thisArg);
  } else if (pageNonce) {
    console.log('❌ Page nonce exists but code lacks valid nonce - REJECTED');
    return defaultVal;
  }
  
  console.log('⚠️ No page nonce - returning default');
  return defaultVal;
}

// Transform response function (simplified)
function transformResponse(text, serverNonce) {
  console.log(`\n📥 Processing response with server nonce: "${serverNonce}"`);
  console.log(`📄 Original text: "${text}"`);
  
  if (serverNonce) {
    const pageNonce = getPageLoadNonce();
    if (pageNonce) {
      // Remove existing page nonces (prevent reuse)
      const pageNonceRegex = new RegExp(`nonce:${pageNonce.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')};`, 'g');
      text = text.replace(pageNonceRegex, '');
      console.log(`🧹 After removing existing page nonces: "${text}"`);
      
      // Replace server nonce with page nonce
      const serverNonceRegex = new RegExp(`nonce:${serverNonce.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')};`, 'g');
      text = text.replace(serverNonceRegex, `nonce:${pageNonce};`);
      console.log(`🔄 After replacing server nonce: "${text}"`);
    }
  }
  
  return text;
}

// Test Cases
console.log('\n🧪 TEST CASES\n');

// Test 1: Valid nonce in hx-on
console.log('--- Test 1: Valid nonce in hx-on ---');
const result1 = secureEval(null, mockOriginalEval, null, 
  'nonce:page-nonce-123;console.log("Hello from hx-on")', 
  'event', {type: 'click'}, null, 'DEFAULT');
console.log('Result:', result1);

// Test 2: Invalid nonce
console.log('\n--- Test 2: Invalid nonce ---');
const result2 = secureEval(null, mockOriginalEval, null, 
  'nonce:wrong-nonce;console.log("Should not execute")', 
  null, null, null, 'DEFAULT');
console.log('Result:', result2);

// Test 3: No nonce
console.log('\n--- Test 3: No nonce ---');
const result3 = secureEval(null, mockOriginalEval, null, 
  'console.log("No nonce code")', 
  null, null, null, 'DEFAULT');
console.log('Result:', result3);

// Test 4: hx-vars with return wrapper
console.log('\n--- Test 4: hx-vars with return wrapper ---');
const result4 = secureEval(null, mockOriginalEval, null, 
  'return (nonce:page-nonce-123;{userId: 42, timestamp: Date.now()})', 
  'event', {}, null, {});
console.log('Result:', result4);

// Test 5: Transform response - server nonce replacement
console.log('\n--- Test 5: Transform response ---');
const responseText = '<div hx-on:click="nonce:server-456;handleClick(event)">Click</div>';
const transformed = transformResponse(responseText, 'server-456');
console.log('Transformed:', transformed);

// Test 6: Transform response - page nonce reuse prevention
console.log('\n--- Test 6: Page nonce reuse prevention ---');
const maliciousText = '<div hx-on:click="nonce:page-nonce-123;maliciousCode()">Evil</div>';
const cleaned = transformResponse(maliciousText, 'server-789');
console.log('Cleaned:', cleaned);

// Test 7: Complex eval scenarios
console.log('\n--- Test 7: Complex scenarios ---');

// Event filter with nonce
const eventFilter = secureEval(null, mockOriginalEval, null,
  'nonce:page-nonce-123;event.ctrlKey && event.target.matches(".special")',
  'event', {ctrlKey: true, target: {matches: () => true}}, null, false);
console.log('Event filter result:', eventFilter);

// hx-vals with js: prefix
const hxVals = secureEval(null, mockOriginalEval, null,
  'return (nonce:page-nonce-123;{timestamp: Date.now(), random: Math.random()})',
  'event', {}, null, {});
console.log('hx-vals result:', hxVals);

console.log('\n✅ All tests completed!');
console.log('\n📋 Summary:');
console.log('- Valid nonces should execute and return results');
console.log('- Invalid nonces should be rejected with default values');  
console.log('- Server nonces should be replaced with page nonce');
console.log('- Existing page nonces should be removed to prevent reuse');
console.log('- Return wrappers should work correctly with nonce extraction');
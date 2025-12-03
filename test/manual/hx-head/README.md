# hx-head Manual Tests

## Basic Tests
- `index.html` / `page2.html` - Basic head merging test

## Async Script Loading Tests
- `async-test-index.html` - Main test page
- `async-test-page2.html` - Tests synchronous script loading (should block swap)
- `async-test-page3.html` - Tests async script loading (should NOT block swap)
- `async-test-page4.html` - Tests stylesheet loading (should block swap)

### Expected Behavior

**Page 2 (Sync Script):**
- The sync script should load BEFORE the content swaps in
- Status should show "✓ Loaded before swap"

**Page 3 (Async Script):**
- The async script should NOT block the swap
- Content swaps immediately, script loads in background
- Status may show "Still loading..." then "✓ Loaded (after swap)"

**Page 4 (Stylesheet):**
- The stylesheet should load BEFORE the content swaps in
- The styled content should have blue border immediately
- Status should show "✓ Loaded before swap"

### Running the Tests

1. Start a local server in the htmx root directory:
   ```
   npx serve
   ```

2. Navigate to: `http://localhost:3000/test/manual/hx-head/async-test-index.html`

3. Click through the links and verify the expected behavior

# HTMX Module Bundler Tests

Tests for bundling and importing htmx with various module bundlers and TypeScript.

Each test folder contains a minimal setup to verify htmx can be properly imported and bundled as an ESM module with extensions.

## Running Tests

From the root htmx directory:

```bash
npm run test:module:webpack
npm run test:module:vite
npm run test:module:esbuild
npm run test:module:typescript
```

## Available Tests

- **webpack** - Bundles htmx with webpack
- **vite** - Bundles htmx with Vite
- **esbuild** - Bundles htmx with esbuild
- **typescript** - Verifies TypeScript definitions and public API

## Test Structure

Each test includes:
- `package.json` - Dependencies with latest versions and test script
- `[bundler].config.js` - Bundler configuration with htmx aliases
- `src/index.js` or `src/index.ts` - Entry point importing htmx and extensions
- `verify.js` - Script verifying bundle contents
- `.gitignore` - Excludes generated files

## What's Being Tested

1. htmx can be imported as an ESM module
2. Extensions can be bundled alongside htmx
3. The bundle includes the `window.htmx` global assignment
4. TypeScript definitions are correct and complete
5. All public API methods are properly typed

## Test Cleanup

Each bundler test automatically cleans up `node_modules`, `dist`, and `package-lock.json` after running.

## Adding New Tests

Create a new folder with the same structure and add to main `package.json`:

```json
"test:module:rollup": "cd test/module/rollup && npm install && npm test"
```

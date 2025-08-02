# HTMX WebAssembly

A WebAssembly implementation of htmx - high power tools for HTML.

## Overview

This is a Rust-based WebAssembly port of the popular htmx library. It provides the same core functionality as the original JavaScript version but compiled to WebAssembly for potentially better performance and memory safety.

## Features

- **Core HTMX Attributes**: Support for `hx-get`, `hx-post`, `hx-put`, `hx-delete`, `hx-patch`
- **Triggers**: Configurable event triggers with `hx-trigger`
- **Swapping**: Multiple swap strategies (`innerHTML`, `outerHTML`, `beforebegin`, etc.)
- **Boosting**: Progressive enhancement with `hx-boost`
- **Events**: Custom event system for extensibility
- **Configuration**: Configurable behavior similar to original htmx

## Project Structure

```
htmx-wasm/
├── src/
│   ├── lib.rs          # Main library entry point
│   ├── config.rs       # Configuration management
│   ├── dom.rs          # DOM utilities
│   ├── events.rs       # Event management
│   ├── ajax.rs         # AJAX request handling
│   ├── swap.rs         # Content swapping
│   └── triggers.rs     # Trigger parsing and binding
├── Cargo.toml          # Rust dependencies
├── build.sh            # Build script
└── README.md           # This file
```

## Building

1. Install Rust and wasm-pack:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
   ```

2. Build the project:
   ```bash
   chmod +x build.sh
   ./build.sh
   ```

3. Serve the test file:
   ```bash
   python -m http.server 8000
   ```

4. Open http://localhost:8000 in your browser

## Usage

```html
<!DOCTYPE html>
<html>
<head>
    <title>HTMX WASM Example</title>
</head>
<body>
    <button hx-get="/api/data" hx-target="#result">
        Load Data
    </button>
    
    <div id="result"></div>

    <script type="module">
        import init, { Htmx } from './pkg/htmx-wasm.js';
        
        async function run() {
            await init();
            const htmx = new Htmx();
            window.htmx = htmx;
            htmx.process(document.body);
        }
        
        run();
    </script>
</body>
</html>
```

## API

### Core Methods

- `new Htmx()` - Create a new HTMX instance
- `process(element)` - Process an element for HTMX attributes
- `find(selector)` - Find an element by CSS selector
- `findAll(selector)` - Find all elements by CSS selector
- `on(event, selector, handler)` - Add event listener
- `trigger(element, event, detail)` - Trigger custom event
- `ajax(verb, path, element)` - Make AJAX request
- `swap(target, content, style)` - Swap content

### Configuration

The HTMX instance can be configured similar to the original:

```javascript
htmx.config.defaultSwapStyle = 'outerHTML';
htmx.config.timeout = 5000;
htmx.config.historyEnabled = false;
```

## Supported Attributes

- `hx-get`, `hx-post`, `hx-put`, `hx-delete`, `hx-patch` - HTTP verbs
- `hx-trigger` - Event triggers
- `hx-target` - Target element for swaps
- `hx-swap` - Swap strategy
- `hx-boost` - Progressive enhancement
- `hx-params` - Parameter filtering
- `hx-headers` - Custom headers
- `hx-vals` - Additional values

## Differences from Original

This WebAssembly version aims to be functionally equivalent to the original htmx but may have some differences:

1. **Performance**: Potentially faster execution due to WebAssembly
2. **Memory Safety**: Rust's memory safety guarantees
3. **Bundle Size**: May be larger due to WASM overhead
4. **Browser Support**: Requires WebAssembly support
5. **Extensions**: Extension system may differ slightly

## Development

To contribute or modify:

1. Edit the Rust source files in `src/`
2. Run `./build.sh` to rebuild
3. Test changes in the browser
4. Submit pull requests

## License

This project follows the same license as the original htmx library.

## Version

Current version: 2.0.6-wasm (based on htmx 2.0.6)
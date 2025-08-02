#!/bin/bash

# Build script for htmx-wasm

echo "Building htmx-wasm..."

# Install wasm-pack if not already installed
if ! command -v wasm-pack &> /dev/null; then
    echo "Installing wasm-pack..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

# Build the WebAssembly package
wasm-pack build --target web --out-dir pkg --out-name htmx-wasm

# Create a simple HTML test file
cat > index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>HTMX WASM Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .htmx-indicator { opacity: 0; transition: opacity 200ms ease-in; }
        .htmx-request .htmx-indicator { opacity: 1; }
        button { padding: 10px 20px; margin: 10px; }
        .response { margin: 20px 0; padding: 20px; background: #f0f0f0; }
    </style>
</head>
<body>
    <h1>HTMX WebAssembly Demo</h1>
    
    <button hx-get="/api/hello" hx-target="#response">
        Get Hello
        <span class="htmx-indicator">Loading...</span>
    </button>
    
    <button hx-post="/api/submit" hx-target="#response">
        Post Data
        <span class="htmx-indicator">Submitting...</span>
    </button>
    
    <form hx-post="/api/form" hx-target="#response">
        <input type="text" name="message" placeholder="Enter message" />
        <button type="submit">Submit Form</button>
    </form>
    
    <div id="response" class="response">
        Response will appear here...
    </div>

    <script type="module">
        import init, { Htmx } from './pkg/htmx-wasm.js';
        
        async function run() {
            await init();
            
            // Initialize HTMX
            const htmx = new Htmx();
            
            // Make it globally available
            window.htmx = htmx;
            
            console.log('HTMX WASM initialized, version:', htmx.version);
            
            // Process the document
            htmx.process(document.body);
            
            // Mock server responses for demo
            const originalFetch = window.fetch;
            window.fetch = function(url, options) {
                console.log('Mock fetch:', url, options);
                
                return new Promise(resolve => {
                    setTimeout(() => {
                        let response;
                        if (url.includes('/api/hello')) {
                            response = '<p>Hello from HTMX WASM!</p>';
                        } else if (url.includes('/api/submit')) {
                            response = '<p>Data submitted successfully!</p>';
                        } else if (url.includes('/api/form')) {
                            response = '<p>Form submitted with WASM!</p>';
                        } else {
                            response = '<p>Unknown endpoint</p>';
                        }
                        
                        resolve({
                            ok: true,
                            text: () => Promise.resolve(response),
                            headers: new Headers()
                        });
                    }, 500);
                });
            };
        }
        
        run();
    </script>
</body>
</html>
EOF

echo "Build complete! Open index.html in a web server to test."
echo "You can use: python -m http.server 8000"
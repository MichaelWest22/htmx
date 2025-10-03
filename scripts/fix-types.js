const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../dist/htmx.esm.d.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Transform namespace to interface
content = content.replace('declare namespace htmx {', 'interface HTMX {');

// Remove 'let ' from property declarations inside the interface
content = content.replace(/^    let /gm, '    ');

// Remove 'function ' from method declarations
content = content.replace(/^    function /gm, '    ');

// Convert nested namespace config to object type
content = content.replace(/^    namespace config \{$/m, '    config: {');

// Remove 'let ' from config properties
content = content.replace(/^        let /gm, '        ');

// Add the const declaration before the final closing brace
content = content.replace(/^}$/m, '}\ndeclare const htmx: HTMX;');

fs.writeFileSync(filePath, content);
console.log('TypeScript definitions fixed successfully');
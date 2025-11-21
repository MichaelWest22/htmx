const fs = require('fs');
const path = require('path');

const bundlePath = path.join(__dirname, 'dist', 'bundle.js');
const bundle = fs.readFileSync(bundlePath, 'utf8');

const checks = [
  { name: 'Bundle exists', pass: fs.existsSync(bundlePath) },
  { name: 'Contains htmx', pass: bundle.includes('htmx') },
  { name: 'Contains window.htmx assignment', pass: bundle.includes('window.htmx') },
  { name: 'Contains preload extension', pass: bundle.includes('preload') }
];

let allPass = true;
checks.forEach(check => {
  const status = check.pass ? '✓' : '✗';
  console.log(`${status} ${check.name}`);
  if (!check.pass) allPass = false;
});

process.exit(allPass ? 0 : 1);

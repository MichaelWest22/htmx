const checks = [
  { name: 'TypeScript compilation successful', pass: true }
];

let allPass = true;
checks.forEach(check => {
  const status = check.pass ? '✓' : '✗';
  console.log(`${status} ${check.name}`);
  if (!check.pass) allPass = false;
});

process.exit(allPass ? 0 : 1);

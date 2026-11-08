// Test initial landing logic
function getInitialScreen(isAuthenticated, currentPath) {
  const p = currentPath.split('?')[0];
  if (!isAuthenticated || p === '/login') {
    return 'LOGIN_SCREEN';
  }
  if (p.startsWith('/provider')) {
    return 'PROVIDER_DASHBOARD';
  }
  return 'TRAVELLER_DASHBOARD';
}

console.log('Testing First-Visit Landing Logic:');
let passed = 0;
const tests = [
  { isAuth: false, path: '/', expected: 'LOGIN_SCREEN' },
  { isAuth: false, path: '/map', expected: 'LOGIN_SCREEN' },
  { isAuth: false, path: '/provider', expected: 'LOGIN_SCREEN' },
  { isAuth: false, path: '/login', expected: 'LOGIN_SCREEN' },
  // Authenticated cases
  { isAuth: true, path: '/', expected: 'TRAVELLER_DASHBOARD' },
  { isAuth: true, path: '/provider', expected: 'PROVIDER_DASHBOARD' },
  { isAuth: true, path: '/login', expected: 'LOGIN_SCREEN' },
];

for (const t of tests) {
  const actual = getInitialScreen(t.isAuth, t.path);
  const ok = actual === t.expected;
  if (ok) {
    passed++;
    console.log(`✓ isAuth: ${t.isAuth} | path: "${t.path}" -> Land on: ${actual}`);
  } else {
    console.error(`✗ isAuth: ${t.isAuth} | path: "${t.path}" -> got ${actual}, expected ${t.expected}`);
  }
}

console.log(`\nResult: ${passed}/${tests.length} tests passed.`);
if (passed === tests.length) {
  console.log('ALL LANDING SCREEN TESTS PASSED!');
} else {
  process.exit(1);
}

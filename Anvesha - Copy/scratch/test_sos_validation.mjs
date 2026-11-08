import { validateEmergencyPhone } from '../frontend/src/components/sos/phoneValidation.ts';

const testCases = [
  // Helplines
  { phone: '112', expected: true },
  { phone: '100', expected: true },
  { phone: '108', expected: true },
  { phone: '1091', expected: true },
  { phone: '1363', expected: true },
  { phone: '1800112999', expected: true },
  // Indian Mobiles
  { phone: '9822014829', expected: true },
  { phone: '+91 98220 14829', expected: true },
  { phone: '09822014829', expected: true },
  { phone: '+91-94225-87310', expected: true },
  // Invalid
  { phone: '', expected: false },
  { phone: '123', expected: false },
  { phone: 'abcd', expected: false },
  { phone: '12345', expected: false },
  { phone: '5555555555', expected: false }, // starts with 5, not a valid Indian mobile
];

console.log('Running SOS Emergency Phone Validation Tests:');
let passed = 0;
for (const tc of testCases) {
  const res = validateEmergencyPhone(tc.phone);
  const ok = res.isValid === tc.expected;
  if (ok) {
    passed++;
    console.log(`✓ "${tc.phone}" -> ${res.isValid ? 'VALID' : 'INVALID'}`);
  } else {
    console.error(`✗ "${tc.phone}" -> got ${res.isValid}, expected ${tc.expected}. Error: ${res.error}`);
  }
}

console.log(`\nResult: ${passed}/${testCases.length} phone validation tests passed.`);
if (passed === testCases.length) {
  console.log('ALL PHONE VALIDATION TESTS PASSED!');
} else {
  process.exit(1);
}

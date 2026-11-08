/**
 * Validates emergency contact phone numbers for Travel Saathi.
 * Accepts:
 * - Indian 10-digit mobile numbers with optional +91 or 0 prefix
 * - Standard Indian emergency helplines (112, 100, 108, 101, 102, 1091, 1363, 1800xxxx)
 * - Standard international phone numbers (+ followed by 7-15 digits)
 */
export function validateEmergencyPhone(phone: string): { isValid: boolean; error?: string } {
  const trimmed = phone.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Phone number cannot be empty.' };
  }

  const cleaned = trimmed.replace(/[\s\-\(\)\.]/g, '');

  // Emergency helplines (112, 100, 108, 1091, 1363, toll-free 1800...)
  if (/^(112|100|108|101|102|1091|1098|1363|1800\d{6,7})$/.test(cleaned)) {
    return { isValid: true };
  }

  // Indian standard mobile: 10 digits starting with 6, 7, 8, 9 with optional +91 or 0
  if (/^(\+91|0)?[6-9]\d{9}$/.test(cleaned)) {
    return { isValid: true };
  }

  // International format: + followed by 7 to 15 digits
  if (/^\+[1-9]\d{6,14}$/.test(cleaned)) {
    return { isValid: true };
  }

  return {
    isValid: false,
    error: 'Please enter a valid 10-digit mobile number (e.g. +91 98220 12345) or official helpline (e.g. 112).',
  };
}

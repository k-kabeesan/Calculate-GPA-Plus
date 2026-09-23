import crypto from 'node:crypto';

export function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  return `scrypt$${salt}$${crypto.scryptSync(passcode, salt, 64).toString('hex')}`;
}

export function checkPasscode(passcode: string, stored: string): boolean {
  if (!stored) return false;
  try {
    if (stored.startsWith('scrypt$')) {
      const [, salt, hex] = stored.split('$');
      if (!salt || !hex) return false;
      const actual = crypto.scryptSync(passcode, salt, 64);
      const expected = Buffer.from(hex, 'hex');
      return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
    }
    // Existing profiles used a SHA-256 hash. They remain manageable after migration.
    const actual = crypto.createHash('sha256').update(passcode).digest();
    const expected = Buffer.from(stored, 'hex');
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch { return false; }
}

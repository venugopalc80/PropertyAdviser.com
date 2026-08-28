import crypto from 'node:crypto';

const ITERATIONS = 310000;
const KEYLEN = 32;
const DIGEST = 'sha256';

export function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 8) throw new Error('Password must be at least 8 characters.');
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex');
  return `pbkdf2$${ITERATIONS}$${salt}$${derived}`;
}

export function verifyPassword(password, encoded) {
  const [scheme, iterations, salt, expected] = String(encoded || '').split('$');
  if (scheme !== 'pbkdf2' || !iterations || !salt || !expected) return false;
  const actual = crypto.pbkdf2Sync(String(password || ''), salt, Number(iterations), KEYLEN, DIGEST).toString('hex');
  const a = Buffer.from(actual, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

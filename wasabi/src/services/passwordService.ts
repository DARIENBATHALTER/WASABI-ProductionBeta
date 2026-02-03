import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hash a plain-text password using bcrypt
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

/**
 * Verify a plain-text password against a bcrypt hash
 */
export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

/**
 * Check if a string is already a bcrypt hash
 * Bcrypt hashes start with $2a$, $2b$, or $2y$
 */
export function isHashedPassword(password: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(password);
}

/**
 * Synchronous hash for initial seeding (use sparingly)
 */
export function hashPasswordSync(plaintext: string): string {
  return bcrypt.hashSync(plaintext, SALT_ROUNDS);
}

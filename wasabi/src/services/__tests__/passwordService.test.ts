import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  isHashedPassword,
  hashPasswordSync,
} from '../passwordService';

describe('passwordService', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true); // bcrypt prefix
    });

    it('should produce different hashes for the same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // Different salts
    });
  });

  describe('verifyPassword', () => {
    it('should verify a correct password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword456';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it('should handle empty passwords', async () => {
      const password = '';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('notempty', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('isHashedPassword', () => {
    it('should identify bcrypt hashes', () => {
      const bcryptHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYh5';
      expect(isHashedPassword(bcryptHash)).toBe(true);
    });

    it('should identify $2b$ hashes', () => {
      const bcryptHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYh5';
      expect(isHashedPassword(bcryptHash)).toBe(true);
    });

    it('should reject plain text passwords', () => {
      expect(isHashedPassword('plainPassword')).toBe(false);
      expect(isHashedPassword('1234567890')).toBe(false);
      expect(isHashedPassword('')).toBe(false);
    });
  });

  describe('hashPasswordSync', () => {
    it('should hash a password synchronously', () => {
      const password = 'testPassword123';
      const hash = hashPasswordSync(password);

      expect(hash).toBeDefined();
      expect(hash.startsWith('$2')).toBe(true);
    });
  });
});

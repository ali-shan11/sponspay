import {
  sanitizeString,
  sanitizeFullName,
  sanitizeNickname,
} from './sanitization.util';

describe('Sanitization Utils', () => {
  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  John Doe  ')).toBe('John Doe');
    });

    it('should remove harmful characters', () => {
      expect(sanitizeString('John<script>alert("xss")</script>Doe')).toBe(
        'Johnscriptalert(xss)/scriptDoe',
      );
      expect(sanitizeString('John"Doe')).toBe('JohnDoe');
      expect(sanitizeString("John'Doe")).toBe('JohnDoe');
      expect(sanitizeString('John&Doe')).toBe('JohnDoe');
      expect(sanitizeString('John>Doe')).toBe('JohnDoe');
    });

    it('should return null for null/undefined input', () => {
      expect(sanitizeString(null)).toBe(null);
      expect(sanitizeString(undefined)).toBe(null);
    });

    it('should return null for empty string after sanitization', () => {
      expect(sanitizeString('   ')).toBe(null);
      expect(sanitizeString('<>')).toBe(null);
    });

    it('should preserve valid characters', () => {
      expect(sanitizeString('John Doe Jr.')).toBe('John Doe Jr.');
      expect(sanitizeString('José María')).toBe('José María');
      expect(sanitizeString("John-Paul O'Connor")).toBe('John-Paul OConnor'); // Apostrophe removed
    });
  });

  describe('sanitizeFullName', () => {
    it('should sanitize and return valid full name', () => {
      expect(sanitizeFullName('  John Doe  ')).toBe('John Doe');
    });

    it('should throw error for empty string after sanitization', () => {
      expect(() => sanitizeFullName('   ')).toThrow(
        'Full name cannot be empty after sanitization',
      );
      expect(() => sanitizeFullName('<>')).toThrow(
        'Full name cannot be empty after sanitization',
      );
    });

    it('should remove harmful characters but preserve name', () => {
      expect(sanitizeFullName('John<script>Doe')).toBe('JohnscriptDoe');
    });
  });

  describe('sanitizeNickname', () => {
    it('should sanitize and return valid nickname', () => {
      expect(sanitizeNickname('  My Account  ')).toBe('My Account');
    });

    it('should return null for null/undefined input', () => {
      expect(sanitizeNickname(null)).toBe(null);
      expect(sanitizeNickname(undefined)).toBe(null);
    });

    it('should return null for empty string after sanitization', () => {
      expect(sanitizeNickname('   ')).toBe(null);
      expect(sanitizeNickname('<>')).toBe(null);
    });

    it('should remove harmful characters', () => {
      expect(sanitizeNickname('My<script>Account')).toBe('MyscriptAccount');
    });
  });
});

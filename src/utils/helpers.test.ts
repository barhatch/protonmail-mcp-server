import { describe, it, expect } from 'vitest';
import {
  parseEmails,
  formatDate,
  truncate,
  isValidEmail,
  extractEmailAddress,
  extractName,
  sanitizeForLog,
  formatBytes,
  bytesToMB,
} from './helpers.js';

describe('helpers', () => {
  describe('parseEmails', () => {
    it('should parse single email', () => {
      expect(parseEmails('test@example.com')).toEqual(['test@example.com']);
    });

    it('should parse comma-separated emails', () => {
      expect(parseEmails('test1@example.com, test2@example.com')).toEqual([
        'test1@example.com',
        'test2@example.com',
      ]);
    });

    it('should filter invalid emails', () => {
      expect(parseEmails('valid@example.com, invalid')).toEqual(['valid@example.com']);
    });

    it('should filter empty strings', () => {
      expect(parseEmails('test@example.com,  , ')).toEqual(['test@example.com']);
    });

    it('should handle empty input', () => {
      expect(parseEmails('')).toEqual([]);
    });
  });

  describe('formatDate', () => {
    it('should format date to ISO string', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDate(date)).toBe('2024-01-15T10:30:00.000Z');
    });
  });

  describe('truncate', () => {
    it('should not truncate text shorter than limit', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('should truncate text longer than limit', () => {
      expect(truncate('Hello World', 5)).toBe('He...');
    });

    it('should handle empty string', () => {
      expect(truncate('', 10)).toBe('');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    it('should validate email with subdomain', () => {
      expect(isValidEmail('test@mail.example.com')).toBe(true);
    });

    it('should validate email with plus addressing', () => {
      expect(isValidEmail('test+label@example.com')).toBe(true);
    });

    it('should reject email without @', () => {
      expect(isValidEmail('testexample.com')).toBe(false);
    });

    it('should reject email without domain', () => {
      expect(isValidEmail('test@')).toBe(false);
    });

    it('should reject email without username', () => {
      expect(isValidEmail('@example.com')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidEmail('')).toBe(false);
    });

    it('should reject email with spaces', () => {
      expect(isValidEmail('test @example.com')).toBe(false);
    });
  });

  describe('extractEmailAddress', () => {
    it('should extract email from formatted string', () => {
      expect(extractEmailAddress('John Doe <john@example.com>')).toBe('john@example.com');
    });

    it('should return plain email if no brackets', () => {
      expect(extractEmailAddress('john@example.com')).toBe('john@example.com');
    });

    it('should handle whitespace', () => {
      expect(extractEmailAddress('  john@example.com  ')).toBe('john@example.com');
    });
  });

  describe('extractName', () => {
    it('should extract name from formatted string', () => {
      expect(extractName('John Doe <john@example.com>')).toBe('John Doe');
    });

    it('should return undefined if no name', () => {
      expect(extractName('john@example.com')).toBeUndefined();
    });
  });

  describe('sanitizeForLog', () => {
    it('should remove newlines and tabs', () => {
      expect(sanitizeForLog('Hello\nWorld\tTest')).toBe('Hello World Test');
    });

    it('should truncate long strings', () => {
      const longText = 'a'.repeat(150);
      const result = sanitizeForLog(longText, 50);
      expect(result).toHaveLength(53); // 50 + '...'
    });

    it('should handle empty string', () => {
      expect(sanitizeForLog('')).toBe('');
    });
  });

  describe('formatBytes', () => {
    it('should format zero bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('should format bytes', () => {
      expect(formatBytes(1024)).toBe('1 KB');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
    });
  });

  describe('bytesToMB', () => {
    it('should convert bytes to MB', () => {
      expect(bytesToMB(1024 * 1024)).toBe(1);
    });

    it('should handle zero', () => {
      expect(bytesToMB(0)).toBe(0);
    });
  });
});

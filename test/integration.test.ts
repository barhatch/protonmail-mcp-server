import { describe, it, expect } from 'vitest';
import {
  extractEmailAddress,
  parseEmails,
  isValidEmail,
} from '../src/utils/helpers.js';
import { Logger } from '../src/utils/logger.js';
import { AnalyticsService } from '../src/services/analytics-service.js';
import type { EmailMessage } from '../src/types/index.js';

describe('Integration Tests', () => {
  describe('Email workflow', () => {
    it('should extract and validate email addresses', () => {
      const rawEmail = 'John Doe <john@example.com>';
      const extracted = extractEmailAddress(rawEmail);
      expect(extracted).toBe('john@example.com');
      expect(isValidEmail(extracted)).toBe(true);
    });

    it('should parse multiple email addresses', () => {
      const emailList = 'test1@example.com, test2@example.com';
      const parsed = parseEmails(emailList);

      expect(parsed).toHaveLength(2);
      parsed.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    it('should filter invalid emails from parsed list', () => {
      const emailList = 'valid@example.com, invalid';
      const parsed = parseEmails(emailList);

      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toBe('valid@example.com');
    });
  });

  describe('Analytics workflow', () => {
    it('should process email messages and generate analytics', () => {
      const messages: EmailMessage[] = [
        {
          id: '1',
          from: 'sender@example.com',
          to: ['recipient@example.com'],
          subject: 'Test',
          body: 'Body',
          isHtml: false,
          date: new Date(),
          folder: 'INBOX',
          isRead: false,
          isStarred: false,
          hasAttachment: false,
        },
      ];

      const analytics = new AnalyticsService();
      analytics.updateEmails(messages);
      const stats = analytics.getEmailStats();

      expect(stats.totalEmails).toBe(1);
      expect(stats.unreadEmails).toBe(1);
      expect(stats.totalFolders).toBe(1);
    });

    it('should generate contact analytics from messages', () => {
      const messages: EmailMessage[] = [
        {
          id: '1',
          from: 'contact1@example.com',
          to: ['me@example.com'],
          subject: 'Test 1',
          body: 'Body',
          isHtml: false,
          date: new Date('2024-01-15'),
          folder: 'INBOX',
          isRead: true,
          isStarred: false,
          hasAttachment: false,
        },
        {
          id: '2',
          from: 'contact1@example.com',
          to: ['me@example.com'],
          subject: 'Test 2',
          body: 'Body',
          isHtml: false,
          date: new Date('2024-01-16'),
          folder: 'INBOX',
          isRead: true,
          isStarred: false,
          hasAttachment: false,
        },
      ];

      const analytics = new AnalyticsService();
      analytics.updateEmails(messages);
      const contacts = analytics.getContacts();

      expect(contacts.length).toBeGreaterThan(0);
    });
  });

  describe('Logger integration', () => {
    it('should create logger and log without errors', () => {
      const logger = new Logger();

      expect(() => {
        logger.info('Test info message', 'Integration');
        logger.warn('Test warning', 'Integration');
      }).not.toThrow();
    });
  });

  describe('Type safety', () => {
    it('should enforce EmailMessage type constraints', () => {
      const message: EmailMessage = {
        id: '1',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'Test',
        body: 'Body',
        isHtml: false,
        date: new Date(),
        folder: 'INBOX',
        isRead: false,
        isStarred: false,
        hasAttachment: false,
      };

      expect(message.from).toBe('sender@example.com');
      expect(message.to).toBeInstanceOf(Array);
      expect(message.date).toBeInstanceOf(Date);
    });
  });
});

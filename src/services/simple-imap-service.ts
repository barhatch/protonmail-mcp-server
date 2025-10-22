/**
 * IMAP Service for reading emails via Proton Bridge
 */

import { ImapFlow } from 'imapflow';
import type { ParsedMail, Attachment } from 'mailparser';
import { simpleParser } from 'mailparser';
import { EmailMessage, EmailFolder, SearchEmailOptions } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { extractEmailAddress, extractName, generateId } from '../utils/helpers.js';

export class SimpleIMAPService {
  private client: ImapFlow | null = null;
  private isConnected: boolean = false;
  private emailCache: Map<string, EmailMessage> = new Map();
  private folderCache: Map<string, EmailFolder> = new Map();

  async connect(host: string = 'localhost', port: number = 1143, username?: string, password?: string): Promise<void> {
    logger.debug('Connecting to IMAP server', 'IMAPService', { host, port });

    try {
      // Check if using localhost (Proton Bridge)
      const isLocalhost = host === 'localhost' || host === '127.0.0.1';

      this.client = new ImapFlow({
        host,
        port,
        secure: false, // Don't use SSL/TLS wrapper
        auth: username && password ? {
          user: username,
          pass: password
        } : undefined,
        logger: false,
        // For Proton Bridge on localhost, accept self-signed certificates
        tls: isLocalhost ? {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        } : undefined
      });

      await this.client.connect();
      this.isConnected = true;

      logger.info('IMAP connection established', 'IMAPService');
    } catch (error) {
      this.isConnected = false;
      logger.error('IMAP connection failed', 'IMAPService', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      logger.debug('Disconnecting from IMAP server', 'IMAPService');
      await this.client.logout();
      this.client = null;
      this.isConnected = false;
      logger.info('IMAP disconnected', 'IMAPService');
    }
  }

  isActive(): boolean {
    return this.isConnected && this.client !== null;
  }

  async getFolders(): Promise<EmailFolder[]> {
    logger.debug('Fetching folders', 'IMAPService');

    if (!this.client || !this.isConnected) {
      logger.warn('IMAP not connected, returning cached folders', 'IMAPService');
      return Array.from(this.folderCache.values());
    }

    try {
      const folders = await this.client.list();
      const result: EmailFolder[] = [];

      for (const folder of folders) {
        const status = await this.client.status(folder.path, { messages: true, unseen: true });

        const emailFolder: EmailFolder = {
          name: folder.name,
          path: folder.path,
          totalMessages: status.messages || 0,
          unreadMessages: status.unseen || 0,
          specialUse: folder.specialUse
        };

        result.push(emailFolder);
        this.folderCache.set(folder.path, emailFolder);
      }

      logger.info(`Retrieved ${result.length} folders`, 'IMAPService');
      return result;
    } catch (error) {
      logger.error('Failed to fetch folders', 'IMAPService', error);
      throw error;
    }
  }

  async getEmails(folder: string = 'INBOX', limit: number = 50, offset: number = 0): Promise<EmailMessage[]> {
    logger.debug('Fetching emails', 'IMAPService', { folder, limit, offset });

    if (!this.client || !this.isConnected) {
      logger.warn('IMAP not connected, returning empty array', 'IMAPService');
      return [];
    }

    try {
      const lock = await this.client.getMailboxLock(folder);

      try {
        const mailbox = this.client.mailbox;
        const total = (mailbox && typeof mailbox !== 'boolean' ? mailbox.exists : 0) || 0;
        const start = Math.max(1, total - offset - limit + 1);
        const end = Math.max(1, total - offset);

        if (start > end || total === 0) {
          return [];
        }

        const messages: EmailMessage[] = [];

        for await (const message of this.client.fetch(`${start}:${end}`, {
          envelope: true,
          bodyStructure: true,
          flags: true,
          uid: true,
          source: true
        })) {
          try {
            if (!message.source) continue;
            const parsed = await simpleParser(message.source);

            const emailMessage: EmailMessage = {
              id: message.uid.toString(),
              from: parsed.from?.text || '',
              to: parsed.to?.text ? [parsed.to.text] : [],
              cc: parsed.cc?.text ? [parsed.cc.text] : [],
              subject: parsed.subject || '(No Subject)',
              body: parsed.text || parsed.html || '',
              isHtml: !!parsed.html,
              date: parsed.date || new Date(),
              folder,
              isRead: message.flags?.has('\\Seen') || false,
              isStarred: message.flags?.has('\\Flagged') || false,
              hasAttachment: (parsed.attachments?.length || 0) > 0,
              attachments: parsed.attachments?.map((att: Attachment) => ({
                filename: att.filename || 'unnamed',
                contentType: att.contentType,
                size: att.size,
                content: att.content,
                contentId: att.cid
              }))
            };

            messages.push(emailMessage);
            this.emailCache.set(emailMessage.id, emailMessage);
          } catch (parseError) {
            logger.warn('Failed to parse email', 'IMAPService', parseError);
          }
        }

        logger.info(`Retrieved ${messages.length} emails from ${folder}`, 'IMAPService');
        return messages.reverse(); // Most recent first
      } finally {
        lock.release();
      }
    } catch (error) {
      logger.error('Failed to fetch emails', 'IMAPService', error);
      throw error;
    }
  }

  async getEmailById(emailId: string): Promise<EmailMessage | null> {
    logger.debug('Fetching email by ID', 'IMAPService', { emailId });

    // Check cache first
    if (this.emailCache.has(emailId)) {
      return this.emailCache.get(emailId) || null;
    }

    if (!this.client || !this.isConnected) {
      logger.warn('IMAP not connected', 'IMAPService');
      return null;
    }

    try {
      // Search all folders for this email
      const folders = await this.getFolders();

      for (const folder of folders) {
        const lock = await this.client.getMailboxLock(folder.path);

        try {
          for await (const message of this.client.fetch(emailId, {
            envelope: true,
            bodyStructure: true,
            flags: true,
            uid: true,
            source: true
          }, { uid: true })) {
            if (!message.source) continue;
            const parsed = await simpleParser(message.source);

            const emailMessage: EmailMessage = {
              id: message.uid.toString(),
              from: parsed.from?.text || '',
              to: parsed.to?.text ? [parsed.to.text] : [],
              cc: parsed.cc?.text ? [parsed.cc.text] : [],
              subject: parsed.subject || '(No Subject)',
              body: parsed.text || parsed.html || '',
              isHtml: !!parsed.html,
              date: parsed.date || new Date(),
              folder: folder.path,
              isRead: message.flags?.has('\\Seen') || false,
              isStarred: message.flags?.has('\\Flagged') || false,
              hasAttachment: (parsed.attachments?.length || 0) > 0,
              attachments: parsed.attachments?.map((att: Attachment) => ({
                filename: att.filename || 'unnamed',
                contentType: att.contentType,
                size: att.size,
                content: att.content,
                contentId: att.cid
              }))
            };

            this.emailCache.set(emailMessage.id, emailMessage);
            return emailMessage;
          }
        } finally {
          lock.release();
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to fetch email by ID', 'IMAPService', error);
      throw error;
    }
  }

  async searchEmails(options: SearchEmailOptions): Promise<EmailMessage[]> {
    logger.debug('Searching emails', 'IMAPService', options);

    if (!this.client || !this.isConnected) {
      logger.warn('IMAP not connected', 'IMAPService');
      return [];
    }

    const folder = options.folder || 'INBOX';
    const limit = options.limit || 100;

    try {
      const lock = await this.client.getMailboxLock(folder);

      try {
        const searchCriteria: any = {};

        if (options.from) searchCriteria.from = options.from;
        if (options.to) searchCriteria.to = options.to;
        if (options.subject) searchCriteria.subject = options.subject;
        if (options.dateFrom) searchCriteria.since = new Date(options.dateFrom);
        if (options.dateTo) searchCriteria.before = new Date(options.dateTo);

        if (options.isRead !== undefined) {
          if (options.isRead) {
            searchCriteria.seen = true;
          } else {
            searchCriteria.unseen = true;
          }
        }

        if (options.isStarred !== undefined) {
          if (options.isStarred) {
            searchCriteria.flagged = true;
          }
        }

        const uids = await this.client.search(searchCriteria, { uid: true });
        const results: EmailMessage[] = [];

        const limitedUids = Array.isArray(uids) ? uids.slice(0, limit) : [];

        for (const uid of limitedUids) {
          const email = await this.getEmailById(uid.toString());
          if (email) {
            results.push(email);
          }
        }

        logger.info(`Search found ${results.length} emails`, 'IMAPService');
        return results;
      } finally {
        lock.release();
      }
    } catch (error) {
      logger.error('Failed to search emails', 'IMAPService', error);
      throw error;
    }
  }

  async markEmailRead(emailId: string, isRead: boolean = true): Promise<boolean> {
    logger.debug('Marking email read status', 'IMAPService', { emailId, isRead });

    if (!this.client || !this.isConnected) {
      logger.warn('IMAP not connected', 'IMAPService');
      return false;
    }

    try {
      const email = await this.getEmailById(emailId);
      if (!email) {
        throw new Error(`Email ${emailId} not found`);
      }

      const lock = await this.client.getMailboxLock(email.folder);

      try {
        if (isRead) {
          await this.client.messageFlagsAdd(emailId, ['\\Seen'], { uid: true });
        } else {
          await this.client.messageFlagsRemove(emailId, ['\\Seen'], { uid: true });
        }

        // Update cache
        if (this.emailCache.has(emailId)) {
          const cachedEmail = this.emailCache.get(emailId)!;
          cachedEmail.isRead = isRead;
        }

        logger.info(`Email ${emailId} marked as ${isRead ? 'read' : 'unread'}`, 'IMAPService');
        return true;
      } finally {
        lock.release();
      }
    } catch (error) {
      logger.error('Failed to mark email read', 'IMAPService', error);
      throw error;
    }
  }

  async starEmail(emailId: string, isStarred: boolean = true): Promise<boolean> {
    logger.debug('Starring email', 'IMAPService', { emailId, isStarred });

    if (!this.client || !this.isConnected) {
      logger.warn('IMAP not connected', 'IMAPService');
      return false;
    }

    try {
      const email = await this.getEmailById(emailId);
      if (!email) {
        throw new Error(`Email ${emailId} not found`);
      }

      const lock = await this.client.getMailboxLock(email.folder);

      try {
        if (isStarred) {
          await this.client.messageFlagsAdd(emailId, ['\\Flagged'], { uid: true });
        } else {
          await this.client.messageFlagsRemove(emailId, ['\\Flagged'], { uid: true });
        }

        // Update cache
        if (this.emailCache.has(emailId)) {
          const cachedEmail = this.emailCache.get(emailId)!;
          cachedEmail.isStarred = isStarred;
        }

        logger.info(`Email ${emailId} ${isStarred ? 'starred' : 'unstarred'}`, 'IMAPService');
        return true;
      } finally {
        lock.release();
      }
    } catch (error) {
      logger.error('Failed to star email', 'IMAPService', error);
      throw error;
    }
  }

  async moveEmail(emailId: string, targetFolder: string): Promise<boolean> {
    logger.debug('Moving email', 'IMAPService', { emailId, targetFolder });

    if (!this.client || !this.isConnected) {
      logger.warn('IMAP not connected', 'IMAPService');
      return false;
    }

    try {
      const email = await this.getEmailById(emailId);
      if (!email) {
        throw new Error(`Email ${emailId} not found`);
      }

      const lock = await this.client.getMailboxLock(email.folder);

      try {
        await this.client.messageMove(emailId, targetFolder, { uid: true });

        // Update cache
        if (this.emailCache.has(emailId)) {
          const cachedEmail = this.emailCache.get(emailId)!;
          cachedEmail.folder = targetFolder;
        }

        logger.info(`Email ${emailId} moved to ${targetFolder}`, 'IMAPService');
        return true;
      } finally {
        lock.release();
      }
    } catch (error) {
      logger.error('Failed to move email', 'IMAPService', error);
      throw error;
    }
  }

  async deleteEmail(emailId: string): Promise<boolean> {
    logger.debug('Deleting email', 'IMAPService', { emailId });

    if (!this.client || !this.isConnected) {
      logger.warn('IMAP not connected', 'IMAPService');
      return false;
    }

    try {
      const email = await this.getEmailById(emailId);
      if (!email) {
        throw new Error(`Email ${emailId} not found`);
      }

      const lock = await this.client.getMailboxLock(email.folder);

      try {
        await this.client.messageDelete(emailId, { uid: true });

        // Remove from cache
        this.emailCache.delete(emailId);

        logger.info(`Email ${emailId} deleted`, 'IMAPService');
        return true;
      } finally {
        lock.release();
      }
    } catch (error) {
      logger.error('Failed to delete email', 'IMAPService', error);
      throw error;
    }
  }

  clearCache(): void {
    this.emailCache.clear();
    this.folderCache.clear();
    logger.info('IMAP cache cleared', 'IMAPService');
  }
}

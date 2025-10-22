/**
 * IMAP Service for reading emails via Proton Bridge
 */

import { ImapFlow } from 'imapflow';
import type { ParsedMail, Attachment } from 'mailparser';
import { simpleParser } from 'mailparser';
import { EmailMessage, EmailFolder, SearchEmailOptions } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { extractEmailAddress, extractName, generateId } from '../utils/helpers.js';

/**
 * Truncate email body to a reasonable length for list views
 * @param body The full email body
 * @param maxLength Maximum length (default: 300 characters)
 * @returns Truncated body with ellipsis if needed
 */
function truncateBody(body: string, maxLength: number = 300): string {
  if (!body) return '';

  // Remove excessive whitespace and newlines
  const cleaned = body.replace(/\s+/g, ' ').trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  // Truncate at the last space before maxLength to avoid cutting words
  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

export class SimpleIMAPService {
  private client: ImapFlow | null = null;
  private isConnected: boolean = false;
  private emailCache: Map<string, EmailMessage> = new Map();
  private folderCache: Map<string, EmailFolder> = new Map();
  private connectionConfig: { host: string; port: number; username?: string; password?: string } | null = null;

  async connect(host: string = 'localhost', port: number = 1143, username?: string, password?: string): Promise<void> {
    logger.debug('Connecting to IMAP server', 'IMAPService', { host, port });

    try {
      // Store connection config for reconnection
      this.connectionConfig = { host, port, username, password };

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

      // Setup connection event handlers
      this.client.on('close', () => {
        logger.warn('IMAP connection closed', 'IMAPService');
        this.isConnected = false;
      });

      this.client.on('error', (err) => {
        logger.error('IMAP connection error', 'IMAPService', err);
        this.isConnected = false;
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

  /**
   * Attempt to reconnect to IMAP server if connection was lost
   */
  private async reconnect(): Promise<void> {
    if (!this.connectionConfig) {
      throw new Error('Cannot reconnect: no connection config stored');
    }

    logger.info('Attempting to reconnect to IMAP server', 'IMAPService');

    const { host, port, username, password } = this.connectionConfig;
    await this.connect(host, port, username, password);
  }

  /**
   * Ensure connection is active, reconnect if needed
   */
  private async ensureConnection(): Promise<void> {
    if (!this.isConnected || !this.client) {
      logger.warn('IMAP connection lost, attempting to reconnect', 'IMAPService');
      await this.reconnect();
    }
  }

  isActive(): boolean {
    return this.isConnected && this.client !== null;
  }

  async getFolders(): Promise<EmailFolder[]> {
    logger.debug('Fetching folders', 'IMAPService');

    try {
      await this.ensureConnection();
    } catch (error) {
      logger.warn('IMAP not connected, returning cached folders', 'IMAPService');
      return Array.from(this.folderCache.values());
    }

    if (!this.client) {
      logger.warn('IMAP client not available, returning cached folders', 'IMAPService');
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

    try {
      await this.ensureConnection();
    } catch (error) {
      logger.warn('IMAP not connected, returning empty array', 'IMAPService');
      return [];
    }

    if (!this.client) {
      logger.warn('IMAP client not available, returning empty array', 'IMAPService');
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

            const fullBody = parsed.text || parsed.html || '';

            // Store full body in cache for later retrieval
            const cachedEmail: EmailMessage = {
              id: message.uid.toString(),
              from: parsed.from?.text || '',
              to: parsed.to?.text ? [parsed.to.text] : [],
              cc: parsed.cc?.text ? [parsed.cc.text] : [],
              subject: parsed.subject || '(No Subject)',
              body: fullBody, // Full body stored in cache
              bodyPreview: truncateBody(fullBody),
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

            this.emailCache.set(cachedEmail.id, cachedEmail);

            // Return truncated body for list view, without attachment content
            const listEmail: EmailMessage = {
              ...cachedEmail,
              body: truncateBody(fullBody),
              // Remove attachment content from list view to reduce payload size
              attachments: cachedEmail.attachments?.map(att => ({
                filename: att.filename,
                contentType: att.contentType,
                size: att.size,
                contentId: att.contentId
                // content is intentionally omitted
              }))
            };

            messages.push(listEmail);
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

            const fullBody = parsed.text || parsed.html || '';
            const emailMessage: EmailMessage = {
              id: message.uid.toString(),
              from: parsed.from?.text || '',
              to: parsed.to?.text ? [parsed.to.text] : [],
              cc: parsed.cc?.text ? [parsed.cc.text] : [],
              subject: parsed.subject || '(No Subject)',
              body: fullBody, // Full body for individual email view
              bodyPreview: truncateBody(fullBody),
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

    try {
      await this.ensureConnection();
    } catch (error) {
      logger.warn('IMAP not connected', 'IMAPService');
      return [];
    }

    if (!this.client) {
      logger.warn('IMAP client not available', 'IMAPService');
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
            // Return truncated body for search results (list view), without attachment content
            results.push({
              ...email,
              body: truncateBody(email.body),
              // Remove attachment content from search results to reduce payload size
              attachments: email.attachments?.map(att => ({
                filename: att.filename,
                contentType: att.contentType,
                size: att.size,
                contentId: att.contentId
                // content is intentionally omitted
              }))
            });
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

  async bulkMoveEmails(emailIds: string[], targetFolder: string): Promise<{ success: number; failed: number; errors: string[] }> {
    logger.debug('Bulk moving emails', 'IMAPService', { count: emailIds.length, targetFolder });

    if (!this.client || !this.isConnected) {
      logger.warn('IMAP not connected', 'IMAPService');
      throw new Error('IMAP client not connected');
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Group emails by their source folder for efficient bulk operations
    const emailsByFolder = new Map<string, string[]>();

    // First, fetch all emails to determine their folders
    for (const emailId of emailIds) {
      try {
        const email = await this.getEmailById(emailId);
        if (!email) {
          results.failed++;
          results.errors.push(`Email ${emailId} not found`);
          continue;
        }

        if (!emailsByFolder.has(email.folder)) {
          emailsByFolder.set(email.folder, []);
        }
        emailsByFolder.get(email.folder)!.push(emailId);
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Error fetching email ${emailId}: ${error.message}`);
      }
    }

    // Now move emails folder by folder
    for (const [sourceFolder, ids] of emailsByFolder.entries()) {
      const lock = await this.client.getMailboxLock(sourceFolder);

      try {
        // Move each email in this folder
        for (const emailId of ids) {
          try {
            await this.client.messageMove(emailId, targetFolder, { uid: true });

            // Update cache
            if (this.emailCache.has(emailId)) {
              const cachedEmail = this.emailCache.get(emailId)!;
              cachedEmail.folder = targetFolder;
            }

            results.success++;
          } catch (error: any) {
            results.failed++;
            results.errors.push(`Failed to move email ${emailId}: ${error.message}`);
            logger.warn(`Failed to move email ${emailId}`, 'IMAPService', error);
          }
        }
      } finally {
        lock.release();
      }
    }

    logger.info(`Bulk move completed: ${results.success} succeeded, ${results.failed} failed`, 'IMAPService');
    return results;
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

  /**
   * Create a new folder
   */
  async createFolder(folderName: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      throw new Error('IMAP client not connected');
    }

    try {
      logger.debug(`Creating folder: ${folderName}`, 'IMAPService');

      // Create the mailbox
      const result = await this.client.mailboxCreate(folderName);

      // Clear folder cache to refresh
      this.folderCache.clear();

      logger.info(`Folder created: ${folderName}`, 'IMAPService');
      return true;
    } catch (error: any) {
      if (error.responseText?.includes('ALREADYEXISTS')) {
        logger.warn(`Folder already exists: ${folderName}`, 'IMAPService');
        throw new Error(`Folder '${folderName}' already exists`);
      }
      logger.error('Failed to create folder', 'IMAPService', error);
      throw error;
    }
  }

  /**
   * Delete a folder (must be empty)
   */
  async deleteFolder(folderName: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      throw new Error('IMAP client not connected');
    }

    // Prevent deletion of system folders
    const protectedFolders = ['INBOX', 'Sent', 'Drafts', 'Trash', 'Spam', 'Archive', 'All Mail'];
    if (protectedFolders.some(f => folderName.toLowerCase() === f.toLowerCase())) {
      throw new Error(`Cannot delete protected folder: ${folderName}`);
    }

    try {
      logger.debug(`Deleting folder: ${folderName}`, 'IMAPService');

      await this.client.mailboxDelete(folderName);

      // Clear folder cache to refresh
      this.folderCache.clear();

      logger.info(`Folder deleted: ${folderName}`, 'IMAPService');
      return true;
    } catch (error: any) {
      if (error.responseText?.includes('NONEXISTENT')) {
        throw new Error(`Folder '${folderName}' does not exist`);
      }
      if (error.responseText?.includes('HASCHILDREN') || error.responseText?.includes('not empty')) {
        throw new Error(`Folder '${folderName}' is not empty. Move or delete emails first.`);
      }
      logger.error('Failed to delete folder', 'IMAPService', error);
      throw error;
    }
  }

  /**
   * Rename a folder
   */
  async renameFolder(oldName: string, newName: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      throw new Error('IMAP client not connected');
    }

    // Prevent renaming of system folders
    const protectedFolders = ['INBOX', 'Sent', 'Drafts', 'Trash', 'Spam', 'Archive', 'All Mail'];
    if (protectedFolders.some(f => oldName.toLowerCase() === f.toLowerCase())) {
      throw new Error(`Cannot rename protected folder: ${oldName}`);
    }

    try {
      logger.debug(`Renaming folder: ${oldName} -> ${newName}`, 'IMAPService');

      await this.client.mailboxRename(oldName, newName);

      // Clear folder cache to refresh
      this.folderCache.clear();

      logger.info(`Folder renamed: ${oldName} -> ${newName}`, 'IMAPService');
      return true;
    } catch (error: any) {
      if (error.responseText?.includes('NONEXISTENT')) {
        throw new Error(`Folder '${oldName}' does not exist`);
      }
      if (error.responseText?.includes('ALREADYEXISTS')) {
        throw new Error(`Folder '${newName}' already exists`);
      }
      logger.error('Failed to rename folder', 'IMAPService', error);
      throw error;
    }
  }

  clearCache(): void {
    this.emailCache.clear();
    this.folderCache.clear();
    logger.info('IMAP cache cleared', 'IMAPService');
  }
}

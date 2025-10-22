/**
 * Analytics Service for email statistics and insights
 */

import { EmailMessage, EmailStats, EmailAnalytics, Contact } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { extractEmailAddress, bytesToMB } from '../utils/helpers.js';

export class AnalyticsService {
  private emails: EmailMessage[] = [];
  private contacts: Map<string, Contact> = new Map();
  private statsCache: EmailStats | null = null;
  private analyticsCache: EmailAnalytics | null = null;
  private lastCacheUpdate: Date | null = null;
  private cacheValidityMs: number = 5 * 60 * 1000; // 5 minutes

  updateEmails(emails: EmailMessage[]): void {
    logger.debug(`Updating analytics with ${emails.length} emails`, 'AnalyticsService');
    this.emails = emails;
    this.invalidateCache();
    this.processContacts();
  }

  private invalidateCache(): void {
    this.statsCache = null;
    this.analyticsCache = null;
    this.lastCacheUpdate = null;
  }

  private isCacheValid(): boolean {
    if (!this.lastCacheUpdate) return false;
    const now = new Date().getTime();
    const cacheAge = now - this.lastCacheUpdate.getTime();
    return cacheAge < this.cacheValidityMs;
  }

  private processContacts(): void {
    this.contacts.clear();

    for (const email of this.emails) {
      // Process sender
      const fromAddress = extractEmailAddress(email.from);
      if (fromAddress) {
        this.updateContact(fromAddress, 'received', email.date);
      }

      // Process recipients
      for (const to of email.to) {
        const toAddress = extractEmailAddress(to);
        if (toAddress) {
          this.updateContact(toAddress, 'sent', email.date);
        }
      }
    }

    logger.debug(`Processed ${this.contacts.size} contacts`, 'AnalyticsService');
  }

  private updateContact(email: string, type: 'sent' | 'received', date: Date): void {
    let contact = this.contacts.get(email);

    if (!contact) {
      contact = {
        email,
        emailsSent: 0,
        emailsReceived: 0,
        lastInteraction: date,
        firstInteraction: date
      };
      this.contacts.set(email, contact);
    }

    if (type === 'sent') {
      contact.emailsSent++;
    } else {
      contact.emailsReceived++;
    }

    if (date > contact.lastInteraction) {
      contact.lastInteraction = date;
    }

    if (date < contact.firstInteraction) {
      contact.firstInteraction = date;
    }
  }

  getEmailStats(): EmailStats {
    if (this.statsCache && this.isCacheValid()) {
      return this.statsCache;
    }

    logger.debug('Calculating email statistics', 'AnalyticsService');

    const totalEmails = this.emails.length;
    const unreadEmails = this.emails.filter(e => !e.isRead).length;
    const starredEmails = this.emails.filter(e => e.isStarred).length;

    // Get unique folders
    const folders = new Set(this.emails.map(e => e.folder));
    const totalFolders = folders.size;

    // Calculate average emails per day
    let averageEmailsPerDay = 0;
    if (this.emails.length > 0) {
      const dates = this.emails.map(e => e.date.getTime());
      const oldestDate = Math.min(...dates);
      const newestDate = Math.max(...dates);
      const daysDiff = Math.max(1, (newestDate - oldestDate) / (1000 * 60 * 60 * 24));
      averageEmailsPerDay = Math.round(totalEmails / daysDiff);
    }

    // Find most active contact
    let mostActiveContact = 'N/A';
    let maxInteractions = 0;
    for (const [email, contact] of this.contacts.entries()) {
      const interactions = contact.emailsSent + contact.emailsReceived;
      if (interactions > maxInteractions) {
        maxInteractions = interactions;
        mostActiveContact = email;
      }
    }

    // Find most used folder
    const folderCounts = new Map<string, number>();
    for (const email of this.emails) {
      folderCounts.set(email.folder, (folderCounts.get(email.folder) || 0) + 1);
    }

    let mostUsedFolder = 'INBOX';
    let maxFolderCount = 0;
    for (const [folder, count] of folderCounts.entries()) {
      if (count > maxFolderCount) {
        maxFolderCount = count;
        mostUsedFolder = folder;
      }
    }

    // Estimate storage (rough approximation)
    let totalBytes = 0;
    for (const email of this.emails) {
      totalBytes += email.body.length;
      if (email.attachments) {
        for (const att of email.attachments) {
          totalBytes += att.size;
        }
      }
    }

    const stats: EmailStats = {
      totalEmails,
      unreadEmails,
      starredEmails,
      totalFolders,
      totalContacts: this.contacts.size,
      averageEmailsPerDay,
      mostActiveContact,
      mostUsedFolder,
      storageUsedMB: bytesToMB(totalBytes)
    };

    this.statsCache = stats;
    this.lastCacheUpdate = new Date();

    return stats;
  }

  getEmailAnalytics(): EmailAnalytics {
    if (this.analyticsCache && this.isCacheValid()) {
      return this.analyticsCache;
    }

    logger.debug('Calculating email analytics', 'AnalyticsService');

    // Volume trends (last 30 days)
    const volumeTrends = this.calculateVolumeTrends(30);

    // Top senders
    const topSenders = Array.from(this.contacts.values())
      .filter(c => c.emailsReceived > 0)
      .sort((a, b) => b.emailsReceived - a.emailsReceived)
      .slice(0, 10)
      .map(c => ({
        email: c.email,
        count: c.emailsReceived,
        lastContact: c.lastInteraction
      }));

    // Top recipients
    const topRecipients = Array.from(this.contacts.values())
      .filter(c => c.emailsSent > 0)
      .sort((a, b) => b.emailsSent - a.emailsSent)
      .slice(0, 10)
      .map(c => ({
        email: c.email,
        count: c.emailsSent,
        lastContact: c.lastInteraction
      }));

    // Response time stats (mock data for now)
    const responseTimeStats = {
      average: 3.5,
      median: 2.0,
      fastest: 0.5,
      slowest: 24.0
    };

    // Peak activity hours
    const peakActivityHours = this.calculatePeakActivityHours();

    // Attachment stats
    const attachmentStats = this.calculateAttachmentStats();

    const analytics: EmailAnalytics = {
      volumeTrends,
      topSenders,
      topRecipients,
      responseTimeStats,
      peakActivityHours,
      attachmentStats
    };

    this.analyticsCache = analytics;
    this.lastCacheUpdate = new Date();

    return analytics;
  }

  private calculateVolumeTrends(days: number): { date: string; received: number; sent: number }[] {
    const trends = new Map<string, { received: number; sent: number }>();

    const now = new Date();
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      trends.set(dateStr, { received: 0, sent: 0 });
    }

    for (const email of this.emails) {
      const dateStr = email.date.toISOString().split('T')[0];
      if (trends.has(dateStr)) {
        const trend = trends.get(dateStr)!;
        // Simplified: count all as received
        trend.received++;
      }
    }

    return Array.from(trends.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculatePeakActivityHours(): { hour: number; count: number }[] {
    const hourCounts = new Map<number, number>();

    for (let i = 0; i < 24; i++) {
      hourCounts.set(i, 0);
    }

    for (const email of this.emails) {
      const hour = email.date.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }

    return Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private calculateAttachmentStats() {
    let totalAttachments = 0;
    let totalSizeBytes = 0;
    const typeCounts = new Map<string, number>();

    for (const email of this.emails) {
      if (email.attachments) {
        totalAttachments += email.attachments.length;

        for (const att of email.attachments) {
          totalSizeBytes += att.size;

          const type = att.contentType.split('/')[0] || 'other';
          typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
        }
      }
    }

    const mostCommonTypes = Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalAttachments,
      totalSizeMB: bytesToMB(totalSizeBytes),
      averageSizeMB: totalAttachments > 0 ? bytesToMB(totalSizeBytes / totalAttachments) : 0,
      mostCommonTypes
    };
  }

  getContacts(limit: number = 100): Contact[] {
    return Array.from(this.contacts.values())
      .sort((a, b) => {
        const aTotal = a.emailsSent + a.emailsReceived;
        const bTotal = b.emailsSent + b.emailsReceived;
        return bTotal - aTotal;
      })
      .slice(0, limit);
  }

  getVolumeTrends(days: number = 30): { date: string; received: number; sent: number }[] {
    return this.calculateVolumeTrends(days);
  }

  clearCache(): void {
    this.invalidateCache();
    logger.info('Analytics cache cleared', 'AnalyticsService');
  }

  clearAll(): void {
    this.emails = [];
    this.contacts.clear();
    this.invalidateCache();
    logger.info('All analytics data cleared', 'AnalyticsService');
  }
}

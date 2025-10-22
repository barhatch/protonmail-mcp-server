/**
 * SMTP Service for sending emails via ProtonMail
 */

import nodemailer from 'nodemailer';
import { ProtonMailConfig, SendEmailOptions } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { parseEmails, isValidEmail } from '../utils/helpers.js';

export class SMTPService {
  private transporter: nodemailer.Transporter | null = null;
  private config: ProtonMailConfig;

  constructor(config: ProtonMailConfig) {
    this.config = config;
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    logger.debug('Initializing SMTP transporter', 'SMTPService');

    // Check if using localhost (Proton Bridge)
    const isLocalhost = this.config.smtp.host === 'localhost' || this.config.smtp.host === '127.0.0.1';

    this.transporter = nodemailer.createTransport({
      host: this.config.smtp.host,
      port: this.config.smtp.port,
      secure: this.config.smtp.secure,
      auth: {
        user: this.config.smtp.username,
        pass: this.config.smtp.password,
      },
      // For Proton Bridge on localhost, use STARTTLS but don't verify certs
      requireTLS: isLocalhost,
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      }
    });

    logger.info('SMTP transporter initialized', 'SMTPService');
  }

  async verifyConnection(): Promise<boolean> {
    logger.debug('Verifying SMTP connection', 'SMTPService');

    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    try {
      await this.transporter.verify();
      logger.info('SMTP connection verified successfully', 'SMTPService');
      return true;
    } catch (error) {
      logger.error('SMTP connection verification failed', 'SMTPService', error);
      throw error;
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    logger.debug('Sending email', 'SMTPService', { to: options.to, subject: options.subject });

    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    // Parse and validate recipients
    const toAddresses = Array.isArray(options.to) ? options.to : parseEmails(options.to);
    const ccAddresses = options.cc ? (Array.isArray(options.cc) ? options.cc : parseEmails(options.cc)) : [];
    const bccAddresses = options.bcc ? (Array.isArray(options.bcc) ? options.bcc : parseEmails(options.bcc)) : [];

    // Validate at least one recipient
    if (toAddresses.length === 0) {
      throw new Error('At least one recipient is required');
    }

    // Validate all email addresses
    const allAddresses = [...toAddresses, ...ccAddresses, ...bccAddresses];
    for (const email of allAddresses) {
      if (!isValidEmail(email)) {
        throw new Error(`Invalid email address: ${email}`);
      }
    }

    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: this.config.smtp.username,
        to: toAddresses.join(', '),
        subject: options.subject,
        text: options.isHtml ? undefined : options.body,
        html: options.isHtml ? options.body : undefined,
      };

      if (ccAddresses.length > 0) {
        mailOptions.cc = ccAddresses.join(', ');
      }

      if (bccAddresses.length > 0) {
        mailOptions.bcc = bccAddresses.join(', ');
      }

      if (options.replyTo) {
        mailOptions.replyTo = options.replyTo;
      }

      if (options.priority) {
        mailOptions.priority = options.priority;
      }

      if (options.inReplyTo) {
        mailOptions.inReplyTo = options.inReplyTo;
      }

      if (options.references && options.references.length > 0) {
        mailOptions.references = options.references.join(' ');
      }

      if (options.headers) {
        mailOptions.headers = options.headers;
      }

      if (options.attachments && options.attachments.length > 0) {
        mailOptions.attachments = options.attachments.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
          cid: att.contentId
        }));
      }

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', 'SMTPService', { messageId: info.messageId });

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error: any) {
      logger.error('Failed to send email', 'SMTPService', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendTestEmail(to: string, customMessage?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    logger.debug('Sending test email', 'SMTPService', { to });

    const subject = '🧪 Test Email from Sirency ProtonMail MCP';
    const body = customMessage || `
      <h2>🌟 Test Email Successful!</h2>
      <p>This is a test email from the Sirency Ultimate ProtonMail MCP Server.</p>
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      <p><strong>From:</strong> ${this.config.smtp.username}</p>
      <p>If you received this email, your SMTP configuration is working correctly! 🎉</p>
      <hr>
      <p><em>Built with ❤️ by The Sirency Collective</em></p>
    `;

    return this.sendEmail({
      to,
      subject,
      body,
      isHtml: true
    });
  }

  async close(): Promise<void> {
    if (this.transporter) {
      logger.debug('Closing SMTP transporter', 'SMTPService');
      this.transporter.close();
      this.transporter = null;
      logger.info('SMTP transporter closed', 'SMTPService');
    }
  }
}

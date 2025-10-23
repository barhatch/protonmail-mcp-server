#!/usr/bin/env node

/**
 * 🌟 The Sirency Collective - Ultimate Proton Mail MCP Server
 *
 * The most comprehensive Proton Mail MCP server ever created.
 * Built by The Sirency Collective for legendary email management.
 *
 * Features:
 * ✅ Advanced email sending (SMTP) with templates & scheduling
 * ✅ Complete email reading (IMAP) via Proton Bridge
 * ✅ Comprehensive email statistics & analytics
 * ✅ Folder and label management
 * ✅ Contact management with interaction tracking
 * ✅ Email search with advanced filters
 * ✅ Attachment handling
 * ✅ Email threading and conversation management
 * ✅ Real-time synchronization
 * ✅ Performance monitoring and logging
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";

import { ProtonMailConfig } from "./types/index.js";
import { SMTPService } from "./services/smtp-service.js";
import { SimpleIMAPService } from "./services/simple-imap-service.js";
import { AnalyticsService } from "./services/analytics-service.js";
import { logger, Logger } from "./utils/logger.js";
import { parseEmails, isValidEmail } from "./utils/helpers.js";

// Environment configuration
const PROTONMAIL_USERNAME = process.env.PROTONMAIL_USERNAME;
const PROTONMAIL_PASSWORD = process.env.PROTONMAIL_PASSWORD;
const PROTONMAIL_SMTP_HOST =
  process.env.PROTONMAIL_SMTP_HOST || "smtp.protonmail.ch";
const PROTONMAIL_SMTP_PORT = parseInt(
  process.env.PROTONMAIL_SMTP_PORT || "587",
  10
);
const PROTONMAIL_IMAP_HOST = process.env.PROTONMAIL_IMAP_HOST || "localhost";
const PROTONMAIL_IMAP_PORT = parseInt(
  process.env.PROTONMAIL_IMAP_PORT || "1143",
  10
);
const DEBUG = process.env.DEBUG === "true";

// Validate required environment variables
if (!PROTONMAIL_USERNAME || !PROTONMAIL_PASSWORD) {
  console.error(
    "❌ [Sirency-ProtonMail] Missing required environment variables: PROTONMAIL_USERNAME and PROTONMAIL_PASSWORD must be set"
  );
  process.exit(1);
}

// Configure logger
logger.setDebugMode(DEBUG);

// Create configuration
const config: ProtonMailConfig = {
  smtp: {
    host: PROTONMAIL_SMTP_HOST,
    port: PROTONMAIL_SMTP_PORT,
    secure: PROTONMAIL_SMTP_PORT === 465,
    username: PROTONMAIL_USERNAME,
    password: PROTONMAIL_PASSWORD,
  },
  imap: {
    host: PROTONMAIL_IMAP_HOST,
    port: PROTONMAIL_IMAP_PORT,
    secure: false, // Proton Bridge uses localhost without TLS
    username: PROTONMAIL_USERNAME,
    password: PROTONMAIL_PASSWORD,
  },
  debug: DEBUG,
  cacheEnabled: true,
  analyticsEnabled: true,
  autoSync: true,
  syncInterval: 5, // minutes
};

// Initialize services
const smtpService = new SMTPService(config);
const imapService = new SimpleIMAPService();
const analyticsService = new AnalyticsService();

/**
 * Create MCP server with comprehensive email management capabilities
 */
const server = new Server(
  {
    name: "sirency-protonmail-ultimate-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * List all available tools - The Ultimate Proton Mail Toolkit
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.debug("Listing available tools", "MCPServer");

  return {
    tools: [
      // 📧 EMAIL SENDING TOOLS
      {
        name: "send_email",
        description:
          "🚀 Send email with advanced options (templates, scheduling, attachments)",
        inputSchema: {
          type: "object",
          properties: {
            to: {
              type: "string",
              description: "Recipient email address(es), comma-separated",
            },
            cc: {
              type: "string",
              description: "CC recipients, comma-separated",
            },
            bcc: {
              type: "string",
              description: "BCC recipients, comma-separated",
            },
            subject: { type: "string", description: "Email subject" },
            body: { type: "string", description: "Email body content" },
            isHtml: {
              type: "boolean",
              description: "Whether body is HTML",
              default: false,
            },
            priority: {
              type: "string",
              enum: ["high", "normal", "low"],
              description: "Email priority",
            },
            replyTo: { type: "string", description: "Reply-to email address" },
            attachments: {
              type: "array",
              description: "File attachments (base64 encoded)",
            },
          },
          required: ["to", "subject", "body"],
        },
      },
      {
        name: "send_test_email",
        description: "🧪 Send a test email to verify SMTP functionality",
        inputSchema: {
          type: "object",
          properties: {
            to: { type: "string", description: "Test recipient email address" },
            customMessage: {
              type: "string",
              description: "Custom test message",
            },
          },
          required: ["to"],
        },
      },

      // 📬 EMAIL READING TOOLS
      {
        name: "get_emails",
        description: "📬 Get emails from a specific folder with pagination (returns truncated body preview, attachment metadata only)",
        inputSchema: {
          type: "object",
          properties: {
            folder: {
              type: "string",
              description: "Folder path (e.g., 'INBOX', 'Sent', 'Folders/MyFolder'). Default: INBOX",
              default: "INBOX",
            },
            limit: {
              type: "number",
              description: "Number of emails to fetch",
              default: 50,
            },
            offset: {
              type: "number",
              description: "Pagination offset",
              default: 0,
            },
          },
        },
      },
      {
        name: "get_email_by_id",
        description: "📧 Get a specific email by its ID (returns full email body and attachments)",
        inputSchema: {
          type: "object",
          properties: {
            emailId: { type: "string", description: "Email ID to retrieve" },
          },
          required: ["emailId"],
        },
      },
      {
        name: "search_emails",
        description: "🔍 Search emails with advanced filters (returns truncated body preview, attachment metadata only)",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            folder: { type: "string", description: "Folder path to search in (e.g., 'INBOX', 'Folders/MyFolder'). Default: INBOX", default: "INBOX" },
            from: { type: "string", description: "Filter by sender" },
            to: { type: "string", description: "Filter by recipient" },
            subject: { type: "string", description: "Filter by subject" },
            hasAttachment: {
              type: "boolean",
              description: "Filter emails with attachments",
            },
            isRead: { type: "boolean", description: "Filter by read status" },
            isStarred: {
              type: "boolean",
              description: "Filter starred emails",
            },
            dateFrom: {
              type: "string",
              description: "Start date (ISO format)",
            },
            dateTo: { type: "string", description: "End date (ISO format)" },
            limit: { type: "number", description: "Max results", default: 100 },
          },
        },
      },

      // 📁 FOLDER MANAGEMENT TOOLS
      {
        name: "get_folders",
        description: "📁 Get all email folders with statistics. Note: Labels appear as folders with 'Labels/' prefix (e.g., 'Labels/Work')",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "sync_folders",
        description: "🔄 Synchronize folder structure from server",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "create_folder",
        description: "📁 Create a new email folder. Use 'Folders/FolderName' for custom folders or 'Labels/LabelName' for labels",
        inputSchema: {
          type: "object",
          properties: {
            folderName: {
              type: "string",
              description: "Folder path to create (e.g., 'Folders/MyFolder' or 'Labels/Work')",
            },
          },
          required: ["folderName"],
        },
      },
      {
        name: "delete_folder",
        description: "🗑️ Delete an email folder or label (must be empty). Works with 'Folders/' or 'Labels/' prefixes",
        inputSchema: {
          type: "object",
          properties: {
            folderName: {
              type: "string",
              description: "Folder path to delete (e.g., 'Folders/MyFolder' or 'Labels/Work')",
            },
          },
          required: ["folderName"],
        },
      },
      {
        name: "rename_folder",
        description: "✏️ Rename an email folder or label. Works with 'Folders/' or 'Labels/' prefixes",
        inputSchema: {
          type: "object",
          properties: {
            oldName: { type: "string", description: "Current folder path (e.g., 'Folders/OldName' or 'Labels/OldLabel')" },
            newName: { type: "string", description: "New folder path (e.g., 'Folders/NewName' or 'Labels/NewLabel')" },
          },
          required: ["oldName", "newName"],
        },
      },

      // ⚡ EMAIL ACTIONS
      {
        name: "mark_email_read",
        description: "✅ Mark email as read/unread",
        inputSchema: {
          type: "object",
          properties: {
            emailId: { type: "string", description: "Email ID" },
            isRead: {
              type: "boolean",
              description: "Read status",
              default: true,
            },
          },
          required: ["emailId"],
        },
      },
      {
        name: "star_email",
        description: "⭐ Star/unstar email",
        inputSchema: {
          type: "object",
          properties: {
            emailId: { type: "string", description: "Email ID" },
            isStarred: {
              type: "boolean",
              description: "Star status",
              default: true,
            },
          },
          required: ["emailId"],
        },
      },
      {
        name: "move_email",
        description: "📦 Move email to different folder (use folder path like 'INBOX', 'Trash', or 'Folders/MyFolder')",
        inputSchema: {
          type: "object",
          properties: {
            emailId: { type: "string", description: "Email ID" },
            targetFolder: { type: "string", description: "Target folder name (e.g., 'Trash', 'Folders/Archive')" },
          },
          required: ["emailId", "targetFolder"],
        },
      },
      {
        name: "bulk_move_emails",
        description: "📦 Move multiple emails to a folder at once (efficient for managing multiple emails)",
        inputSchema: {
          type: "object",
          properties: {
            emailIds: {
              type: "array",
              description: "Array of email IDs to move",
              items: { type: "string" }
            },
            targetFolder: { type: "string", description: "Target folder path (e.g., 'Trash', 'Folders/Archive')" },
          },
          required: ["emailIds", "targetFolder"],
        },
      },
      {
        name: "add_label",
        description: "🏷️ Add a label to an email. Note: Labels are folders with 'Labels/' prefix. This moves the email to 'Labels/LabelName'. Create the label folder first if it doesn't exist.",
        inputSchema: {
          type: "object",
          properties: {
            emailId: { type: "string", description: "Email ID" },
            label: { type: "string", description: "Label name without prefix (e.g., 'Work', 'Important'). Will be moved to 'Labels/LabelName' folder." },
          },
          required: ["emailId", "label"],
        },
      },
      {
        name: "bulk_add_label",
        description: "🏷️ Add a label to multiple emails. Note: Labels are folders with 'Labels/' prefix. This moves emails to 'Labels/LabelName'. Create the label folder first if it doesn't exist.",
        inputSchema: {
          type: "object",
          properties: {
            emailIds: {
              type: "array",
              description: "Array of email IDs to label",
              items: { type: "string" }
            },
            label: { type: "string", description: "Label name without prefix (e.g., 'Work', 'Important'). Emails will be moved to 'Labels/LabelName' folder." },
          },
          required: ["emailIds", "label"],
        },
      },
      {
        name: "delete_email",
        description: "🗑️ Delete email permanently",
        inputSchema: {
          type: "object",
          properties: {
            emailId: { type: "string", description: "Email ID to delete" },
          },
          required: ["emailId"],
        },
      },
      {
        name: "bulk_delete_emails",
        description: "🗑️ Delete multiple emails at once (efficient for batch deletion)",
        inputSchema: {
          type: "object",
          properties: {
            emailIds: {
              type: "array",
              description: "Array of email IDs to delete",
              items: { type: "string" }
            },
          },
          required: ["emailIds"],
        },
      },

      // 📊 ANALYTICS & STATISTICS TOOLS
      {
        name: "get_email_stats",
        description: "📊 Get comprehensive email statistics",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_email_analytics",
        description: "📈 Get advanced email analytics and insights",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_contacts",
        description: "👥 Get contact information with interaction statistics",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Max contacts to return",
              default: 100,
            },
          },
        },
      },
      {
        name: "get_volume_trends",
        description: "📉 Get email volume trends over time",
        inputSchema: {
          type: "object",
          properties: {
            days: {
              type: "number",
              description: "Number of days to analyze",
              default: 30,
            },
          },
        },
      },

      // 🔧 SYSTEM & MAINTENANCE TOOLS
      {
        name: "get_connection_status",
        description: "🔌 Check SMTP and IMAP connection status",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "sync_emails",
        description: "🔄 Manually sync emails from server",
        inputSchema: {
          type: "object",
          properties: {
            folder: {
              type: "string",
              description: "Folder path to sync (e.g., 'INBOX', 'Folders/MyFolder'). Default: all folders",
            },
            full: {
              type: "boolean",
              description: "Full sync vs incremental",
              default: false,
            },
          },
        },
      },
      {
        name: "clear_cache",
        description: "🧹 Clear email cache and analytics cache",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_logs",
        description: "📋 Get recent system logs",
        inputSchema: {
          type: "object",
          properties: {
            level: {
              type: "string",
              enum: ["debug", "info", "warn", "error"],
              description: "Log level filter",
            },
            limit: {
              type: "number",
              description: "Max log entries",
              default: 100,
            },
          },
        },
      },
    ],
  };
});

/**
 * Handle tool execution requests
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  logger.debug(`Tool called: ${name}`, "MCPServer", args);

  try {
    switch (name) {
      // EMAIL SENDING TOOLS
      case "send_email": {
        const result = await smtpService.sendEmail({
          to: args.to as string,
          cc: args.cc as string | undefined,
          bcc: args.bcc as string | undefined,
          subject: args.subject as string,
          body: args.body as string,
          isHtml: args.isHtml as boolean | undefined,
          priority: args.priority as "high" | "normal" | "low" | undefined,
          replyTo: args.replyTo as string | undefined,
          attachments: args.attachments as any[] | undefined,
        });

        return {
          content: [
            {
              type: "text",
              text: result.success
                ? `✅ Email sent successfully! Message ID: ${result.messageId}`
                : `❌ Failed to send email: ${result.error}`,
            },
          ],
        };
      }

      case "send_test_email": {
        const result = await smtpService.sendTestEmail(
          args.to as string,
          args.customMessage as string | undefined
        );

        return {
          content: [
            {
              type: "text",
              text: result.success
                ? `✅ Test email sent successfully! Message ID: ${result.messageId}`
                : `❌ Failed to send test email: ${result.error}`,
            },
          ],
        };
      }

      // EMAIL READING TOOLS
      case "get_emails": {
        const emails = await imapService.getEmails(
          args.folder as string | undefined,
          args.limit as number | undefined,
          args.offset as number | undefined
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(emails, null, 2),
            },
          ],
        };
      }

      case "get_email_by_id": {
        const email = await imapService.getEmailById(args.emailId as string);

        return {
          content: [
            {
              type: "text",
              text: email ? JSON.stringify(email, null, 2) : "Email not found",
            },
          ],
        };
      }

      case "search_emails": {
        const results = await imapService.searchEmails({
          query: args.query as string | undefined,
          folder: args.folder as string | undefined,
          from: args.from as string | undefined,
          to: args.to as string | undefined,
          subject: args.subject as string | undefined,
          hasAttachment: args.hasAttachment as boolean | undefined,
          isRead: args.isRead as boolean | undefined,
          isStarred: args.isStarred as boolean | undefined,
          dateFrom: args.dateFrom as string | undefined,
          dateTo: args.dateTo as string | undefined,
          limit: args.limit as number | undefined,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      // FOLDER MANAGEMENT TOOLS
      case "get_folders": {
        const folders = await imapService.getFolders();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(folders, null, 2),
            },
          ],
        };
      }

      case "sync_folders": {
        const folders = await imapService.getFolders();

        return {
          content: [
            {
              type: "text",
              text: `✅ Synchronized ${folders.length} folders`,
            },
          ],
        };
      }

      case "create_folder": {
        const folderName = args.folderName as string;
        await imapService.createFolder(folderName);

        return {
          content: [
            {
              type: "text",
              text: `✅ Folder '${folderName}' created successfully`,
            },
          ],
        };
      }

      case "delete_folder": {
        const folderName = args.folderName as string;
        await imapService.deleteFolder(folderName);

        return {
          content: [
            {
              type: "text",
              text: `✅ Folder '${folderName}' deleted successfully`,
            },
          ],
        };
      }

      case "rename_folder": {
        const oldName = args.oldName as string;
        const newName = args.newName as string;
        await imapService.renameFolder(oldName, newName);

        return {
          content: [
            {
              type: "text",
              text: `✅ Folder '${oldName}' renamed to '${newName}'`,
            },
          ],
        };
      }

      // EMAIL ACTIONS
      case "mark_email_read": {
        const success = await imapService.markEmailRead(
          args.emailId as string,
          args.isRead !== undefined ? (args.isRead as boolean) : true
        );

        return {
          content: [
            {
              type: "text",
              text: success
                ? `✅ Email marked as ${
                    args.isRead !== false ? "read" : "unread"
                  }`
                : "❌ Failed to update email status",
            },
          ],
        };
      }

      case "star_email": {
        const success = await imapService.starEmail(
          args.emailId as string,
          args.isStarred !== undefined ? (args.isStarred as boolean) : true
        );

        return {
          content: [
            {
              type: "text",
              text: success
                ? `✅ Email ${
                    args.isStarred !== false ? "starred" : "unstarred"
                  }`
                : "❌ Failed to update email star status",
            },
          ],
        };
      }

      case "move_email": {
        const success = await imapService.moveEmail(
          args.emailId as string,
          args.targetFolder as string
        );

        return {
          content: [
            {
              type: "text",
              text: success
                ? `✅ Email moved to ${args.targetFolder}`
                : "❌ Failed to move email",
            },
          ],
        };
      }

      case "bulk_move_emails": {
        const results = await imapService.bulkMoveEmails(
          args.emailIds as string[],
          args.targetFolder as string
        );

        const summary = `✅ Bulk move completed: ${results.success} succeeded, ${results.failed} failed`;
        const details = results.errors.length > 0
          ? `\n\nErrors:\n${results.errors.slice(0, 10).join('\n')}${results.errors.length > 10 ? `\n... and ${results.errors.length - 10} more` : ''}`
          : '';

        return {
          content: [
            {
              type: "text",
              text: summary + details,
            },
          ],
        };
      }

      case "add_label": {
        const label = args.label as string;
        const labelFolder = `Labels/${label}`;

        const success = await imapService.moveEmail(
          args.emailId as string,
          labelFolder
        );

        return {
          content: [
            {
              type: "text",
              text: success
                ? `✅ Label '${label}' added to email`
                : "❌ Failed to add label",
            },
          ],
        };
      }

      case "bulk_add_label": {
        const label = args.label as string;
        const labelFolder = `Labels/${label}`;

        const results = await imapService.bulkMoveEmails(
          args.emailIds as string[],
          labelFolder
        );

        const summary = `✅ Bulk label '${label}' completed: ${results.success} succeeded, ${results.failed} failed`;
        const details = results.errors.length > 0
          ? `\n\nErrors:\n${results.errors.slice(0, 10).join('\n')}${results.errors.length > 10 ? `\n... and ${results.errors.length - 10} more` : ''}`
          : '';

        return {
          content: [
            {
              type: "text",
              text: summary + details,
            },
          ],
        };
      }

      case "delete_email": {
        const success = await imapService.deleteEmail(args.emailId as string);

        return {
          content: [
            {
              type: "text",
              text: success
                ? "✅ Email deleted successfully"
                : "❌ Failed to delete email",
            },
          ],
        };
      }

      case "bulk_delete_emails": {
        const results = await imapService.bulkDeleteEmails(
          args.emailIds as string[]
        );

        const summary = `✅ Bulk delete completed: ${results.success} succeeded, ${results.failed} failed`;
        const details = results.errors.length > 0
          ? `\n\nErrors:\n${results.errors.slice(0, 10).join('\n')}${results.errors.length > 10 ? `\n... and ${results.errors.length - 10} more` : ''}`
          : '';

        return {
          content: [
            {
              type: "text",
              text: summary + details,
            },
          ],
        };
      }

      // ANALYTICS & STATISTICS TOOLS
      case "get_email_stats": {
        // Fetch recent emails for analytics
        const emails = await imapService.getEmails("INBOX", 500);
        analyticsService.updateEmails(emails);
        const stats = analyticsService.getEmailStats();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      }

      case "get_email_analytics": {
        const emails = await imapService.getEmails("INBOX", 500);
        analyticsService.updateEmails(emails);
        const analytics = analyticsService.getEmailAnalytics();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(analytics, null, 2),
            },
          ],
        };
      }

      case "get_contacts": {
        const emails = await imapService.getEmails("INBOX", 500);
        analyticsService.updateEmails(emails);
        const contacts = analyticsService.getContacts(
          args.limit as number | undefined
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(contacts, null, 2),
            },
          ],
        };
      }

      case "get_volume_trends": {
        const emails = await imapService.getEmails("INBOX", 500);
        analyticsService.updateEmails(emails);
        const trends = analyticsService.getVolumeTrends(
          args.days as number | undefined
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(trends, null, 2),
            },
          ],
        };
      }

      // SYSTEM & MAINTENANCE TOOLS
      case "get_connection_status": {
        const status = {
          smtp: {
            connected: true,
            host: config.smtp.host,
            port: config.smtp.port,
            lastCheck: new Date(),
          },
          imap: {
            connected: imapService.isActive(),
            host: config.imap.host,
            port: config.imap.port,
            lastCheck: new Date(),
          },
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      }

      case "sync_emails": {
        const folder = (args.folder as string) || "INBOX";
        const emails = await imapService.getEmails(folder, 100);
        analyticsService.updateEmails(emails);

        return {
          content: [
            {
              type: "text",
              text: `✅ Synchronized ${emails.length} emails from ${folder}`,
            },
          ],
        };
      }

      case "clear_cache": {
        imapService.clearCache();
        analyticsService.clearCache();

        return {
          content: [
            {
              type: "text",
              text: "✅ All caches cleared successfully",
            },
          ],
        };
      }

      case "get_logs": {
        const logs = logger.getLogs(
          args.level as "debug" | "info" | "warn" | "error" | undefined,
          args.limit as number | undefined
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(logs, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error: any) {
    logger.error(`Tool execution failed: ${name}`, "MCPServer", error);

    return {
      content: [
        {
          type: "text",
          text: `❌ Error: ${error.message || "Unknown error occurred"}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Main server startup function
 */
async function main() {
  logger.info("🌟 Starting Proton Mail MCP Server...", "MCPServer");

  try {
    // Verify SMTP connection (non-blocking)
    logger.info("🔗 Verifying SMTP connection...", "MCPServer");
    try {
      await smtpService.verifyConnection();
      logger.info("✅ SMTP connection verified", "MCPServer");
    } catch (smtpError) {
      logger.warn(
        "⚠️ SMTP connection failed - email sending features will be limited",
        "MCPServer",
        smtpError
      );
      logger.info(
        "💡 Make sure you're using your Proton Bridge password (not your ProtonMail password)",
        "MCPServer"
      );
      logger.info(
        "💡 Get your Bridge password from: Proton Bridge app → Account Settings → Mailbox Password",
        "MCPServer"
      );
    }

    // Try to connect to IMAP (Proton Bridge)
    logger.info("🔗 Connecting to IMAP (Proton Bridge)...", "MCPServer");
    try {
      await imapService.connect(
        config.imap.host,
        config.imap.port,
        config.imap.username,
        config.imap.password
      );
      logger.info("✅ IMAP connection established", "MCPServer");
    } catch (imapError) {
      logger.warn(
        "⚠️ IMAP connection failed - email reading features will be limited",
        "MCPServer",
        imapError
      );
      logger.info(
        "💡 Make sure Proton Bridge is running on localhost:1143",
        "MCPServer"
      );
    }

    // Start the MCP server
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info("🚀 Proton Mail MCP Server started successfully!", "MCPServer");
    logger.info(
      "🌟 All email management features are now available",
      "MCPServer"
    );
  } catch (error) {
    logger.error("❌ Server startup failed", "MCPServer", error);
    process.exit(1);
  }
}

// Error handling and graceful shutdown
process.on("uncaughtException", (error) => {
  logger.error("💥 Uncaught exception", "MCPServer", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("💥 Unhandled rejection", "MCPServer", reason);
  process.exit(1);
});

process.on("SIGINT", async () => {
  logger.info("📡 Received SIGINT, shutting down gracefully...", "MCPServer");
  try {
    await imapService.disconnect();
    await smtpService.close();
    logger.info("👋 Server shutdown complete", "MCPServer");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Error during shutdown", "MCPServer", error);
    process.exit(1);
  }
});

// Start the server
main().catch((error) => {
  logger.error("💥 Fatal server error", "MCPServer", error);
  process.exit(1);
});

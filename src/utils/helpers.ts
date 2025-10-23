/**
 * Helper utilities for ProtonMail MCP Server
 */

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Parse comma-separated email addresses
 */
export function parseEmails(emailString: string): string[] {
  if (!emailString || emailString.trim() === "") {
    return [];
  }

  return emailString
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0 && isValidEmail(email));
}

/**
 * Format date to ISO string
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Parse date from string
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Convert bytes to megabytes
 */
export function bytesToMB(bytes: number): number {
  return parseFloat((bytes / (1024 * 1024)).toFixed(2));
}

/**
 * Sanitize string for safe logging
 */
export function sanitizeForLog(str: string, maxLength: number = 100): string {
  if (!str) return "";

  let sanitized = str.replace(/[\r\n\t]/g, " ").trim();

  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + "...";
  }

  return sanitized;
}

/**
 * Extract email address from "Name <email@domain.com>" format
 */
export function extractEmailAddress(emailString: string): string {
  const match = emailString.match(/<([^>]+)>/);
  return match ? match[1] : emailString.trim();
}

/**
 * Extract name from "Name <email@domain.com>" format
 */
export function extractName(emailString: string): string | undefined {
  const match = emailString.match(/^([^<]+)</);
  return match ? match[1].trim() : undefined;
}

/**
 * Sleep/delay function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await sleep(delayMs * Math.pow(2, i));
      }
    }
  }

  throw lastError;
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

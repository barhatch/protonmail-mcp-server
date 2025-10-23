/**
 * Logging utility for ProtonMail MCP Server
 */

import { LogEntry } from "../types/index.js";

export class Logger {
  private debugMode: boolean = false;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  debug(message: string, context: string = "System", data?: any): void {
    if (this.debugMode) {
      this.log("debug", message, context, data);
      console.error(`[DEBUG] [${context}] ${message}`, data || "");
    }
  }

  info(message: string, context: string = "System", data?: any): void {
    this.log("info", message, context, data);
    console.error(`[INFO] [${context}] ${message}`, data || "");
  }

  warn(message: string, context: string = "System", data?: any): void {
    this.log("warn", message, context, data);
    console.error(`[WARN] [${context}] ${message}`, data || "");
  }

  error(message: string, context: string = "System", error?: any): void {
    this.log("error", message, context, error);
    console.error(`[ERROR] [${context}] ${message}`, error || "");
  }

  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    context: string,
    data?: any
  ): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      context,
      message,
      data,
    };

    this.logs.push(entry);

    // Keep only last N logs to prevent memory issues
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  getLogs(
    level?: "debug" | "info" | "warn" | "error",
    limit: number = 100
  ): LogEntry[] {
    let filteredLogs = this.logs;

    if (level) {
      filteredLogs = filteredLogs.filter((log) => log.level === level);
    }

    return filteredLogs.slice(-limit);
  }

  clearLogs(): void {
    this.logs = [];
  }
}

// Export singleton instance
export const logger = new Logger();

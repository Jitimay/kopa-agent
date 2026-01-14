// Structured logging utility for KOPA Agent

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogContext {
  transactionId?: string;
  agent?: string;
  operation?: string;
  [key: string]: any;
}

export class Logger {
  private static instance: Logger;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      })
    };

    // In production, send to logging service
    console.log(JSON.stringify(logEntry));
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Logs agent operation with full context
   */
  logAgentOperation(
    agent: string,
    operation: string,
    transactionId: string,
    success: boolean,
    error?: Error
  ): void {
    const context: LogContext = {
      agent,
      operation,
      transactionId,
      success
    };

    if (success) {
      this.info(`${agent} ${operation} completed successfully`, context);
    } else {
      this.error(`${agent} ${operation} failed`, context, error);
    }
  }
}

export const logger = Logger.getInstance();

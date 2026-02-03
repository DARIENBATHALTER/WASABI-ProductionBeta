/**
 * WASABI Logger Utility
 *
 * Provides environment-aware logging that can be disabled in production.
 * Use this instead of console.log for debug messages.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  prefix: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private config: LoggerConfig;

  constructor() {
    // Default config based on environment
    const isDev = import.meta.env.DEV;
    this.config = {
      enabled: isDev,
      minLevel: isDev ? 'debug' : 'error',
      prefix: '[WASABI]',
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    return `${this.config.prefix} ${timestamp} [${level.toUpperCase()}] ${message}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), ...args);
    }
  }

  // Group related logs together
  group(label: string): void {
    if (this.config.enabled) {
      console.group(this.formatMessage('debug', label));
    }
  }

  groupEnd(): void {
    if (this.config.enabled) {
      console.groupEnd();
    }
  }

  // Time operations
  time(label: string): void {
    if (this.config.enabled) {
      console.time(`${this.config.prefix} ${label}`);
    }
  }

  timeEnd(label: string): void {
    if (this.config.enabled) {
      console.timeEnd(`${this.config.prefix} ${label}`);
    }
  }

  // Table output for data
  table(data: any): void {
    if (this.shouldLog('debug')) {
      console.table(data);
    }
  }

  // Configure logger at runtime
  configure(options: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...options };
  }

  // Disable all logging
  disable(): void {
    this.config.enabled = false;
  }

  // Enable logging
  enable(): void {
    this.config.enabled = true;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing/configuration
export { Logger };

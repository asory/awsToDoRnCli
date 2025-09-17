type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private static logLevel: LogLevel = 'info';
  private static logLevels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  static shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] >= this.logLevels[this.logLevel];
  }

  static debug(message: string, ...args: any[]) {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  static info(message: string, ...args: any[]) {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  static warn(message: string, ...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  static error(message: string, error?: Error, ...args: any[]) {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, error, ...args);
    }
  }

  static logWithContext(level: LogLevel, message: string, context?: Record<string, any>) {
    const logMessage = context
      ? `${message} | Context: ${JSON.stringify(context)}`
      : message;

    switch (level) {
      case 'debug':
        this.debug(logMessage);
        break;
      case 'info':
        this.info(logMessage);
        break;
      case 'warn':
        this.warn(logMessage);
        break;
      case 'error':
        this.error(logMessage);
        break;
    }
  }

  static setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }
}
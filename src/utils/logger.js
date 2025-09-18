/**
 * Logger utility - Simple console logger for development
 */
class Logger {
  info(message, ...args) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  }

  error(message, ...args) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
  }

  warn(message, ...args) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  }

  debug(message, ...args) {
    console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
  }
}

module.exports = new Logger();
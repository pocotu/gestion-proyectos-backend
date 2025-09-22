/**
 * TestLogger - Utilidad para logging en tests
 */
class TestLogger {
  constructor(options = {}) {
    this.prefix = options.prefix || '[TEST]';
    this.enabled = process.env.NODE_ENV !== 'test' || process.env.TEST_VERBOSE === 'true';
  }

  log(level, message, ...args) {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString();
    const formattedMessage = `${timestamp} ${this.prefix} [${level.toUpperCase()}] ${message}`;
    
    console.log(formattedMessage, ...args);
  }

  info(message, ...args) {
    this.log('info', message, ...args);
  }

  success(message, ...args) {
    this.log('success', `✅ ${message}`, ...args);
  }

  error(message, ...args) {
    this.log('error', `❌ ${message}`, ...args);
  }

  warn(message, ...args) {
    this.log('warn', `⚠️ ${message}`, ...args);
  }

  debug(message, ...args) {
    if (process.env.TEST_DEBUG === 'true') {
      this.log('debug', `🐛 ${message}`, ...args);
    }
  }

  testStart(message, ...args) {
    this.log('info', `🚀 ${message}`, ...args);
  }

  testEnd(message, ...args) {
    this.log('info', `🏁 ${message}`, ...args);
  }
}

module.exports = TestLogger;
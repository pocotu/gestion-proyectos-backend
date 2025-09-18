const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, errors, splat } = format;
const config = require('./config');

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const base = `${timestamp} [${level}]: ${message}`;
  if (stack) return `${base}\n${stack}`;
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return base + metaStr;
});

const logger = createLogger({
  level: config.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    splat(),
    timestamp(),
    logFormat
  ),
  transports: [
    new transports.Console({ handleExceptions: true }),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' })
  ],
  exitOnError: false,
});

module.exports = logger;

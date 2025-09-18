const winston = require('winston');
const config = require('./config');

// Log format configuration
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Logger instance with configurable transports
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: config.LOG_ERROR_FILE,
      level: 'error'
    }),
    new winston.transports.File({
      filename: config.LOG_COMBINED_FILE
    })
  ]
});

module.exports = logger;

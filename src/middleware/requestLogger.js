const logger = require('../config/logger');

function requestLogger(req, res, next) {
  const { method, url, ip } = req;
  const user = req.user ? { id: req.user.id } : undefined;
  logger.info('%s %s - %s', method, url, ip, user || '');
  // attach a simple request logger on res to log responses if needed
  res.on('finish', () => {
    logger.info('%s %s %s %s', method, url, res.statusCode, ip);
  });
  next();
}

module.exports = requestLogger;

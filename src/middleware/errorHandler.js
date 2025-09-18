const logger = require('../config/logger');

function errorHandler(err, req, res, _next) {
  // refer to _next to satisfy some linters that require usage of the parameter
  void _next;
  // Normalize known error shapes (example)
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log full error with stack for server-side inspection
  logger.error('Error: %s', message, { status, stack: err.stack, path: req.originalUrl });

  // Avoid leaking stack in production
  const response = {
    error: {
      message,
      status,
    },
  };

  if (process.env.NODE_ENV !== 'production') {
    response.error.stack = err.stack;
  }

  res.status(status).json(response);
}

module.exports = errorHandler;

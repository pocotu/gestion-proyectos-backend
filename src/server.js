const app = require('./app');
const { testConnection } = require('./config/db');
const logger = require('./config/logger');
const config = require('./config/config');
const { createAllTables } = require('./models');

let server;

async function start() {
  try {
    // Test DB before starting (fail fast)
    await testConnection();
    logger.info('Database connection OK');

    // Optional: create tables and seed defaults when requested (development convenience)
    if (process.env.SETUP_DB === 'true') {
      logger.info('SETUP_DB=true detected — creating tables and seeding defaults');
      await createAllTables();
      logger.info('Database setup complete');
    }

    server = app.listen(config.PORT, () => {
      logger.info(`Server listening on port ${config.PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server: %s', err.message, { stack: err.stack });
    process.exit(1);
  }
}

// Handle unexpected errors gracefully
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err.message, { stack: err.stack });
  console.error('Uncaught Exception:', err);
  // attempt graceful shutdown
  if (server && server.close) server.close(() => process.exit(1));
  else process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection: %o', reason);
});

start();

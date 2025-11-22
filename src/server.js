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

    // Optional: setup database when requested
    if (process.env.SETUP_DB === 'true') {
      logger.info('SETUP_DB=true detected — running database setup');
      
      // Limpiar base de datos si CLEAN_DATABASE=true
      if (process.env.CLEAN_DATABASE === 'true') {
        logger.info('CLEAN_DATABASE=true detected — cleaning database');
        const pool = require('./config/db').pool;
        
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');
        
        const tables = [
          'logs_actividad', 'archivos_proyecto', 'archivos_tarea',
          'tareas', 'proyecto_responsables', 'proyectos',
          'usuario_roles', 'usuarios', 'roles'
        ];
        
        for (const table of tables) {
          try {
            await pool.query(`DELETE FROM ${table}`);
            await pool.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
            logger.info(`Cleaned table: ${table}`);
          } catch (error) {
            if (error.code !== 'ER_NO_SUCH_TABLE') {
              logger.warn(`Could not clean table ${table}: ${error.message}`);
            }
          }
        }
        
        await pool.query('SET FOREIGN_KEY_CHECKS = 1');
        logger.info('Database cleaned successfully');
      }
      
      // Crear tablas y ejecutar seeders
      await createAllTables();
      
      const SeederManager = require('./seeders');
      const seederManager = new SeederManager();
      await seederManager.runAll();
      
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

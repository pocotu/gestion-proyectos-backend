const mysql = require('mysql2/promise');
const config = require('./config');

// Database connection pool configuration
// Uses environment variables for all settings
const pool = mysql.createPool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  connectionLimit: config.DB_CONNECTION_LIMIT,
  queueLimit: config.DB_QUEUE_LIMIT,
  // Configuraciones válidas para mysql2
  waitForConnections: true,
  idleTimeout: 300000,    // 5 minutos de timeout para conexiones idle
  enableKeepAlive: true,  // Mantener conexiones vivas
  keepAliveInitialDelay: 0
});

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Eventos del pool para debugging
pool.on('connection', (connection) => {
  console.log('🔗 [DB-POOL] Nueva conexión establecida como id:', connection.threadId);
});

pool.on('error', (err) => {
  console.error('💥 [DB-POOL] Error en el pool de conexiones:', err.message);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('🔄 [DB-POOL] Conexión perdida, intentando reconectar...');
  }
});

// Función para obtener el estado del pool
function getPoolStatus() {
  return {
    totalConnections: pool._allConnections ? pool._allConnections.length : 0,
    freeConnections: pool._freeConnections ? pool._freeConnections.length : 0,
    connectionQueue: pool._connectionQueue ? pool._connectionQueue.length : 0
  };
}

module.exports = { pool, testConnection, getPoolStatus };

const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Script de limpieza de base de datos
 * 
 * Control mediante variable de entorno:
 * - CLEAN_DATABASE=true  -> Limpia la base de datos en deploy
 * - CLEAN_DATABASE=false -> No limpia (por defecto)
 * 
 * En Render:
 * 1. Ir a Environment Variables
 * 2. Agregar: CLEAN_DATABASE = true (para limpiar)
 * 3. Después del deploy, cambiar a: CLEAN_DATABASE = false
 */

const CLEAN_ENABLED = process.env.CLEAN_DATABASE === 'true';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gestion_proyectos',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function cleanDatabase() {
  // Verificar si la limpieza está habilitada
  if (!CLEAN_ENABLED) {
    console.log('[SKIP] Limpieza de base de datos DESACTIVADA (CLEAN_DATABASE != true)');
    console.log('[INFO] Para activar, establece CLEAN_DATABASE=true en las variables de entorno');
    await pool.end();
    process.exit(0);
    return;
  }

  console.log('[WARNING] ADVERTENCIA: Limpieza de base de datos ACTIVADA');
  console.log('[CLEAN] Limpiando base de datos completamente...');

  try {
    // Desactivar verificación de claves foráneas
    await pool.execute('SET FOREIGN_KEY_CHECKS = 0');

    // Limpiar todas las tablas
    const tables = [
      'logs_actividad',
      'archivos_proyecto',
      'archivos_tarea',
      'tareas',
      'proyecto_responsables',
      'proyectos',
      'usuario_roles',
      'usuarios',
      'roles',
    ];

    for (const table of tables) {
      console.log(`[DELETE] Limpiando tabla: ${table}`);
      await pool.execute(`DELETE FROM ${table}`);
      await pool.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
    }

    // Reactivar verificación de claves foráneas
    await pool.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('[SUCCESS] Base de datos limpiada completamente');
    console.log('[INFO] Recuerda cambiar CLEAN_DATABASE=false para evitar limpiezas futuras');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Error limpiando base de datos:', error);
    await pool.end();
    process.exit(1);
  }
}

cleanDatabase();

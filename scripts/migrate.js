const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

/**
 * Sistema de Migraciones SQL
 * 
 * Ejecuta migraciones SQL en orden desde la carpeta migrations/
 * Controla completamente la base de datos incluyendo creacion y limpieza
 */

class MigrationManager {
  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'railway',
      multipleStatements: true,
    };
    
    this.migrationsPath = path.join(__dirname, '../migrations');
  }

  async createConnection() {
    return await mysql.createConnection(this.config);
  }

  async ensureDatabase() {
    const configWithoutDb = { ...this.config };
    delete configWithoutDb.database;
    
    const connection = await mysql.createConnection(configWithoutDb);
    
    try {
      console.log(`[MIGRATE] Verificando base de datos: ${this.config.database}`);
      await connection.query(`CREATE DATABASE IF NOT EXISTS ${this.config.database}`);
      console.log(`[SUCCESS] Base de datos ${this.config.database} lista`);
    } finally {
      await connection.end();
    }
  }

  async createMigrationsTable(connection) {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getExecutedMigrations(connection) {
    try {
      const [rows] = await connection.query('SELECT name FROM migrations');
      return rows.map(row => row.name);
    } catch (error) {
      return [];
    }
  }

  async getMigrationFiles() {
    const files = await fs.readdir(this.migrationsPath);
    return files
      .filter(file => file.endsWith('.sql'))
      .sort();
  }

  async executeMigration(connection, filename) {
    const filePath = path.join(this.migrationsPath, filename);
    const sql = await fs.readFile(filePath, 'utf8');
    
    console.log(`[MIGRATE] Ejecutando: ${filename}`);
    
    await connection.query(sql);
    await connection.query('INSERT INTO migrations (name) VALUES (?)', [filename]);
    
    console.log(`[SUCCESS] Completado: ${filename}`);
  }

  async runMigrations() {
    console.log('[MIGRATE] Iniciando sistema de migraciones...');
    
    await this.ensureDatabase();
    
    const connection = await this.createConnection();
    
    try {
      await this.createMigrationsTable(connection);
      
      const executedMigrations = await this.getExecutedMigrations(connection);
      const migrationFiles = await this.getMigrationFiles();
      
      const pendingMigrations = migrationFiles.filter(
        file => !executedMigrations.includes(file)
      );
      
      if (pendingMigrations.length === 0) {
        console.log('[INFO] No hay migraciones pendientes');
        return;
      }
      
      console.log(`[INFO] Migraciones pendientes: ${pendingMigrations.length}`);
      
      for (const migration of pendingMigrations) {
        await this.executeMigration(connection, migration);
      }
      
      console.log('[SUCCESS] Todas las migraciones completadas');
      
    } finally {
      await connection.end();
    }
  }

  async cleanDatabase() {
    const CLEAN_ENABLED = process.env.CLEAN_DATABASE === 'true';

    if (!CLEAN_ENABLED) {
      console.log('[SKIP] Limpieza desactivada (CLEAN_DATABASE != true)');
      return false;
    }

    console.log('[WARNING] Limpiando base de datos...');
    
    const connection = await this.createConnection();
    
    try {
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');

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
        await connection.query(`DELETE FROM ${table}`);
        await connection.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
      }

      await connection.query('SET FOREIGN_KEY_CHECKS = 1');

      console.log('[SUCCESS] Base de datos limpiada');
      return true;
      
    } finally {
      await connection.end();
    }
  }

  async resetDatabase() {
    console.log('[RESET] Reseteando base de datos completa...');
    
    const connection = await this.createConnection();
    
    try {
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      
      const [tables] = await connection.query('SHOW TABLES');
      
      for (const row of tables) {
        const tableName = Object.values(row)[0];
        console.log(`[DROP] Eliminando tabla: ${tableName}`);
        await connection.query(`DROP TABLE IF EXISTS ${tableName}`);
      }
      
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      
      console.log('[SUCCESS] Base de datos reseteada');
      
    } finally {
      await connection.end();
    }
  }
}

async function main() {
  const manager = new MigrationManager();
  const command = process.argv[2];

  try {
    switch (command) {
      case 'clean':
        await manager.cleanDatabase();
        break;
      case 'reset':
        await manager.resetDatabase();
        await manager.runMigrations();
        break;
      case 'up':
      default:
        await manager.runMigrations();
        break;
    }
    
    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Fallo en migracion:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { MigrationManager };

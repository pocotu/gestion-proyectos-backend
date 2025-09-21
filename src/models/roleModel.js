const { pool } = require('../config/db');
const logger = require('../config/logger');

class RoleModel {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    console.log('🔧 [ROLE-MODEL] Ejecutando CREATE TABLE roles...');
    await pool.query(sql);
    console.log('✅ [ROLE-MODEL] Tabla roles creada/verificada');
  }

  static async seedDefaults() {
    const defaults = ['admin','responsable_proyecto','responsable_tarea'];
    console.log('🌱 [ROLE-MODEL] Insertando roles por defecto:', defaults);
    
    let insertedCount = 0;
    let existingCount = 0;
    
    for (const name of defaults) {
      try {
        const [result] = await pool.execute('INSERT IGNORE INTO roles (nombre) VALUES (?)', [name]);
        if (result.affectedRows > 0) {
          insertedCount++;
          console.log(`✅ [ROLE-MODEL] Rol insertado: ${name}`);
        } else {
          existingCount++;
          console.log(`ℹ️ [ROLE-MODEL] Rol ya existe: ${name}`);
        }
      } catch (error) {
        console.error(`❌ [ROLE-MODEL] Error insertando rol ${name}:`, error.message);
        logger.error(`Error inserting role ${name}:`, error);
        throw error;
      }
    }
    
    console.log(`📊 [ROLE-MODEL] Resumen: ${insertedCount} insertados, ${existingCount} ya existían`);
    logger.info(`Roles seeded: ${insertedCount} inserted, ${existingCount} existing`);
    
    // Verificación final
    const [count] = await pool.execute('SELECT COUNT(*) as total FROM roles');
    const totalRoles = count[0].total;
    console.log(`🔍 [ROLE-MODEL] Total de roles en DB: ${totalRoles}`);
    
    if (totalRoles < defaults.length) {
      throw new Error(`Expected ${defaults.length} roles, but found ${totalRoles} in database`);
    }
  }
}

module.exports = RoleModel;

const { pool } = require('../config/db');

class RoleModel {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(sql);
  }

  static async seedDefaults() {
    const defaults = ['admin','responsable_proyecto','responsable_tarea'];
    for (const name of defaults) {
      await pool.execute('INSERT IGNORE INTO roles (nombre) VALUES (?)', [name]);
    }
  }
}

module.exports = RoleModel;

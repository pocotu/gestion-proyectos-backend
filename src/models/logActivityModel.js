const { pool } = require('../config/db');

class LogActivityModel {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS logs_actividad (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT,
        accion VARCHAR(100) NOT NULL,
        entidad_tipo VARCHAR(50) NOT NULL,
        entidad_id INT NOT NULL,
        descripcion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(sql);
  }

  static async log({
    usuario_id,
    accion,
    entidad_tipo,
    entidad_id = null,
    descripcion = null
  }) {
    const sql = `
      INSERT INTO logs_actividad (
        usuario_id, accion, entidad_tipo, entidad_id, descripcion
      ) VALUES (?, ?, ?, ?, ?)
    `;
    
    const [result] = await pool.execute(sql, [
      usuario_id,
      accion,
      entidad_tipo,
      entidad_id,
      descripcion
    ]);
    
    return { id: result.insertId };
  }

  static async getByUser(usuario_id, limit = 50) {
    const sql = `
      SELECT * FROM logs_actividad 
      WHERE usuario_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `;
    const [rows] = await pool.execute(sql, [usuario_id, limit]);
    return rows;
  }

  static async getByEntity(entidad_tipo, entidad_id, limit = 50) {
    const sql = `
      SELECT la.*, u.nombre as usuario_nombre 
      FROM logs_actividad la
      LEFT JOIN usuarios u ON la.usuario_id = u.id
      WHERE la.entidad_tipo = ? AND la.entidad_id = ?
      ORDER BY la.created_at DESC 
      LIMIT ?
    `;
    const [rows] = await pool.execute(sql, [entidad_tipo, entidad_id, limit]);
    return rows;
  }

  static async getRecent(limit = 100) {
    const sql = `
      SELECT la.*, u.nombre as usuario_nombre 
      FROM logs_actividad la
      LEFT JOIN usuarios u ON la.usuario_id = u.id
      ORDER BY la.created_at DESC 
      LIMIT ?
    `;
    const [rows] = await pool.execute(sql, [limit]);
    return rows;
  }
}

module.exports = LogActivityModel;

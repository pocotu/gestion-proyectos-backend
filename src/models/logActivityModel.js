const { pool } = require('../config/db');

class LogActivityModel {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS logs_actividad (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT,
        accion VARCHAR(100) NOT NULL,
        entidad_tipo VARCHAR(50) NOT NULL,
        entidad_id INT,
        descripcion TEXT,
        datos_anteriores JSON,
        datos_nuevos JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
        INDEX idx_usuario_id (usuario_id),
        INDEX idx_entidad (entidad_tipo, entidad_id),
        INDEX idx_accion (accion),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(sql);
  }

  static async log({
    usuario_id,
    accion,
    entidad_tipo,
    entidad_id = null,
    descripcion = null,
    datos_anteriores = null,
    datos_nuevos = null,
    ip_address = null,
    user_agent = null
  }) {
    const sql = `
      INSERT INTO logs_actividad (
        usuario_id, accion, entidad_tipo, entidad_id, descripcion,
        datos_anteriores, datos_nuevos, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await pool.execute(sql, [
      usuario_id,
      accion,
      entidad_tipo,
      entidad_id,
      descripcion,
      datos_anteriores ? JSON.stringify(datos_anteriores) : null,
      datos_nuevos ? JSON.stringify(datos_nuevos) : null,
      ip_address,
      user_agent
    ]);
    
    return { id: result.insertId };
  }

  static async getByUser(usuario_id, limit = 50, offset = 0) {
    const sql = `
      SELECT la.*, u.nombre as usuario_nombre, u.email as usuario_email
      FROM logs_actividad la
      LEFT JOIN usuarios u ON la.usuario_id = u.id
      WHERE la.usuario_id = ? 
      ORDER BY la.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.execute(sql, [usuario_id, limit, offset]);
    return rows.map(row => ({
      ...row,
      datos_anteriores: row.datos_anteriores ? JSON.parse(row.datos_anteriores) : null,
      datos_nuevos: row.datos_nuevos ? JSON.parse(row.datos_nuevos) : null
    }));
  }

  static async getByEntity(entidad_tipo, entidad_id, limit = 50, offset = 0) {
    const sql = `
      SELECT la.*, u.nombre as usuario_nombre, u.email as usuario_email
      FROM logs_actividad la
      LEFT JOIN usuarios u ON la.usuario_id = u.id
      WHERE la.entidad_tipo = ? AND la.entidad_id = ?
      ORDER BY la.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.execute(sql, [entidad_tipo, entidad_id, limit, offset]);
    return rows.map(row => ({
      ...row,
      datos_anteriores: row.datos_anteriores ? JSON.parse(row.datos_anteriores) : null,
      datos_nuevos: row.datos_nuevos ? JSON.parse(row.datos_nuevos) : null
    }));
  }

  static async getRecent(limit = 100, offset = 0) {
    const sql = `
      SELECT la.*, u.nombre as usuario_nombre, u.email as usuario_email
      FROM logs_actividad la
      LEFT JOIN usuarios u ON la.usuario_id = u.id
      ORDER BY la.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.execute(sql, [limit, offset]);
    return rows.map(row => ({
      ...row,
      datos_anteriores: row.datos_anteriores ? JSON.parse(row.datos_anteriores) : null,
      datos_nuevos: row.datos_nuevos ? JSON.parse(row.datos_nuevos) : null
    }));
  }

  static async getByDateRange(startDate, endDate, limit = 100, offset = 0) {
    const sql = `
      SELECT la.*, u.nombre as usuario_nombre, u.email as usuario_email
      FROM logs_actividad la
      LEFT JOIN usuarios u ON la.usuario_id = u.id
      WHERE la.created_at BETWEEN ? AND ?
      ORDER BY la.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.execute(sql, [startDate, endDate, limit, offset]);
    return rows.map(row => ({
      ...row,
      datos_anteriores: row.datos_anteriores ? JSON.parse(row.datos_anteriores) : null,
      datos_nuevos: row.datos_nuevos ? JSON.parse(row.datos_nuevos) : null
    }));
  }

  static async getByAction(accion, limit = 50, offset = 0) {
    const sql = `
      SELECT la.*, u.nombre as usuario_nombre, u.email as usuario_email
      FROM logs_actividad la
      LEFT JOIN usuarios u ON la.usuario_id = u.id
      WHERE la.accion = ?
      ORDER BY la.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.execute(sql, [accion, limit, offset]);
    return rows.map(row => ({
      ...row,
      datos_anteriores: row.datos_anteriores ? JSON.parse(row.datos_anteriores) : null,
      datos_nuevos: row.datos_nuevos ? JSON.parse(row.datos_nuevos) : null
    }));
  }

  static async getStats(dias = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dias);

    const totalSql = `
      SELECT COUNT(*) as total
      FROM logs_actividad
      WHERE created_at >= ?
    `;

    const byActionSql = `
      SELECT accion, COUNT(*) as count
      FROM logs_actividad
      WHERE created_at >= ?
      GROUP BY accion
      ORDER BY count DESC
    `;

    const byEntitySql = `
      SELECT entidad_tipo, COUNT(*) as count
      FROM logs_actividad
      WHERE created_at >= ?
      GROUP BY entidad_tipo
      ORDER BY count DESC
    `;

    const [totalResult] = await pool.execute(totalSql, [startDate]);
    const [actionResult] = await pool.execute(byActionSql, [startDate]);
    const [entityResult] = await pool.execute(byEntitySql, [startDate]);

    return {
      total: totalResult[0].total,
      byAction: actionResult,
      byEntity: entityResult
    };
  }
}

module.exports = LogActivityModel;

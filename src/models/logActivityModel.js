const { pool } = require('../config/db');

class LogActivityModel {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS log_actividades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT,
        accion ENUM('crear','actualizar','eliminar','login','logout','asignar','completar','cancelar') NOT NULL,
        entidad_tipo ENUM('usuario','proyecto','tarea','archivo','rol') NOT NULL,
        entidad_id INT,
        descripcion TEXT,
        datos_anteriores JSON,
        datos_nuevos JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
        INDEX idx_usuario_fecha (usuario_id, created_at),
        INDEX idx_entidad (entidad_tipo, entidad_id),
        INDEX idx_accion (accion),
        INDEX idx_fecha (created_at)
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
      INSERT INTO log_actividades (
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
      SELECT la.*, u.nombre as usuario_nombre
      FROM log_actividades la
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
      SELECT la.*, u.nombre as usuario_nombre
      FROM log_actividades la
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

  static async getByAction(accion, limit = 50, offset = 0) {
    const sql = `
      SELECT la.*, u.nombre as usuario_nombre
      FROM log_actividades la
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

  static async getByDateRange(fecha_inicio, fecha_fin, limit = 100, offset = 0) {
    const sql = `
      SELECT la.*, u.nombre as usuario_nombre
      FROM log_actividades la
      LEFT JOIN usuarios u ON la.usuario_id = u.id
      WHERE la.created_at BETWEEN ? AND ?
      ORDER BY la.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.execute(sql, [fecha_inicio, fecha_fin, limit, offset]);
    return rows.map(row => ({
      ...row,
      datos_anteriores: row.datos_anteriores ? JSON.parse(row.datos_anteriores) : null,
      datos_nuevos: row.datos_nuevos ? JSON.parse(row.datos_nuevos) : null
    }));
  }

  static async getActivitySummary(usuario_id = null, dias = 30) {
    let sql = `
      SELECT 
        accion,
        entidad_tipo,
        COUNT(*) as total,
        DATE(created_at) as fecha
      FROM log_actividades
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    
    let params = [dias];
    
    if (usuario_id) {
      sql += ` AND usuario_id = ?`;
      params.push(usuario_id);
    }
    
    sql += `
      GROUP BY accion, entidad_tipo, DATE(created_at)
      ORDER BY fecha DESC, total DESC
    `;
    
    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  // Métodos de conveniencia para acciones comunes
  static async logLogin(usuario_id, ip_address, user_agent) {
    return this.log({
      usuario_id,
      accion: 'login',
      entidad_tipo: 'usuario',
      entidad_id: usuario_id,
      descripcion: 'Usuario inició sesión',
      ip_address,
      user_agent
    });
  }

  static async logLogout(usuario_id, ip_address) {
    return this.log({
      usuario_id,
      accion: 'logout',
      entidad_tipo: 'usuario',
      entidad_id: usuario_id,
      descripcion: 'Usuario cerró sesión',
      ip_address
    });
  }

  static async logCreate(usuario_id, entidad_tipo, entidad_id, datos_nuevos, ip_address = null) {
    return this.log({
      usuario_id,
      accion: 'crear',
      entidad_tipo,
      entidad_id,
      descripcion: `Creó ${entidad_tipo} con ID ${entidad_id}`,
      datos_nuevos,
      ip_address
    });
  }

  static async logUpdate(usuario_id, entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, ip_address = null) {
    return this.log({
      usuario_id,
      accion: 'actualizar',
      entidad_tipo,
      entidad_id,
      descripcion: `Actualizó ${entidad_tipo} con ID ${entidad_id}`,
      datos_anteriores,
      datos_nuevos,
      ip_address
    });
  }

  static async logDelete(usuario_id, entidad_tipo, entidad_id, datos_anteriores, ip_address = null) {
    return this.log({
      usuario_id,
      accion: 'eliminar',
      entidad_tipo,
      entidad_id,
      descripcion: `Eliminó ${entidad_tipo} con ID ${entidad_id}`,
      datos_anteriores,
      ip_address
    });
  }
}

module.exports = LogActivityModel;

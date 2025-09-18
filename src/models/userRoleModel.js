const { pool } = require('../config/db');

class UserRoleModel {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS usuario_roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        rol_id INT NOT NULL,
        asignado_por INT,
        fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (asignado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
        UNIQUE KEY unique_user_role (usuario_id, rol_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(sql);
  }

  static async assignRole(usuario_id, rol_id, asignado_por = null) {
    const sql = `
      INSERT INTO usuario_roles (usuario_id, rol_id, asignado_por) 
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        activo = TRUE, 
        asignado_por = VALUES(asignado_por),
        updated_at = CURRENT_TIMESTAMP
    `;
    const [result] = await pool.execute(sql, [usuario_id, rol_id, asignado_por]);
    return { id: result.insertId };
  }

  static async removeRole(usuario_id, rol_id) {
    const sql = `UPDATE usuario_roles SET activo = FALSE WHERE usuario_id = ? AND rol_id = ?`;
    const [result] = await pool.execute(sql, [usuario_id, rol_id]);
    return result.affectedRows > 0;
  }

  static async getUserRoles(usuario_id) {
    const sql = `
      SELECT ur.*, user_role_model_table.nombre as rol_nombre 
      FROM usuario_roles ur
      JOIN roles user_role_model_table ON ur.rol_id = user_role_model_table.id
      WHERE ur.usuario_id = ? AND ur.activo = TRUE
    `;
    const [rows] = await pool.execute(sql, [usuario_id]);
    return rows;
  }

  static async getUsersByRole(rol_id) {
    const sql = `
      SELECT ur.*, u.nombre, u.email 
      FROM usuario_roles ur
      JOIN usuarios u ON ur.usuario_id = u.id
      WHERE ur.rol_id = ? AND ur.activo = TRUE
    `;
    const [rows] = await pool.execute(sql, [rol_id]);
    return rows;
  }

  static async findByUserId(userId) {
    const query = `
      SELECT ur.*, role_check_model_table.nombre as rol_nombre
      FROM usuario_roles ur
      LEFT JOIN roles role_check_model_table ON ur.rol_id = role_check_model_table.id
      WHERE ur.usuario_id = ?
    `;
    
    const [result] = await pool.execute(query, [userId]);
    return result;
  }

  static async findByRoleId(roleId) {
    const query = `
      SELECT ur.*, u.nombre, u.email
      FROM usuario_roles ur
      LEFT JOIN usuarios u ON ur.usuario_id = u.id
      WHERE ur.rol_id = ?
    `;
    
    const [result] = await pool.execute(query, [roleId]);
    return result;
  }

  static async hasRole(userId, roleName) {
    const query = `
      SELECT COUNT(*) as count
      FROM usuario_roles ur
      LEFT JOIN roles role_check_model_table ON ur.rol_id = role_check_model_table.id
      WHERE ur.usuario_id = ? AND role_check_model_table.nombre = ?
    `;
    
    const [result] = await pool.execute(query, [userId, roleName]);
    return result[0].count > 0;
  }
}

module.exports = UserRoleModel;
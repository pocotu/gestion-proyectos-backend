const { pool } = require('../config/db');

class ProjectResponsibleModel {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS proyecto_responsables (
        id INT AUTO_INCREMENT PRIMARY KEY,
        proyecto_id INT NOT NULL,
        usuario_id INT NOT NULL,
        rol_responsabilidad ENUM('responsable_principal','responsable_secundario','colaborador','supervisor') DEFAULT 'colaborador',
        fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_fin DATE DEFAULT NULL,
        asignado_por INT,
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (asignado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
        UNIQUE KEY unique_project_user_role (proyecto_id, usuario_id, rol_responsabilidad)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(sql);
  }

  static async assignResponsible(proyecto_id, usuario_id, rol_responsabilidad = 'colaborador', asignado_por = null, fecha_fin = null) {
    const sql = `
      INSERT INTO proyecto_responsables (proyecto_id, usuario_id, rol_responsabilidad, asignado_por, fecha_fin) 
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        activo = TRUE, 
        asignado_por = VALUES(asignado_por),
        fecha_fin = VALUES(fecha_fin),
        updated_at = CURRENT_TIMESTAMP
    `;
    const [result] = await pool.execute(sql, [proyecto_id, usuario_id, rol_responsabilidad, asignado_por, fecha_fin]);
    return { id: result.insertId };
  }

  static async removeResponsible(proyecto_id, usuario_id, rol_responsabilidad = null) {
    let sql = `UPDATE proyecto_responsables SET activo = 0 WHERE proyecto_id = ? AND usuario_id = ?`;
    let params = [proyecto_id, usuario_id];
    
    if (rol_responsabilidad) {
      sql += ` AND rol_responsabilidad = ?`;
      params.push(rol_responsabilidad);
    }
    
    const [result] = await pool.execute(sql, params);
    return result.affectedRows > 0;
  }

  static async getProjectResponsibles(proyecto_id) {
    const sql = `
      SELECT pr.*, u.nombre, u.email, u.id as usuario_id,
             asignador.nombre as asignado_por_nombre
      FROM proyecto_responsables pr
      JOIN usuarios u ON pr.usuario_id = u.id
      LEFT JOIN usuarios asignador ON pr.asignado_por = asignador.id
      WHERE pr.proyecto_id = ? AND pr.activo = 1
      ORDER BY 
        CASE pr.rol_responsabilidad 
          WHEN 'responsable_principal' THEN 1
          WHEN 'responsable_secundario' THEN 2
          WHEN 'supervisor' THEN 3
          WHEN 'colaborador' THEN 4
        END,
        pr.fecha_asignacion ASC
    `;
    const [rows] = await pool.execute(sql, [proyecto_id]);
    return rows;
  }

  static async getUserProjects(usuario_id) {
    const sql = `
      SELECT pr.*, p.titulo, p.descripcion, p.estado as proyecto_estado,
             p.fecha_inicio, p.fecha_fin
      FROM proyecto_responsables pr
      JOIN proyectos p ON pr.proyecto_id = p.id
      WHERE pr.usuario_id = ? AND pr.activo = 1
      ORDER BY 
        CASE pr.rol_responsabilidad 
          WHEN 'responsable_principal' THEN 1
          WHEN 'responsable_secundario' THEN 2
          WHEN 'supervisor' THEN 3
          WHEN 'colaborador' THEN 4
        END,
        p.fecha_inicio DESC
    `;
    const [rows] = await pool.execute(sql, [usuario_id]);
    return rows;
  }

  static async getResponsiblesByRole(proyecto_id, rol_responsabilidad) {
    const sql = `
      SELECT pr.*, u.nombre, u.email
      FROM proyecto_responsables pr
      JOIN usuarios u ON pr.usuario_id = u.id
      WHERE pr.proyecto_id = ? AND pr.rol_responsabilidad = ? AND pr.activo = 1
      ORDER BY pr.fecha_asignacion ASC
    `;
    const [rows] = await pool.execute(sql, [proyecto_id, rol_responsabilidad]);
    return rows;
  }

  static async getPrincipalResponsible(proyecto_id) {
    const sql = `
      SELECT pr.*, u.nombre, u.email
      FROM proyecto_responsables pr
      JOIN usuarios u ON pr.usuario_id = u.id
      WHERE pr.proyecto_id = ? AND pr.rol_responsabilidad = 'responsable_principal' AND pr.activo = 1
      LIMIT 1
    `;
    const [rows] = await pool.execute(sql, [proyecto_id]);
    return rows[0] || null;
  }

  static async isUserResponsible(proyecto_id, usuario_id, rol_responsabilidad = null) {
    let sql = `
      SELECT COUNT(*) as count
      FROM proyecto_responsables
      WHERE proyecto_id = ? AND usuario_id = ? AND activo = 1
    `;
    let params = [proyecto_id, usuario_id];
    
    if (rol_responsabilidad) {
      sql += ` AND rol_responsabilidad = ?`;
      params.push(rol_responsabilidad);
    }
    
    const [rows] = await pool.execute(sql, params);
    return rows[0].count > 0;
  }

  static async updateResponsibleRole(proyecto_id, usuario_id, nuevo_rol, asignado_por = null) {
    const sql = `
      UPDATE proyecto_responsables 
      SET rol_responsabilidad = ?, asignado_por = ?, updated_at = CURRENT_TIMESTAMP
      WHERE proyecto_id = ? AND usuario_id = ? AND activo = 1
    `;
    const [result] = await pool.execute(sql, [nuevo_rol, asignado_por, proyecto_id, usuario_id]);
    return result.affectedRows > 0;
  }

  static async getProjectStats(proyecto_id) {
    const sql = `
      SELECT 
        rol_responsabilidad,
        COUNT(*) as total
      FROM proyecto_responsables
      WHERE proyecto_id = ? AND activo = TRUE
      GROUP BY rol_responsabilidad
    `;
    const [rows] = await pool.execute(sql, [proyecto_id]);
    return rows;
  }

  static async transferResponsibility(proyecto_id, usuario_actual, usuario_nuevo, rol_responsabilidad, asignado_por = null) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Desactivar responsabilidad actual
      await connection.execute(
        `UPDATE proyecto_responsables SET activo = FALSE WHERE proyecto_id = ? AND usuario_id = ? AND rol_responsabilidad = ?`,
        [proyecto_id, usuario_actual, rol_responsabilidad]
      );
      
      // Asignar nueva responsabilidad
      await connection.execute(
        `INSERT INTO proyecto_responsables (proyecto_id, usuario_id, rol_responsabilidad, asignado_por) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE activo = TRUE, asignado_por = VALUES(asignado_por), updated_at = CURRENT_TIMESTAMP`,
        [proyecto_id, usuario_nuevo, rol_responsabilidad, asignado_por]
      );
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = ProjectResponsibleModel;
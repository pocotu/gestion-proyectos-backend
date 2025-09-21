const { pool } = require('../config/db');

class TaskModel {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS tareas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(150) NOT NULL,
        descripcion TEXT,
        fecha_inicio DATE,
        fecha_fin DATE,
        estado ENUM('pendiente','en_progreso','completada','cancelada') DEFAULT 'pendiente',
        prioridad ENUM('baja','media','alta') DEFAULT 'media',
        proyecto_id INT NOT NULL,
        usuario_asignado_id INT,
        creado_por INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_asignado_id) REFERENCES usuarios(id) ON DELETE SET NULL,
        FOREIGN KEY (creado_por) REFERENCES usuarios(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(sql);
  }

  static async create({ titulo, descripcion, proyecto_id, usuario_asignado_id, creado_por, prioridad = 'media', estado = 'pendiente', fecha_inicio, fecha_fin }) {
    const sql = `
      INSERT INTO tareas (titulo, descripcion, proyecto_id, usuario_asignado_id, creado_por, prioridad, estado, fecha_inicio, fecha_fin) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
      titulo, 
      descripcion || null, 
      proyecto_id, 
      usuario_asignado_id || null, 
      creado_por, 
      prioridad, 
      estado, 
      fecha_inicio || null, 
      fecha_fin || null
    ]);
    return { id: result.insertId };
  }

  static async findById(id) {
    const sql = `
      SELECT t.*, 
             u1.nombre as asignado_nombre,
             u2.nombre as creador_nombre,
             p.titulo as proyecto_titulo
      FROM tareas t
      LEFT JOIN usuarios u1 ON t.usuario_asignado_id = u1.id
      LEFT JOIN usuarios u2 ON t.creado_por = u2.id
      LEFT JOIN proyectos p ON t.proyecto_id = p.id
      WHERE t.id = ?
    `;
    const [rows] = await pool.execute(sql, [id]);
    return rows[0] || null;
  }

  static async findByProject(proyecto_id) {
    const sql = `
      SELECT t.*, 
             u1.nombre as asignado_nombre,
             u2.nombre as creador_nombre
      FROM tareas t
      LEFT JOIN usuarios u1 ON t.usuario_asignado_id = u1.id
      LEFT JOIN usuarios u2 ON t.creado_por = u2.id
      WHERE t.proyecto_id = ?
      ORDER BY t.prioridad DESC, t.fecha_fin ASC
    `;
    const [rows] = await pool.execute(sql, [proyecto_id]);
    return rows;
  }

  static async findByUser(usuario_id) {
    const sql = `
      SELECT t.*, 
             p.titulo as proyecto_titulo,
             u.nombre as creador_nombre
      FROM tareas t
      LEFT JOIN proyectos p ON t.proyecto_id = p.id
      LEFT JOIN usuarios u ON t.creado_por = u.id
      WHERE t.usuario_asignado_id = ?
      ORDER BY t.prioridad DESC, t.fecha_fin ASC
    `;
    const [rows] = await pool.execute(sql, [usuario_id]);
    return rows;
  }

  static async updateStatus(id, estado) {
    const sql = `UPDATE tareas SET estado = ? WHERE id = ?`;
    const [result] = await pool.execute(sql, [estado, id]);
    return result.affectedRows > 0;
  }
}

module.exports = TaskModel;

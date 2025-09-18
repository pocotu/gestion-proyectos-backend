const { pool } = require('../config/db');

class TaskModel {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS tareas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        proyecto_id INT NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        descripcion TEXT,
        estado ENUM('pendiente','en_progreso','en_revision','completada','cancelada') DEFAULT 'pendiente',
        prioridad ENUM('baja','media','alta','critica') DEFAULT 'media',
        fecha_inicio DATE,
        fecha_fin DATE,
        fecha_limite DATE,
        estimacion_horas DECIMAL(5,2),
        horas_trabajadas DECIMAL(5,2) DEFAULT 0,
        asignado_a INT,
        creado_por INT,
        padre_tarea_id INT DEFAULT NULL,
        porcentaje_completado TINYINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
        FOREIGN KEY (asignado_a) REFERENCES usuarios(id) ON DELETE SET NULL,
        FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
        FOREIGN KEY (padre_tarea_id) REFERENCES tareas(id) ON DELETE SET NULL,
        CHECK (porcentaje_completado >= 0 AND porcentaje_completado <= 100)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(sql);
  }

  static async create({ 
    proyecto_id, 
    titulo, 
    descripcion, 
    estado = 'pendiente',
    prioridad = 'media',
    fecha_inicio,
    fecha_fin,
    fecha_limite,
    estimacion_horas,
    asignado_a,
    creado_por,
    padre_tarea_id = null
  }) {
    const sql = `
      INSERT INTO tareas (
        proyecto_id, titulo, descripcion, estado, prioridad, 
        fecha_inicio, fecha_fin, fecha_limite, estimacion_horas, 
        asignado_a, creado_por, padre_tarea_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
      proyecto_id, titulo, descripcion || null, estado, prioridad,
      fecha_inicio || null, fecha_fin || null, fecha_limite || null, 
      estimacion_horas || null, asignado_a || null, creado_por || null, padre_tarea_id
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
      LEFT JOIN usuarios u1 ON t.asignado_a = u1.id
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
      LEFT JOIN usuarios u1 ON t.asignado_a = u1.id
      LEFT JOIN usuarios u2 ON t.creado_por = u2.id
      WHERE t.proyecto_id = ?
      ORDER BY t.prioridad DESC, t.fecha_limite ASC
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
      WHERE t.asignado_a = ?
      ORDER BY t.prioridad DESC, t.fecha_limite ASC
    `;
    const [rows] = await pool.execute(sql, [usuario_id]);
    return rows;
  }

  static async updateStatus(id, estado, porcentaje_completado = null) {
    let sql = `UPDATE tareas SET estado = ?`;
    let params = [estado];
    
    if (porcentaje_completado !== null) {
      sql += `, porcentaje_completado = ?`;
      params.push(porcentaje_completado);
    }
    
    sql += ` WHERE id = ?`;
    params.push(id);
    
    const [result] = await pool.execute(sql, params);
    return result.affectedRows > 0;
  }

  static async updateHours(id, horas_trabajadas) {
    const sql = `UPDATE tareas SET horas_trabajadas = ? WHERE id = ?`;
    const [result] = await pool.execute(sql, [horas_trabajadas, id]);
    return result.affectedRows > 0;
  }

  static async getSubtasks(padre_tarea_id) {
    const sql = `
      SELECT t.*, 
             u1.nombre as asignado_nombre,
             u2.nombre as creador_nombre
      FROM tareas t
      LEFT JOIN usuarios u1 ON t.asignado_a = u1.id
      LEFT JOIN usuarios u2 ON t.creado_por = u2.id
      WHERE t.padre_tarea_id = ?
      ORDER BY t.created_at ASC
    `;
    const [rows] = await pool.execute(sql, [padre_tarea_id]);
    return rows;
  }
}

module.exports = TaskModel;

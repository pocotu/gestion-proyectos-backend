const { pool } = require('../config/db');

class ProjectModel {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS proyectos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        descripcion TEXT,
        fecha_inicio DATE,
        fecha_fin DATE,
        estado ENUM('planificacion','en_progreso','completado','cancelado') DEFAULT 'planificacion',
        creado_por INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(sql);
  }

  static async create({ titulo, descripcion, fecha_inicio, fecha_fin, creado_por }) {
    const sql = `INSERT INTO proyectos (titulo, descripcion, fecha_inicio, fecha_fin, creado_por) VALUES (?, ?, ?, ?, ?)`;
    const [result] = await pool.execute(sql, [titulo, descripcion || null, fecha_inicio || null, fecha_fin || null, creado_por || null]);
    return { id: result.insertId };
  }
}

module.exports = ProjectModel;

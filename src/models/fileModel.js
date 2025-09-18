const { pool } = require('../config/db');

class FileModel {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS archivos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        proyecto_id INT DEFAULT NULL,
        tarea_id INT DEFAULT NULL,
        nombre_archivo VARCHAR(255) NOT NULL,
        nombre_original VARCHAR(255) NOT NULL,
        tipo VARCHAR(100),
        tamano_bytes BIGINT,
        ruta_archivo VARCHAR(1024) NOT NULL,
        subido_por INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
        FOREIGN KEY (tarea_id) REFERENCES tareas(id) ON DELETE CASCADE,
        FOREIGN KEY (subido_por) REFERENCES usuarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(sql);
  }

  static async create({ proyecto_id, tarea_id, nombre_archivo, nombre_original, tipo, tamano_bytes, ruta_archivo, subido_por }) {
    const sql = `INSERT INTO archivos (proyecto_id, tarea_id, nombre_archivo, nombre_original, tipo, tamano_bytes, ruta_archivo, subido_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const [result] = await pool.execute(sql, [proyecto_id || null, tarea_id || null, nombre_archivo, nombre_original, tipo || null, tamano_bytes || null, ruta_archivo, subido_por || null]);
    return { id: result.insertId };
  }
}

module.exports = FileModel;

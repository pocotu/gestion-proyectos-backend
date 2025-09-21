const { pool } = require('../config/db');

class FileModel {
  static async createTable() {
    // Crear tabla archivos_proyecto
    const sqlProyecto = `
      CREATE TABLE IF NOT EXISTS archivos_proyecto (
        id INT AUTO_INCREMENT PRIMARY KEY,
        proyecto_id INT NOT NULL,
        nombre_archivo VARCHAR(200) NOT NULL,
        nombre_original VARCHAR(200) NOT NULL,
        tipo ENUM('PDF', 'DOCX', 'JPG') NOT NULL,
        tamaño_bytes INT,
        ruta_archivo VARCHAR(500) NOT NULL,
        subido_por INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
        FOREIGN KEY (subido_por) REFERENCES usuarios(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    
    // Crear tabla archivos_tarea
    const sqlTarea = `
      CREATE TABLE IF NOT EXISTS archivos_tarea (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tarea_id INT NOT NULL,
        nombre_archivo VARCHAR(200) NOT NULL,
        nombre_original VARCHAR(200) NOT NULL,
        tipo ENUM('PDF', 'DOCX', 'JPG') NOT NULL,
        tamaño_bytes INT,
        ruta_archivo VARCHAR(500) NOT NULL,
        subido_por INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tarea_id) REFERENCES tareas(id) ON DELETE CASCADE,
        FOREIGN KEY (subido_por) REFERENCES usuarios(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    
    await pool.query(sqlProyecto);
    await pool.query(sqlTarea);
  }

  static async create({ proyecto_id, tarea_id, nombre_archivo, nombre_original, tipo, tamano_bytes, ruta_archivo, subido_por }) {
    if (proyecto_id) {
      const sql = `INSERT INTO archivos_proyecto (proyecto_id, nombre_archivo, nombre_original, tipo, tamaño_bytes, ruta_archivo, subido_por) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      const [result] = await pool.execute(sql, [proyecto_id, nombre_archivo, nombre_original || nombre_archivo, tipo || null, tamano_bytes || null, ruta_archivo, subido_por]);
      return { id: result.insertId };
    } else if (tarea_id) {
      const sql = `INSERT INTO archivos_tarea (tarea_id, nombre_archivo, nombre_original, tipo, tamaño_bytes, ruta_archivo, subido_por) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      const [result] = await pool.execute(sql, [tarea_id, nombre_archivo, nombre_original || nombre_archivo, tipo || null, tamano_bytes || null, ruta_archivo, subido_por]);
      return { id: result.insertId };
    } else {
      throw new Error('Debe especificar proyecto_id o tarea_id');
    }
  }
}

module.exports = FileModel;

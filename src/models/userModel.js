const { pool } = require('../config/db');

class UserModel {
  // Single Responsibility: data access for users
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        contraseña VARCHAR(255) NOT NULL,
        telefono VARCHAR(20),
        estado BOOLEAN DEFAULT TRUE,
        es_administrador BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(sql);
  }

  static async create({ nombre, email, contraseña, telefono, es_administrador = 0 }) {
    console.log('🔍 [USER-MODEL] create - Datos recibidos:', { nombre, email, telefono, es_administrador });
    const sql = `INSERT INTO usuarios (nombre, email, contraseña, telefono, es_administrador) VALUES (?, ?, ?, ?, ?)`;
    const [result] = await pool.execute(sql, [nombre, email, contraseña, telefono || null, es_administrador]);
    console.log('🔍 [USER-MODEL] create - Usuario creado con ID:', result.insertId);
    return { id: result.insertId };
  }

  static async findById(id) {
    console.log('🔍 [USER-MODEL] findById - Buscando usuario con ID:', id);
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE id = ?', [id]);
    console.log('🔍 [USER-MODEL] findById - Usuario encontrado:', rows[0] ? { id: rows[0].id, email: rows[0].email } : 'null');
    return rows[0];
  }

  static async findByEmail(email) {
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
    return rows[0];
  }
}

module.exports = UserModel;

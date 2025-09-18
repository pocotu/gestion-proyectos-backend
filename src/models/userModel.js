const { pool } = require('../config/db');

class UserModel {
  // Single Responsibility: data access for users
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(150) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        contraseña VARCHAR(255) NOT NULL,
        telefono VARCHAR(50),
        estado ENUM('activo','inactivo') DEFAULT 'activo',
        es_administrador TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(sql);
  }

  static async create({ nombre, email, contraseña, telefono, es_administrador = 0 }) {
    const sql = `INSERT INTO usuarios (nombre, email, contraseña, telefono, es_administrador) VALUES (?, ?, ?, ?, ?)`;
    const [result] = await pool.execute(sql, [nombre, email, contraseña, telefono || null, es_administrador]);
    return { id: result.insertId };
  }

  static async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE id = ?', [id]);
    return rows[0];
  }

  static async findByEmail(email) {
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
    return rows[0];
  }
}

module.exports = UserModel;

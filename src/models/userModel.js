const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');

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
    console.log('🔧 [USER-MODEL] Ejecutando CREATE TABLE usuarios...');
    await pool.query(sql);
    console.log('✅ [USER-MODEL] Tabla usuarios creada/verificada');
  }

  static async seedDefaultAdmin() {
    const adminEmail = 'admin@gestion-proyectos.com';
    const adminPassword = 'Admin123!!!'; // Contraseña temporal fuerte
    
    console.log('🌱 [USER-MODEL] Verificando usuario administrador por defecto...');
    
    try {
      // Verificar si ya existe el admin
      const [existing] = await pool.execute('SELECT id FROM usuarios WHERE email = ?', [adminEmail]);
      
      if (existing.length > 0) {
        console.log('ℹ️ [USER-MODEL] Usuario administrador ya existe');
        logger.info('Default admin user already exists');
        return existing[0].id;
      }
      
      // Crear el usuario administrador
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const sql = `INSERT INTO usuarios (nombre, email, contraseña, es_administrador) VALUES (?, ?, ?, ?)`;
      const [result] = await pool.execute(sql, [
        'Administrador del Sistema',
        adminEmail,
        hashedPassword,
        1
      ]);
      
      console.log(`✅ [USER-MODEL] Usuario administrador creado con ID: ${result.insertId}`);
      console.log(`🔑 [USER-MODEL] Email: ${adminEmail}`);
      console.log(`🔑 [USER-MODEL] Password temporal: ${adminPassword}`);
      logger.info(`Default admin user created with ID: ${result.insertId}`);
      
      return result.insertId;
      
    } catch (error) {
      console.error('❌ [USER-MODEL] Error creando usuario administrador:', error.message);
      logger.error('Error creating default admin user:', error);
      throw error;
    }
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

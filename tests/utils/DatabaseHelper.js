/**
 * DatabaseHelper - Helper para manejo de base de datos en tests MVP
 * Simplificado para funcionalidades básicas sin refresh tokens ni blacklist
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

class DatabaseHelper {
  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'kali',
      database: process.env.DB_NAME || 'gestion_proyectos',
      port: process.env.DB_PORT || 3306
    };
    this.connection = null;
  }

  /**
   * Inicializa la conexión a la base de datos
   */
  async initialize() {
    try {
      // Crear conexión directa para tests
      this.connection = await mysql.createConnection(this.config);
      console.log('✅ Conexión a base de datos de test establecida');
      
      // Verificar que las tablas existen
      await this.verifyTables();
      
    } catch (error) {
      console.error('❌ Error al conectar con la base de datos de test:', error.message);
      throw error;
    }
  }

  /**
   * Verifica que las tablas necesarias existen
   */
  async verifyTables() {
    const requiredTables = [
      'usuarios', 'proyectos', 'tareas'
    ];

    for (const table of requiredTables) {
      const [rows] = await this.connection.execute(
        'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
        [process.env.DB_NAME || 'gestion_proyectos_test', table]
      );
      
      if (rows[0].count === 0) {
        throw new Error(`Tabla requerida '${table}' no existe en la base de datos de test`);
      }
    }
  }

  /**
   * Limpia datos de test después de cada prueba
   */
  async cleanTestData() {
    if (!this.connection) return;

    try {
      // Desactivar verificación de claves foráneas temporalmente
      await this.connection.execute('SET FOREIGN_KEY_CHECKS = 0');
      
      // Limpiar tablas en orden correcto (respetando dependencias)
      const cleanupQueries = [
        'DELETE FROM tareas WHERE proyecto_id IN (SELECT id FROM proyectos WHERE titulo LIKE "%test%" OR titulo LIKE "%prueba%")',
        'DELETE FROM proyectos WHERE titulo LIKE "%test%" OR titulo LIKE "%prueba%" OR creado_por IN (SELECT id FROM usuarios WHERE email LIKE "%test%" OR email LIKE "%@example.com")',
        'DELETE FROM usuarios WHERE email LIKE "%test%" OR email LIKE "%@example.com"'
      ];

      for (const query of cleanupQueries) {
        await this.connection.execute(query);
      }
      
      // Reactivar verificación de claves foráneas
      await this.connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      
    } catch (error) {
      console.error('Error limpiando datos de test:', error.message);
      // No lanzar error para no interrumpir otros tests
    }
  }

  /**
   * Alias para cleanTestData para compatibilidad
   */
  async cleanup() {
    return await this.cleanTestData();
  }

  /**
   * Crea un usuario de prueba básico
   */
  async createTestUser(userData = {}) {
    const defaultUser = {
      nombre: 'Usuario Test',
      email: 'test@example.com',
      contraseña: '$2b$10$hashedpassword', // Password hasheado
      telefono: '1234567890',
      estado: true,
      es_administrador: false,
      ...userData
    };

    const [result] = await this.connection.execute(
      `INSERT INTO usuarios (nombre, email, contraseña, telefono, estado, es_administrador) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        defaultUser.nombre,
        defaultUser.email,
        defaultUser.contraseña,
        defaultUser.telefono,
        defaultUser.estado,
        defaultUser.es_administrador
      ]
    );

    return {
      id: result.insertId,
      ...defaultUser
    };
  }

  /**
   * Crea un proyecto de prueba
   */
  async createTestProject(projectData = {}, createdBy = null) {
    if (!createdBy) {
      const testUser = await this.createTestUser();
      createdBy = testUser.id;
    }

    const defaultProject = {
      titulo: 'Proyecto Test',
      descripcion: 'Descripción del proyecto de prueba',
      fecha_inicio: '2024-01-01',
      fecha_fin: '2024-12-31',
      estado: 'planificacion',
      creado_por: createdBy,
      ...projectData
    };

    const [result] = await this.connection.execute(
      `INSERT INTO proyectos (titulo, descripcion, fecha_inicio, fecha_fin, estado, creado_por) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        defaultProject.titulo,
        defaultProject.descripcion,
        defaultProject.fecha_inicio,
        defaultProject.fecha_fin,
        defaultProject.estado,
        defaultProject.creado_por
      ]
    );

    return {
      id: result.insertId,
      ...defaultProject
    };
  }

  /**
   * Crea una tarea de prueba
   */
  async createTestTask(taskData = {}, projectId = null, assignedUserId = null) {
    if (!projectId) {
      const testProject = await this.createTestProject();
      projectId = testProject.id;
    }

    if (!assignedUserId) {
      const testUser = await this.createTestUser();
      assignedUserId = testUser.id;
    }

    const defaultTask = {
      titulo: 'Tarea Test',
      descripcion: 'Descripción de la tarea de prueba',
      proyecto_id: projectId,
      usuario_asignado_id: assignedUserId,
      estado: 'pendiente',
      prioridad: 'media',
      fecha_vencimiento: '2024-06-30',
      ...taskData
    };

    const [result] = await this.connection.execute(
      `INSERT INTO tareas (titulo, descripcion, proyecto_id, usuario_asignado_id, estado, prioridad, fecha_vencimiento) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        defaultTask.titulo,
        defaultTask.descripcion,
        defaultTask.proyecto_id,
        defaultTask.usuario_asignado_id,
        defaultTask.estado,
        defaultTask.prioridad,
        defaultTask.fecha_vencimiento
      ]
    );

    return {
      id: result.insertId,
      ...defaultTask
    };
  }

  /**
   * Ejecuta una consulta SQL
   */
  async query(sql, params = []) {
    if (!this.connection) {
      throw new Error('Base de datos no inicializada');
    }
    
    try {
      const [results] = await this.connection.execute(sql, params);
      return results;
    } catch (error) {
      console.error('Error en consulta SQL:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de la base de datos
   */
  async getStats() {
    const stats = {};
    
    const tables = ['usuarios', 'proyectos', 'tareas'];
    
    for (const table of tables) {
      const [rows] = await this.connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
      stats[table] = rows[0].count;
    }
    
    return stats;
  }

  /**
   * Cierra la conexión a la base de datos
   */
  async close() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
      console.log('✅ Conexión a base de datos de test cerrada');
    }
  }
}

module.exports = DatabaseHelper;
/**
 * DatabaseHelper - Clase para manejo de base de datos en tests de integración
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja operaciones de base de datos para tests
 * - Open/Closed: Extensible para nuevas operaciones
 * - Dependency Inversion: Depende de abstracciones (mysql2)
 */

const mysql = require('mysql2/promise');
const TestLogger = require('./TestLogger');

class DatabaseHelper {
  constructor() {
    this.connection = null;
    this.logger = new TestLogger({ prefix: '[DB-HELPER]' });
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'kali',
      database: process.env.DB_NAME || 'gestion_proyectos',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    };
  }

  /**
   * Inicializar conexión a base de datos
   */
  async initialize() {
    try {
      this.logger.info('Inicializando conexión a base de datos original');
      
      // Conectar directamente a la base de datos original
      this.connection = await mysql.createConnection(this.config);
      
      this.logger.success('Conexión a base de datos establecida', {
        host: this.config.host,
        database: this.config.database
      });

      // Verificar que las tablas existen (no las creamos, usamos las existentes)
      await this.verifyTables();
      
    } catch (error) {
      this.logger.error('Error al inicializar base de datos', error);
      throw error;
    }
  }

  /**
   * Verificar que las tablas necesarias existen en la base de datos
   */
  async verifyTables() {
    try {
      this.logger.info('Verificando que las tablas necesarias existen');

      const requiredTables = [
        'usuarios', 'roles', 'usuario_roles', 'proyectos', 
        'proyecto_responsables', 'tareas', 'refresh_tokens', 
        'token_blacklist', 'logs_actividad'
      ];

      for (const tableName of requiredTables) {
        const [rows] = await this.connection.execute(
          `SELECT COUNT(*) as count FROM information_schema.tables 
           WHERE table_schema = ? AND table_name = ?`,
          [this.config.database, tableName]
        );
        
        if (rows[0].count === 0) {
          throw new Error(`Tabla requerida '${tableName}' no existe en la base de datos`);
        }
      }

      // Verificar que existen roles básicos
      const [roleRows] = await this.connection.execute(
        'SELECT COUNT(*) as count FROM roles WHERE nombre IN (?, ?, ?)',
        ['admin', 'responsable_proyecto', 'responsable_tarea']
      );

      if (roleRows[0].count < 3) {
        this.logger.info('Insertando roles básicos faltantes');
        await this.connection.execute(`
          INSERT IGNORE INTO roles (nombre) VALUES 
          ('admin'),
          ('responsable_proyecto'),
          ('responsable_tarea')
        `);
      }

      this.logger.success('Todas las tablas necesarias están presentes');

    } catch (error) {
      this.logger.error('Error al verificar tablas', error);
      throw error;
    }
  }

  /**
   * Configurar base de datos de test
   */
  async setupTestDatabase() {
    try {
      await this.initialize();
      // No limpiamos datos en la base de datos original, solo verificamos conexión
      this.logger.success('Base de datos original configurada para tests');
    } catch (error) {
      this.logger.error('Error configurando base de datos de test', error);
      throw error;
    }
  }

  /**
   * Limpiar base de datos de test
   */
  async cleanupTestDatabase() {
    try {
      // Solo cerramos la conexión, no limpiamos datos de la base original
      await this.close();
      this.logger.success('Cleanup de base de datos completado');
    } catch (error) {
      this.logger.error('Error en cleanup de base de datos', error);
      throw error;
    }
  }

  /**
   * Crear proyecto de prueba
   */
  async createTestProject(projectData = {}) {
    try {
      const defaultProject = {
        titulo: 'Proyecto Test',
        descripcion: 'Proyecto para pruebas',
        creado_por: 1,
        estado: 'planificacion',
        fecha_inicio: new Date(),
        fecha_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días después
      };

      const project = { ...defaultProject, ...projectData };
      
      const [result] = await this.connection.execute(
        `INSERT INTO proyectos (titulo, descripcion, creado_por, estado, fecha_inicio, fecha_fin) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [project.titulo, project.descripcion, project.creado_por, project.estado, project.fecha_inicio, project.fecha_fin]
      );

      const projectId = result.insertId;
      
      // Asignar al creador como responsable principal del proyecto
      await this.connection.execute(
        `INSERT INTO proyecto_responsables (proyecto_id, usuario_id, rol_responsabilidad, asignado_por, activo) 
         VALUES (?, ?, 'responsable_principal', ?, true)`,
        [projectId, project.creado_por, project.creado_por]
      );
      
      const createdProject = { ...project, id: projectId };
      
      this.logger.success('Proyecto de prueba creado con responsable asignado', { id: projectId, titulo: project.titulo, responsable: project.creado_por });
      return createdProject;
    } catch (error) {
      this.logger.error('Error creando proyecto de prueba', error);
      throw error;
    }
  }

  /**
   * Crear tarea de prueba
   */
  async createTestTask(taskData = {}) {
    try {
      // Crear usuario de prueba si no se proporciona creado_por
      let createdBy = taskData.creado_por;
      if (!createdBy) {
        const authHelper = require('./AuthHelper');
        const testUser = await new authHelper(null, this).createTestUser();
        createdBy = testUser.id;
      }

      const defaultTask = {
        titulo: 'Tarea Test',
        descripcion: 'Tarea para pruebas',
        proyecto_id: 1,
        usuario_asignado_id: 1,
        creado_por: createdBy,
        estado: 'pendiente',
        prioridad: 'media',
        fecha_inicio: new Date(),
        fecha_fin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días después
      };

      const task = { ...defaultTask, ...taskData, creado_por: createdBy };
      
      const [result] = await this.connection.execute(
        `INSERT INTO tareas (titulo, descripcion, proyecto_id, usuario_asignado_id, creado_por, estado, prioridad, fecha_inicio, fecha_fin) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [task.titulo, task.descripcion, task.proyecto_id, task.usuario_asignado_id, task.creado_por, task.estado, task.prioridad, task.fecha_inicio, task.fecha_fin]
      );

      const taskId = result.insertId;
      const createdTask = { ...task, id: taskId };
      
      this.logger.success('Tarea de prueba creada', { id: taskId, titulo: task.titulo });
      return createdTask;
    } catch (error) {
      this.logger.error('Error creando tarea de prueba', error);
      throw error;
    }
  }

  /**
   * Limpiar datos de prueba
   */
  async cleanTestData() {
    try {
      this.logger.database('Limpiando datos de prueba');

      // Limpiar en orden correcto para evitar violaciones de FK
      const cleanupQueries = [
        'DELETE FROM token_blacklist WHERE usuario_id IN (SELECT id FROM usuarios WHERE email LIKE "%test%" OR email LIKE "%@example.com")',
        'DELETE FROM refresh_tokens WHERE usuario_id IN (SELECT id FROM usuarios WHERE email LIKE "%test%" OR email LIKE "%@example.com")',
        'DELETE FROM logs_actividad WHERE usuario_id IN (SELECT id FROM usuarios WHERE email LIKE "%test%" OR email LIKE "%@example.com")',
        'DELETE FROM tareas WHERE proyecto_id IN (SELECT id FROM proyectos WHERE titulo LIKE "%Test%" OR titulo LIKE "%Prueba%")',
        'DELETE FROM proyecto_responsables WHERE proyecto_id IN (SELECT id FROM proyectos WHERE titulo LIKE "%Test%" OR titulo LIKE "%Prueba%")',
        'DELETE FROM proyectos WHERE titulo LIKE "%Test%" OR titulo LIKE "%Prueba%" OR creado_por IN (SELECT id FROM usuarios WHERE email LIKE "%test%" OR email LIKE "%@example.com")',
        'DELETE FROM usuario_roles WHERE usuario_id IN (SELECT id FROM usuarios WHERE email LIKE "%test%" OR email LIKE "%@example.com")',
        'DELETE FROM usuarios WHERE email LIKE "%test%" OR email LIKE "%@example.com"'
      ];

      for (const query of cleanupQueries) {
        await this.connection.execute(query);
      }

      this.logger.success('Datos de prueba limpiados exitosamente');

    } catch (error) {
      this.logger.error('Error al limpiar datos de prueba', error);
      throw error;
    }
  }

  /**
   * Ejecutar query personalizada
   */
  async query(sql, params = []) {
    try {
      this.logger.debug('Ejecutando query', { sql, params });
      const [results] = await this.connection.execute(sql, params);
      return results;
    } catch (error) {
      this.logger.error('Error en query', error);
      throw error;
    }
  }

  /**
   * Obtener usuario por email
   */
  async getUserByEmail(email) {
    const [users] = await this.connection.execute(
      'SELECT * FROM usuarios WHERE email = ?',
      [email]
    );
    return users[0] || null;
  }

  /**
   * Obtener proyecto por ID
   */
  async getProjectById(id) {
    const [projects] = await this.connection.execute(
      'SELECT * FROM proyectos WHERE id = ?',
      [id]
    );
    return projects[0] || null;
  }

  /**
   * Obtener tarea por ID
   */
  async getTaskById(id) {
    const [tasks] = await this.connection.execute(
      'SELECT * FROM tareas WHERE id = ?',
      [id]
    );
    return tasks[0] || null;
  }

  /**
   * Contar registros en una tabla
   */
  async countRecords(table, condition = '1=1', params = []) {
    const [result] = await this.connection.execute(
      `SELECT COUNT(*) as count FROM ${table} WHERE ${condition}`,
      params
    );
    return result[0].count;
  }

  /**
   * Cleanup completo de la base de datos
   */
  async cleanup() {
    try {
      this.logger.info('Iniciando cleanup completo de base de datos');
      await this.cleanTestData();
      this.logger.success('Cleanup completo exitoso');
    } catch (error) {
      this.logger.error('Error en cleanup completo', error);
      throw error;
    }
  }

  /**
   * Cerrar conexión
   */
  async close() {
    try {
      if (this.connection) {
        await this.connection.end();
        this.connection = null;
        this.logger.info('Conexión a base de datos cerrada');
      }
    } catch (error) {
      this.logger.error('Error al cerrar conexión', error);
      throw error;
    }
  }
}

module.exports = DatabaseHelper;
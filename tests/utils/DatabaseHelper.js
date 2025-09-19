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
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestion_proyectos_test',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    };
  }

  /**
   * Inicializar conexión a base de datos
   */
  async initialize() {
    try {
      this.logger.info('Inicializando conexión a base de datos de pruebas');
      
      // Crear conexión sin especificar base de datos primero
      const tempConnection = await mysql.createConnection({
        ...this.config,
        database: undefined
      });

      // Crear base de datos de pruebas si no existe
      await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${this.config.database}\``);
      await tempConnection.end();

      // Conectar a la base de datos de pruebas
      this.connection = await mysql.createConnection(this.config);
      
      this.logger.success('Conexión a base de datos establecida', {
        host: this.config.host,
        database: this.config.database
      });

      // Crear tablas si no existen
      await this.createTables();
      
    } catch (error) {
      this.logger.error('Error al inicializar base de datos', error);
      throw error;
    }
  }

  /**
   * Crear tablas necesarias para tests
   */
  async createTables() {
    try {
      this.logger.info('Verificando y creando tablas necesarias');

      // Crear tablas una por una para evitar problemas con múltiples statements
      const tables = [
        `CREATE TABLE IF NOT EXISTS usuarios (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          contraseña VARCHAR(255) NOT NULL,
          telefono VARCHAR(20),
          estado BOOLEAN DEFAULT TRUE,
          es_administrador BOOLEAN DEFAULT FALSE,
          configuraciones JSON DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS roles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nombre VARCHAR(50) NOT NULL UNIQUE
        )`,
        
        `CREATE TABLE IF NOT EXISTS usuario_roles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          usuario_id INT NOT NULL,
          rol_id INT NOT NULL,
          activo BOOLEAN DEFAULT TRUE,
          asignado_por INT,
          fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
          FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE,
          FOREIGN KEY (asignado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
          UNIQUE KEY unique_usuario_rol (usuario_id, rol_id)
        )`,
        
        `CREATE TABLE IF NOT EXISTS proyectos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          titulo VARCHAR(150) NOT NULL,
          descripcion TEXT,
          fecha_inicio DATE,
          fecha_fin DATE,
          estado ENUM('planificacion', 'en_progreso', 'completado', 'cancelado') DEFAULT 'planificacion',
          creado_por INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (creado_por) REFERENCES usuarios(id)
        )`,
        
        `CREATE TABLE IF NOT EXISTS proyecto_responsables (
          id INT AUTO_INCREMENT PRIMARY KEY,
          proyecto_id INT NOT NULL,
          usuario_id INT NOT NULL,
          activo BOOLEAN DEFAULT TRUE,
          asignado_por INT,
          fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
          FOREIGN KEY (asignado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
          UNIQUE KEY unique_proyecto_responsable (proyecto_id, usuario_id)
        )`,
        
        `CREATE TABLE IF NOT EXISTS tareas (
          id INT AUTO_INCREMENT PRIMARY KEY,
          titulo VARCHAR(150) NOT NULL,
          descripcion TEXT,
          proyecto_id INT NOT NULL,
          usuario_asignado_id INT,
          estado ENUM('pendiente', 'en_progreso', 'completada', 'cancelada') DEFAULT 'pendiente',
          prioridad ENUM('baja', 'media', 'alta', 'critica') DEFAULT 'media',
          fecha_inicio DATE,
          fecha_fin DATE,
          fecha_limite DATE,
          porcentaje_completado DECIMAL(5,2) DEFAULT 0.00,
          tiempo_estimado INT,
          tiempo_real INT,
          padre_tarea_id INT,
          creado_por INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
          FOREIGN KEY (usuario_asignado_id) REFERENCES usuarios(id) ON DELETE SET NULL,
          FOREIGN KEY (creado_por) REFERENCES usuarios(id),
          FOREIGN KEY (padre_tarea_id) REFERENCES tareas(id) ON DELETE SET NULL,
          CONSTRAINT chk_porcentaje_completado CHECK (porcentaje_completado >= 0 AND porcentaje_completado <= 100)
        )`,
        
        `CREATE TABLE IF NOT EXISTS refresh_tokens (
          id INT AUTO_INCREMENT PRIMARY KEY,
          token VARCHAR(500) NOT NULL UNIQUE,
          usuario_id INT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          is_revoked BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        )`,
        
        `CREATE TABLE IF NOT EXISTS token_blacklist (
          id INT AUTO_INCREMENT PRIMARY KEY,
          token_jti VARCHAR(255) NOT NULL UNIQUE,
          usuario_id INT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        )`,
        
        `CREATE TABLE IF NOT EXISTS logs_actividad (
          id INT AUTO_INCREMENT PRIMARY KEY,
          usuario_id INT,
          accion VARCHAR(100) NOT NULL,
          entidad_tipo VARCHAR(50) NOT NULL,
          entidad_id INT NOT NULL,
          descripcion TEXT,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
        )`
      ];

      // Ejecutar cada tabla por separado
      for (const tableSQL of tables) {
        await this.connection.execute(tableSQL);
      }

      // Insertar roles básicos
      await this.connection.execute(`
        INSERT IGNORE INTO roles (nombre) VALUES 
        ('admin'),
        ('responsable_proyecto'),
        ('responsable_tarea')
      `);

      this.logger.success('Tablas creadas/verificadas exitosamente');

    } catch (error) {
      this.logger.error('Error al crear tablas', error);
      throw error;
    }
  }

  /**
   * Configurar base de datos de test
   */
  async setupTestDatabase() {
    try {
      await this.initialize();
      await this.createTables();
      await this.cleanTestData();
      this.logger.success('Base de datos de test configurada exitosamente');
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
      await this.cleanTestData();
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
      const createdProject = { ...project, id: projectId };
      
      this.logger.success('Proyecto de prueba creado', { id: projectId, titulo: project.titulo });
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
      const defaultTask = {
        titulo: 'Tarea Test',
        descripcion: 'Tarea para pruebas',
        proyecto_id: 1,
        usuario_asignado_id: 1,
        creado_por: 1,
        estado: 'pendiente',
        prioridad: 'media',
        fecha_inicio: new Date(),
        fecha_fin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días después
      };

      const task = { ...defaultTask, ...taskData };
      
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
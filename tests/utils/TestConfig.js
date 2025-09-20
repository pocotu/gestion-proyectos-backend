/**
 * TestConfig - Configuración centralizada para tests de integración
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja configuración de tests
 * - Open/Closed: Extensible para nuevas configuraciones
 * - Dependency Inversion: Configuración basada en abstracciones
 */

const path = require('path');
const TestLogger = require('./TestLogger');

class TestConfig {
  constructor() {
    this.logger = new TestLogger({ prefix: '[TEST-CONFIG]' });
    this.config = this.loadConfiguration();
  }

  /**
   * Cargar configuración completa
   */
  loadConfiguration() {
    const config = {
      // Configuración de Base de Datos
      database: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_proyectos_test',
        port: parseInt(process.env.DB_PORT) || 3306,
        connectionLimit: 10,
        acquireTimeout: 60000,
        timeout: 60000
      },

      // Configuración de JWT
      jwt: {
        secret: process.env.JWT_SECRET || 'test_jwt_secret_key_for_integration_tests',
        expiresIn: '1h',
        issuer: 'gestion-proyectos-test',
        algorithm: 'HS256'
      },

      // Configuración del Servidor
      server: {
        port: parseInt(process.env.TEST_PORT) || 3001,
        host: process.env.TEST_HOST || 'localhost',
        baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3001'
      },

      // Configuración de Tests
      test: {
        timeout: 30000, // 30 segundos por test
        retries: 2,
        parallel: false, // Para evitar conflictos de DB
        verbose: process.env.TEST_VERBOSE === 'true',
        coverage: process.env.TEST_COVERAGE === 'true'
      },

      // Configuración de Logging
      logging: {
        level: process.env.TEST_LOG_LEVEL || 'info',
        silent: process.env.NODE_ENV === 'test',
        file: process.env.TEST_LOG_FILE || null
      },

      // Configuración de Endpoints
      endpoints: {
        auth: {
          register: '/api/auth/register',
          login: '/api/auth/login',
          logout: '/api/auth/logout',
          refresh: '/api/auth/refresh',
          profile: '/api/auth/profile'
        },
        users: {
          base: '/api/users',
          profile: '/api/users/profile',
          list: '/api/users',
          create: '/api/users',
          update: '/api/users/:id',
          delete: '/api/users/:id',
          roles: '/api/users/:id/roles'
        },
        projects: {
          base: '/api/projects',
          list: '/api/projects',
          create: '/api/projects',
          update: '/api/projects/:id',
          delete: '/api/projects/:id',
          detail: '/api/projects/:id',
          members: '/api/projects/:id/members',
          tasks: '/api/projects/:id/tasks',
          responsible: '/api/projects/:id/responsibles',
          responsibles: '/api/projects/:id/responsibles',
          stats: '/api/projects/:id/stats',
          my: '/api/projects/my-projects',
          search: '/api/projects/search'
        },
        tasks: {
          base: '/api/tasks',
          list: '/api/tasks',
          create: '/api/tasks',
          update: '/api/tasks/:id',
          delete: '/api/tasks/:id',
          assign: '/api/tasks/:id/assign',
          status: '/api/tasks/:id/status'
        },
        dashboard: {
          base: '/api/dashboard',
          stats: '/api/dashboard/stats',
          projects: '/api/dashboard/projects',
          tasks: '/api/dashboard/tasks',
          activity: '/api/dashboard/activity'
        }
      },

      // Datos de prueba por defecto
      testData: {
        users: {
          admin: {
            nombre: 'Admin Test',
            email: 'admin@test.com',
            contraseña: 'admin123',
            telefono: '1234567890',
            es_administrador: true
          },
          regular: {
            nombre: 'Usuario Test',
            email: 'user@test.com',
            contraseña: 'user123',
            telefono: '0987654321',
            es_administrador: false
          },
          manager: {
            nombre: 'Manager Test',
            email: 'manager@test.com',
            contraseña: 'manager123',
            telefono: '1122334455',
            es_administrador: false
          }
        },
        projects: {
          sample: {
            titulo: 'Proyecto Test',
            descripcion: 'Descripción del proyecto de prueba',
            fecha_inicio: '2024-01-01',
            fecha_fin: '2024-12-31',
            estado: 'en_progreso'
          },
          completed: {
            titulo: 'Proyecto Completado Test',
            descripcion: 'Proyecto completado para pruebas',
            fecha_inicio: '2023-01-01',
            fecha_fin: '2023-12-31',
            estado: 'completado'
          }
        },
        tasks: {
          sample: {
            titulo: 'Tarea Test',
            descripcion: 'Descripción de tarea de prueba',
            fecha_inicio: '2024-01-01',
            fecha_fin: '2024-01-31',
            estado: 'pendiente',
            prioridad: 'media'
          },
          urgent: {
            titulo: 'Tarea Urgente Test',
            descripcion: 'Tarea urgente para pruebas',
            fecha_inicio: '2024-01-01',
            fecha_fin: '2024-01-07',
            estado: 'en_progreso',
            prioridad: 'alta'
          }
        }
      },

      // Configuración de Validaciones
      validation: {
        email: {
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          maxLength: 100
        },
        password: {
          minLength: 6,
          maxLength: 50,
          requireSpecialChar: false
        },
        name: {
          minLength: 2,
          maxLength: 100
        },
        phone: {
          pattern: /^\d{10,15}$/
        }
      },

      // Configuración de Rate Limiting (deshabilitado en tests)
      rateLimit: {
        enabled: false,
        windowMs: 15 * 60 * 1000, // 15 minutos
        max: 1000 // requests por ventana
      },

      // Configuración de CORS para tests
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
      }
    };

    this.logger.info('Configuración de tests cargada', {
      database: config.database.database,
      server: `${config.server.host}:${config.server.port}`,
      testTimeout: config.test.timeout
    });

    return config;
  }

  /**
   * Obtener configuración completa
   */
  getConfig() {
    return this.config;
  }

  /**
   * Obtener configuración de base de datos
   */
  getDatabaseConfig() {
    return this.config.database;
  }

  /**
   * Obtener configuración de JWT
   */
  getJWTConfig() {
    return this.config.jwt;
  }

  /**
   * Obtener configuración del servidor
   */
  getServerConfig() {
    return this.config.server;
  }

  /**
   * Obtener endpoint específico
   */
  getEndpoint(category, endpoint) {
    return this.config.endpoints[category]?.[endpoint];
  }

  /**
   * Obtener URL completa de endpoint
   */
  getFullEndpointUrl(category, endpoint, params = {}) {
    let url = this.config.endpoints[category]?.[endpoint];
    if (!url) {
      throw new Error(`Endpoint ${category}.${endpoint} no encontrado`);
    }

    // Reemplazar parámetros en la URL
    Object.keys(params).forEach(key => {
      url = url.replace(`:${key}`, params[key]);
    });

    // Asegurar que la baseUrl termine con / y la url no empiece con /
    const baseUrl = this.config.server.baseUrl.replace(/\/$/, '');
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;

    return `${baseUrl}${cleanUrl}`;
  }

  /**
   * Obtener datos de prueba
   */
  getTestData(category, type = null) {
    if (type) {
      return this.config.testData[category]?.[type];
    }
    return this.config.testData[category];
  }

  /**
   * Obtener configuración de validación
   */
  getValidationConfig(field) {
    return this.config.validation[field];
  }

  /**
   * Verificar si está en modo verbose
   */
  isVerbose() {
    return this.config.test.verbose;
  }

  /**
   * Obtener timeout de tests
   */
  getTestTimeout() {
    return this.config.test.timeout;
  }

  /**
   * Obtener número de reintentos
   */
  getTestRetries() {
    return this.config.test.retries;
  }

  /**
   * Verificar si los tests deben ejecutarse en paralelo
   */
  shouldRunInParallel() {
    return this.config.test.parallel;
  }

  /**
   * Obtener configuración de logging
   */
  getLoggingConfig() {
    return this.config.logging;
  }

  /**
   * Actualizar configuración en tiempo de ejecución
   */
  updateConfig(path, value) {
    const keys = path.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    
    this.logger.debug('Configuración actualizada', { path, value });
  }

  /**
   * Validar configuración
   */
  validateConfig() {
    const required = [
      'database.host',
      'database.user',
      'database.database',
      'jwt.secret',
      'server.port'
    ];

    const missing = [];
    
    required.forEach(path => {
      const keys = path.split('.');
      let current = this.config;
      
      for (const key of keys) {
        if (!current || current[key] === undefined) {
          missing.push(path);
          break;
        }
        current = current[key];
      }
    });

    if (missing.length > 0) {
      throw new Error(`Configuración faltante: ${missing.join(', ')}`);
    }

    this.logger.success('Configuración validada exitosamente');
    return true;
  }

  /**
   * Obtener configuración para entorno específico
   */
  getEnvironmentConfig(env = 'test') {
    const envConfig = { ...this.config };
    
    // Ajustes específicos por entorno
    switch (env) {
      case 'test':
        envConfig.logging.silent = true;
        envConfig.rateLimit.enabled = false;
        break;
      case 'development':
        envConfig.logging.level = 'debug';
        envConfig.test.verbose = true;
        break;
      case 'ci':
        envConfig.test.parallel = true;
        envConfig.test.timeout = 60000;
        break;
    }

    return envConfig;
  }
}

// Singleton para configuración global
let testConfigInstance = null;

function getTestConfig() {
  if (!testConfigInstance) {
    testConfigInstance = new TestConfig();
  }
  return testConfigInstance;
}

module.exports = { TestConfig, getTestConfig };
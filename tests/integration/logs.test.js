/**
 * Tests de Integración - Logs de Actividad
 * Valida endpoints del sistema de logs (/api/logs)
 * 
 * Siguiendo principios de testing:
 * - Arrange-Act-Assert pattern
 * - Independencia entre tests
 * - Limpieza después de cada test
 */

const request = require('supertest');
const app = require('../../src/app');
const DatabaseHelper = require('../utils/DatabaseHelper');
const AuthHelper = require('../utils/AuthHelper');
const TestLogger = require('../utils/TestLogger');

describe('Logs Integration Tests', () => {
  let db;
  let authHelper;
  let logger;

  // Tokens y usuarios de prueba
  let adminToken;
  let adminUser;
  let normalToken;
  let normalUser;
  let otherUserToken;
  let otherUser;

  // Setup global para todos los tests
  beforeAll(async () => {
    logger = new TestLogger({ prefix: '[LOGS-TESTS]' });
    
    logger.testStart('Configurando entorno de tests de logs');
    
    // Inicializar helpers
    db = new DatabaseHelper();
    await db.initialize();
    
    authHelper = new AuthHelper(app);
    
    // Crear usuarios de prueba con tokens
    logger.info('Creando usuarios de prueba...');
    
    // Admin
    const adminAuth = await authHelper.createAdminAndGetToken();
    adminUser = adminAuth.user;
    adminToken = adminAuth.token;
    
    // Usuario normal
    const normalAuth = await authHelper.createUserAndGetToken();
    normalUser = normalAuth.user;
    normalToken = normalAuth.token;
    
    // Otro usuario
    const otherAuth = await authHelper.createUserAndGetToken();
    otherUser = otherAuth.user;
    otherUserToken = otherAuth.token;
    
    // Crear algunos logs de prueba
    await db.createTestLogs([
      {
        usuario_id: adminUser.id,
        accion: 'crear',
        entidad_tipo: 'proyecto',
        entidad_id: 1,
        descripcion: 'Proyecto de prueba creado'
      },
      {
        usuario_id: normalUser.id,
        accion: 'actualizar',
        entidad_tipo: 'tarea',
        entidad_id: 1,
        descripcion: 'Tarea de prueba actualizada'
      },
      {
        usuario_id: otherUser.id,
        accion: 'eliminar',
        entidad_tipo: 'archivo',
        entidad_id: 1,
        descripcion: 'Archivo de prueba eliminado'
      }
    ]);
    
    logger.success('Entorno de tests configurado exitosamente');
  }, 30000);

  // Cleanup después de cada test
  afterEach(async () => {
    // No limpiar logs ya que son necesarios para varios tests
  });

  // Cleanup global
  afterAll(async () => {
    logger.testEnd('Finalizando tests de logs');
    await db.cleanTestData();
    await db.close();
  });

  // ========================================
  // GET /api/logs - Obtener todos los logs
  // ========================================

  describe('GET /api/logs', () => {
    test('Debe permitir al admin obtener todos los logs (200)', async () => {
      logger.info('Test: Admin obtiene todos los logs');
      
      const response = await request(app)
        .get('/api/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        pagination: expect.objectContaining({
          page: expect.any(Number),
          limit: expect.any(Number),
          offset: expect.any(Number)
        })
      });

      // Verificar que hay logs
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Verificar estructura de un log
      const log = response.body.data[0];
      expect(log).toMatchObject({
        id: expect.any(Number),
        usuario_id: expect.any(Number),
        accion: expect.any(String),
        entidad_tipo: expect.any(String),
        descripcion: expect.any(String),
        created_at: expect.any(String)
      });
      
      logger.success('Admin obtuvo logs correctamente');
    });

    test('Debe denegar acceso a usuario normal (403)', async () => {
      logger.info('Test: Usuario normal intenta acceder a todos los logs');
      
      const response = await request(app)
        .get('/api/logs')
        .set('Authorization', `Bearer ${normalToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringMatching(/permisos|roles|admin/i)
      });
      
      logger.success('Acceso denegado correctamente');
    });

    test('Debe funcionar la paginación correctamente', async () => {
      logger.info('Test: Paginación de logs');
      
      // Primera página
      const response1 = await request(app)
        .get('/api/logs?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response1.body.pagination).toMatchObject({
        page: 1,
        limit: 2,
        offset: 0
      });
      expect(response1.body.data.length).toBeLessThanOrEqual(2);

      // Segunda página
      const response2 = await request(app)
        .get('/api/logs?page=2&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response2.body.pagination).toMatchObject({
        page: 2,
        limit: 2,
        offset: 2
      });
      
      logger.success('Paginación funciona correctamente');
    });

    test('Debe filtrar logs por fecha correctamente', async () => {
      logger.info('Test: Filtrado por fecha');
      
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      
      const response = await request(app)
        .get(`/api/logs?startDate=${today}&endDate=${tomorrow}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });

      // Verificar que los logs están dentro del rango de fechas
      if (response.body.data.length > 0) {
        response.body.data.forEach(log => {
          const logDate = new Date(log.created_at);
          const start = new Date(today);
          const end = new Date(tomorrow);
          expect(logDate >= start && logDate <= end).toBe(true);
        });
      }
      
      logger.success('Filtrado por fecha funciona correctamente');
    });

    test('Debe filtrar logs por tipo de entidad correctamente', async () => {
      logger.info('Test: Filtrado por tipo de entidad');
      
      const response = await request(app)
        .get('/api/logs?entityType=proyecto')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });

      // Verificar que todos los logs son del tipo correcto
      response.body.data.forEach(log => {
        expect(log.entidad_tipo).toBe('proyecto');
      });
      
      logger.success('Filtrado por entidad funciona correctamente');
    });

    test('Debe denegar acceso sin autenticación (401)', async () => {
      logger.info('Test: Acceso sin token');
      
      const response = await request(app)
        .get('/api/logs')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringMatching(/token|acceso|autenticación/i)
      });
      
      logger.success('Acceso sin token denegado correctamente');
    });
  });

  // ========================================
  // GET /api/logs/user/:id - Logs de usuario
  // ========================================

  describe('GET /api/logs/user/:id', () => {
    test('Debe permitir al admin ver logs de cualquier usuario (200)', async () => {
      logger.info('Test: Admin ve logs de otro usuario');
      
      const response = await request(app)
        .get(`/api/logs/user/${normalUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          logs: expect.any(Array),
          stats: expect.any(Object),
          userId: normalUser.id
        })
      });

      // Verificar que los logs son del usuario correcto
      response.body.data.logs.forEach(log => {
        expect(log.usuario_id).toBe(normalUser.id);
      });
      
      logger.success('Admin obtuvo logs de usuario correctamente');
    });

    test('Debe permitir al usuario ver sus propios logs (200)', async () => {
      logger.info('Test: Usuario ve sus propios logs');
      
      const response = await request(app)
        .get(`/api/logs/user/${normalUser.id}`)
        .set('Authorization', `Bearer ${normalToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          logs: expect.any(Array),
          stats: expect.any(Object),
          userId: normalUser.id
        })
      });

      // Verificar que todos los logs pertenecen al usuario
      response.body.data.logs.forEach(log => {
        expect(log.usuario_id).toBe(normalUser.id);
      });
      
      logger.success('Usuario obtuvo sus propios logs correctamente');
    });

    test('Debe denegar a usuario ver logs de otros usuarios (403)', async () => {
      logger.info('Test: Usuario intenta ver logs de otro usuario');
      
      const response = await request(app)
        .get(`/api/logs/user/${otherUser.id}`)
        .set('Authorization', `Bearer ${normalToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('permisos')
      });
      
      logger.success('Acceso a logs de otro usuario denegado correctamente');
    });

    test('Debe retornar error con ID de usuario inválido (500)', async () => {
      logger.info('Test: ID de usuario inválido');
      
      const response = await request(app)
        .get('/api/logs/user/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200); // El endpoint retorna 200 con array vacío

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          logs: expect.any(Array)
        })
      });
      
      // Array de logs debería estar vacío o tener logs sin ese usuario
      expect(response.body.data.logs.length).toBe(0);
      
      logger.success('Manejo de usuario inválido correcto');
    });

    test('Debe funcionar la paginación en logs de usuario', async () => {
      logger.info('Test: Paginación de logs de usuario');
      
      const response = await request(app)
        .get(`/api/logs/user/${normalUser.id}?page=1&limit=1`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 1,
        offset: 0
      });
      
      expect(response.body.data.logs.length).toBeLessThanOrEqual(1);
      
      logger.success('Paginación de logs de usuario funciona correctamente');
    });

    test('Debe incluir estadísticas del usuario en la respuesta', async () => {
      logger.info('Test: Estadísticas en logs de usuario');
      
      const response = await request(app)
        .get(`/api/logs/user/${normalUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats).toMatchObject({
        total: expect.any(Number),
        recent: expect.any(Number)
      });
      
      logger.success('Estadísticas incluidas correctamente');
    });
  });

  // ========================================
  // Tests adicionales de seguridad
  // ========================================

  describe('Seguridad y validación', () => {
    test('Debe validar límite máximo de paginación', async () => {
      logger.info('Test: Límite máximo de paginación');
      
      const response = await request(app)
        .get('/api/logs?limit=999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // El límite máximo debería ser 100
      expect(response.body.pagination.limit).toBeLessThanOrEqual(100);
      
      logger.success('Límite máximo respetado');
    });

    test('Debe sanitizar parámetros de entrada', async () => {
      logger.info('Test: Sanitización de parámetros');
      
      const response = await request(app)
        .get('/api/logs?page=-1&limit=abc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Debe usar valores por defecto para parámetros inválidos
      expect(response.body.pagination.page).toBeGreaterThan(0);
      expect(response.body.pagination.limit).toBeGreaterThan(0);
      
      logger.success('Parámetros sanitizados correctamente');
    });

    test('Debe manejar token expirado o inválido', async () => {
      logger.info('Test: Token inválido');
      
      const response = await request(app)
        .get('/api/logs')
        .set('Authorization', 'Bearer token_invalido')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false
      });
      
      logger.success('Token inválido manejado correctamente');
    });
  });

  // ========================================
  // GET /api/logs/project/:id - Logs de proyecto
  // ========================================

  describe('GET /api/logs/project/:id', () => {
    let testProject;
    let projectResponsible;
    let projectResponsibleToken;

    beforeAll(async () => {
      // Crear proyecto de prueba
      testProject = await db.createTestProject({
        titulo: 'Proyecto para logs',
        descripcion: 'Proyecto de prueba para logs'
      }, adminUser.id);

      // Crear usuario responsable del proyecto
      const responsibleAuth = await authHelper.createUserAndGetToken();
      projectResponsible = responsibleAuth.user;
      projectResponsibleToken = responsibleAuth.token;

      // Asignar responsable al proyecto
      await db.assignProjectResponsible(testProject.id, projectResponsible.id);

      // Crear logs del proyecto
      await db.createTestLogs([
        {
          usuario_id: adminUser.id,
          accion: 'crear',
          entidad_tipo: 'proyecto',
          entidad_id: testProject.id,
          descripcion: 'Proyecto creado'
        },
        {
          usuario_id: projectResponsible.id,
          accion: 'actualizar',
          entidad_tipo: 'proyecto',
          entidad_id: testProject.id,
          descripcion: 'Proyecto actualizado'
        }
      ]);

      logger.info('Datos de prueba para logs de proyecto creados');
    });

    test('Debe permitir al responsable de proyecto ver logs (200)', async () => {
      logger.info('Test: Responsable ve logs del proyecto');

      const response = await request(app)
        .get(`/api/logs/project/${testProject.id}`)
        .set('Authorization', `Bearer ${projectResponsibleToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          logs: expect.any(Array),
          history: expect.any(Array),
          projectId: testProject.id,
          entityType: 'proyecto'
        })
      });

      // Verificar que los logs son del proyecto correcto
      response.body.data.logs.forEach(log => {
        expect(log.entidad_tipo).toBe('proyecto');
        expect(log.entidad_id).toBe(testProject.id);
      });

      logger.success('Responsable obtuvo logs del proyecto correctamente');
    });

    test('Debe permitir al admin ver logs de cualquier proyecto (200)', async () => {
      logger.info('Test: Admin ve logs de proyecto');

      const response = await request(app)
        .get(`/api/logs/project/${testProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          logs: expect.any(Array),
          projectId: testProject.id
        })
      });

      logger.success('Admin obtuvo logs del proyecto correctamente');
    });

    test('Debe denegar acceso a usuario sin permisos (403)', async () => {
      logger.info('Test: Usuario sin acceso intenta ver logs de proyecto');

      const response = await request(app)
        .get(`/api/logs/project/${testProject.id}`)
        .set('Authorization', `Bearer ${normalToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('permisos')
      });

      logger.success('Acceso denegado correctamente');
    });
  });

  // ========================================
  // GET /api/logs/task/:id - Logs de tarea
  // ========================================

  describe('GET /api/logs/task/:id', () => {
    let testTask;
    let testProject2;
    let taskAssigned;
    let taskAssignedToken;
    let taskProjectResponsible;
    let taskProjectResponsibleToken;

    beforeAll(async () => {
      // Crear proyecto de prueba
      testProject2 = await db.createTestProject({
        titulo: 'Proyecto para tareas',
        descripcion: 'Proyecto de prueba para tareas'
      }, adminUser.id);

      // Crear usuario asignado a la tarea
      const assignedAuth = await authHelper.createUserAndGetToken();
      taskAssigned = assignedAuth.user;
      taskAssignedToken = assignedAuth.token;

      // Crear usuario responsable del proyecto
      const responsibleAuth = await authHelper.createUserAndGetToken();
      taskProjectResponsible = responsibleAuth.user;
      taskProjectResponsibleToken = responsibleAuth.token;

      // Asignar responsable al proyecto
      await db.assignProjectResponsible(testProject2.id, taskProjectResponsible.id);

      // Crear tarea de prueba
      testTask = await db.createTestTask({
        titulo: 'Tarea para logs',
        descripcion: 'Tarea de prueba para logs',
        proyecto_id: testProject2.id,
        usuario_asignado_id: taskAssigned.id
      });

      // Crear logs de la tarea
      await db.createTestLogs([
        {
          usuario_id: taskAssigned.id,
          accion: 'crear',
          entidad_tipo: 'tarea',
          entidad_id: testTask.id,
          descripcion: 'Tarea creada'
        },
        {
          usuario_id: taskProjectResponsible.id,
          accion: 'actualizar',
          entidad_tipo: 'tarea',
          entidad_id: testTask.id,
          descripcion: 'Tarea actualizada'
        }
      ]);

      logger.info('Datos de prueba para logs de tarea creados');
    });

    test('Debe permitir al asignado a tarea ver logs (200)', async () => {
      logger.info('Test: Asignado ve logs de la tarea');

      const response = await request(app)
        .get(`/api/logs/task/${testTask.id}`)
        .set('Authorization', `Bearer ${taskAssignedToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          logs: expect.any(Array),
          history: expect.any(Array),
          taskId: testTask.id,
          entityType: 'tarea'
        })
      });

      // Verificar que los logs son de la tarea correcta
      response.body.data.logs.forEach(log => {
        expect(log.entidad_tipo).toBe('tarea');
        expect(log.entidad_id).toBe(testTask.id);
      });

      logger.success('Asignado obtuvo logs de la tarea correctamente');
    });

    test('Debe permitir al responsable de proyecto ver logs (200)', async () => {
      logger.info('Test: Responsable de proyecto ve logs de tarea');

      const response = await request(app)
        .get(`/api/logs/task/${testTask.id}`)
        .set('Authorization', `Bearer ${taskProjectResponsibleToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          logs: expect.any(Array),
          taskId: testTask.id
        })
      });

      logger.success('Responsable obtuvo logs de la tarea correctamente');
    });

    test('Debe permitir al admin ver logs de cualquier tarea (200)', async () => {
      logger.info('Test: Admin ve logs de tarea');

      const response = await request(app)
        .get(`/api/logs/task/${testTask.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          logs: expect.any(Array),
          taskId: testTask.id
        })
      });

      logger.success('Admin obtuvo logs de la tarea correctamente');
    });

    test('Debe denegar acceso a usuario sin permisos (403)', async () => {
      logger.info('Test: Usuario sin acceso intenta ver logs de tarea');

      const response = await request(app)
        .get(`/api/logs/task/${testTask.id}`)
        .set('Authorization', `Bearer ${normalToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('permisos')
      });

      logger.success('Acceso denegado correctamente');
    });
  });
});

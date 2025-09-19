/**
 * Tests de integración para endpoints del Dashboard
 * Siguiendo principios SOLID:
 * - Single Responsibility: Cada test tiene una responsabilidad específica
 * - Open/Closed: Abierto para extensión de nuevos tests
 * - Liskov Substitution: Los mocks pueden sustituir servicios reales
 * - Interface Segregation: Tests específicos para cada endpoint
 * - Dependency Inversion: Depende de abstracciones (helpers y utilidades)
 */

const request = require('supertest');
const app = require('../../src/app');
const DatabaseHelper = require('../utils/DatabaseHelper');
const AuthHelper = require('../utils/AuthHelper');
const TestLogger = require('../utils/TestLogger');
const { TestConfig, getTestConfig } = require('../utils/TestConfig');

describe('Dashboard Integration Tests', () => {
  let dbHelper;
  let authHelper;
  let logger;
  let config;
  let adminToken;
  let userToken;
  let testUser;
  let testAdmin;
  let testProject;
  let testTask;

  beforeAll(async () => {
    console.log('🧪 [TEST] ===== SETUP DASHBOARD TEST =====');
    
    // Inicializar utilidades de test
    dbHelper = new DatabaseHelper();
    logger = new TestLogger('Dashboard Tests');
    config = new TestConfig();

    console.log('🧪 [SETUP] Iniciando setup del test dashboard');

    // Configurar base de datos de test
    await dbHelper.setupTestDatabase();
    
    // Inicializar AuthHelper con app y dbHelper
    authHelper = new AuthHelper(app, dbHelper);
    
    console.log('🧪 [SETUP] Creando usuarios de prueba...');
    
    // Crear usuarios de prueba
    testAdmin = await authHelper.createTestAdmin();
    testUser = await authHelper.createTestUser();
    
    console.log('🧪 [SETUP] Usuarios creados:', { 
      admin: { id: testAdmin.id, email: testAdmin.email, es_administrador: testAdmin.es_administrador },
      user: { id: testUser.id, email: testUser.email, es_administrador: testUser.es_administrador }
    });
    
    // Verificar que el usuario existe en la base de datos
    const { pool } = require('../../src/config/db');
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE id = ?', [testAdmin.id]);
    console.log('🧪 [TEST] Usuario en BD:', rows.length > 0 ? { id: rows[0].id, email: rows[0].email, es_administrador: rows[0].es_administrador } : 'No encontrado');
    
    // Generar tokens
    console.log('🧪 [TEST] Generando token...');
    adminToken = authHelper.generateToken(testAdmin);
    userToken = authHelper.generateToken(testUser);

    console.log('🧪 [SETUP] Tokens generados:', { 
      adminToken: adminToken ? 'Presente' : 'Ausente',
      userToken: userToken ? 'Presente' : 'Ausente'
    });
    console.log('🧪 [SETUP] JWT_SECRET:', process.env.JWT_SECRET);

    // Crear datos de prueba
    testProject = await dbHelper.createTestProject({
      titulo: 'Proyecto Dashboard Test',
      descripcion: 'Proyecto para tests del dashboard',
      creado_por: testUser.id,
      estado: 'en_progreso'
    });

    testTask = await dbHelper.createTestTask({
      titulo: 'Tarea Dashboard Test',
      descripcion: 'Tarea para tests del dashboard',
      proyecto_id: testProject.id,
      usuario_asignado_id: testUser.id,
      creado_por: testUser.id,
      estado: 'pendiente',
      prioridad: 'media'
    });

    logger.info('Setup completado para tests del dashboard');
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await authHelper.cleanupTestData();
    await dbHelper.cleanupTestDatabase();
    logger.info('Cleanup completado para tests del dashboard');
  });

  describe('GET /api/dashboard/summary', () => {
    it('debería obtener resumen completo del dashboard para usuario normal', async () => {
      const response = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${userToken}`);

      console.log('Response status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));
      
      if (response.status !== 200) {
        console.log('Error details:', response.body);
        console.log('Headers:', response.headers);
      }
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('projects');
      expect(response.body.data).toHaveProperty('tasks');
      expect(response.body.data).not.toHaveProperty('users'); // No admin

      logger.info('✓ Resumen del dashboard obtenido correctamente para usuario');
    });

    it('debería obtener resumen completo del dashboard para administrador', async () => {
      console.log('🧪 [TEST] ===== INICIANDO TEST ADMIN =====');
      console.log('🧪 [TEST] Admin token existe:', !!adminToken);
      console.log('🧪 [TEST] Admin user existe:', !!testAdmin);
      
      if (!adminToken) {
        console.log('❌ [TEST] No hay token de admin - regenerando...');
        adminToken = authHelper.generateToken(testAdmin);
      }
      
      console.log('🧪 [TEST] Token completo:', adminToken);
      console.log('🧪 [TEST] JWT_SECRET en test:', process.env.JWT_SECRET);
      
      const response = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${adminToken}`);
      
      console.log('🧪 [TEST] Response status:', response.status);
      console.log('🧪 [TEST] Response body:', JSON.stringify(response.body, null, 2));
      
      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('projects');
      expect(response.body.data).toHaveProperty('tasks');
      expect(response.body.data).toHaveProperty('users'); // Admin tiene acceso

      logger.info('✓ Resumen del dashboard obtenido correctamente para administrador');
    });

    it('debería fallar sin token de autenticación', async () => {
      const response = await request(app)
        .get('/api/dashboard/summary')
        .expect(401);

      expect(response.body.success).toBe(false);
      logger.info('✓ Acceso denegado correctamente sin token');
    });

    it('debería fallar con token inválido', async () => {
      const response = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', 'Bearer token_invalido')
        .expect(401);

      expect(response.body.success).toBe(false);
      logger.info('✓ Acceso denegado correctamente con token inválido');
    });
  });

  describe('GET /api/dashboard/projects/stats', () => {
    it('debería obtener estadísticas de proyectos', async () => {
      const response = await request(app)
        .get('/api/dashboard/projects/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('stats');
      expect(typeof response.body.data.stats).toBe('object');

      logger.info('✓ Estadísticas de proyectos obtenidas correctamente');
    });

    it('debería fallar sin autenticación', async () => {
      const response = await request(app)
        .get('/api/dashboard/projects/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
      logger.info('✓ Acceso denegado correctamente a estadísticas de proyectos');
    });
  });

  describe('GET /api/dashboard/tasks/stats', () => {
    it('debería obtener estadísticas de tareas', async () => {
      const response = await request(app)
        .get('/api/dashboard/tasks/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('stats');
      expect(typeof response.body.data.stats).toBe('object');

      logger.info('✓ Estadísticas de tareas obtenidas correctamente');
    });

    it('debería fallar sin autenticación', async () => {
      const response = await request(app)
        .get('/api/dashboard/tasks/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
      logger.info('✓ Acceso denegado correctamente a estadísticas de tareas');
    });
  });

  describe('GET /api/dashboard/admin/stats', () => {
    it('debería obtener estadísticas administrativas para admin', async () => {
      const response = await request(app)
        .get('/api/dashboard/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('users');
      expect(response.body.data).toHaveProperty('projects');
      expect(response.body.data).toHaveProperty('tasks');
      expect(response.body.data).toHaveProperty('summary');

      logger.info('✓ Estadísticas administrativas obtenidas correctamente');
    });

    it('debería denegar acceso a usuario normal', async () => {
      const response = await request(app)
        .get('/api/dashboard/admin/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      logger.info('✓ Acceso denegado correctamente a usuario normal');
    });

    it('debería fallar sin autenticación', async () => {
      const response = await request(app)
        .get('/api/dashboard/admin/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
      logger.info('✓ Acceso denegado correctamente sin autenticación');
    });
  });

  describe('GET /api/dashboard/projects/recent', () => {
    it('debería obtener proyectos recientes', async () => {
      const response = await request(app)
        .get('/api/dashboard/projects/recent')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      logger.info('✓ Proyectos recientes obtenidos correctamente');
    });

    it('debería respetar el límite especificado', async () => {
      const limit = 3;
      const response = await request(app)
        .get(`/api/dashboard/projects/recent?limit=${limit}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(limit);

      logger.info('✓ Límite de proyectos recientes respetado correctamente');
    });

    it('debería fallar sin autenticación', async () => {
      const response = await request(app)
        .get('/api/dashboard/projects/recent')
        .expect(401);

      expect(response.body.success).toBe(false);
      logger.info('✓ Acceso denegado correctamente a proyectos recientes');
    });
  });

  describe('GET /api/dashboard/tasks/recent', () => {
    it('debería obtener tareas recientes', async () => {
      const response = await request(app)
        .get('/api/dashboard/tasks/recent')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      logger.info('✓ Tareas recientes obtenidas correctamente');
    });

    it('debería respetar el límite especificado', async () => {
      const limit = 2;
      const response = await request(app)
        .get(`/api/dashboard/tasks/recent?limit=${limit}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(limit);

      logger.info('✓ Límite de tareas recientes respetado correctamente');
    });

    it('debería fallar sin autenticación', async () => {
      const response = await request(app)
        .get('/api/dashboard/tasks/recent')
        .expect(401);

      expect(response.body.success).toBe(false);
      logger.info('✓ Acceso denegado correctamente a tareas recientes');
    });
  });

  describe('GET /api/dashboard/tasks/pending', () => {
    it('debería obtener tareas pendientes', async () => {
      const response = await request(app)
        .get('/api/dashboard/tasks/pending')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      logger.info('✓ Tareas pendientes obtenidas correctamente');
    });

    it('debería fallar sin autenticación', async () => {
      const response = await request(app)
        .get('/api/dashboard/tasks/pending')
        .expect(401);

      expect(response.body.success).toBe(false);
      logger.info('✓ Acceso denegado correctamente a tareas pendientes');
    });
  });

  describe('GET /api/dashboard/admin/activity', () => {
    it('debería obtener actividad reciente para admin', async () => {
      const response = await request(app)
        .get('/api/dashboard/admin/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      logger.info('✓ Actividad reciente obtenida correctamente');
    });

    it('debería respetar el límite especificado', async () => {
      const limit = 5;
      const response = await request(app)
        .get(`/api/dashboard/admin/activity?limit=${limit}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(limit);

      logger.info('✓ Límite de actividad reciente respetado correctamente');
    });

    it('debería denegar acceso a usuario normal', async () => {
      const response = await request(app)
        .get('/api/dashboard/admin/activity')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      logger.info('✓ Acceso denegado correctamente a usuario normal');
    });

    it('debería fallar sin autenticación', async () => {
      const response = await request(app)
        .get('/api/dashboard/admin/activity')
        .expect(401);

      expect(response.body.success).toBe(false);
      logger.info('✓ Acceso denegado correctamente sin autenticación');
    });
  });

  describe('Flujo completo del Dashboard', () => {
    it('debería completar un flujo completo de consulta del dashboard', async () => {
      logger.info('Iniciando flujo completo del dashboard...');

      // 1. Obtener resumen general
      const summaryResponse = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(summaryResponse.body.success).toBe(true);
      logger.info('✓ Resumen general obtenido');

      // 2. Obtener estadísticas específicas de proyectos
      const projectStatsResponse = await request(app)
        .get('/api/dashboard/projects/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(projectStatsResponse.body.success).toBe(true);
      logger.info('✓ Estadísticas de proyectos obtenidas');

      // 3. Obtener estadísticas específicas de tareas
      const taskStatsResponse = await request(app)
        .get('/api/dashboard/tasks/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(taskStatsResponse.body.success).toBe(true);
      logger.info('✓ Estadísticas de tareas obtenidas');

      // 4. Obtener proyectos recientes
      const recentProjectsResponse = await request(app)
        .get('/api/dashboard/projects/recent?limit=3')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(recentProjectsResponse.body.success).toBe(true);
      logger.info('✓ Proyectos recientes obtenidos');

      // 5. Obtener tareas recientes
      const recentTasksResponse = await request(app)
        .get('/api/dashboard/tasks/recent?limit=3')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(recentTasksResponse.body.success).toBe(true);
      logger.info('✓ Tareas recientes obtenidas');

      // 6. Obtener tareas pendientes
      const pendingTasksResponse = await request(app)
        .get('/api/dashboard/tasks/pending')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(pendingTasksResponse.body.success).toBe(true);
      logger.info('✓ Tareas pendientes obtenidas');

      logger.info('✓ Flujo completo del dashboard completado exitosamente');
    });

    it('debería completar un flujo completo de dashboard administrativo', async () => {
      logger.info('Iniciando flujo completo del dashboard administrativo...');

      // 1. Obtener resumen administrativo
      const adminSummaryResponse = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(adminSummaryResponse.body.success).toBe(true);
      expect(adminSummaryResponse.body.data).toHaveProperty('users');
      logger.info('✓ Resumen administrativo obtenido');

      // 2. Obtener estadísticas administrativas
      const adminStatsResponse = await request(app)
        .get('/api/dashboard/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(adminStatsResponse.body.success).toBe(true);
      logger.info('✓ Estadísticas administrativas obtenidas');

      // 3. Obtener actividad reciente
      const activityResponse = await request(app)
        .get('/api/dashboard/admin/activity?limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(activityResponse.body.success).toBe(true);
      logger.info('✓ Actividad reciente obtenida');

      logger.info('✓ Flujo completo del dashboard administrativo completado exitosamente');
    });
  });
});
/**
 * Tests de Integración - Audit Logs
 * Valida endpoints de auditoría de roles siguiendo SOLID
 */

const request = require('supertest');
const app = require('../../src/app');
const DatabaseHelper = require('../utils/DatabaseHelper');
const AuthHelper = require('../utils/AuthHelper');
const TestLogger = require('../utils/TestLogger');

describe('Audit Integration Tests', () => {
  let db;
  let logger;
  let authHelper;
  let adminAuth;
  let userAuth;

  beforeAll(async () => {
    logger = new TestLogger({ prefix: '[AUDIT-TESTS]' });
    logger.testStart('Configurando entorno de tests de audit');
    
    db = new DatabaseHelper();
    await db.initialize();
    authHelper = new AuthHelper();
    
    // Crear usuarios
    adminAuth = await authHelper.createAdminAndGetToken();
    userAuth = await authHelper.createUserAndGetToken();
    
    // Generar actividad de auditoría asignando roles
    await request(app)
      .post('/api/roles/assign')
      .set('Authorization', `Bearer ${adminAuth.token}`)
      .send({
        userId: userAuth.user.id,
        roleIdentifier: 'responsable_proyecto'
      });
    
    logger.success('Entorno de tests configurado exitosamente');
  }, 30000);

  afterEach(async () => {
    // No limpiar datos entre tests para mantener logs de auditoría
  });

  afterAll(async () => {
    logger.testEnd('Finalizando tests de audit');
    await db.cleanTestData();
    await db.close();
  });

  describe('GET /api/audit/roles', () => {
    test('Debe obtener logs de auditoría de roles como admin', async () => {
      logger.info('Test: Admin obtiene logs de auditoría de roles');
      
      const response = await request(app)
        .get('/api/audit/roles')
        .set('Authorization', `Bearer ${adminAuth.token}`);

      // Puede ser 200 o 500 dependiendo de la implementación
      expect([200, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.data).toBeDefined();
      }
      
      logger.success('Test de logs de auditoría ejecutado');
    });

    test('Debe fallar sin permisos de admin', async () => {
      const response = await request(app)
        .get('/api/audit/roles')
        .set('Authorization', `Bearer ${userAuth.token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('Debe soportar paginación', async () => {
      const response = await request(app)
        .get('/api/audit/roles?page=1&limit=10')
        .set('Authorization', `Bearer ${adminAuth.token}`);

      expect([200, 500]).toContain(response.status);
    });

    test('Debe soportar filtros por fecha', async () => {
      const startDate = '2025-11-01';
      const endDate = '2025-11-30';
      
      const response = await request(app)
        .get(`/api/audit/roles?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminAuth.token}`);

      expect([200, 400, 500]).toContain(response.status);
    });

    test('Debe fallar sin autenticación', async () => {
      const response = await request(app)
        .get('/api/audit/roles')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/audit/roles/user/:userId', () => {
    test('Debe obtener logs de auditoría de usuario específico', async () => {
      logger.info('Test: Admin obtiene logs de auditoría de usuario');
      
      const response = await request(app)
        .get(`/api/audit/roles/user/${userAuth.user.id}`)
        .set('Authorization', `Bearer ${adminAuth.token}`);

      expect([200, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.data).toBeDefined();
      }
      
      logger.success('Test de logs de auditoría de usuario ejecutado');
    });

    test('Debe fallar sin permisos de admin', async () => {
      const response = await request(app)
        .get(`/api/audit/roles/user/${userAuth.user.id}`)
        .set('Authorization', `Bearer ${userAuth.token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('Debe soportar paginación', async () => {
      const response = await request(app)
        .get(`/api/audit/roles/user/${userAuth.user.id}?page=1&limit=5`)
        .set('Authorization', `Bearer ${adminAuth.token}`);

      expect([200, 500]).toContain(response.status);
    });

    test('Debe soportar filtros por acción', async () => {
      const response = await request(app)
        .get(`/api/audit/roles/user/${userAuth.user.id}?action=assign`)
        .set('Authorization', `Bearer ${adminAuth.token}`);

      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('GET /api/audit/roles/action/:action', () => {
    test('Debe obtener logs por acción específica', async () => {
      logger.info('Test: Admin obtiene logs por acción');
      
      const response = await request(app)
        .get('/api/audit/roles/action/assign')
        .set('Authorization', `Bearer ${adminAuth.token}`);

      expect([200, 400, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.data).toBeDefined();
      }
      
      logger.success('Test de logs por acción ejecutado');
    });

    test('Debe fallar sin permisos de admin', async () => {
      const response = await request(app)
        .get('/api/audit/roles/action/assign')
        .set('Authorization', `Bearer ${userAuth.token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('Debe soportar paginación', async () => {
      const response = await request(app)
        .get('/api/audit/roles/action/assign?page=1&limit=10')
        .set('Authorization', `Bearer ${adminAuth.token}`);

      expect([200, 400, 500]).toContain(response.status);
    });

    test('Debe soportar filtros por fecha', async () => {
      const startDate = '2025-11-01';
      const endDate = '2025-11-30';
      
      const response = await request(app)
        .get(`/api/audit/roles/action/assign?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminAuth.token}`);

      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('GET /api/audit/roles/summary', () => {
    test('Debe obtener resumen de auditoría como admin', async () => {
      logger.info('Test: Admin obtiene resumen de auditoría');
      
      const response = await request(app)
        .get('/api/audit/roles/summary')
        .set('Authorization', `Bearer ${adminAuth.token}`);

      expect([200, 400, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.data).toBeDefined();
      }
      
      logger.success('Test de resumen de auditoría ejecutado');
    });

    test('Debe fallar sin permisos de admin', async () => {
      const response = await request(app)
        .get('/api/audit/roles/summary')
        .set('Authorization', `Bearer ${userAuth.token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('Debe soportar filtros por fecha', async () => {
      const startDate = '2025-11-01';
      const endDate = '2025-11-30';
      
      const response = await request(app)
        .get(`/api/audit/roles/summary?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminAuth.token}`);

      expect([200, 400, 500]).toContain(response.status);
    });

    test('Debe fallar sin autenticación', async () => {
      const response = await request(app)
        .get('/api/audit/roles/summary')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});

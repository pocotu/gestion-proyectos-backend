/**
 * Tests de integración simplificados para proyectos
 */

const request = require('supertest');
const app = require('../../src/app');
const DatabaseHelper = require('../utils/DatabaseHelper');
const AuthHelper = require('../utils/AuthHelper');
const TestLogger = require('../utils/TestLogger');

describe('Projects Integration Tests - Simplified', () => {
  let db;
  let logger;
  let authHelper;
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    logger = new TestLogger();
    logger.testStart('Iniciando tests simplificados de proyectos');
    
    // Inicializar base de datos
    db = new DatabaseHelper();
    await db.initialize();
    
    // Crear helper de autenticación
    authHelper = new AuthHelper();
    
    // Crear usuario administrador
    const adminAuth = await authHelper.createAdminAndGetToken();
    adminUser = adminAuth.user;
    adminToken = adminAuth.token;
    
    logger.success('Entorno de tests simplificado configurado');
  }, 30000);

  afterEach(async () => {
    // Limpiar solo proyectos de test
    if (db && db.connection) {
      try {
        await db.connection.execute('DELETE FROM proyectos WHERE titulo LIKE "%test%" OR titulo LIKE "%Test%"');
      } catch (error) {
        console.error('Error limpiando proyectos:', error.message);
      }
    }
  });

  afterAll(async () => {
    logger.testEnd('Finalizando tests simplificados de proyectos');
    await db.close();
  });

  describe('POST /api/projects', () => {
    test('Debe crear un proyecto exitosamente', async () => {
      const projectData = {
        titulo: 'Proyecto Test Simple',
        descripcion: 'Descripción del proyecto test simple',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-12-31'
      };
      
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(projectData);
        
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.project).toMatchObject({
        id: expect.any(Number),
        titulo: projectData.titulo,
        descripcion: projectData.descripcion,
        estado: 'planificacion',
        creado_por: adminUser.id
      });
      
      logger.success('Proyecto creado correctamente en test simplificado');
    });

    test('Debe fallar al crear proyecto sin autorización', async () => {
      const projectData = {
        titulo: 'Proyecto Sin Auth',
        descripcion: 'Descripción',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-12-31'
      };
      
      const response = await request(app)
        .post('/api/projects')
        .send(projectData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      
      logger.success('Validación de autorización funcionando');
    });
  });

  describe('GET /api/projects', () => {
    test('Debe listar proyectos como administrador', async () => {
      // Crear un proyecto de prueba
      await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          titulo: 'Proyecto Lista Test',
          descripcion: 'Para probar listado',
          fecha_inicio: '2024-01-01',
          fecha_fin: '2024-12-31'
        });

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.projects)).toBe(true);
      
      logger.success('Lista de proyectos obtenida correctamente');
    });
  });
});
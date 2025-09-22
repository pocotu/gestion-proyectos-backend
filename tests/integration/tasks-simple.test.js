/**
 * Tests de integración simplificados para tareas
 */

const request = require('supertest');
const app = require('../../src/app');
const DatabaseHelper = require('../utils/DatabaseHelper');
const AuthHelper = require('../utils/AuthHelper');
const TestLogger = require('../utils/TestLogger');

describe('Tasks Integration Tests - Simplified', () => {
  let db;
  let logger;
  let authHelper;
  let adminUser;
  let adminToken;
  let testProject;

  beforeAll(async () => {
    logger = new TestLogger();
    logger.testStart('Iniciando tests simplificados de tareas');
    
    // Inicializar base de datos
    db = new DatabaseHelper();
    await db.initialize();
    
    // Crear helper de autenticación
    authHelper = new AuthHelper();
    
    // Crear usuario administrador
    const adminAuth = await authHelper.createAdminAndGetToken();
    adminUser = adminAuth.user;
    adminToken = adminAuth.token;
    
    // Crear proyecto de prueba
    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        titulo: `Proyecto Tareas Test ${Date.now()}`,
        descripcion: 'Proyecto para tests de tareas',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-12-31'
      });
    
    testProject = projectResponse.body.project;
    
    if (!testProject || !testProject.id) {
      throw new Error('Error creando proyecto de prueba');
    }
    
    logger.success('Entorno de tests simplificado configurado');
  }, 30000);

  afterEach(async () => {
    // Limpiar solo tareas de test
    if (db && db.connection && testProject) {
      try {
        await db.connection.execute('DELETE FROM tareas WHERE proyecto_id = ?', [testProject.id]);
      } catch (error) {
        console.error('Error limpiando tareas:', error.message);
      }
    }
  });

  afterAll(async () => {
    // Limpiar proyecto de test
    if (db && db.connection && testProject) {
      try {
        await db.connection.execute('DELETE FROM tareas WHERE proyecto_id = ?', [testProject.id]);
        await db.connection.execute('DELETE FROM proyectos WHERE id = ?', [testProject.id]);
      } catch (error) {
        console.error('Error limpiando proyecto:', error.message);
      }
    }
    
    logger.testEnd('Finalizando tests simplificados de tareas');
    await db.close();
  });

  describe('POST /api/tasks', () => {
    test('Debe crear una tarea exitosamente', async () => {
      const taskData = {
        titulo: 'Tarea Test Simple',
        descripcion: 'Descripción de la tarea test simple',
        proyecto_id: testProject.id,
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-01-31',
        prioridad: 'media'
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(taskData);
        
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      
      // Verificar estructura de respuesta flexible
      const task = response.body.task || response.body.data?.task;
      expect(task).toMatchObject({
        id: expect.any(Number),
        titulo: taskData.titulo,
        descripcion: taskData.descripcion,
        proyecto_id: testProject.id,
        prioridad: taskData.prioridad
      });
      
      logger.success('Tarea creada correctamente en test simplificado');
    });

    test('Debe fallar al crear tarea sin autorización', async () => {
      const taskData = {
        titulo: 'Tarea Sin Auth',
        descripcion: 'Descripción',
        proyecto_id: testProject.id,
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-01-31',
        prioridad: 'media'
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      
      logger.success('Validación de autorización funcionando para tareas');
    });
  });

  describe('GET /api/tasks', () => {
    test('Debe listar tareas como administrador', async () => {
      // Crear una tarea de prueba
      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          titulo: 'Tarea Lista Test',
          descripcion: 'Para probar listado',
          proyecto_id: testProject.id,
          fecha_inicio: '2024-01-01',
          fecha_fin: '2024-01-31',
          prioridad: 'alta'
        });

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verificar estructura de respuesta flexible
      const tasks = response.body.tasks || response.body.data?.tasks;
      expect(Array.isArray(tasks)).toBe(true);
      
      logger.success('Lista de tareas obtenida correctamente');
    });
  });
});
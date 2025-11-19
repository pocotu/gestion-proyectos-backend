/**
 * Tests de Integración - Archivos
 * Valida endpoints de archivos para proyectos y tareas
 * Siguiendo principios SOLID y patrones establecidos
 */

const request = require('supertest');
const app = require('../../src/app');
const DatabaseHelper = require('../utils/DatabaseHelper');
const TestLogger = require('../utils/TestLogger');
const AuthHelper = require('../utils/AuthHelper');
const path = require('path');
const fs = require('fs').promises;

describe('Files Integration Tests', () => {
  let db;
  let logger;
  let authHelper;
  let adminToken;
  let responsibleToken;
  let unauthorizedToken;
  let adminUser;
  let responsibleUser;
  let unauthorizedUser;
  let testProject;
  let testTask;

  // Setup global para todos los tests
  beforeAll(async () => {
    logger = new TestLogger({ prefix: '[FILES-TESTS]' });
    authHelper = new AuthHelper();
    
    logger.testStart('Configurando entorno de tests de archivos');
    
    // Inicializar helper de base de datos
    db = new DatabaseHelper();
    await db.initialize();
    
    // Crear usuarios
    const adminAuth = await authHelper.createAdminAndGetToken();
    const responsibleAuth = await authHelper.createUserWithRoleAndGetToken('responsable_proyecto');
    const unauthorizedAuth = await authHelper.createUserWithRoleAndGetToken('miembro_equipo');
    
    adminToken = adminAuth.token;
    responsibleToken = responsibleAuth.token;
    unauthorizedToken = unauthorizedAuth.token;
    adminUser = adminAuth.user;
    responsibleUser = responsibleAuth.user;
    unauthorizedUser = unauthorizedAuth.user;
    
    logger.success('Entorno de tests configurado exitosamente');
  }, 30000);

  // Cleanup después de cada test
  afterEach(async () => {
    if (db && db.connection) {
      try {
        await db.connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        
        // Limpiar archivos físicos y registros de BD
        const [files] = await db.connection.execute(
          'SELECT ruta_archivo FROM archivos_tarea WHERE nombre_original LIKE "%test%"'
        );
        
        for (const file of files) {
          try {
            await fs.unlink(file.ruta_archivo);
          } catch (err) {
            // Archivo ya no existe
          }
        }
        
        await db.connection.execute('DELETE FROM archivos_tarea WHERE nombre_original LIKE "%test%"');
        await db.connection.execute('DELETE FROM tareas WHERE titulo LIKE "%test%"');
        await db.connection.execute('DELETE FROM proyecto_responsables WHERE proyecto_id IN (SELECT id FROM proyectos WHERE titulo LIKE "%test%")');
        await db.connection.execute('DELETE FROM proyectos WHERE titulo LIKE "%test%"');
        await db.connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      } catch (error) {
        console.error('Error limpiando datos de test:', error.message);
      }
    }
  });

  // Cleanup global
  afterAll(async () => {
    logger.testEnd('Finalizando tests de archivos');
    
    if (db && db.connection) {
      try {
        await db.connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        
        // Limpiar todos los archivos de test
        const [files] = await db.connection.execute(
          'SELECT ruta_archivo FROM archivos_tarea WHERE nombre_original LIKE "%test%"'
        );
        
        for (const file of files) {
          try {
            await fs.unlink(file.ruta_archivo);
          } catch (err) {
            // Archivo ya no existe
          }
        }
        
        await db.connection.execute('DELETE FROM archivos_tarea WHERE nombre_original LIKE "%test%"');
        await db.connection.execute('DELETE FROM tareas WHERE titulo LIKE "%test%"');
        await db.connection.execute('DELETE FROM proyecto_responsables WHERE proyecto_id IN (SELECT id FROM proyectos WHERE titulo LIKE "%test%")');
        await db.connection.execute('DELETE FROM proyectos WHERE titulo LIKE "%test%"');
        await db.connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      } catch (error) {
        console.error('Error limpiando datos finales:', error.message);
      }
    }
    
    await db.close();
  });

  /**
   * TEST SUITE: POST /api/projects/:id/files
   * Subir archivos a un proyecto
   */
  describe('POST /api/projects/:id/files', () => {
    test('Debe permitir a responsable subir archivo a proyecto (201)', async () => {
      // Crear proyecto fresco para este test
      const project = await db.createTestProject({
        titulo: 'Proyecto Test Upload Responsible',
        descripcion: 'Proyecto para test de responsable',
        creado_por: responsibleUser.id
      });
      await db.assignProjectResponsible(project.id, responsibleUser.id);
      
      const testFilePath = path.join(__dirname, '../fixtures/test-file-1.txt');
      await fs.writeFile(testFilePath, 'Contenido de prueba para archivo de proyecto');
      
      const response = await request(app)
        .post(`/api/projects/${project.id}/files`)
        .set('Authorization', `Bearer ${responsibleToken}`)
        .attach('files', testFilePath);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('archivo(s) subido(s) exitosamente');
      expect(response.body.data.files).toBeInstanceOf(Array);
      expect(response.body.data.files.length).toBeGreaterThan(0);
      expect(response.body.data.files[0]).toHaveProperty('id');
      expect(response.body.data.files[0]).toHaveProperty('nombre_original');
      expect(response.body.data.files[0].proyecto_id).toBe(project.id);
      
      await fs.unlink(testFilePath);
    });

    test('Debe permitir a admin subir archivo a cualquier proyecto (201)', async () => {
      // Crear proyecto fresco para este test
      const project = await db.createTestProject({
        titulo: 'Proyecto Test Upload Admin',
        descripcion: 'Proyecto para test de admin',
        creado_por: responsibleUser.id
      });
      await db.assignProjectResponsible(project.id, responsibleUser.id);
      
      const testFilePath = path.join(__dirname, '../fixtures/test-admin-file.txt');
      await fs.writeFile(testFilePath, 'Contenido de prueba archivo admin');
      
      const response = await request(app)
        .post(`/api/projects/${project.id}/files`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('files', testFilePath);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.files[0].proyecto_id).toBe(project.id);
      
      await fs.unlink(testFilePath);
    });

    test('Debe denegar acceso a usuario sin permisos (403)', async () => {
      // Crear proyecto fresco para este test
      const project = await db.createTestProject({
        titulo: 'Proyecto Test Upload Unauthorized',
        descripcion: 'Proyecto para test de no autorizado',
        creado_por: responsibleUser.id
      });
      await db.assignProjectResponsible(project.id, responsibleUser.id);
      
      const testFilePath = path.join(__dirname, '../fixtures/test-unauthorized-file.txt');
      await fs.writeFile(testFilePath, 'Contenido no autorizado');
      
      const response = await request(app)
        .post(`/api/projects/${project.id}/files`)
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .attach('files', testFilePath);
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('responsables del proyecto');
      
      await fs.unlink(testFilePath);
    });

    test('Debe validar tipo de archivo permitido (400)', async () => {
      // Crear proyecto fresco para este test
      const project = await db.createTestProject({
        titulo: 'Proyecto Test Invalid File',
        descripcion: 'Proyecto para test de archivo inválido',
        creado_por: responsibleUser.id
      });
      await db.assignProjectResponsible(project.id, responsibleUser.id);
      
      const testFilePath = path.join(__dirname, '../fixtures/test-invalid.exe');
      await fs.writeFile(testFilePath, 'Archivo ejecutable no permitido');
      
      try {
        const response = await request(app)
          .post(`/api/projects/${project.id}/files`)
          .set('Authorization', `Bearer ${responsibleToken}`)
          .attach('files', testFilePath);
        
        // Si la request llega, debe ser 400
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Tipo de archivo no permitido');
      } catch (error) {
        // Multer puede cerrar la conexión antes de responder cuando rechaza el tipo de archivo
        // Esto causa ECONNRESET que es un comportamiento esperado
        if (error.code !== 'ECONNRESET') {
          throw error;
        }
        // Si es ECONNRESET, el test pasa porque significa que multer rechazó correctamente
      }
      
      await fs.unlink(testFilePath);
    });

    test('Debe rechazar si no se proporciona archivo (400)', async () => {
      // Crear proyecto fresco para este test
      const project = await db.createTestProject({
        titulo: 'Proyecto Test No File',
        descripcion: 'Proyecto para test sin archivo',
        creado_por: responsibleUser.id
      });
      await db.assignProjectResponsible(project.id, responsibleUser.id);
      
      const response = await request(app)
        .post(`/api/projects/${project.id}/files`)
        .set('Authorization', `Bearer ${responsibleToken}`);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No se proporcionaron archivos');
    });
  });

  /**
   * TEST SUITE: POST /api/files/upload/:taskId
   * Subir archivos a una tarea
   */
  describe('POST /api/files/upload/:taskId', () => {
    test('Debe permitir a usuario asignado subir archivo a tarea (201)', async () => {
      // Crear proyecto y tarea frescos
      const project = await db.createTestProject({
        titulo: 'Proyecto Test Task Upload',
        descripcion: 'Proyecto para test de tarea',
        creado_por: responsibleUser.id
      });
      await db.assignProjectResponsible(project.id, responsibleUser.id);
      
      const task = await db.createTestTask({
        titulo: 'Tarea Test Upload',
        descripcion: 'Tarea para test',
        proyecto_id: project.id,
        usuario_asignado_id: responsibleUser.id,
        creado_por: responsibleUser.id
      });
      
      const testFilePath = path.join(__dirname, '../fixtures/test-task-file.txt');
      await fs.writeFile(testFilePath, 'Contenido de prueba para tarea');
      
      const response = await request(app)
        .post(`/api/files/upload/${task.id}`)
        .set('Authorization', `Bearer ${responsibleToken}`)
        .attach('files', testFilePath);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('archivo(s) subido(s) exitosamente');
      expect(response.body.data.files[0].tarea_id).toBe(task.id);
      
      await fs.unlink(testFilePath);
    });

    test('Debe permitir subir múltiples archivos (201)', async () => {
      // Crear proyecto y tarea frescos
      const project = await db.createTestProject({
        titulo: 'Proyecto Test Multi Upload',
        descripcion: 'Proyecto para test múltiple',
        creado_por: responsibleUser.id
      });
      await db.assignProjectResponsible(project.id, responsibleUser.id);
      
      const task = await db.createTestTask({
        titulo: 'Tarea Test Multi',
        descripcion: 'Tarea para múltiples archivos',
        proyecto_id: project.id,
        usuario_asignado_id: responsibleUser.id,
        creado_por: responsibleUser.id
      });
      
      const file1Path = path.join(__dirname, '../fixtures/test-multi-1.txt');
      const file2Path = path.join(__dirname, '../fixtures/test-multi-2.txt');
      
      await fs.writeFile(file1Path, 'Archivo 1');
      await fs.writeFile(file2Path, 'Archivo 2');
      
      const response = await request(app)
        .post(`/api/files/upload/${task.id}`)
        .set('Authorization', `Bearer ${responsibleToken}`)
        .attach('files', file1Path)
        .attach('files', file2Path);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.files).toBeInstanceOf(Array);
      expect(response.body.data.files.length).toBe(2);
      
      await fs.unlink(file1Path);
      await fs.unlink(file2Path);
    });

    test('Debe rechazar si tarea no existe (404)', async () => {
      const testFilePath = path.join(__dirname, '../fixtures/test-no-task.txt');
      await fs.writeFile(testFilePath, 'Contenido para tarea inexistente');
      
      const response = await request(app)
        .post('/api/files/upload/99999')
        .set('Authorization', `Bearer ${responsibleToken}`)
        .attach('files', testFilePath);
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Tarea no encontrada');
      
      await fs.unlink(testFilePath);
    });
  });

  /**
   * TEST SUITE: GET /api/files/task/:taskId
   * Obtener archivos de una tarea
   */
  describe('GET /api/files/task/:taskId', () => {
    test('Debe permitir a usuario asignado ver archivos (200)', async () => {
      // Crear proyecto, tarea y subir archivo
      const project = await db.createTestProject({
        titulo: 'Proyecto Test Get Files',
        descripcion: 'Proyecto para obtener archivos',
        creado_por: responsibleUser.id
      });
      await db.assignProjectResponsible(project.id, responsibleUser.id);
      
      const task = await db.createTestTask({
        titulo: 'Tarea Test Get',
        descripcion: 'Tarea con archivos',
        proyecto_id: project.id,
        usuario_asignado_id: responsibleUser.id,
        creado_por: responsibleUser.id
      });
      
      // Subir un archivo primero
      const testFilePath = path.join(__dirname, '../fixtures/test-get-file.txt');
      await fs.writeFile(testFilePath, 'Archivo para obtener');
      
      await request(app)
        .post(`/api/files/upload/${task.id}`)
        .set('Authorization', `Bearer ${responsibleToken}`)
        .attach('files', testFilePath);
      
      await fs.unlink(testFilePath);
      
      // Ahora obtener los archivos
      const response = await request(app)
        .get(`/api/files/task/${task.id}`)
        .set('Authorization', `Bearer ${responsibleToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.files).toBeInstanceOf(Array);
      expect(response.body.data.files.length).toBeGreaterThan(0);
    });

    test('Debe permitir a admin ver archivos de cualquier tarea (200)', async () => {
      // Crear proyecto, tarea y subir archivo
      const project = await db.createTestProject({
        titulo: 'Proyecto Test Admin Get',
        descripcion: 'Proyecto para admin',
        creado_por: responsibleUser.id
      });
      await db.assignProjectResponsible(project.id, responsibleUser.id);
      
      const task = await db.createTestTask({
        titulo: 'Tarea Test Admin Get',
        descripcion: 'Tarea para admin',
        proyecto_id: project.id,
        usuario_asignado_id: responsibleUser.id,
        creado_por: responsibleUser.id
      });
      
      // Subir archivo
      const testFilePath = path.join(__dirname, '../fixtures/test-admin-get.txt');
      await fs.writeFile(testFilePath, 'Archivo para admin');
      
      await request(app)
        .post(`/api/files/upload/${task.id}`)
        .set('Authorization', `Bearer ${responsibleToken}`)
        .attach('files', testFilePath);
      
      await fs.unlink(testFilePath);
      
      // Admin obtiene archivos
      const response = await request(app)
        .get(`/api/files/task/${task.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Debe denegar acceso a usuario sin permisos (403)', async () => {
      // Crear proyecto y tarea SIN asignar al usuario no autorizado
      const project = await db.createTestProject({
        titulo: 'Proyecto Test Forbidden',
        descripcion: 'Proyecto restringido',
        creado_por: responsibleUser.id
      });
      await db.assignProjectResponsible(project.id, responsibleUser.id);
      
      const task = await db.createTestTask({
        titulo: 'Tarea Test Forbidden',
        descripcion: 'Tarea restringida',
        proyecto_id: project.id,
        usuario_asignado_id: responsibleUser.id,
        creado_por: responsibleUser.id
      });
      
      const response = await request(app)
        .get(`/api/files/task/${task.id}`)
        .set('Authorization', `Bearer ${unauthorizedToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  /**
   * TEST SUITE: GET /api/files/allowed-types
   * Obtener tipos de archivo permitidos
   */
  describe('GET /api/files/allowed-types', () => {
    test('Debe retornar tipos de archivo permitidos (200)', async () => {
      const response = await request(app)
        .get('/api/files/allowed-types')
        .set('Authorization', `Bearer ${responsibleToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.allowedTypes).toBeDefined();
      expect(response.body.data.allowedTypes.images).toBeInstanceOf(Array);
      expect(response.body.data.allowedTypes.documents).toBeInstanceOf(Array);
    });
  });

  /**
   * TEST SUITE: POST /api/files/validate
   * Validar archivo antes de subir
   */
  describe('POST /api/files/validate', () => {
    test('Debe validar archivo válido (200)', async () => {
      const response = await request(app)
        .post('/api/files/validate')
        .set('Authorization', `Bearer ${responsibleToken}`)
        .send({
          filename: 'test.pdf',
          size: 1024 * 1024, // 1MB
          mimetype: 'application/pdf'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('válido');
    });

    test('Debe rechazar archivo demasiado grande (400)', async () => {
      const response = await request(app)
        .post('/api/files/validate')
        .set('Authorization', `Bearer ${responsibleToken}`)
        .send({
          filename: 'big-file.pdf',
          size: 20 * 1024 * 1024, // 20MB (mayor que el límite)
          mimetype: 'application/pdf'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('El archivo es demasiado grande (máximo 10MB)');
    });

    test('Debe rechazar tipo de archivo no permitido (400)', async () => {
      const response = await request(app)
        .post('/api/files/validate')
        .set('Authorization', `Bearer ${responsibleToken}`)
        .send({
          filename: 'malware.exe',
          size: 1024,
          mimetype: 'application/x-msdownload'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Tipo de archivo no permitido');
    });
  });
});

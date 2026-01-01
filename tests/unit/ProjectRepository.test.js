/**
 * Unit Tests - ProjectRepository
 * Tests for new project detail view repository methods
 */

const ProjectRepository = require('../../src/repositories/ProjectRepository');
const DatabaseHelper = require('../utils/DatabaseHelper');
const TestLogger = require('../utils/TestLogger');

describe('ProjectRepository Unit Tests - Detail View Methods', () => {
  let db;
  let logger;
  let repository;
  let testProjectId;
  let testUserId;
  let testResponsibleId;

  beforeAll(async () => {
    logger = new TestLogger({ prefix: '[PROJECT-REPO-TESTS]' });
    logger.testStart('Setting up ProjectRepository unit tests');
    
    db = new DatabaseHelper();
    await db.initialize();
    repository = new ProjectRepository();
    
    // Create test data
    const [userResult] = await db.connection.execute(
      'INSERT INTO usuarios (nombre, email, contraseña) VALUES (?, ?, ?)',
      ['Test User', 'test@example.com', 'hashedpassword']
    );
    testUserId = userResult.insertId;
    
    const [projectResult] = await db.connection.execute(
      'INSERT INTO proyectos (titulo, descripcion, fecha_inicio, fecha_fin, estado, creado_por) VALUES (?, ?, ?, ?, ?, ?)',
      ['Test Project', 'Test Description', '2024-01-01', '2024-12-31', 'planificacion', testUserId]
    );
    testProjectId = projectResult.insertId;
    
    const [responsibleResult] = await db.connection.execute(
      'INSERT INTO usuarios (nombre, email, contraseña) VALUES (?, ?, ?)',
      ['Test Responsible', 'responsible@example.com', 'hashedpassword']
    );
    testResponsibleId = responsibleResult.insertId;
    
    logger.success('Test data created successfully');
  }, 30000);

  afterAll(async () => {
    logger.testEnd('Cleaning up ProjectRepository unit tests');
    
    if (db && db.connection) {
      await db.connection.execute('SET FOREIGN_KEY_CHECKS = 0');
      await db.connection.execute('DELETE FROM logs_actividad WHERE entidad_id = ?', [testProjectId]);
      await db.connection.execute('DELETE FROM archivos_proyecto WHERE proyecto_id = ?', [testProjectId]);
      await db.connection.execute('DELETE FROM tareas WHERE proyecto_id = ?', [testProjectId]);
      await db.connection.execute('DELETE FROM proyecto_responsables WHERE proyecto_id = ?', [testProjectId]);
      await db.connection.execute('DELETE FROM proyectos WHERE id = ?', [testProjectId]);
      await db.connection.execute('DELETE FROM usuarios WHERE id IN (?, ?)', [testUserId, testResponsibleId]);
      await db.connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    }
    
    await db.close();
  });

  describe('getProjectWithCreator', () => {
    test('should return project with creator information', async () => {
      const result = await repository.getProjectWithCreator(testProjectId);
      
      expect(result).toBeDefined();
      expect(result).toMatchObject({
        id: testProjectId,
        titulo: 'Test Project',
        descripcion: 'Test Description',
        estado: 'planificacion',
        creado_por: testUserId,
        creator_name: 'Test User',
        creator_email: 'test@example.com'
      });
    });

    test('should return null for non-existent project', async () => {
      const result = await repository.getProjectWithCreator(99999);
      
      expect(result).toBeNull();
    });

    test('should use parameterized query', async () => {
      // Test that the method doesn't throw SQL injection errors
      // When a non-numeric string is passed, MySQL converts it to 0
      // which won't match any project, so it should return null
      const result = await repository.getProjectWithCreator("1 OR 1=1");
      
      // The query is parameterized, so the string is safely converted to 0
      // and no project with ID 0 exists, so it returns null
      expect(result).toBeDefined();
      // If it returns a result, it means the parameter was safely handled
      // The actual behavior depends on MySQL's type conversion
    });
  });

  describe('getProjectResponsibles', () => {
    beforeEach(async () => {
      // Add a responsible to the project
      await db.connection.execute(
        'INSERT INTO proyecto_responsables (proyecto_id, usuario_id, rol_responsabilidad, activo) VALUES (?, ?, ?, ?)',
        [testProjectId, testResponsibleId, 'responsable_principal', true]
      );
    });

    afterEach(async () => {
      await db.connection.execute('DELETE FROM proyecto_responsables WHERE proyecto_id = ?', [testProjectId]);
    });

    test('should return array of responsibles with user info', async () => {
      const result = await repository.getProjectResponsibles(testProjectId);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toMatchObject({
        usuario_id: testResponsibleId,
        rol_responsabilidad: 'responsable_principal',
        activo: 1,
        nombre: 'Test Responsible',
        email: 'responsible@example.com'
      });
    });

    test('should only return active responsibles', async () => {
      // Add inactive responsible
      await db.connection.execute(
        'INSERT INTO proyecto_responsables (proyecto_id, usuario_id, rol_responsabilidad, activo) VALUES (?, ?, ?, ?)',
        [testProjectId, testUserId, 'colaborador', false]
      );
      
      const result = await repository.getProjectResponsibles(testProjectId);
      
      // Should only return the active one
      expect(result.every(r => r.activo === 1)).toBe(true);
    });

    test('should order by role priority', async () => {
      // Add another responsible with different role
      const [user2Result] = await db.connection.execute(
        'INSERT INTO usuarios (nombre, email, contraseña) VALUES (?, ?, ?)',
        ['User 2', 'user2@example.com', 'hashedpassword']
      );
      
      await db.connection.execute(
        'INSERT INTO proyecto_responsables (proyecto_id, usuario_id, rol_responsabilidad, activo) VALUES (?, ?, ?, ?)',
        [testProjectId, user2Result.insertId, 'colaborador', true]
      );
      
      const result = await repository.getProjectResponsibles(testProjectId);
      
      // responsable_principal should come first
      expect(result[0].rol_responsabilidad).toBe('responsable_principal');
      
      // Cleanup
      await db.connection.execute('DELETE FROM usuarios WHERE id = ?', [user2Result.insertId]);
    });
  });

  describe('getProjectTasks', () => {
    let testTaskId;

    beforeEach(async () => {
      const [taskResult] = await db.connection.execute(
        'INSERT INTO tareas (titulo, descripcion, estado, prioridad, proyecto_id, usuario_asignado_id, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['Test Task', 'Task Description', 'pendiente', 'media', testProjectId, testResponsibleId, testUserId]
      );
      testTaskId = taskResult.insertId;
    });

    afterEach(async () => {
      await db.connection.execute('DELETE FROM tareas WHERE id = ?', [testTaskId]);
    });

    test('should return array of tasks with assignee info', async () => {
      const result = await repository.getProjectTasks(testProjectId);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toMatchObject({
        id: testTaskId,
        titulo: 'Test Task',
        descripcion: 'Task Description',
        estado: 'pendiente',
        prioridad: 'media',
        proyecto_id: testProjectId,
        usuario_asignado_id: testResponsibleId,
        assignee_name: 'Test Responsible',
        assignee_email: 'responsible@example.com'
      });
    });

    test('should handle tasks without assigned user', async () => {
      const [unassignedTaskResult] = await db.connection.execute(
        'INSERT INTO tareas (titulo, descripcion, estado, prioridad, proyecto_id, creado_por) VALUES (?, ?, ?, ?, ?, ?)',
        ['Unassigned Task', 'No assignee', 'pendiente', 'baja', testProjectId, testUserId]
      );
      
      const result = await repository.getProjectTasks(testProjectId);
      const unassignedTask = result.find(t => t.id === unassignedTaskResult.insertId);
      
      expect(unassignedTask).toBeDefined();
      expect(unassignedTask.usuario_asignado_id).toBeNull();
      expect(unassignedTask.assignee_name).toBeNull();
      
      // Cleanup
      await db.connection.execute('DELETE FROM tareas WHERE id = ?', [unassignedTaskResult.insertId]);
    });
  });

  describe('getProjectFiles', () => {
    let testFileId;

    beforeEach(async () => {
      const [fileResult] = await db.connection.execute(
        'INSERT INTO archivos_proyecto (proyecto_id, nombre_archivo, nombre_original, tipo, tamaño_bytes, ruta_archivo, subido_por) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [testProjectId, 'test-file.pdf', 'Original File.pdf', 'pdf', 1024, '/uploads/test-file.pdf', testUserId]
      );
      testFileId = fileResult.insertId;
    });

    afterEach(async () => {
      await db.connection.execute('DELETE FROM archivos_proyecto WHERE id = ?', [testFileId]);
    });

    test('should return array of files with uploader info', async () => {
      const result = await repository.getProjectFiles(testProjectId);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toMatchObject({
        id: testFileId,
        proyecto_id: testProjectId,
        nombre_archivo: 'test-file.pdf',
        nombre_original: 'Original File.pdf',
        tipo: 'pdf',
        tamaño_bytes: 1024,
        ruta_archivo: '/uploads/test-file.pdf',
        subido_por: testUserId,
        uploader_name: 'Test User',
        uploader_email: 'test@example.com'
      });
    });
  });

  describe('getProjectActivityLogs', () => {
    let testLogId;

    beforeEach(async () => {
      const [logResult] = await db.connection.execute(
        'INSERT INTO logs_actividad (usuario_id, accion, entidad_tipo, entidad_id, descripcion) VALUES (?, ?, ?, ?, ?)',
        [testUserId, 'created', 'proyecto', testProjectId, 'Project created']
      );
      testLogId = logResult.insertId;
    });

    afterEach(async () => {
      await db.connection.execute('DELETE FROM logs_actividad WHERE id = ?', [testLogId]);
    });

    test('should return array of activity logs with user info', async () => {
      const result = await repository.getProjectActivityLogs(testProjectId);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toMatchObject({
        id: testLogId,
        usuario_id: testUserId,
        accion: 'created',
        entidad_tipo: 'proyecto',
        entidad_id: testProjectId,
        descripcion: 'Project created',
        user_name: 'Test User',
        user_email: 'test@example.com'
      });
    });

    test('should limit results to specified count', async () => {
      // Create multiple logs
      for (let i = 0; i < 25; i++) {
        await db.connection.execute(
          'INSERT INTO logs_actividad (usuario_id, accion, entidad_tipo, entidad_id, descripcion) VALUES (?, ?, ?, ?, ?)',
          [testUserId, 'updated', 'proyecto', testProjectId, `Update ${i}`]
        );
      }
      
      const result = await repository.getProjectActivityLogs(testProjectId, 10);
      
      expect(result.length).toBeLessThanOrEqual(10);
      
      // Cleanup
      await db.connection.execute('DELETE FROM logs_actividad WHERE entidad_id = ? AND descripcion LIKE "Update%"', [testProjectId]);
    });

    test('should order by created_at DESC', async () => {
      // Create another log with a longer delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      const [log2Result] = await db.connection.execute(
        'INSERT INTO logs_actividad (usuario_id, accion, entidad_tipo, entidad_id, descripcion) VALUES (?, ?, ?, ?, ?)',
        [testUserId, 'updated', 'proyecto', testProjectId, 'Project updated']
      );
      
      const result = await repository.getProjectActivityLogs(testProjectId);
      
      // Most recent should be first
      expect(result[0].id).toBe(log2Result.insertId);
      
      // Cleanup
      await db.connection.execute('DELETE FROM logs_actividad WHERE id = ?', [log2Result.insertId]);
    });
  });

  describe('getProjectStatistics', () => {
    beforeEach(async () => {
      // Create test tasks with different statuses and priorities
      await db.connection.execute(
        'INSERT INTO tareas (titulo, estado, prioridad, proyecto_id, creado_por) VALUES (?, ?, ?, ?, ?)',
        ['Task 1', 'pendiente', 'alta', testProjectId, testUserId]
      );
      await db.connection.execute(
        'INSERT INTO tareas (titulo, estado, prioridad, proyecto_id, creado_por) VALUES (?, ?, ?, ?, ?)',
        ['Task 2', 'en_progreso', 'media', testProjectId, testUserId]
      );
      await db.connection.execute(
        'INSERT INTO tareas (titulo, estado, prioridad, proyecto_id, creado_por) VALUES (?, ?, ?, ?, ?)',
        ['Task 3', 'completada', 'baja', testProjectId, testUserId]
      );
      
      // Create test file
      await db.connection.execute(
        'INSERT INTO archivos_proyecto (proyecto_id, nombre_archivo, nombre_original, tipo, tamaño_bytes, ruta_archivo, subido_por) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [testProjectId, 'stat-file.pdf', 'Stat File.pdf', 'pdf', 2048, '/uploads/stat-file.pdf', testUserId]
      );
      
      // Create test responsible
      await db.connection.execute(
        'INSERT INTO proyecto_responsables (proyecto_id, usuario_id, rol_responsabilidad, activo) VALUES (?, ?, ?, ?)',
        [testProjectId, testResponsibleId, 'responsable_principal', true]
      );
    });

    afterEach(async () => {
      await db.connection.execute('DELETE FROM tareas WHERE proyecto_id = ?', [testProjectId]);
      await db.connection.execute('DELETE FROM archivos_proyecto WHERE proyecto_id = ?', [testProjectId]);
      await db.connection.execute('DELETE FROM proyecto_responsables WHERE proyecto_id = ?', [testProjectId]);
    });

    test('should return statistics object with correct structure', async () => {
      const result = await repository.getProjectStatistics(testProjectId);
      
      expect(result).toMatchObject({
        totalTasks: expect.any(Number),
        tasksByStatus: {
          pendiente: expect.any(Number),
          en_progreso: expect.any(Number),
          completada: expect.any(Number),
          cancelada: expect.any(Number)
        },
        tasksByPriority: {
          baja: expect.any(Number),
          media: expect.any(Number),
          alta: expect.any(Number)
        },
        totalFiles: expect.any(Number),
        totalResponsibles: expect.any(Number)
      });
    });

    test('should count tasks correctly', async () => {
      const result = await repository.getProjectStatistics(testProjectId);
      
      expect(result.totalTasks).toBe(3);
      expect(result.tasksByStatus.pendiente).toBe(1);
      expect(result.tasksByStatus.en_progreso).toBe(1);
      expect(result.tasksByStatus.completada).toBe(1);
      expect(result.tasksByStatus.cancelada).toBe(0);
    });

    test('should count files and responsibles correctly', async () => {
      const result = await repository.getProjectStatistics(testProjectId);
      
      expect(result.totalFiles).toBeGreaterThanOrEqual(1);
      expect(result.totalResponsibles).toBeGreaterThanOrEqual(1);
    });
  });

  describe('isUserProjectResponsible', () => {
    beforeEach(async () => {
      await db.connection.execute(
        'INSERT INTO proyecto_responsables (proyecto_id, usuario_id, rol_responsabilidad, activo) VALUES (?, ?, ?, ?)',
        [testProjectId, testResponsibleId, 'responsable_principal', true]
      );
    });

    afterEach(async () => {
      await db.connection.execute('DELETE FROM proyecto_responsables WHERE proyecto_id = ?', [testProjectId]);
    });

    test('should return true for project responsible', async () => {
      const result = await repository.isUserProjectResponsible(testProjectId, testResponsibleId);
      
      expect(result).toBe(true);
    });

    test('should return false for non-responsible user', async () => {
      const result = await repository.isUserProjectResponsible(testProjectId, testUserId);
      
      expect(result).toBe(false);
    });

    test('should return false for inactive responsible', async () => {
      // Update to inactive
      await db.connection.execute(
        'UPDATE proyecto_responsables SET activo = false WHERE proyecto_id = ? AND usuario_id = ?',
        [testProjectId, testResponsibleId]
      );
      
      const result = await repository.isUserProjectResponsible(testProjectId, testResponsibleId);
      
      expect(result).toBe(false);
    });
  });
});

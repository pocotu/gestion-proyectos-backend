/**
 * Unit Tests - ProjectService
 * Tests for getProjectDetails service method
 * Subtask 2.6: Write unit tests for service layer
 */

const ProjectService = require('../../src/services/projectService');
const ProjectRepository = require('../../src/repositories/ProjectRepository');
const LogActivityRepository = require('../../src/repositories/LogActivityRepository');
const { ValidationError, NotFoundError, ForbiddenError } = require('../../src/utils/errors');

// Mock the repositories
jest.mock('../../src/repositories/ProjectRepository');
jest.mock('../../src/repositories/ProjectResponsibleRepository');
jest.mock('../../src/repositories/UserRepository');
jest.mock('../../src/repositories/LogActivityRepository');

describe('ProjectService Unit Tests - getProjectDetails', () => {
  let projectService;
  let mockProjectRepository;
  let mockLogActivityRepository;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create service instance
    projectService = new ProjectService();
    
    // Get mock instances
    mockProjectRepository = ProjectRepository.mock.instances[0];
    mockLogActivityRepository = LogActivityRepository.mock.instances[0];
  });

  describe('Input Validation (Subtask 2.1)', () => {
    test('should throw ValidationError for null project ID', async () => {
      await expect(
        projectService.getProjectDetails(null, 1, false)
      ).rejects.toThrow(ValidationError);
      
      await expect(
        projectService.getProjectDetails(null, 1, false)
      ).rejects.toThrow('ID de proyecto inválido');
    });

    test('should throw ValidationError for undefined project ID', async () => {
      await expect(
        projectService.getProjectDetails(undefined, 1, false)
      ).rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError for non-numeric project ID', async () => {
      await expect(
        projectService.getProjectDetails('abc', 1, false)
      ).rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError for negative project ID', async () => {
      await expect(
        projectService.getProjectDetails(-1, 1, false)
      ).rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError for zero project ID', async () => {
      await expect(
        projectService.getProjectDetails(0, 1, false)
      ).rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError for decimal project ID', async () => {
      await expect(
        projectService.getProjectDetails(1.5, 1, false)
      ).rejects.toThrow(ValidationError);
    });

    test('should accept valid numeric string project ID', async () => {
      // Mock successful responses
      mockProjectRepository.getProjectWithCreator.mockResolvedValue({
        id: 1,
        titulo: 'Test Project',
        creado_por: 1,
        creator_name: 'Test User',
        creator_email: 'test@example.com'
      });
      mockProjectRepository.isUserProjectResponsible.mockResolvedValue(false);
      
      // Should not throw for valid string number when user is admin
      await expect(
        projectService.getProjectDetails('1', 1, true)
      ).resolves.toBeDefined();
    });
  });

  describe('Project Existence Check (Subtask 2.2)', () => {
    test('should throw NotFoundError when project does not exist', async () => {
      mockProjectRepository.getProjectWithCreator.mockResolvedValue(null);
      
      await expect(
        projectService.getProjectDetails(999, 1, true)
      ).rejects.toThrow(NotFoundError);
      
      await expect(
        projectService.getProjectDetails(999, 1, true)
      ).rejects.toThrow('Proyecto no encontrado');
    });

    test('should call getProjectWithCreator with correct project ID', async () => {
      mockProjectRepository.getProjectWithCreator.mockResolvedValue(null);
      
      try {
        await projectService.getProjectDetails(123, 1, true);
      } catch (error) {
        // Expected to throw
      }
      
      expect(mockProjectRepository.getProjectWithCreator).toHaveBeenCalledWith(123);
    });
  });

  describe('Authorization Logic (Subtask 2.3)', () => {
    const mockProject = {
      id: 1,
      titulo: 'Test Project',
      creado_por: 1,
      creator_name: 'Test User',
      creator_email: 'test@example.com'
    };

    beforeEach(() => {
      mockProjectRepository.getProjectWithCreator.mockResolvedValue(mockProject);
      mockProjectRepository.getProjectResponsibles.mockResolvedValue([]);
      mockProjectRepository.getProjectTasks.mockResolvedValue([]);
      mockProjectRepository.getProjectFiles.mockResolvedValue([]);
      mockProjectRepository.getProjectActivityLogs.mockResolvedValue([]);
      mockProjectRepository.getProjectStatistics.mockResolvedValue({
        totalTasks: 0,
        tasksByStatus: { pendiente: 0, en_progreso: 0, completada: 0, cancelada: 0 },
        tasksByPriority: { baja: 0, media: 0, alta: 0 },
        totalFiles: 0,
        totalResponsibles: 0
      });
      mockLogActivityRepository.logActivity.mockResolvedValue({});
    });

    test('should allow admin to access any project', async () => {
      const result = await projectService.getProjectDetails(1, 999, true);
      
      expect(result).toBeDefined();
      expect(result.project).toEqual(mockProject);
      // Should not check if user is responsible when admin
      expect(mockProjectRepository.isUserProjectResponsible).not.toHaveBeenCalled();
    });

    test('should allow project responsible to access assigned project', async () => {
      mockProjectRepository.isUserProjectResponsible.mockResolvedValue(true);
      
      const result = await projectService.getProjectDetails(1, 2, false);
      
      expect(result).toBeDefined();
      expect(result.project).toEqual(mockProject);
      expect(mockProjectRepository.isUserProjectResponsible).toHaveBeenCalledWith(1, 2);
    });

    test('should throw ForbiddenError when non-admin non-responsible tries to access', async () => {
      mockProjectRepository.isUserProjectResponsible.mockResolvedValue(false);
      
      await expect(
        projectService.getProjectDetails(1, 999, false)
      ).rejects.toThrow(ForbiddenError);
      
      await expect(
        projectService.getProjectDetails(1, 999, false)
      ).rejects.toThrow('No tiene permisos para ver este proyecto');
    });

    test('should check authorization before fetching related data', async () => {
      mockProjectRepository.isUserProjectResponsible.mockResolvedValue(false);
      
      try {
        await projectService.getProjectDetails(1, 999, false);
      } catch (error) {
        // Expected to throw
      }
      
      // Should not fetch related data if authorization fails
      expect(mockProjectRepository.getProjectResponsibles).not.toHaveBeenCalled();
      expect(mockProjectRepository.getProjectTasks).not.toHaveBeenCalled();
      expect(mockProjectRepository.getProjectFiles).not.toHaveBeenCalled();
    });
  });

  describe('Data Aggregation (Subtask 2.4)', () => {
    const mockProject = {
      id: 1,
      titulo: 'Test Project',
      creado_por: 1,
      creator_name: 'Test User',
      creator_email: 'test@example.com'
    };

    const mockResponsibles = [
      { usuario_id: 2, nombre: 'Responsible 1', rol_responsabilidad: 'responsable_principal' }
    ];

    const mockTasks = [
      { id: 1, titulo: 'Task 1', estado: 'pendiente', prioridad: 'alta' }
    ];

    const mockFiles = [
      { id: 1, nombre_archivo: 'file1.pdf', tamaño_bytes: 1024 }
    ];

    const mockActivityLogs = [
      { id: 1, accion: 'created', usuario_id: 1, user_name: 'Test User' }
    ];

    const mockStatistics = {
      totalTasks: 1,
      tasksByStatus: { pendiente: 1, en_progreso: 0, completada: 0, cancelada: 0 },
      tasksByPriority: { baja: 0, media: 0, alta: 1 },
      totalFiles: 1,
      totalResponsibles: 1
    };

    beforeEach(() => {
      mockProjectRepository.getProjectWithCreator.mockResolvedValue(mockProject);
      mockProjectRepository.getProjectResponsibles.mockResolvedValue(mockResponsibles);
      mockProjectRepository.getProjectTasks.mockResolvedValue(mockTasks);
      mockProjectRepository.getProjectFiles.mockResolvedValue(mockFiles);
      mockProjectRepository.getProjectActivityLogs.mockResolvedValue(mockActivityLogs);
      mockProjectRepository.getProjectStatistics.mockResolvedValue(mockStatistics);
      mockLogActivityRepository.logActivity.mockResolvedValue({});
    });

    test('should combine all data sections into single response object', async () => {
      const result = await projectService.getProjectDetails(1, 1, true);
      
      expect(result).toMatchObject({
        project: mockProject,
        responsibles: mockResponsibles,
        tasks: mockTasks,
        files: mockFiles,
        activityLogs: mockActivityLogs,
        statistics: mockStatistics
      });
    });

    test('should call all repository methods with correct project ID', async () => {
      await projectService.getProjectDetails(1, 1, true);
      
      expect(mockProjectRepository.getProjectResponsibles).toHaveBeenCalledWith(1);
      expect(mockProjectRepository.getProjectTasks).toHaveBeenCalledWith(1);
      expect(mockProjectRepository.getProjectFiles).toHaveBeenCalledWith(1);
      expect(mockProjectRepository.getProjectActivityLogs).toHaveBeenCalledWith(1, 20);
      expect(mockProjectRepository.getProjectStatistics).toHaveBeenCalledWith(1);
    });

    test('should fetch activity logs with limit of 20', async () => {
      await projectService.getProjectDetails(1, 1, true);
      
      expect(mockProjectRepository.getProjectActivityLogs).toHaveBeenCalledWith(1, 20);
    });

    test('should handle empty arrays for sections with no data', async () => {
      mockProjectRepository.getProjectResponsibles.mockResolvedValue([]);
      mockProjectRepository.getProjectTasks.mockResolvedValue([]);
      mockProjectRepository.getProjectFiles.mockResolvedValue([]);
      mockProjectRepository.getProjectActivityLogs.mockResolvedValue([]);
      
      const result = await projectService.getProjectDetails(1, 1, true);
      
      expect(result.responsibles).toEqual([]);
      expect(result.tasks).toEqual([]);
      expect(result.files).toEqual([]);
      expect(result.activityLogs).toEqual([]);
    });
  });

  describe('Activity Logging (Subtask 2.5)', () => {
    const mockProject = {
      id: 1,
      titulo: 'Test Project',
      creado_por: 1,
      creator_name: 'Test User',
      creator_email: 'test@example.com'
    };

    beforeEach(() => {
      mockProjectRepository.getProjectWithCreator.mockResolvedValue(mockProject);
      mockProjectRepository.getProjectResponsibles.mockResolvedValue([]);
      mockProjectRepository.getProjectTasks.mockResolvedValue([]);
      mockProjectRepository.getProjectFiles.mockResolvedValue([]);
      mockProjectRepository.getProjectActivityLogs.mockResolvedValue([]);
      mockProjectRepository.getProjectStatistics.mockResolvedValue({
        totalTasks: 0,
        tasksByStatus: { pendiente: 0, en_progreso: 0, completada: 0, cancelada: 0 },
        tasksByPriority: { baja: 0, media: 0, alta: 0 },
        totalFiles: 0,
        totalResponsibles: 0
      });
    });

    test('should create activity log with action "viewed"', async () => {
      mockLogActivityRepository.logActivity.mockResolvedValue({});
      
      await projectService.getProjectDetails(1, 5, true);
      
      expect(mockLogActivityRepository.logActivity).toHaveBeenCalledWith({
        usuario_id: 5,
        accion: 'viewed',
        entidad_tipo: 'proyecto',
        entidad_id: 1,
        descripcion: 'Proyecto "Test Project" visualizado',
        ip_address: null
      });
    });

    test('should include user ID and project ID in log', async () => {
      mockLogActivityRepository.logActivity.mockResolvedValue({});
      
      await projectService.getProjectDetails(123, 456, true);
      
      expect(mockLogActivityRepository.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          usuario_id: 456,
          entidad_id: 123
        })
      );
    });

    test('should not fail main operation if logging fails', async () => {
      mockLogActivityRepository.logActivity.mockRejectedValue(new Error('Logging failed'));
      
      // Should still return successfully
      const result = await projectService.getProjectDetails(1, 1, true);
      
      expect(result).toBeDefined();
      expect(result.project).toEqual(mockProject);
    });

    test('should log error to console if logging fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockLogActivityRepository.logActivity.mockRejectedValue(new Error('Logging failed'));
      
      await projectService.getProjectDetails(1, 1, true);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error logging project view:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    test('should re-throw ValidationError', async () => {
      await expect(
        projectService.getProjectDetails('invalid', 1, true)
      ).rejects.toThrow(ValidationError);
    });

    test('should re-throw NotFoundError', async () => {
      mockProjectRepository.getProjectWithCreator.mockResolvedValue(null);
      
      await expect(
        projectService.getProjectDetails(999, 1, true)
      ).rejects.toThrow(NotFoundError);
    });

    test('should re-throw ForbiddenError', async () => {
      mockProjectRepository.getProjectWithCreator.mockResolvedValue({
        id: 1,
        titulo: 'Test Project'
      });
      mockProjectRepository.isUserProjectResponsible.mockResolvedValue(false);
      
      await expect(
        projectService.getProjectDetails(1, 999, false)
      ).rejects.toThrow(ForbiddenError);
    });

    test('should throw generic error for unexpected database errors', async () => {
      mockProjectRepository.getProjectWithCreator.mockRejectedValue(
        new Error('Database connection failed')
      );
      
      await expect(
        projectService.getProjectDetails(1, 1, true)
      ).rejects.toThrow('Error obteniendo detalles del proyecto');
    });
  });
});

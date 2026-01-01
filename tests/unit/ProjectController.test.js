/**
 * Unit Tests - ProjectController
 * Tests for getProjectDetails controller method
 * Subtask 4.3: Write unit tests for controller
 * Requirements: 2.1, 2.2, 2.3
 */

const ProjectController = require('../../src/controllers/projectController');
const { ValidationError, NotFoundError, ForbiddenError } = require('../../src/utils/errors');

describe('ProjectController Unit Tests - getProjectDetails', () => {
  let projectController;
  let mockProjectService;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Create mock service
    mockProjectService = {
      getProjectDetails: jest.fn()
    };

    // Create controller instance and inject mock service
    projectController = new ProjectController();
    projectController.projectService = mockProjectService;

    // Create mock request object
    mockReq = {
      params: { id: '1' },
      user: { id: 1, es_administrador: false }
    };

    // Create mock response object
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Create mock next function
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Success Cases', () => {
    test('should return 200 with complete data for authorized user', async () => {
      // Arrange
      const mockProjectDetails = {
        project: { id: 1, titulo: 'Test Project' },
        responsibles: [],
        tasks: [],
        files: [],
        activityLogs: [],
        statistics: {}
      };

      mockProjectService.getProjectDetails.mockResolvedValue(mockProjectDetails);

      // Act
      await projectController.getProjectDetails(mockReq, mockRes, mockNext);

      // Assert
      expect(mockProjectService.getProjectDetails).toHaveBeenCalledWith(1, 1, false);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockProjectDetails
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should handle admin user correctly', async () => {
      // Arrange
      mockReq.user.es_administrador = true;
      const mockProjectDetails = {
        project: { id: 1, titulo: 'Test Project' },
        responsibles: [],
        tasks: [],
        files: [],
        activityLogs: [],
        statistics: {}
      };

      mockProjectService.getProjectDetails.mockResolvedValue(mockProjectDetails);

      // Act
      await projectController.getProjectDetails(mockReq, mockRes, mockNext);

      // Assert
      expect(mockProjectService.getProjectDetails).toHaveBeenCalledWith(1, 1, true);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    test('should parse string project ID to integer', async () => {
      // Arrange
      mockReq.params.id = '123';
      const mockProjectDetails = {
        project: { id: 123, titulo: 'Test Project' },
        responsibles: [],
        tasks: [],
        files: [],
        activityLogs: [],
        statistics: {}
      };

      mockProjectService.getProjectDetails.mockResolvedValue(mockProjectDetails);

      // Act
      await projectController.getProjectDetails(mockReq, mockRes, mockNext);

      // Assert
      expect(mockProjectService.getProjectDetails).toHaveBeenCalledWith(123, 1, false);
    });
  });

  describe('Error Handling - ValidationError', () => {
    test('should return 400 for invalid project ID', async () => {
      // Arrange
      const validationError = new ValidationError('ID de proyecto inválido');
      mockProjectService.getProjectDetails.mockRejectedValue(validationError);

      // Act
      await projectController.getProjectDetails(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'ID de proyecto inválido'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 400 for negative project ID', async () => {
      // Arrange
      mockReq.params.id = '-1';
      const validationError = new ValidationError('ID de proyecto inválido');
      mockProjectService.getProjectDetails.mockRejectedValue(validationError);

      // Act
      await projectController.getProjectDetails(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'ID de proyecto inválido'
      });
    });

    test('should return 400 for zero project ID', async () => {
      // Arrange
      mockReq.params.id = '0';
      const validationError = new ValidationError('ID de proyecto inválido');
      mockProjectService.getProjectDetails.mockRejectedValue(validationError);

      // Act
      await projectController.getProjectDetails(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Error Handling - NotFoundError', () => {
    test('should return 404 for non-existent project', async () => {
      // Arrange
      const notFoundError = new NotFoundError('Proyecto no encontrado');
      mockProjectService.getProjectDetails.mockRejectedValue(notFoundError);

      // Act
      await projectController.getProjectDetails(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Proyecto no encontrado'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 404 with correct error message', async () => {
      // Arrange
      const notFoundError = new NotFoundError('El proyecto con ID 999 no existe');
      mockProjectService.getProjectDetails.mockRejectedValue(notFoundError);

      // Act
      await projectController.getProjectDetails(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'El proyecto con ID 999 no existe'
      });
    });
  });

  describe('Error Handling - ForbiddenError', () => {
    test('should return 403 for unauthorized user', async () => {
      // Arrange
      const forbiddenError = new ForbiddenError('No tiene permisos para ver este proyecto');
      mockProjectService.getProjectDetails.mockRejectedValue(forbiddenError);

      // Act
      await projectController.getProjectDetails(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'No tiene permisos para ver este proyecto'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 403 when non-admin user tries to access unassigned project', async () => {
      // Arrange
      mockReq.user.es_administrador = false;
      const forbiddenError = new ForbiddenError('No tiene permisos para ver este proyecto');
      mockProjectService.getProjectDetails.mockRejectedValue(forbiddenError);

      // Act
      await projectController.getProjectDetails(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Error Handling - Database Errors', () => {
    test('should handle database errors gracefully', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockProjectService.getProjectDetails.mockRejectedValue(dbError);

      // Act
      await projectController.getProjectDetails(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(dbError);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('should pass generic errors to error handler middleware', async () => {
      // Arrange
      const genericError = new Error('Something went wrong');
      mockProjectService.getProjectDetails.mockRejectedValue(genericError);

      // Act
      await projectController.getProjectDetails(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(genericError);
    });

    test('should log error before passing to middleware', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const genericError = new Error('Unexpected error');
      mockProjectService.getProjectDetails.mockRejectedValue(genericError);

      // Act
      await projectController.getProjectDetails(mockReq, mockRes, mockNext);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error obteniendo detalles del proyecto:',
        genericError
      );
      expect(mockNext).toHaveBeenCalledWith(genericError);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Request Parameter Extraction', () => {
    test('should extract projectId from req.params.id', async () => {
      // Arrange
      mockReq.params.id = '42';
      mockProjectService.getProjectDetails.mockResolvedValue({
        project: { id: 42 },
        responsibles: [],
        tasks: [],
        files: [],
        activityLogs: [],
        statistics: {}
      });

      // Act
      await projectController.getProjectDetails(mockReq, mockRes, mockNext);

      // Assert
      expect(mockProjectService.getProjectDetails).toHaveBeenCalledWith(
        42,
        expect.any(Number),
        expect.any(Boolean)
      );
    });

    test('should extract userId from req.user.id', async () => {
      // Arrange
      mockReq.user.id = 999;
      mockProjectService.getProjectDetails.mockResolvedValue({
        project: { id: 1 },
        responsibles: [],
        tasks: [],
        files: [],
        activityLogs: [],
        statistics: {}
      });

      // Act
      await projectController.getProjectDetails(mockReq, mockRes, mockNext);

      // Assert
      expect(mockProjectService.getProjectDetails).toHaveBeenCalledWith(
        expect.any(Number),
        999,
        expect.any(Boolean)
      );
    });

    test('should extract isAdmin from req.user.es_administrador', async () => {
      // Arrange
      mockReq.user.es_administrador = true;
      mockProjectService.getProjectDetails.mockResolvedValue({
        project: { id: 1 },
        responsibles: [],
        tasks: [],
        files: [],
        activityLogs: [],
        statistics: {}
      });

      // Act
      await projectController.getProjectDetails(mockReq, mockRes, mockNext);

      // Assert
      expect(mockProjectService.getProjectDetails).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        true
      );
    });

    test('should default isAdmin to false if not present', async () => {
      // Arrange
      delete mockReq.user.es_administrador;
      mockProjectService.getProjectDetails.mockResolvedValue({
        project: { id: 1 },
        responsibles: [],
        tasks: [],
        files: [],
        activityLogs: [],
        statistics: {}
      });

      // Act
      await projectController.getProjectDetails(mockReq, mockRes, mockNext);

      // Assert
      expect(mockProjectService.getProjectDetails).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        false
      );
    });
  });
});

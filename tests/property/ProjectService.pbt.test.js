/**
 * Property-Based Tests - ProjectService
 * Tests for getProjectDetails service method
 * 
 * Property 2: Authorization Enforcement - Validates: Requirements 7.3, 7.4
 * Property 4: Invalid Project ID Validation - Validates: Requirements 2.3, 15.1, 15.2
 * Property 1: Project Details Completeness - Validates: Requirements 2.5
 * 
 * Feature: project-detail-view
 */

const fc = require('fast-check');
const ProjectService = require('../../src/services/projectService');
const ProjectRepository = require('../../src/repositories/ProjectRepository');
const LogActivityRepository = require('../../src/repositories/LogActivityRepository');
const { ValidationError, NotFoundError, ForbiddenError } = require('../../src/utils/errors');

// Mock the repositories
jest.mock('../../src/repositories/ProjectRepository');
jest.mock('../../src/repositories/ProjectResponsibleRepository');
jest.mock('../../src/repositories/UserRepository');
jest.mock('../../src/repositories/LogActivityRepository');

describe('Property-Based Tests - ProjectService', () => {
  let projectService;
  let mockProjectRepository;
  let mockLogActivityRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    projectService = new ProjectService();
    mockProjectRepository = ProjectRepository.mock.instances[0];
    mockLogActivityRepository = LogActivityRepository.mock.instances[0];
  });

  describe('Property 2: Authorization Enforcement', () => {
    /**
     * Property: For any project detail request, if the requesting user is neither 
     * an administrator nor a project responsible, the system should return a 403 Forbidden error.
     * 
     * Validates: Requirements 7.3, 7.4
     * Tag: Feature: project-detail-view, Property 2: Authorization Enforcement
     */
    test('should enforce authorization for all non-admin non-responsible users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // projectId
          fc.integer({ min: 1, max: 1000 }), // userId
          async (projectId, userId) => {
            // Setup: Project exists
            mockProjectRepository.getProjectWithCreator.mockResolvedValue({
              id: projectId,
              titulo: `Project ${projectId}`,
              creado_por: 1,
              creator_name: 'Creator',
              creator_email: 'creator@example.com'
            });
            
            // Setup: User is NOT responsible
            mockProjectRepository.isUserProjectResponsible.mockResolvedValue(false);
            
            // Test: Non-admin, non-responsible user should be denied
            try {
              await projectService.getProjectDetails(projectId, userId, false);
              // If we reach here, the test failed - should have thrown ForbiddenError
              return false;
            } catch (error) {
              // Should throw ForbiddenError
              return error instanceof ForbiddenError;
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true
        }
      );
    });

    test('should allow admin access to any project', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // projectId
          fc.integer({ min: 1, max: 1000 }), // userId
          async (projectId, userId) => {
            // Setup: Project exists
            mockProjectRepository.getProjectWithCreator.mockResolvedValue({
              id: projectId,
              titulo: `Project ${projectId}`,
              creado_por: 1,
              creator_name: 'Creator',
              creator_email: 'creator@example.com'
            });
            
            // Setup: Mock all data fetching methods
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
            
            // Test: Admin should have access
            try {
              const result = await projectService.getProjectDetails(projectId, userId, true);
              // Should succeed and return data
              return result !== null && result.project !== undefined;
            } catch (error) {
              // Should not throw for admin
              return false;
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true
        }
      );
    });

    test('should allow responsible user access to assigned project', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // projectId
          fc.integer({ min: 1, max: 1000 }), // userId
          async (projectId, userId) => {
            // Setup: Project exists
            mockProjectRepository.getProjectWithCreator.mockResolvedValue({
              id: projectId,
              titulo: `Project ${projectId}`,
              creado_por: 1,
              creator_name: 'Creator',
              creator_email: 'creator@example.com'
            });
            
            // Setup: User IS responsible
            mockProjectRepository.isUserProjectResponsible.mockResolvedValue(true);
            
            // Setup: Mock all data fetching methods
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
            
            // Test: Responsible user should have access
            try {
              const result = await projectService.getProjectDetails(projectId, userId, false);
              // Should succeed and return data
              return result !== null && result.project !== undefined;
            } catch (error) {
              // Should not throw for responsible user
              return false;
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true
        }
      );
    });
  });

  describe('Property 4: Invalid Project ID Validation', () => {
    /**
     * Property: For any non-numeric or negative project ID, when requesting project details,
     * the system should return a 400 Bad Request error.
     * 
     * Validates: Requirements 2.3, 15.1, 15.2
     * Tag: Feature: project-detail-view, Property 4: Invalid Project ID Validation
     */
    test('should reject negative project IDs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ max: -1 }), // Negative integers
          fc.integer({ min: 1, max: 1000 }), // userId
          async (projectId, userId) => {
            try {
              await projectService.getProjectDetails(projectId, userId, true);
              // Should have thrown ValidationError
              return false;
            } catch (error) {
              return error instanceof ValidationError;
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true
        }
      );
    });

    test('should reject zero as project ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // userId
          async (userId) => {
            try {
              await projectService.getProjectDetails(0, userId, true);
              // Should have thrown ValidationError
              return false;
            } catch (error) {
              return error instanceof ValidationError;
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true
        }
      );
    });

    test('should reject non-numeric strings as project ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => isNaN(s)), // Non-numeric strings
          fc.integer({ min: 1, max: 1000 }), // userId
          async (projectId, userId) => {
            try {
              await projectService.getProjectDetails(projectId, userId, true);
              // Should have thrown ValidationError
              return false;
            } catch (error) {
              return error instanceof ValidationError;
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true
        }
      );
    });

    test('should reject decimal numbers as project ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.double({ min: 0.1, max: 1000, noNaN: true }).filter(n => !Number.isInteger(n)), // Decimals
          fc.integer({ min: 1, max: 1000 }), // userId
          async (projectId, userId) => {
            try {
              await projectService.getProjectDetails(projectId, userId, true);
              // Should have thrown ValidationError
              return false;
            } catch (error) {
              return error instanceof ValidationError;
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true
        }
      );
    });

    test('should reject null and undefined as project ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(null, undefined),
          fc.integer({ min: 1, max: 1000 }), // userId
          async (projectId, userId) => {
            try {
              await projectService.getProjectDetails(projectId, userId, true);
              // Should have thrown ValidationError
              return false;
            } catch (error) {
              return error instanceof ValidationError;
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true
        }
      );
    });

    test('should accept valid positive integer project IDs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // Valid project IDs
          fc.integer({ min: 1, max: 1000 }), // userId
          async (projectId, userId) => {
            // Setup: Project exists
            mockProjectRepository.getProjectWithCreator.mockResolvedValue({
              id: projectId,
              titulo: `Project ${projectId}`,
              creado_por: 1,
              creator_name: 'Creator',
              creator_email: 'creator@example.com'
            });
            
            // Setup: Mock all data fetching methods
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
            
            try {
              // Admin user should be able to access
              const result = await projectService.getProjectDetails(projectId, userId, true);
              // Should not throw ValidationError for valid IDs
              return result !== null;
            } catch (error) {
              // Should not throw ValidationError
              return !(error instanceof ValidationError);
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true
        }
      );
    });
  });

  describe('Property 1: Project Details Completeness', () => {
    /**
     * Property: For any valid project ID, when fetching project details, the response should 
     * include all five data sections: project info, responsibles, tasks, files, and activity logs
     * (even if some sections are empty arrays).
     * 
     * Validates: Requirements 2.5
     * Tag: Feature: project-detail-view, Property 1: Project Details Completeness
     */
    test('should always return all five data sections', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // projectId
          fc.integer({ min: 1, max: 1000 }), // userId
          fc.array(fc.record({
            usuario_id: fc.integer({ min: 1, max: 100 }),
            nombre: fc.string({ minLength: 1, maxLength: 50 }),
            rol_responsabilidad: fc.constantFrom('responsable_principal', 'colaborador')
          }), { maxLength: 10 }), // responsibles
          fc.array(fc.record({
            id: fc.integer({ min: 1, max: 1000 }),
            titulo: fc.string({ minLength: 1, maxLength: 100 }),
            estado: fc.constantFrom('pendiente', 'en_progreso', 'completada')
          }), { maxLength: 20 }), // tasks
          fc.array(fc.record({
            id: fc.integer({ min: 1, max: 1000 }),
            nombre_archivo: fc.string({ minLength: 1, maxLength: 50 }),
            tamaño_bytes: fc.integer({ min: 0, max: 10000000 })
          }), { maxLength: 15 }), // files
          fc.array(fc.record({
            id: fc.integer({ min: 1, max: 1000 }),
            accion: fc.constantFrom('created', 'updated', 'viewed'),
            usuario_id: fc.integer({ min: 1, max: 100 })
          }), { maxLength: 20 }), // activityLogs
          async (projectId, userId, responsibles, tasks, files, activityLogs) => {
            // Setup: Project exists
            mockProjectRepository.getProjectWithCreator.mockResolvedValue({
              id: projectId,
              titulo: `Project ${projectId}`,
              creado_por: 1,
              creator_name: 'Creator',
              creator_email: 'creator@example.com'
            });
            
            // Setup: Mock data with generated values
            mockProjectRepository.getProjectResponsibles.mockResolvedValue(responsibles);
            mockProjectRepository.getProjectTasks.mockResolvedValue(tasks);
            mockProjectRepository.getProjectFiles.mockResolvedValue(files);
            mockProjectRepository.getProjectActivityLogs.mockResolvedValue(activityLogs);
            mockProjectRepository.getProjectStatistics.mockResolvedValue({
              totalTasks: tasks.length,
              tasksByStatus: { pendiente: 0, en_progreso: 0, completada: 0, cancelada: 0 },
              tasksByPriority: { baja: 0, media: 0, alta: 0 },
              totalFiles: files.length,
              totalResponsibles: responsibles.length
            });
            mockLogActivityRepository.logActivity.mockResolvedValue({});
            
            // Test: Admin user fetches details
            const result = await projectService.getProjectDetails(projectId, userId, true);
            
            // Verify all five sections are present
            const hasProject = result.project !== undefined && result.project !== null;
            const hasResponsibles = Array.isArray(result.responsibles);
            const hasTasks = Array.isArray(result.tasks);
            const hasFiles = Array.isArray(result.files);
            const hasActivityLogs = Array.isArray(result.activityLogs);
            const hasStatistics = result.statistics !== undefined && result.statistics !== null;
            
            return hasProject && hasResponsibles && hasTasks && hasFiles && hasActivityLogs && hasStatistics;
          }
        ),
        {
          numRuns: 100,
          verbose: true
        }
      );
    });

    test('should return empty arrays for sections with no data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // projectId
          fc.integer({ min: 1, max: 1000 }), // userId
          async (projectId, userId) => {
            // Setup: Project exists but has no related data
            mockProjectRepository.getProjectWithCreator.mockResolvedValue({
              id: projectId,
              titulo: `Project ${projectId}`,
              creado_por: 1,
              creator_name: 'Creator',
              creator_email: 'creator@example.com'
            });
            
            // Setup: All sections return empty arrays
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
            
            // Test: Admin user fetches details
            const result = await projectService.getProjectDetails(projectId, userId, true);
            
            // Verify empty arrays are returned (not null or undefined)
            return (
              Array.isArray(result.responsibles) && result.responsibles.length === 0 &&
              Array.isArray(result.tasks) && result.tasks.length === 0 &&
              Array.isArray(result.files) && result.files.length === 0 &&
              Array.isArray(result.activityLogs) && result.activityLogs.length === 0
            );
          }
        ),
        {
          numRuns: 100,
          verbose: true
        }
      );
    });
  });

  describe('Property 15: Activity Logging on View', () => {
    /**
     * Property: For any successful project detail view, the system should create 
     * an activity log entry with action type "viewed" and the current user's ID.
     * 
     * Validates: Requirements 13.1, 13.2
     * Tag: Feature: project-detail-view, Property 15: Activity Logging on View
     */
    test('should log activity for every successful project view', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // projectId
          fc.integer({ min: 1, max: 1000 }), // userId
          async (projectId, userId) => {
            // Setup: Project exists
            mockProjectRepository.getProjectWithCreator.mockResolvedValue({
              id: projectId,
              titulo: `Project ${projectId}`,
              creado_por: 1,
              creator_name: 'Creator',
              creator_email: 'creator@example.com'
            });
            
            // Setup: Mock all data fetching methods
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
            
            // Setup: Mock activity logging
            mockLogActivityRepository.logActivity.mockResolvedValue({});
            
            // Test: Admin user views project details
            await projectService.getProjectDetails(projectId, userId, true);
            
            // Verify: logActivity was called with correct object parameter
            expect(mockLogActivityRepository.logActivity).toHaveBeenCalledWith({
              usuario_id: userId,
              accion: 'viewed',
              entidad_tipo: 'proyecto',
              entidad_id: projectId,
              descripcion: expect.stringContaining('visualizado'),
              ip_address: null
            });
            
            return true;
          }
        ),
        {
          numRuns: 100,
          verbose: true
        }
      );
    });

    test('should not fail main operation if logging fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // projectId
          fc.integer({ min: 1, max: 1000 }), // userId
          async (projectId, userId) => {
            // Setup: Project exists
            mockProjectRepository.getProjectWithCreator.mockResolvedValue({
              id: projectId,
              titulo: `Project ${projectId}`,
              creado_por: 1,
              creator_name: 'Creator',
              creator_email: 'creator@example.com'
            });
            
            // Setup: Mock all data fetching methods
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
            
            // Setup: Mock activity logging to fail
            mockLogActivityRepository.logActivity.mockRejectedValue(new Error('Logging failed'));
            
            // Test: Admin user views project details - should succeed despite logging failure
            try {
              const result = await projectService.getProjectDetails(projectId, userId, true);
              
              // Verify: Main operation succeeded
              return result !== null && result.project !== undefined;
            } catch (error) {
              // Should not throw error due to logging failure
              return false;
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true
        }
      );
    });
  });

  describe('Property 9: Activity Log Limit', () => {
    /**
     * Property: For any project, when fetching activity logs, the system should 
     * return at most 20 entries, ordered by most recent first.
     * 
     * Validates: Requirements 6.2
     * Tag: Feature: project-detail-view, Property 9: Activity Log Limit
     */
    test('should limit activity logs to maximum 20 entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // projectId
          fc.integer({ min: 1, max: 1000 }), // userId
          fc.integer({ min: 0, max: 100 }), // Number of activity logs (0 to 100)
          async (projectId, userId, logCount) => {
            // Setup: Project exists
            mockProjectRepository.getProjectWithCreator.mockResolvedValue({
              id: projectId,
              titulo: `Project ${projectId}`,
              creado_por: 1,
              creator_name: 'Creator',
              creator_email: 'creator@example.com'
            });
            
            // Setup: Generate activity logs (up to logCount)
            const activityLogs = Array.from({ length: logCount }, (_, i) => ({
              id: i + 1,
              usuario_id: userId,
              user_name: `User ${userId}`,
              accion: 'updated',
              descripcion: `Activity ${i + 1}`,
              created_at: new Date(Date.now() - i * 1000).toISOString()
            }));
            
            // Setup: Mock all data fetching methods
            mockProjectRepository.getProjectResponsibles.mockResolvedValue([]);
            mockProjectRepository.getProjectTasks.mockResolvedValue([]);
            mockProjectRepository.getProjectFiles.mockResolvedValue([]);
            mockProjectRepository.getProjectActivityLogs.mockResolvedValue(
              activityLogs.slice(0, 20) // Repository should limit to 20
            );
            mockProjectRepository.getProjectStatistics.mockResolvedValue({
              totalTasks: 0,
              tasksByStatus: { pendiente: 0, en_progreso: 0, completada: 0, cancelada: 0 },
              tasksByPriority: { baja: 0, media: 0, alta: 0 },
              totalFiles: 0,
              totalResponsibles: 0
            });
            mockLogActivityRepository.logActivity.mockResolvedValue({});
            
            // Test: Admin user fetches project details
            const result = await projectService.getProjectDetails(projectId, userId, true);
            
            // Verify: Activity logs are limited to 20 entries
            expect(result.activityLogs).toBeDefined();
            expect(Array.isArray(result.activityLogs)).toBe(true);
            expect(result.activityLogs.length).toBeLessThanOrEqual(20);
            
            // Verify: Repository was called with limit of 20
            expect(mockProjectRepository.getProjectActivityLogs).toHaveBeenCalledWith(projectId, 20);
            
            return true;
          }
        ),
        {
          numRuns: 100,
          verbose: true
        }
      );
    });

    test('should return activity logs ordered by most recent first', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // projectId
          fc.integer({ min: 1, max: 1000 }), // userId
          fc.integer({ min: 2, max: 20 }), // Number of activity logs (at least 2 to test ordering)
          async (projectId, userId, logCount) => {
            // Setup: Project exists
            mockProjectRepository.getProjectWithCreator.mockResolvedValue({
              id: projectId,
              titulo: `Project ${projectId}`,
              creado_por: 1,
              creator_name: 'Creator',
              creator_email: 'creator@example.com'
            });
            
            // Setup: Generate activity logs with timestamps (most recent first)
            const now = Date.now();
            const activityLogs = Array.from({ length: logCount }, (_, i) => ({
              id: i + 1,
              usuario_id: userId,
              user_name: `User ${userId}`,
              accion: 'updated',
              descripcion: `Activity ${i + 1}`,
              created_at: new Date(now - i * 60000).toISOString() // Each log 1 minute apart
            }));
            
            // Setup: Mock all data fetching methods
            mockProjectRepository.getProjectResponsibles.mockResolvedValue([]);
            mockProjectRepository.getProjectTasks.mockResolvedValue([]);
            mockProjectRepository.getProjectFiles.mockResolvedValue([]);
            mockProjectRepository.getProjectActivityLogs.mockResolvedValue(activityLogs);
            mockProjectRepository.getProjectStatistics.mockResolvedValue({
              totalTasks: 0,
              tasksByStatus: { pendiente: 0, en_progreso: 0, completada: 0, cancelada: 0 },
              tasksByPriority: { baja: 0, media: 0, alta: 0 },
              totalFiles: 0,
              totalResponsibles: 0
            });
            mockLogActivityRepository.logActivity.mockResolvedValue({});
            
            // Test: Admin user fetches project details
            const result = await projectService.getProjectDetails(projectId, userId, true);
            
            // Verify: Activity logs are ordered by most recent first
            if (result.activityLogs.length >= 2) {
              for (let i = 0; i < result.activityLogs.length - 1; i++) {
                const currentDate = new Date(result.activityLogs[i].created_at);
                const nextDate = new Date(result.activityLogs[i + 1].created_at);
                // Current log should be more recent (or equal) than next log
                expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
              }
            }
            
            return true;
          }
        ),
        {
          numRuns: 100,
          verbose: true
        }
      );
    });
  });
});

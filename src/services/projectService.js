const ProjectRepository = require('../repositories/ProjectRepository');
const ProjectResponsibleRepository = require('../repositories/ProjectResponsibleRepository');
const UserRepository = require('../repositories/UserRepository');
const LogActivityRepository = require('../repositories/LogActivityRepository');
const { NotFoundError, ValidationError, ConflictError, ForbiddenError } = require('../utils/errors');

/**
 * ProjectService - Servicio para gestión de proyectos
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja lógica de negocio de proyectos
 * - Open/Closed: Abierto para extensión (nuevos métodos)
 * - Liskov Substitution: Puede ser sustituido por otros servicios
 * - Interface Segregation: Métodos específicos para cada operación
 * - Dependency Inversion: Depende de abstracciones (ProjectRepository, LogActivityRepository)
 */
class ProjectService {
  constructor() {
    this.projectRepository = new ProjectRepository();
    this.projectResponsibleRepository = new ProjectResponsibleRepository();
    this.userRepository = new UserRepository();
    this.logActivityRepository = new LogActivityRepository();
  }

  /**
   * Obtener todos los proyectos con paginación y filtros
   */
  async getAllProjects({ page = 1, limit = 10, filters = {}, isAdmin = false }) {
    try {
      const offset = (page - 1) * limit;
      
      const projects = await this.projectRepository.findAll({
        limit,
        offset,
        filters,
        isAdmin
      });

      const total = await this.projectRepository.count(filters, isAdmin);

      return {
        projects,
        pagination: {
          page, limit, total, pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error en ProjectService.getAllProjects:', error);
      throw new Error('Error obteniendo proyectos');
    }
  }

  /**
   * Obtener proyecto por ID
   */
  async getProjectById(id, userId = null, isAdmin = false) {
    try {
      const project = await this.projectRepository.findById(id);
      
      if (!project) {
        throw new NotFoundError('Proyecto no encontrado');
      }

      // Verificar acceso si no es admin
      if (!isAdmin && userId) {
        const hasAccess = await this.projectRepository.hasUserAccess(id, userId);
        if (!hasAccess) {
          throw new Error('No tienes acceso a este proyecto');
        }
      }

      // Obtener responsables del proyecto
      const responsibles = await this.projectResponsibleRepository.getProjectResponsibles(id);
      project.responsables = responsibles;

      return project;
    } catch (error) {
      console.error('Error en ProjectService.getProjectById:', error);
      throw error;
    }
  }

  /**
   * Crear nuevo proyecto
   */
  async createProject(projectData, createdBy, ipAddress = null) {
    try {
      const dataToCreate = {
        ...projectData,
        creado_por: createdBy,
        created_at: new Date(),
        updated_at: new Date()
      };
  
      const project = await this.projectRepository.create(dataToCreate);
      
      // Registrar actividad de creación (Principio de Responsabilidad Única)
      try {
        await this.logActivityRepository.logActivity({
          usuario_id: createdBy,
          accion: 'crear',
          entidad_tipo: 'proyecto',
          entidad_id: project.id,
          descripcion: `Proyecto "${projectData.titulo}" creado`,
          ip_address: ipAddress
        });
      } catch (logError) {
        console.error('Error logging project creation:', logError);
        // No fallar la operación principal por errores de logging
      }
      
      return project;
    } catch (error) {
      throw new Error(`Error creating project: ${error.message}`);
    }
  }

  /**
   * Actualizar proyecto
   */
  async updateProject(id, projectData, userId, isAdmin = false, ipAddress = null) {
    try {
      const existingProject = await this.projectRepository.findById(id);
      if (!existingProject) {
        throw new NotFoundError('Proyecto no encontrado');
      }

      // Verificar acceso si no es admin
      if (!isAdmin) {
        const hasAccess = await this.projectRepository.hasUserAccess(id, userId);
        if (!hasAccess) {
          throw new Error('No tienes permisos para actualizar este proyecto');
        }
      }

      // Si se está actualizando el título, verificar que no exista
      if (projectData.titulo && projectData.titulo !== existingProject.titulo) {
        const titleExists = await this.projectRepository.findByTitle(projectData.titulo);
        if (titleExists) {
          throw new Error('Ya existe un proyecto con ese título');
        }
      }

      const updatedProject = await this.projectRepository.updateById(id, projectData);
      
      // Registrar actividad de actualización (Principio de Responsabilidad Única)
      try {
        await this.logActivityRepository.logActivity({
          usuario_id: userId,
          accion: 'actualizar',
          entidad_tipo: 'proyecto',
          entidad_id: id,
          descripcion: `Proyecto "${existingProject.titulo}" actualizado`,
          ip_address: ipAddress
        });
      } catch (logError) {
        console.error('Error logging project update:', logError);
      }
      
      return updatedProject;
    } catch (error) {
      console.error('Error en ProjectService.updateProject:', error);
      throw error;
    }
  }

  /**
   * Eliminar proyecto
   */
  async deleteProject(id, userId, isAdmin = false) {
    try {
      const project = await this.projectRepository.findById(id);
      if (!project) {
        throw new NotFoundError('Proyecto no encontrado');
      }

      // Verificar acceso si no es admin
      if (!isAdmin) {
        const hasAccess = await this.projectRepository.hasUserAccess(id, userId);
        if (!hasAccess) {
          throw new Error('No tienes permisos para eliminar este proyecto');
        }
      }

      // Verificar si el proyecto tiene tareas asociadas
      const tasks = await this.projectRepository.getProjectTasks(id);
      if (tasks && tasks.length > 0) {
        throw new ValidationError('No se puede eliminar un proyecto con tareas asociadas. Elimina las tareas primero.');
      }

      // Eliminar el proyecto (CASCADE eliminará automáticamente responsables y archivos)
      const deletedRows = await this.projectRepository.deleteById(id);
      if (deletedRows === 0) {
        throw new Error('No se pudo eliminar el proyecto');
      }
      
      console.log(`Proyecto ${id} eliminado exitosamente (incluyendo relaciones en cascada)`);
      return { message: 'Proyecto eliminado correctamente' };
    } catch (error) {
      console.error('Error en ProjectService.deleteProject:', error);
      throw error;
    }
  }

  /**
   * Cambiar estado del proyecto
   */
  async changeProjectStatus(id, newStatus, userId, isAdmin = false) {
    try {
      const project = await this.projectRepository.findById(id);
      if (!project) {
        throw new NotFoundError('Proyecto no encontrado');
      }

      // Verificar acceso si no es admin
      if (!isAdmin) {
        const hasAccess = await this.projectRepository.hasUserAccess(id, userId);
        if (!hasAccess) {
          throw new Error('No tienes permisos para cambiar el estado de este proyecto');
        }
      }

      // Validar transición de estado
      const validTransitions = {
        'planificacion': ['en_progreso', 'cancelado'],
        'en_progreso': ['completado', 'cancelado'],
        'completado': [],
        'cancelado': ['planificacion']
      };

      if (!validTransitions[project.estado].includes(newStatus)) {
        throw new Error(`No se puede cambiar de ${project.estado} a ${newStatus}`);
      }

      const updatedProject = await this.projectRepository.updateById(id, { estado: newStatus });
      return updatedProject;
    } catch (error) {
      console.error('Error en ProjectService.changeProjectStatus:', error);
      throw error;
    }
  }

  /**
   * Asignar responsable al proyecto
   */
  async assignResponsible(projectId, userId, assignedBy, ipAddress = null) {
    try {
      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        throw new NotFoundError('Proyecto no encontrado');
      }

      // Verificar si ya es responsable
      const isAlreadyResponsible = await this.projectResponsibleRepository.isUserResponsible(projectId, userId);
      if (isAlreadyResponsible) {
        throw new Error('El usuario ya es responsable de este proyecto');
      }

      // Llamar con los parámetros correctos: proyecto_id, usuario_id, rol_responsabilidad, asignado_por
      await this.projectResponsibleRepository.assignResponsible(projectId, userId, 'responsable_principal', assignedBy);
      
      // Registrar actividad de asignación (Principio de Responsabilidad Única)
      try {
        const assignedUser = await this.userRepository.findById(userId);
        await this.logActivityRepository.logActivity({
          usuario_id: assignedBy,
          accion: 'asignar',
          entidad_tipo: 'proyecto',
          entidad_id: projectId,
          descripcion: `Asignación de rol: responsable al usuario ${assignedUser?.nombre || 'ID: ' + userId} en proyecto "${project.titulo}"`,
          ip_address: ipAddress
        });
      } catch (logError) {
        console.error('Error logging responsible assignment:', logError);
      }
      
      return { message: 'Responsable asignado correctamente' };
    } catch (error) {
      console.error('Error en ProjectService.assignResponsible:', error);
      throw error;
    }
  }

  /**
   * Remover responsable del proyecto
   */
  async removeResponsible(projectId, userId) {
    try {
      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        return { success: false, message: 'Proyecto no encontrado' };
      }

      const isResponsible = await this.projectResponsibleRepository.isUserResponsible(projectId, userId);
      if (!isResponsible) {
        return { success: false, message: 'El usuario no es responsable de este proyecto' };
      }

      await this.projectResponsibleRepository.removeResponsible(projectId, userId);
      return { success: true, message: 'Responsable removido correctamente' };
    } catch (error) {
      console.error('Error en ProjectService.removeResponsible:', error);
      return { success: false, message: 'Error interno del servidor' };
    }
  }

  /**
   * Obtener responsables del proyecto
   */
  async getProjectResponsibles(projectId) {
    try {
      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        throw new NotFoundError('Proyecto no encontrado');
      }

      const responsibles = await this.projectResponsibleRepository.getProjectResponsibles(projectId);
      return responsibles;
    } catch (error) {
      console.error('Error en ProjectService.getProjectResponsibles:', error);
      throw error;
    }
  }

  /**
   * Obtener tareas del proyecto
   */
  async getProjectTasks(projectId, userId = null, isAdmin = false) {
    try {
      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        throw new NotFoundError('Proyecto no encontrado');
      }

      // Verificar acceso si no es admin
      if (!isAdmin && userId) {
        const hasAccess = await this.projectRepository.hasUserAccess(projectId, userId);
        if (!hasAccess) {
          throw new Error('No tienes acceso a este proyecto');
        }
      }

      const tasks = await this.projectRepository.getProjectTasks(projectId);
      return tasks;
    } catch (error) {
      console.error('Error en ProjectService.getProjectTasks:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas del proyecto
   */
  async getProjectStats(projectId, userId = null, isAdmin = false) {
    try {
      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        throw new NotFoundError('Proyecto no encontrado');
      }

      // Verificar acceso si no es admin
      if (!isAdmin && userId) {
        const hasAccess = await this.projectRepository.hasUserAccess(projectId, userId);
        if (!hasAccess) {
          throw new Error('No tienes acceso a este proyecto');
        }
      }

      const stats = await this.projectRepository.getProjectStats(projectId);
      return stats;
    } catch (error) {
      console.error('Error en ProjectService.getProjectStats:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas generales de proyectos
   */
  async getProjectsOverview(userId = null, isAdmin = false) {
    try {
      const stats = await this.projectRepository.getOverviewStats(userId, isAdmin);
      return stats;
    } catch (error) {
      console.error('Error en ProjectService.getProjectsOverview:', error);
      throw new Error('Error obteniendo estadísticas de proyectos');
    }
  }

  /**
   * Buscar proyectos
   */
  async searchProjects(query = '', { page = 1, limit = 10, userId = null, isAdmin = false } = {}) {
    try {
      // Validar parámetros
      if (typeof query !== 'string') {
        throw new Error('El parámetro de búsqueda debe ser una cadena de texto');
      }

      if (page < 1 || limit < 1) {
        throw new Error('Los parámetros de paginación deben ser números positivos');
      }

      const offset = (page - 1) * limit;
      
      const projects = await this.projectRepository.search(query, {
        limit,
        offset,
        userId,
        isAdmin
      });

      const total = await this.projectRepository.countSearch(query, userId, isAdmin);

      return {
        projects,
        pagination: {
          page, limit, total, pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error en ProjectService.searchProjects:', error);
      throw error; // Re-lanzar el error original para mantener el mensaje específico
    }
  }

  /**
   * Obtener proyectos por estado
   */
  async getProjectsByStatus(status, { page = 1, limit = 10, userId = null, isAdmin = false }) {
    try {
      const offset = (page - 1) * limit;
      
      const projects = await this.projectRepository.findByStatus(status, {
        limit,
        offset,
        userId,
        isAdmin
      });

      const total = await this.projectRepository.countByStatus(status, userId, isAdmin);

      return {
        projects,
        pagination: {
          page, limit, total, pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error en ProjectService.getProjectsByStatus:', error);
      throw new Error('Error obteniendo proyectos por estado');
    }
  }

  /**
   * Obtener mis proyectos (donde soy responsable)
   */
  async getUserProjects(userId, page = 1, limit = 10) {
    try {
        const offset = (page - 1) * limit;
        
        const projects = await this.projectRepository.findByResponsible(userId, limit, offset);
        
        const total = await this.projectRepository.countByResponsible(userId);
        
        return {
            projects,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        throw new Error(`Error getting user projects: ${error.message}`);
    }
  }

  /**
   * Obtener mis proyectos (donde soy responsable) - alias para compatibilidad
   */
  async getMyProjects(userId, { page = 1, limit = 10 } = {}) {
    return this.getUserProjects(userId, { page, limit });
  }

  /**
   * Verificar si un usuario puede gestionar un proyecto
   * Un usuario puede gestionar un proyecto si:
   * - Es administrador
   * - Es responsable del proyecto
   */
  async userCanManageProject(userId, projectId) {
    try {
      // Verificar si es responsable del proyecto usando el repositorio
      const result = await this.projectResponsibleRepository.db('proyecto_responsables')
        .select('1')
        .where('proyecto_id', projectId)
        .where('usuario_id', userId)
        .where('activo', true)
        .first();

      return !!result;
    } catch (error) {
      console.error('Error en ProjectService.userCanManageProject:', error);
      return false;
    }
  }

  /**
   * Verificar si un usuario tiene acceso a un proyecto
   * Un usuario tiene acceso si:
   * - Es administrador
   * - Es responsable del proyecto
   * - Tiene tareas asignadas en el proyecto
   */
  async userHasAccessToProject(userId, projectId) {
    try {
      return await this.projectRepository.hasUserAccess(projectId, userId);
    } catch (error) {
      console.error('Error en ProjectService.userHasAccessToProject:', error);
      return false;
    }
  }

  /**
   * Obtener proyectos recientes
   */
  async getRecentProjects(userId = null, isAdmin = false, limit = 5) {
    try {
      const projects = await this.projectRepository.findRecent(userId, isAdmin, limit);
      return projects;
    } catch (error) {
      console.error('Error en ProjectService.getRecentProjects:', error);
      throw new Error('Error obteniendo proyectos recientes');
    }
  }

  /**
   * Buscar proyectos
   */
  async search(query, { page = 1, limit = 10, userId = null, isAdmin = false } = {}) {
    try {
      const offset = (page - 1) * limit;
      
      const projects = await this.projectRepository.search(query, {
        limit,
        offset,
        userId,
        isAdmin
      });

      const total = await this.projectRepository.countSearch(query, userId, isAdmin);

      return {
        projects,
        pagination: {
          page, limit, total, pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error en ProjectService.search:', error);
      throw new Error('Error buscando proyectos');
    }
  }

  /**
   * Get complete project details with all related data
   * Subtask 2.1: Input validation
   * Subtask 2.2: Project existence check
   * Subtask 2.3: Authorization logic
   * Subtask 2.4: Data aggregation
   * Subtask 2.5: Activity logging
   * 
   * @param {number} projectId - Project ID
   * @param {number} userId - Requesting user ID
   * @param {boolean} isAdmin - Whether user is admin
   * @returns {Promise<Object>} Complete project details
   * @throws {ValidationError} If project ID is invalid
   * @throws {NotFoundError} If project doesn't exist
   * @throws {ForbiddenError} If user lacks permission
   */
  async getProjectDetails(projectId, userId, isAdmin = false) {
    try {
      // Subtask 2.1: Validate projectId is a positive integer
      if (!projectId || isNaN(projectId) || projectId <= 0 || !Number.isInteger(Number(projectId))) {
        throw new ValidationError('ID de proyecto inválido');
      }

      // Convert to number if it's a string
      const numericProjectId = Number(projectId);

      // Subtask 2.2: Check if project exists
      const project = await this.projectRepository.getProjectWithCreator(numericProjectId);
      if (!project) {
        throw new NotFoundError('Proyecto no encontrado');
      }

      // Subtask 2.3: Implement authorization logic
      // Check if user is admin (allow access)
      if (!isAdmin) {
        // Check if user is project responsible (allow access)
        const isResponsible = await this.projectRepository.isUserProjectResponsible(numericProjectId, userId);
        if (!isResponsible) {
          throw new ForbiddenError('No tiene permisos para ver este proyecto');
        }
      }

      // Subtask 2.4: Implement data aggregation
      // Call all repository methods to fetch related data
      const [responsibles, tasks, files, activityLogs, statistics] = await Promise.all([
        this.projectRepository.getProjectResponsibles(numericProjectId),
        this.projectRepository.getProjectTasks(numericProjectId),
        this.projectRepository.getProjectFiles(numericProjectId),
        this.projectRepository.getProjectActivityLogs(numericProjectId, 20),
        this.projectRepository.getProjectStatistics(numericProjectId)
      ]);

      // Subtask 2.5: Implement activity logging
      // Create log entry with action "viewed"
      // Log should not fail the main operation if it errors
      try {
        await this.logActivityRepository.logActivity({
          usuario_id: userId,
          accion: 'viewed',
          entidad_tipo: 'proyecto',
          entidad_id: numericProjectId,
          descripcion: `Proyecto "${project.titulo}" visualizado`,
          ip_address: null // Will be set by controller if available
        });
      } catch (logError) {
        console.error('Error logging project view:', logError);
        // Don't fail the main operation
      }

      // Combine results into single response object
      return {
        project,
        responsibles,
        tasks,
        files,
        activityLogs,
        statistics
      };
    } catch (error) {
      // Re-throw known errors
      if (error instanceof ValidationError || 
          error instanceof NotFoundError || 
          error instanceof ForbiddenError) {
        throw error;
      }
      // Log and throw generic error for unexpected issues
      console.error('Error en ProjectService.getProjectDetails:', error);
      throw new Error('Error obteniendo detalles del proyecto');
    }
  }
}

module.exports = ProjectService;





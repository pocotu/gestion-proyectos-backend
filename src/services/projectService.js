const ProjectRepository = require('../repositories/ProjectRepository');
const ProjectResponsibleRepository = require('../repositories/ProjectResponsibleRepository');

/**
 * ProjectService - Servicio para gestión de proyectos
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja lógica de negocio de proyectos
 * - Open/Closed: Abierto para extensión (nuevos métodos)
 * - Liskov Substitution: Puede ser sustituido por otros servicios
 * - Interface Segregation: Métodos específicos para cada operación
 * - Dependency Inversion: Depende de abstracciones (ProjectRepository)
 */
class ProjectService {
  constructor() {
    this.projectRepository = new ProjectRepository();
    this.projectResponsibleRepository = new ProjectResponsibleRepository();
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
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
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
        throw new Error('Proyecto no encontrado');
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
  async createProject(projectData, createdBy) {
    try {
      console.log('ProjectService.createProject - projectData:', projectData);
      console.log('ProjectService.createProject - createdBy:', createdBy);
      
      // Verificar si ya existe un proyecto con el mismo título
      const existingProject = await this.projectRepository.findByTitle(projectData.titulo);
      if (existingProject) {
        throw new Error('Ya existe un proyecto con ese título');
      }

      const dataToCreate = {
        ...projectData,
        creado_por: createdBy,
        estado: 'planificacion'
      };
      
      console.log('ProjectService.createProject - dataToCreate:', dataToCreate);

      const newProject = await this.projectRepository.create(dataToCreate);

      return newProject;
    } catch (error) {
      console.error('Error en ProjectService.createProject:', error);
      throw error;
    }
  }

  /**
   * Actualizar proyecto
   */
  async updateProject(id, projectData, userId, isAdmin = false) {
    try {
      const existingProject = await this.projectRepository.findById(id);
      if (!existingProject) {
        throw new Error('Proyecto no encontrado');
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
        throw new Error('Proyecto no encontrado');
      }

      // Verificar acceso si no es admin
      if (!isAdmin) {
        const hasAccess = await this.projectRepository.hasUserAccess(id, userId);
        if (!hasAccess) {
          throw new Error('No tienes permisos para eliminar este proyecto');
        }
      }

      await this.projectRepository.deleteById(id);
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
        throw new Error('Proyecto no encontrado');
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
  async assignResponsible(projectId, userId, assignedBy) {
    try {
      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        throw new Error('Proyecto no encontrado');
      }

      // Verificar si ya es responsable
      const isAlreadyResponsible = await this.projectResponsibleRepository.isUserResponsible(projectId, userId);
      if (isAlreadyResponsible) {
        throw new Error('El usuario ya es responsable de este proyecto');
      }

      await this.projectResponsibleRepository.assignResponsible(projectId, userId, assignedBy);
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
        throw new Error('Proyecto no encontrado');
      }

      const isResponsible = await this.projectResponsibleRepository.isUserResponsible(projectId, userId);
      if (!isResponsible) {
        throw new Error('El usuario no es responsable de este proyecto');
      }

      await this.projectResponsibleRepository.removeResponsible(projectId, userId);
      return { message: 'Responsable removido correctamente' };
    } catch (error) {
      console.error('Error en ProjectService.removeResponsible:', error);
      throw error;
    }
  }

  /**
   * Obtener responsables del proyecto
   */
  async getProjectResponsibles(projectId) {
    try {
      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        throw new Error('Proyecto no encontrado');
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
        throw new Error('Proyecto no encontrado');
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
        throw new Error('Proyecto no encontrado');
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
  async searchProjects(query, { page = 1, limit = 10, userId = null, isAdmin = false }) {
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
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error en ProjectService.searchProjects:', error);
      throw new Error('Error buscando proyectos');
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
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
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
  async getMyProjects(userId, { page = 1, limit = 10 }) {
    try {
      const offset = (page - 1) * limit;
      
      const projects = await this.projectRepository.findByResponsible(userId, {
        limit,
        offset
      });

      const total = await this.projectRepository.countByResponsible(userId);

      return {
        projects,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error en ProjectService.getMyProjects:', error);
      throw new Error('Error obteniendo mis proyectos');
    }
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
}

module.exports = ProjectService;
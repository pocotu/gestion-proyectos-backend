const ProjectService = require('../services/projectService');
const { 
  requireProjectManagement, 
  requireOwnershipOrPermission,
  attachPermissions 
} = require('../middleware/permissionMiddleware');

/**
 * ProjectController - Controlador para gestión de proyectos
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja requests HTTP de proyectos
 * - Open/Closed: Abierto para extensión (nuevos endpoints)
 * - Liskov Substitution: Puede ser sustituido por otros controladores
 * - Interface Segregation: Métodos específicos para cada operación
 * - Dependency Inversion: Depende de abstracciones (ProjectService)
 */
class ProjectController {
  constructor() {
    this.projectService = new ProjectService();
  }

  /**
   * Listar proyectos
   * GET /api/projects
   * Permisos: 
   * - Admin: Ve todos los proyectos
   * - Responsable Proyecto: Ve proyectos asignados
   * - Responsable Tarea: Ve proyectos de sus tareas
   */
  async getAllProjects(req, res) {
    try {
      const { page = 1, limit = 10, estado, search } = req.query;
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      const filters = {};
      if (estado) filters.estado = estado;
      if (search) filters.search = search.trim();

      // Si no es admin, filtrar por proyectos donde tiene acceso
      if (!isAdmin) {
        filters.userId = userId;
        filters.userRoles = req.userRoles || [];
      }

      const result = await this.projectService.getAllProjects({
        page: parseInt(page),
        limit: parseInt(limit),
        filters,
        isAdmin
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error obteniendo proyectos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crear nuevo proyecto
   * POST /api/projects
   * Permisos: Admin o Responsable Proyecto
   */
  async createProject(req, res) {
    try {
      const { titulo, descripcion, fecha_inicio, fecha_fin } = req.body;
      const creado_por = req.user.id;

      // Validar datos requeridos
      if (!titulo || !descripcion || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({
          success: false,
          message: 'Título, descripción, fecha de inicio y fecha de fin son requeridos'
        });
      }

      // Validar fechas
      const fechaInicio = new Date(fecha_inicio);
      const fechaFin = new Date(fecha_fin);

      if (fechaInicio >= fechaFin) {
        return res.status(400).json({
          success: false,
          message: 'La fecha de fin debe ser posterior a la fecha de inicio'
        });
      }

      const projectData = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        estado: 'planificacion',
        creado_por
      };

      const project = await this.projectService.createProject(projectData, creado_por);

      // Si el usuario no es admin, asignarlo como responsable del proyecto
      if (!req.user.es_administrador) {
        await this.projectService.assignResponsible(project.id, creado_por, creado_por);
      }

      res.status(201).json({
        success: true,
        message: 'Proyecto creado exitosamente',
        data: { project }
      });

    } catch (error) {
      console.error('Error creando proyecto:', error);
      
      if (error.message.includes('ya existe')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener proyecto por ID
   * GET /api/projects/:id
   * Permisos: Admin, Responsable del proyecto, o usuario con tareas en el proyecto
   */
  async getProjectById(req, res) {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      // Verificar acceso al proyecto
      if (!isAdmin) {
        const hasAccess = await this.projectService.userHasAccessToProject(userId, projectId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'No tienes acceso a este proyecto'
          });
        }
      }

      const project = await this.projectService.getProjectById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
      }

      res.json({
        success: true,
        data: { project }
      });

    } catch (error) {
      console.error('Error obteniendo proyecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar proyecto
   * PUT /api/projects/:id
   * Permisos: Admin o Responsable del proyecto
   */
  async updateProject(req, res) {
    try {
      const projectId = parseInt(req.params.id);
      const { titulo, descripcion, fecha_inicio, fecha_fin, estado } = req.body;
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      // Verificar permisos de edición
      if (!isAdmin) {
        const canManage = await this.projectService.userCanManageProject(userId, projectId);
        if (!canManage) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para editar este proyecto'
          });
        }
      }

      // Validar datos si se proporcionan
      const updateData = {};
      
      if (titulo !== undefined) {
        if (!titulo.trim()) {
          return res.status(400).json({
            success: false,
            message: 'El título no puede estar vacío'
          });
        }
        updateData.titulo = titulo.trim();
      }

      if (descripcion !== undefined) {
        if (!descripcion.trim()) {
          return res.status(400).json({
            success: false,
            message: 'La descripción no puede estar vacía'
          });
        }
        updateData.descripcion = descripcion.trim();
      }

      if (fecha_inicio !== undefined) {
        updateData.fecha_inicio = new Date(fecha_inicio);
      }

      if (fecha_fin !== undefined) {
        updateData.fecha_fin = new Date(fecha_fin);
      }

      if (estado !== undefined) {
        const validStates = ['planificacion', 'en_progreso', 'completado', 'cancelado'];
        if (!validStates.includes(estado)) {
          return res.status(400).json({
            success: false,
            message: 'Estado inválido'
          });
        }
        updateData.estado = estado;
      }

      // Validar fechas si ambas están presentes
      if (updateData.fecha_inicio && updateData.fecha_fin) {
        if (updateData.fecha_inicio >= updateData.fecha_fin) {
          return res.status(400).json({
            success: false,
            message: 'La fecha de fin debe ser posterior a la fecha de inicio'
          });
        }
      }

      const updatedProject = await this.projectService.updateProject(projectId, updateData, userId, isAdmin);

      if (!updatedProject) {
        return res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Proyecto actualizado exitosamente',
        data: { project: updatedProject }
      });

    } catch (error) {
      console.error('Error actualizando proyecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Eliminar proyecto
   * DELETE /api/projects/:id
   * Permisos: Solo Admin
   */
  async deleteProject(req, res) {
    try {
      const projectId = parseInt(req.params.id);

      // Solo admin puede eliminar proyectos
      if (!req.user.es_administrador) {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden eliminar proyectos'
        });
      }

      const deleted = await this.projectService.deleteProject(projectId, req.user.id, req.user.es_administrador);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Proyecto eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error eliminando proyecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Cambiar estado del proyecto
   * PATCH /api/projects/:id/status
   * Permisos: Admin o Responsable del proyecto
   */
  async changeProjectStatus(req, res) {
    try {
      const projectId = parseInt(req.params.id);
      const { estado } = req.body;
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      // Verificar permisos
      if (!isAdmin) {
        const canManage = await this.projectService.userCanManageProject(userId, projectId);
        if (!canManage) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para cambiar el estado de este proyecto'
          });
        }
      }

      const validStates = ['planificacion', 'en_progreso', 'completado', 'cancelado'];
      if (!validStates.includes(estado)) {
        return res.status(400).json({
          success: false,
          message: 'Estado inválido'
        });
      }

      const updatedProject = await this.projectService.updateProject(projectId, { estado });

      if (!updatedProject) {
        return res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Estado del proyecto actualizado exitosamente',
        data: { project: updatedProject }
      });

    } catch (error) {
      console.error('Error cambiando estado del proyecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener responsables del proyecto
   * GET /api/projects/:id/responsables
   * Permisos: Admin, Responsable del proyecto, o usuario con acceso al proyecto
   */
  async getProjectResponsibles(req, res) {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      // Verificar acceso al proyecto
      if (!isAdmin) {
        const hasAccess = await this.projectService.userHasAccessToProject(userId, projectId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'No tienes acceso a este proyecto'
          });
        }
      }

      const responsibles = await this.projectService.getProjectResponsibles(projectId);

      res.json({
        success: true,
        data: { responsibles }
      });

    } catch (error) {
      console.error('Error obteniendo responsables:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Asignar responsable al proyecto
   * POST /api/projects/:id/responsables
   * Permisos: Admin o Responsable del proyecto
   */
  async assignResponsible(req, res) {
    try {
      const projectId = parseInt(req.params.id);
      const { userId: responsibleUserId } = req.body;
      const assignedBy = req.user.id;
      const isAdmin = req.user.es_administrador;

      if (!responsibleUserId) {
        return res.status(400).json({
          success: false,
          message: 'El ID del usuario es requerido'
        });
      }

      // Verificar permisos
      if (!isAdmin) {
        const canManage = await this.projectService.userCanManageProject(assignedBy, projectId);
        if (!canManage) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para asignar responsables a este proyecto'
          });
        }
      }

      const result = await this.projectService.assignResponsible(
        projectId, 
        responsibleUserId, 
        assignedBy
      );

      res.status(201).json({
        success: true,
        message: 'Responsable asignado exitosamente',
        data: result
      });

    } catch (error) {
      console.error('Error asignando responsable:', error);
      
      if (error.message.includes('no encontrado')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Remover responsable del proyecto
   * DELETE /api/projects/:id/responsables/:userId
   * Permisos: Admin o Responsable del proyecto
   */
  async removeResponsible(req, res) {
    try {
      const projectId = parseInt(req.params.id);
      const responsibleUserId = parseInt(req.params.userId);
      const currentUserId = req.user.id;
      const isAdmin = req.user.es_administrador;

      // Verificar permisos
      if (!isAdmin) {
        const canManage = await this.projectService.userCanManageProject(currentUserId, projectId);
        if (!canManage) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para remover responsables de este proyecto'
          });
        }
      }

      const result = await this.projectService.removeResponsible(projectId, responsibleUserId);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.message
        });
      }

      res.json({
        success: true,
        message: 'Responsable removido exitosamente'
      });

    } catch (error) {
      console.error('Error removiendo responsable:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener tareas del proyecto
   * GET /api/projects/:id/tasks
   * Permisos: Admin, Responsable del proyecto, o usuario con acceso al proyecto
   */
  async getProjectTasks(req, res) {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      // Verificar acceso al proyecto
      if (!isAdmin) {
        const hasAccess = await this.projectService.userHasAccessToProject(userId, projectId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'No tienes acceso a este proyecto'
          });
        }
      }

      const tasks = await this.projectService.getProjectTasks(projectId);

      res.json({
        success: true,
        data: { tasks }
      });

    } catch (error) {
      console.error('Error obteniendo tareas del proyecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estadísticas del proyecto
   * GET /api/projects/:id/stats
   * Permisos: Admin, Responsable del proyecto, o usuario con acceso al proyecto
   */
  async getProjectStats(req, res) {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      // Verificar acceso al proyecto
      if (!isAdmin) {
        const hasAccess = await this.projectService.userHasAccessToProject(userId, projectId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'No tienes acceso a este proyecto'
          });
        }
      }

      const stats = await this.projectService.getProjectStatistics(projectId);

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas del proyecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Iniciar proyecto
   * PATCH /api/projects/:id/start
   */
  async startProject(req, res) {
    try {
      const projectId = parseInt(req.params.id);
      const project = await this.projectService.changeProjectStatus(projectId, 'en_progreso');

      res.json({
        success: true,
        data: { project },
        message: 'Proyecto iniciado exitosamente'
      });

    } catch (error) {
      console.error('Error iniciando proyecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Completar proyecto
   * PATCH /api/projects/:id/complete
   */
  async completeProject(req, res) {
    try {
      const projectId = parseInt(req.params.id);
      const project = await this.projectService.changeProjectStatus(projectId, 'completado');

      res.json({
        success: true,
        data: { project },
        message: 'Proyecto completado exitosamente'
      });

    } catch (error) {
      console.error('Error completando proyecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Cancelar proyecto
   * PATCH /api/projects/:id/cancel
   */
  async cancelProject(req, res) {
    try {
      const projectId = parseInt(req.params.id);
      const project = await this.projectService.changeProjectStatus(projectId, 'cancelado');

      res.json({
        success: true,
        data: { project },
        message: 'Proyecto cancelado exitosamente'
      });

    } catch (error) {
      console.error('Error cancelando proyecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crear tarea en proyecto
   * POST /api/projects/:id/tasks
   */
  async createProjectTask(req, res) {
    try {
      const projectId = parseInt(req.params.id);
      const taskData = { ...req.body, proyecto_id: projectId };
      
      const task = await this.projectService.createProjectTask(taskData);

      res.status(201).json({
        success: true,
        data: { task },
        message: 'Tarea creada exitosamente'
      });

    } catch (error) {
      console.error('Error creando tarea:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener resumen de proyectos
   * GET /api/projects/overview
   */
  async getProjectsOverview(req, res) {
    try {
      const overview = await this.projectService.getProjectsOverview();

      res.json({
        success: true,
        data: { overview }
      });

    } catch (error) {
      console.error('Error obteniendo resumen:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener progreso del proyecto
   * GET /api/projects/:id/progress
   */
  async getProjectProgress(req, res) {
    try {
      const projectId = parseInt(req.params.id);
      const progress = await this.projectService.getProjectProgress(projectId);

      res.json({
        success: true,
        data: { progress }
      });

    } catch (error) {
      console.error('Error obteniendo progreso:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Buscar proyectos
   * GET /api/projects/search
   */
  async searchProjects(req, res) {
    try {
      const { query, limit = 10, offset = 0 } = req.query;
      const projects = await this.projectService.searchProjects(query, { limit, offset });

      res.json({
        success: true,
        data: { projects }
      });

    } catch (error) {
      console.error('Error buscando proyectos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener proyectos por estado
   * GET /api/projects/by-status/:status
   */
  async getProjectsByStatus(req, res) {
    try {
      const { status } = req.params;
      const projects = await this.projectService.getProjectsByStatus(status);

      res.json({
        success: true,
        data: { projects }
      });

    } catch (error) {
      console.error('Error obteniendo proyectos por estado:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener mis proyectos
   * GET /api/projects/my-projects
   */
  async getMyProjects(req, res) {
    try {
      const userId = req.user.id;
      const projects = await this.projectService.getUserProjects(userId);

      res.json({
        success: true,
        data: { projects }
      });

    } catch (error) {
      console.error('Error obteniendo mis proyectos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener proyectos en los que participo
   * GET /api/projects/participating
   */
  async getParticipatingProjects(req, res) {
    try {
      const userId = req.user.id;
      const projects = await this.projectService.getParticipatingProjects(userId);

      res.json({
        success: true,
        data: { projects }
      });

    } catch (error) {
      console.error('Error obteniendo proyectos participantes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener archivos del proyecto
   * GET /api/projects/:id/files
   */
  async getProjectFiles(req, res) {
    try {
      const projectId = parseInt(req.params.id);
      const files = await this.projectService.getProjectFiles(projectId);

      res.json({
        success: true,
        data: { files }
      });

    } catch (error) {
      console.error('Error obteniendo archivos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener línea de tiempo del proyecto
   * GET /api/projects/:id/timeline
   */
  async getProjectTimeline(req, res) {
    try {
      const projectId = parseInt(req.params.id);
      const timeline = await this.projectService.getProjectTimeline(projectId);

      res.json({
        success: true,
        data: { timeline }
      });

    } catch (error) {
      console.error('Error obteniendo línea de tiempo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener actividad del proyecto
   * GET /api/projects/:id/activity
   */
  async getProjectActivity(req, res) {
    try {
      const projectId = parseInt(req.params.id);
      const activity = await this.projectService.getProjectActivity(projectId);

      res.json({
        success: true,
        data: { activity }
      });

    } catch (error) {
      console.error('Error obteniendo actividad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = ProjectController;
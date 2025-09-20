const TaskService = require('../services/taskService');
const { 
  requireTaskManagement, 
  requireOwnershipOrPermission,
  attachPermissions 
} = require('../middleware/permissionMiddleware');

/**
 * TaskController - Controlador para gestión de tareas
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja requests HTTP de tareas
 * - Open/Closed: Abierto para extensión (nuevos endpoints)
 * - Liskov Substitution: Puede ser sustituido por otros controladores
 * - Interface Segregation: Métodos específicos para cada operación
 * - Dependency Inversion: Depende de abstracciones (TaskService)
 */
class TaskController {
  constructor() {
    this.taskService = new TaskService();
  }

  /**
   * Listar tareas
   * GET /api/tasks
   * Permisos: 
   * - Admin: Ve todas las tareas
   * - Responsable Proyecto: Ve tareas de sus proyectos
   * - Responsable Tarea: Ve sus tareas asignadas
   */
  async getAllTasks(req, res) {
    try {
      const { page = 1, limit = 10, estado, prioridad, proyecto_id } = req.query;
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      const filters = {};
      if (estado) filters.estado = estado;
      if (prioridad) filters.prioridad = prioridad;
      if (proyecto_id) filters.proyecto_id = parseInt(proyecto_id);

      // Si no es admin, filtrar por tareas donde tiene acceso
      if (!isAdmin) {
        filters.userId = userId;
        filters.userRoles = req.userRoles || [];
      }

      const result = await this.taskService.getAllTasks({
        page: parseInt(page),
        limit: parseInt(limit),
        filters,
        userId,
        isAdmin
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error obteniendo tareas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crear nueva tarea
   * POST /api/tasks
   * Permisos: Admin o Responsable Proyecto (del proyecto específico)
   */
  async createTask(req, res) {
    try {
      const { 
        titulo, 
        descripcion, 
        fecha_inicio, 
        fecha_fin, 
        prioridad, 
        proyecto_id, 
        usuario_asignado_id 
      } = req.body;
      const creado_por = req.user.id;
      const isAdmin = req.user.es_administrador;

      // Validar datos requeridos
      if (!titulo || !descripcion || !fecha_inicio || !fecha_fin || !proyecto_id) {
        return res.status(400).json({
          success: false,
          message: 'Título, descripción, fechas y proyecto son requeridos'
        });
      }

      // Verificar permisos sobre el proyecto
      if (!isAdmin) {
        const canManageProject = await this.taskService.userCanManageProject(creado_por, proyecto_id);
        if (!canManageProject) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para crear tareas en este proyecto'
          });
        }
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

      // Validar prioridad
      const validPriorities = ['baja', 'media', 'alta'];
      if (prioridad && !validPriorities.includes(prioridad)) {
        return res.status(400).json({
          success: false,
          message: 'Prioridad inválida'
        });
      }

      const taskData = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
        prioridad: prioridad || 'media',
        estado: 'pendiente',
        proyecto_id: parseInt(proyecto_id),
        usuario_asignado_id: usuario_asignado_id ? parseInt(usuario_asignado_id) : null,
        creado_por
      };

      const result = await this.taskService.createTask(taskData, creado_por);

      res.status(201).json({
        success: true,
        message: 'Tarea creada exitosamente',
        data: { 
          task: {
            id: result.insertId || result.id,
            ...taskData,
            creado_por
          }
        }
      });

    } catch (error) {
      console.error('Error creando tarea:', error);
      
      if (error.message.includes('no encontrado') || error.message.includes('no existe')) {
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
   * Obtener tarea por ID
   * GET /api/tasks/:id
   * Permisos: Admin, Responsable del proyecto, o usuario asignado a la tarea
   */
  async getTaskById(req, res) {
    try {
      const taskId = parseInt(req.params.id);
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      // Verificar acceso a la tarea
      if (!isAdmin) {
        const hasAccess = await this.taskService.userHasAccessToTask(userId, taskId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'No tienes acceso a esta tarea'
          });
        }
      }

      const task = await this.taskService.getTaskById(taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        });
      }

      res.json({
        success: true,
        data: { task }
      });

    } catch (error) {
      console.error('Error obteniendo tarea:', error);
      
      // Manejar errores específicos
      if (error.message && error.message.includes('no encontrada')) {
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
   * Actualizar tarea
   * PUT /api/tasks/:id
   * Permisos: Admin, Responsable del proyecto, o usuario asignado a la tarea
   */
  async updateTask(req, res) {
    try {
      const taskId = parseInt(req.params.id);
      const { 
        titulo, 
        descripcion, 
        fecha_inicio, 
        fecha_fin, 
        prioridad, 
        estado, 
        usuario_asignado_id 
      } = req.body;
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      // Verificar permisos de edición
      if (!isAdmin) {
        const canManage = await this.taskService.userCanManageTask(userId, taskId);
        if (!canManage) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para editar esta tarea'
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

      if (prioridad !== undefined) {
        const validPriorities = ['baja', 'media', 'alta'];
        if (!validPriorities.includes(prioridad)) {
          return res.status(400).json({
            success: false,
            message: 'Prioridad inválida'
          });
        }
        updateData.prioridad = prioridad;
      }

      if (estado !== undefined) {
        const validStates = ['pendiente', 'en_progreso', 'completada', 'cancelada'];
        if (!validStates.includes(estado)) {
          return res.status(400).json({
            success: false,
            message: 'Estado inválido'
          });
        }
        updateData.estado = estado;
      }

      if (usuario_asignado_id !== undefined) {
        // Solo admin o responsable de proyecto pueden cambiar asignación
        if (!isAdmin) {
          const task = await this.taskService.getTaskById(taskId);
          const canManageProject = await this.taskService.userCanManageProject(userId, task.proyecto_id);
          if (!canManageProject) {
            return res.status(403).json({
              success: false,
              message: 'No tienes permisos para cambiar la asignación de esta tarea'
            });
          }
        }
        updateData.usuario_asignado_id = usuario_asignado_id ? parseInt(usuario_asignado_id) : null;
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

      const updatedTask = await this.taskService.updateTask(taskId, updateData, userId, isAdmin);

      if (!updatedTask) {
        return res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Tarea actualizada exitosamente',
        data: { task: updatedTask }
      });

    } catch (error) {
      console.error('Error actualizando tarea:', error);
      
      // Manejar errores específicos
      if (error.message && error.message.includes('no encontrada')) {
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
   * Eliminar tarea
   * DELETE /api/tasks/:id
   * Permisos: Admin o Responsable del proyecto
   */
  async deleteTask(req, res) {
    try {
      const taskId = parseInt(req.params.id);
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      // Verificar permisos de eliminación
      if (!isAdmin) {
        const task = await this.taskService.getTaskById(taskId);
        if (!task) {
          return res.status(404).json({
            success: false,
            message: 'Tarea no encontrada'
          });
        }

        const canManageProject = await this.taskService.userCanManageProject(userId, task.proyecto_id);
        if (!canManageProject) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para eliminar esta tarea'
          });
        }
      }

      const deleted = await this.taskService.deleteTask(taskId, userId, isAdmin);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Tarea eliminada exitosamente'
      });

    } catch (error) {
      console.error('Error eliminando tarea:', error);
      
      // Manejar errores específicos
      if (error.message.includes('en progreso')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('no encontrada')) {
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
   * Cambiar estado de la tarea
   * PATCH /api/tasks/:id/status
   * Permisos: Admin, Responsable del proyecto, o usuario asignado a la tarea
   */
  async changeTaskStatus(req, res) {
    try {
      const taskId = parseInt(req.params.id);
      const { estado } = req.body;
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      // Verificar permisos
      if (!isAdmin) {
        const canManage = await this.taskService.userCanManageTask(userId, taskId);
        if (!canManage) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para cambiar el estado de esta tarea'
          });
        }
      }

      const validStates = ['pendiente', 'en_progreso', 'completada', 'cancelada'];
      if (!validStates.includes(estado)) {
        return res.status(400).json({
          success: false,
          message: 'Estado inválido'
        });
      }

      const updatedTask = await this.taskService.updateTask(taskId, { estado }, userId, isAdmin);

      if (!updatedTask) {
        return res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Estado de la tarea actualizado exitosamente',
        data: { task: updatedTask }
      });

    } catch (error) {
      console.error('Error cambiando estado de la tarea:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Asignar tarea a usuario
   * PATCH /api/tasks/:id/assign
   * Permisos: Admin o Responsable del proyecto
   */
  async assignTask(req, res) {
    try {
      const taskId = parseInt(req.params.id);
      const { userId, usuario_asignado_id } = req.body;
      const assignedUserId = userId || usuario_asignado_id;
      const currentUserId = req.user.id;
      const isAdmin = req.user.es_administrador;

      if (!assignedUserId) {
        return res.status(400).json({
          success: false,
          message: 'El ID del usuario es requerido'
        });
      }

      // Verificar permisos
      if (!isAdmin) {
        const task = await this.taskService.getTaskById(taskId);
        if (!task) {
          return res.status(404).json({
            success: false,
            message: 'Tarea no encontrada'
          });
        }

        const canManageProject = await this.taskService.userCanManageProject(currentUserId, task.proyecto_id);
        if (!canManageProject) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para asignar esta tarea'
          });
        }
      }

      const updatedTask = await this.taskService.updateTask(taskId, { 
        usuario_asignado_id: parseInt(assignedUserId) 
      }, currentUserId, isAdmin);

      if (!updatedTask) {
        return res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Tarea asignada exitosamente',
        data: { task: updatedTask }
      });

    } catch (error) {
      console.error('Error asignando tarea:', error);
      
      // Manejar errores específicos
      if (error.message.includes('no existe')) {
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
   * Obtener archivos de la tarea
   * GET /api/tasks/:id/files
   * Permisos: Admin, Responsable del proyecto, o usuario asignado a la tarea
   */
  async getTaskFiles(req, res) {
    try {
      const taskId = parseInt(req.params.id);
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      // Verificar acceso a la tarea
      if (!isAdmin) {
        const hasAccess = await this.taskService.userHasAccessToTask(userId, taskId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'No tienes acceso a esta tarea'
          });
        }
      }

      // Obtener parámetros de paginación de la query
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const files = await this.taskService.getTaskFiles(taskId, {
        page,
        limit,
        userId,
        isAdmin
      });

      res.json({
        success: true,
        data: { files }
      });

    } catch (error) {
      console.error('Error obteniendo archivos de la tarea:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener tareas asignadas al usuario actual
   * GET /api/tasks/my-tasks
   * Permisos: Usuario autenticado (sus propias tareas)
   */
  async getMyTasks(req, res) {
    try {
      const userId = req.user.id;
      const { estado, prioridad } = req.query;

      const filters = { usuario_asignado_id: userId };
      if (estado) filters.estado = estado;
      if (prioridad) filters.prioridad = prioridad;

      const tasks = await this.taskService.getTasksByUser(userId, filters);

      res.json({
        success: true,
        data: { tasks }
      });

    } catch (error) {
      console.error('Error obteniendo tareas del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estadísticas de tareas
   * GET /api/tasks/stats
   * Permisos: Admin, o estadísticas filtradas por acceso del usuario
   */
  async getTaskStats(req, res) {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      const stats = await this.taskService.getTaskStatistics(userId, isAdmin);

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas de tareas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = TaskController;
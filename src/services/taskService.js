const TaskRepository = require('../repositories/TaskRepository');
const TaskAssignmentRepository = require('../repositories/TaskAssignmentRepository');
const TaskCommentRepository = require('../repositories/TaskCommentRepository');
const ProjectResponsibleRepository = require('../repositories/ProjectResponsibleRepository');

/**
 * TaskService - Servicio para gestión de tareas
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja lógica de negocio de tareas
 * - Open/Closed: Abierto para extensión (nuevos métodos)
 * - Liskov Substitution: Puede ser sustituido por otros servicios
 * - Interface Segregation: Métodos específicos para cada operación
 * - Dependency Inversion: Depende de abstracciones (TaskRepository)
 */
class TaskService {
  constructor() {
    this.taskRepository = new TaskRepository();
    this.taskAssignmentRepository = new TaskAssignmentRepository();
    this.taskCommentRepository = new TaskCommentRepository();
    this.projectResponsibleRepository = new ProjectResponsibleRepository();
  }

  /**
   * Obtener todas las tareas con paginación y filtros
   */
  async getAllTasks({ page = 1, limit = 10, filters = {}, userId = null, isAdmin = false }) {
    try {
      console.log('TaskService.getAllTasks - Iniciando con parámetros:', { page, limit, filters, userId, isAdmin });
      
      const offset = (page - 1) * limit;
      
      const tasks = await this.taskRepository.findAll({
        limit,
        offset,
        filters,
        userId,
        isAdmin
      });

      console.log('TaskService.getAllTasks - Tareas obtenidas:', tasks.length);

      const total = await this.taskRepository.count(filters, userId, isAdmin);

      console.log('TaskService.getAllTasks - Total de tareas:', total);

      return {
        tasks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error en TaskService.getAllTasks:', error);
      console.error('Stack trace:', error.stack);
      throw new Error('Error obteniendo tareas');
    }
  }

  /**
   * Obtener tarea por ID
   */
  async getTaskById(id, userId = null, isAdmin = false) {
    try {
      const task = await this.taskRepository.findById(id);
      
      if (!task) {
        throw new Error('Tarea no encontrada');
      }

      // Verificar acceso si no es admin
      if (!isAdmin && userId) {
        const hasAccess = await this.taskRepository.hasUserAccess(id, userId);
        if (!hasAccess) {
          throw new Error('No tienes acceso a esta tarea');
        }
      }

      // Obtener asignaciones de la tarea (comentado porque no existe la tabla task_assignments)
      // const assignments = await this.taskAssignmentRepository.getTaskAssignments(id);
      // task.asignaciones = assignments;
      task.asignaciones = []; // Por ahora vacío hasta implementar correctamente

      // Obtener comentarios de la tarea
      // const comments = await this.taskCommentRepository.getTaskComments(id);
      // task.comentarios = comments;
      task.comentarios = [];

      return task;
    } catch (error) {
      console.error('Error en TaskService.getTaskById:', error);
      throw error;
    }
  }

  /**
   * Crear nueva tarea
   */
  async createTask(taskData, createdBy) {
    try {
      // Verificar que el proyecto existe
      if (taskData.proyecto_id) {
        const projectExists = await this.taskRepository.projectExists(taskData.proyecto_id);
        if (!projectExists) {
          throw new Error('El proyecto especificado no existe');
        }
      }

      const result = await this.taskRepository.createTask({
        ...taskData,
        creado_por: createdBy,
        estado: 'pendiente'
      });

      // Obtener la tarea completa recién creada
      const newTask = await this.taskRepository.findById(result.id);
      
      return newTask;
    } catch (error) {
      console.error('Error en TaskService.createTask:', error);
      throw error;
    }
  }

  /**
   * Actualizar tarea
   */
  async updateTask(id, taskData, userId, isAdmin = false) {
    try {
      const existingTask = await this.taskRepository.findById(id);
      if (!existingTask) {
        throw new Error('Tarea no encontrada');
      }

      // Verificar acceso solo si no es admin
      if (!isAdmin) {
        const hasAccess = await this.taskRepository.hasUserAccess(id, userId);
        if (!hasAccess) {
          throw new Error('No tienes permisos para actualizar esta tarea');
        }
      }

      // Si se está actualizando el proyecto, verificar que existe
      if (taskData.proyecto_id && taskData.proyecto_id !== existingTask.proyecto_id) {
        const projectExists = await this.taskRepository.projectExists(taskData.proyecto_id);
        if (!projectExists) {
          throw new Error('El proyecto especificado no existe');
        }
      }

      // Si se está asignando a un usuario, verificar que existe
      if (taskData.usuario_asignado_id && taskData.usuario_asignado_id !== existingTask.usuario_asignado_id) {
        const userExists = await this.taskRepository.userExists(taskData.usuario_asignado_id);
        if (!userExists) {
          throw new Error('El usuario especificado no existe');
        }
      }

      const updatedTask = await this.taskRepository.updateTask(id, taskData);
      return updatedTask;
    } catch (error) {
      console.error('Error en TaskService.updateTask:', error);
      throw error;
    }
  }

  /**
   * Eliminar una tarea
   */
  async deleteTask(taskId, userId, isAdmin) {
    try {
      console.log('TaskService.deleteTask - Iniciando eliminación:', { taskId, userId, isAdmin });

      // Obtener la tarea para verificar su estado
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new Error('Tarea no encontrada');
      }

      // Validar que no se pueda eliminar una tarea en progreso
      if (task.estado === 'en_progreso') {
        throw new Error('No se puede eliminar una tarea que está en progreso');
      }

      // Si es admin, puede eliminar cualquier tarea (excepto las en progreso)
      if (!isAdmin) {
        // Verificar si el usuario tiene acceso a la tarea
        const hasAccess = await this.taskRepository.hasUserAccess(taskId, userId);
        if (!hasAccess) {
          throw new Error('No tienes permisos para eliminar esta tarea');
        }
      }

      // Eliminar la tarea usando el método deleteById
      const result = await this.taskRepository.deleteById(taskId);
      
      if (result === 0) {
        throw new Error('Tarea no encontrada');
      }

      console.log('TaskService.deleteTask - Tarea eliminada exitosamente');
      return { success: true, message: 'Tarea eliminada exitosamente' };
    } catch (error) {
      console.error('Error en TaskService.deleteTask:', error);
      throw error;
    }
  }

  /**
   * Cambiar estado de la tarea
   */
  async changeTaskStatus(id, newStatus, userId, isAdmin = false) {
    try {
      const task = await this.taskRepository.findById(id);
      if (!task) {
        throw new Error('Tarea no encontrada');
      }

      // Verificar acceso si no es admin
      if (!isAdmin) {
        const hasAccess = await this.taskRepository.hasUserAccess(id, userId);
        if (!hasAccess) {
          throw new Error('No tienes permisos para cambiar el estado de esta tarea');
        }
      }

      // Validar transición de estado
      const validTransitions = {
        'pendiente': ['en_progreso', 'cancelada'],
        'en_progreso': ['completada', 'pendiente', 'cancelada'],
        'completada': ['en_progreso'],
        'cancelada': ['pendiente']
      };

      if (!validTransitions[task.estado].includes(newStatus)) {
        throw new Error(`No se puede cambiar de ${task.estado} a ${newStatus}`);
      }

      const updatedTask = await this.taskRepository.updateTask(id, { estado: newStatus });
      return updatedTask;
    } catch (error) {
      console.error('Error en TaskService.changeTaskStatus:', error);
      throw error;
    }
  }

  /**
   * Asignar usuario a la tarea
   */
  async assignTask(taskId, userId, assignedBy) {
    try {
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new Error('Tarea no encontrada');
      }

      // Verificar si ya está asignado
      const isAlreadyAssigned = await this.taskAssignmentRepository.isUserAssigned(taskId, userId);
      if (isAlreadyAssigned) {
        throw new Error('El usuario ya está asignado a esta tarea');
      }

      await this.taskAssignmentRepository.assignTask(taskId, userId, assignedBy);
      return { message: 'Usuario asignado correctamente a la tarea' };
    } catch (error) {
      console.error('Error en TaskService.assignTask:', error);
      throw error;
    }
  }

  /**
   * Desasignar usuario de la tarea
   */
  async unassignTask(taskId, userId) {
    try {
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new Error('Tarea no encontrada');
      }

      const isAssigned = await this.taskAssignmentRepository.isUserAssigned(taskId, userId);
      if (!isAssigned) {
        throw new Error('El usuario no está asignado a esta tarea');
      }

      await this.taskAssignmentRepository.unassignTask(taskId, userId);
      return { message: 'Usuario desasignado correctamente de la tarea' };
    } catch (error) {
      console.error('Error en TaskService.unassignTask:', error);
      throw error;
    }
  }

  /**
   * Obtener asignaciones de la tarea
   */
  async getTaskAssignments(taskId) {
    try {
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new Error('Tarea no encontrada');
      }

      const assignments = await this.taskAssignmentRepository.getTaskAssignments(taskId);
      return assignments;
    } catch (error) {
      console.error('Error en TaskService.getTaskAssignments:', error);
      throw error;
    }
  }

  /**
   * Agregar comentario a la tarea
   */
  async addComment(taskId, commentData, userId) {
    try {
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new Error('Tarea no encontrada');
      }

      // Verificar acceso a la tarea
      const hasAccess = await this.taskRepository.hasUserAccess(taskId, userId);
      if (!hasAccess) {
        throw new Error('No tienes acceso a esta tarea');
      }

      const comment = await this.taskCommentRepository.create({
        ...commentData,
        tarea_id: taskId,
        usuario_id: userId
      });

      return comment;
    } catch (error) {
      console.error('Error en TaskService.addComment:', error);
      throw error;
    }
  }

  /**
   * Obtener comentarios de la tarea
   */
  async getTaskComments(taskId, userId = null, isAdmin = false) {
    try {
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new Error('Tarea no encontrada');
      }

      // Verificar acceso si no es admin
      if (!isAdmin && userId) {
        const hasAccess = await this.taskRepository.hasUserAccess(taskId, userId);
        if (!hasAccess) {
          throw new Error('No tienes acceso a esta tarea');
        }
      }

      const comments = await this.taskCommentRepository.getTaskComments(taskId);
      return comments;
    } catch (error) {
      console.error('Error en TaskService.getTaskComments:', error);
      throw error;
    }
  }

  /**
   * Actualizar comentario
   */
  async updateComment(commentId, commentData, userId, isAdmin = false) {
    try {
      const comment = await this.taskCommentRepository.findById(commentId);
      if (!comment) {
        throw new Error('Comentario no encontrado');
      }

      // Solo el autor del comentario o admin puede editarlo
      if (!isAdmin && comment.usuario_id !== userId) {
        throw new Error('No tienes permisos para editar este comentario');
      }

      const updatedComment = await this.taskCommentRepository.update(commentId, commentData);
      return updatedComment;
    } catch (error) {
      console.error('Error en TaskService.updateComment:', error);
      throw error;
    }
  }

  /**
   * Eliminar comentario
   */
  async deleteComment(commentId, userId, isAdmin = false) {
    try {
      const comment = await this.taskCommentRepository.findById(commentId);
      if (!comment) {
        throw new Error('Comentario no encontrado');
      }

      // Solo el autor del comentario o admin puede eliminarlo
      if (!isAdmin && comment.usuario_id !== userId) {
        throw new Error('No tienes permisos para eliminar este comentario');
      }

      await this.taskCommentRepository.delete(commentId);
      return { message: 'Comentario eliminado correctamente' };
    } catch (error) {
      console.error('Error en TaskService.deleteComment:', error);
      throw error;
    }
  }

  /**
   * Obtener tareas por proyecto
   */
  async getTasksByProject(projectId, { page = 1, limit = 10, userId = null, isAdmin = false }) {
    try {
      const offset = (page - 1) * limit;
      
      const tasks = await this.taskRepository.findByProject(projectId, {
        limit,
        offset,
        userId,
        isAdmin
      });

      const total = await this.taskRepository.countByProject(projectId, userId, isAdmin);

      return {
        tasks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error en TaskService.getTasksByProject:', error);
      throw new Error('Error obteniendo tareas del proyecto');
    }
  }

  /**
   * Obtener tareas asignadas a un usuario
   */
  async getAssignedTasks(userId, { page = 1, limit = 10, filters = {} }) {
    try {
      const offset = (page - 1) * limit;
      
      const tasks = await this.taskRepository.findByAssignee(userId, {
        limit,
        offset,
        filters
      });

      const total = await this.taskRepository.countByAssignee(userId, filters);

      return {
        tasks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error en TaskService.getAssignedTasks:', error);
      throw new Error('Error obteniendo tareas asignadas');
    }
  }

  /**
   * Obtener tareas por estado
   */
  async getTasksByStatus(status, { page = 1, limit = 10, userId = null, isAdmin = false }) {
    try {
      const offset = (page - 1) * limit;
      
      const tasks = await this.taskRepository.findByStatus(status, {
        limit,
        offset,
        userId,
        isAdmin
      });

      const total = await this.taskRepository.countByStatus(status, userId, isAdmin);

      return {
        tasks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error en TaskService.getTasksByStatus:', error);
      throw new Error('Error obteniendo tareas por estado');
    }
  }

  /**
   * Buscar tareas
   */
  async searchTasks(query, { page = 1, limit = 10, userId = null, isAdmin = false }) {
    try {
      const offset = (page - 1) * limit;
      
      const tasks = await this.taskRepository.search(query, {
        limit,
        offset,
        userId,
        isAdmin
      });

      const total = await this.taskRepository.countSearch(query, userId, isAdmin);

      return {
        tasks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error en TaskService.searchTasks:', error);
      throw new Error('Error buscando tareas');
    }
  }

  /**
   * Obtener estadísticas de tareas
   */
  async getTaskStats(userId = null, isAdmin = false, projectId = null) {
    try {
      const stats = await this.taskRepository.getTaskStats(userId, isAdmin, projectId);
      return stats;
    } catch (error) {
      console.error('Error en TaskService.getTaskStats:', error);
      throw new Error('Error obteniendo estadísticas de tareas');
    }
  }

  /**
   * Obtener tareas próximas a vencer
   */
  async getUpcomingTasks(userId = null, isAdmin = false, days = 7) {
    try {
      const tasks = await this.taskRepository.findUpcoming(days, userId, isAdmin);
      return tasks;
    } catch (error) {
      console.error('Error en TaskService.getUpcomingTasks:', error);
      throw new Error('Error obteniendo tareas próximas a vencer');
    }
  }

  /**
   * Obtener tareas vencidas
   */
  async getOverdueTasks(userId = null, isAdmin = false) {
    try {
      const tasks = await this.taskRepository.findOverdue(userId, isAdmin);
      return tasks;
    } catch (error) {
      console.error('Error en TaskService.getOverdueTasks:', error);
      throw new Error('Error obteniendo tareas vencidas');
    }
  }

  /**
   * Cambiar prioridad de la tarea
   */
  async changeTaskPriority(id, newPriority, userId, isAdmin = false) {
    try {
      const task = await this.taskRepository.findById(id);
      if (!task) {
        throw new Error('Tarea no encontrada');
      }

      // Verificar acceso si no es admin
      if (!isAdmin) {
        const hasAccess = await this.taskRepository.hasUserAccess(id, userId);
        if (!hasAccess) {
          throw new Error('No tienes permisos para cambiar la prioridad de esta tarea');
        }
      }

      // Validar prioridad
      const validPriorities = ['baja', 'media', 'alta', 'critica'];
      if (!validPriorities.includes(newPriority)) {
        throw new Error('Prioridad no válida');
      }

      const updatedTask = await this.taskRepository.updateTask(id, { prioridad: newPriority });
      return updatedTask;
    } catch (error) {
      console.error('Error en TaskService.changeTaskPriority:', error);
      throw error;
    }
  }

  /**
   * Obtener historial de cambios de la tarea
   */
  async getTaskHistory(taskId, userId = null, isAdmin = false) {
    try {
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new Error('Tarea no encontrada');
      }

      // Verificar acceso si no es admin
      if (!isAdmin && userId) {
        const hasAccess = await this.taskRepository.hasUserAccess(taskId, userId);
        if (!hasAccess) {
          throw new Error('No tienes acceso a esta tarea');
        }
      }

      const history = await this.taskRepository.getTaskHistory(taskId);
      return history;
    } catch (error) {
      console.error('Error en TaskService.getTaskHistory:', error);
      throw error;
    }
  }

  /**
   * Obtener tareas asignadas a un usuario específico
   */
  async getTasksByUser(userId, filters = {}) {
    try {
      console.log('TaskService.getTasksByUser - Iniciando con parámetros:', { userId, filters });
      
      const tasks = await this.taskRepository.findByUser(userId, filters.estado);
      
      console.log('TaskService.getTasksByUser - Tareas obtenidas:', tasks.length);
      
      return tasks;
    } catch (error) {
      console.error('Error en TaskService.getTasksByUser:', error);
      throw new Error('Error obteniendo tareas del usuario');
    }
  }

  /**
   * Verificar si un usuario puede gestionar una tarea específica
   * Un usuario puede gestionar una tarea si:
   * - Es administrador
   * - Es el usuario asignado a la tarea
   * - Es el creador de la tarea
   * - Es responsable del proyecto al que pertenece la tarea
   */
  async userCanManageTask(userId, taskId) {
    try {
      return await this.taskRepository.hasUserAccess(taskId, userId);
    } catch (error) {
      console.error('Error en TaskService.userCanManageTask:', error);
      return false;
    }
  }

  /**
   * Verificar si un usuario puede gestionar un proyecto
   */
  async userCanManageProject(userId, projectId) {
    try {
      // Verificar si es responsable del proyecto usando el repositorio
      const result = await this.projectResponsibleRepository.isUserResponsible(projectId, userId);
      return result;
    } catch (error) {
      console.error('Error en TaskService.userCanManageProject:', error);
      return false;
    }
  }

  /**
   * Verificar si un usuario tiene acceso a una tarea
   */
  async userHasAccessToTask(userId, taskId) {
    try {
      return await this.taskRepository.hasUserAccess(taskId, userId);
    } catch (error) {
      console.error('Error en TaskService.userHasAccessToTask:', error);
      return false;
    }
  }

  /**
   * Obtener estadísticas de tareas
   */
  async getTaskStatistics(userId = null, isAdmin = false) {
    try {
      const stats = await this.taskRepository.getStatistics(userId, isAdmin);
      return stats;
    } catch (error) {
      console.error('Error en TaskService.getTaskStatistics:', error);
      throw new Error('Error obteniendo estadísticas de tareas');
    }
  }

  /**
   * Obtener estadísticas generales de tareas para el dashboard
   */
  async getTasksOverview(userId = null, isAdmin = false) {
    try {
      const stats = await this.taskRepository.getOverviewStats(userId, isAdmin);
      return stats;
    } catch (error) {
      console.error('Error en TaskService.getTasksOverview:', error);
      throw new Error('Error obteniendo estadísticas de tareas');
    }
  }

  /**
   * Obtener tareas recientes
   */
  async getRecentTasks(userId = null, isAdmin = false, limit = 5) {
    try {
      const tasks = await this.taskRepository.findRecent(userId, isAdmin, limit);
      return tasks;
    } catch (error) {
      console.error('Error en TaskService.getRecentTasks:', error);
      throw new Error('Error obteniendo tareas recientes');
    }
  }

  /**
   * Obtener tareas pendientes
   */
  async getPendingTasks(userId = null, isAdmin = false) {
    try {
      const tasks = await this.taskRepository.findPending(userId, isAdmin);
      return tasks;
    } catch (error) {
      console.error('Error en TaskService.getPendingTasks:', error);
      throw new Error('Error obteniendo tareas pendientes');
    }
  }

  /**
   * Obtener archivos de una tarea
   */
  async getTaskFiles(taskId, options = {}) {
    try {
      const FileService = require('./fileService');
      const fileService = new FileService();
      
      // Proporcionar valores por defecto para la paginación
      const paginationOptions = {
        page: options.page || 1,
        limit: options.limit || 10,
        userId: options.userId || null,
        isAdmin: options.isAdmin || false
      };
      
      const result = await fileService.getFilesByTask(taskId, paginationOptions);
      return result.files || [];
    } catch (error) {
      console.error('Error en TaskService.getTaskFiles:', error);
      throw new Error('Error obteniendo archivos de la tarea');
    }
  }

  /**
   * Verificar si un usuario tiene acceso a una tarea
   */
  async userHasAccessToTask(userId, taskId) {
    try {
      return await this.taskRepository.hasUserAccess(taskId, userId);
    } catch (error) {
      console.error('Error en TaskService.userHasAccessToTask:', error);
      return false;
    }
  }
}

module.exports = TaskService;
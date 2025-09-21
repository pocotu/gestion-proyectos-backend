const UserRoleRepository = require('../repositories/UserRoleRepository');
const ProjectRepository = require('../repositories/ProjectRepository');
const TaskRepository = require('../repositories/TaskRepository');
const FileRepository = require('../repositories/FileRepository');
const ProjectResponsibleRepository = require('../repositories/ProjectResponsibleRepository');

/**
 * GranularAccessMiddleware - Middleware para control de acceso granular
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja control de acceso granular específico
 * - Open/Closed: Abierto para extensión (nuevos tipos de recursos)
 * - Liskov Substitution: Puede ser sustituido por otros middlewares de acceso
 * - Interface Segregation: Métodos específicos para cada tipo de recurso
 * - Dependency Inversion: Depende de abstracciones (Repositories)
 */
class GranularAccessMiddleware {
  constructor() {
    this.userRoleRepository = new UserRoleRepository();
    this.projectRepository = new ProjectRepository();
    this.taskRepository = new TaskRepository();
    this.fileRepository = new FileRepository();
    this.projectResponsibleRepository = new ProjectResponsibleRepository();
  }

  /**
   * Control de acceso granular para proyectos
   * Solo responsables del proyecto y admin pueden acceder
   * @param {string} action - Acción a realizar (read, update, delete)
   * @returns {Function} Middleware function
   */
  requireProjectAccess(action = 'read') {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        const projectId = req.params.projectId || req.params.id;

        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
        }

        // Admin siempre tiene acceso
        if (req.user.es_administrador) {
          next();
          return;
        }

        if (!projectId) {
          // Para creación de proyectos, verificar que tenga rol de responsable_proyecto o sea admin
          if (req.user.es_administrador) {
            next();
            return;
          }
          
          const userRoles = await this.userRoleRepository.getUserRoles(userId);
          const hasProjectRole = userRoles.some(role => role.rol_nombre === 'responsable_proyecto');
          
          if (!hasProjectRole) {
            return res.status(403).json({
              success: false,
              message: 'Solo los responsables de proyecto pueden crear proyectos'
            });
          }
          
          next();
          return;
        }

        // Verificar si el usuario es responsable del proyecto específico
        const isResponsible = await this.projectResponsibleRepository.isUserResponsible(parseInt(projectId), userId);
        
        if (!isResponsible) {
          return res.status(403).json({
            success: false,
            message: 'Solo los responsables del proyecto y administradores pueden acceder a este recurso'
          });
        }

        next();

      } catch (error) {
        console.error('Error verificando acceso al proyecto:', error);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    };
  }

  /**
   * Control de acceso granular para tareas
   * Solo usuarios asignados, responsables del proyecto y admin pueden acceder
   * @param {string} action - Acción a realizar (read, update, delete)
   * @returns {Function} Middleware function
   */
  requireTaskAccess(action = 'read') {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        const taskId = req.params.taskId || req.params.id;

        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
        }

        // Admin siempre tiene acceso
        if (req.user.es_administrador) {
          next();
          return;
        }

        if (!taskId) {
          // Para creación de tareas, verificar acceso al proyecto
          const projectId = req.body.proyecto_id || req.params.projectId;
          
          if (!projectId) {
            return res.status(400).json({
              success: false,
              message: 'ID del proyecto es requerido'
            });
          }

          // Verificar si es responsable del proyecto
          const isProjectResponsible = await this.projectResponsibleRepository.isUserResponsible(parseInt(projectId), userId);
          
          if (!isProjectResponsible) {
            return res.status(403).json({
              success: false,
              message: 'Solo los responsables del proyecto pueden crear tareas'
            });
          }
          
          next();
          return;
        }

        // Obtener información de la tarea
        const task = await this.taskRepository.findById(parseInt(taskId));
        
        if (!task) {
          return res.status(404).json({
            success: false,
            message: 'Tarea no encontrada'
          });
        }

        // Verificar si el usuario está asignado a la tarea
        if (task.usuario_asignado_id === userId) {
          next();
          return;
        }

        // Verificar si es responsable del proyecto al que pertenece la tarea
        const isProjectResponsible = await this.projectResponsibleRepository.isUserResponsible(userId, task.proyecto_id);
        
        if (!isProjectResponsible) {
          return res.status(403).json({
            success: false,
            message: 'Solo los usuarios asignados a la tarea, responsables del proyecto y administradores pueden acceder a este recurso'
          });
        }

        next();

      } catch (error) {
        console.error('Error verificando acceso a la tarea:', error);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    };
  }

  /**
   * Control de acceso granular para archivos
   * Solo quien subió el archivo, responsables del proyecto y admin pueden acceder
   * @param {string} action - Acción a realizar (read, update, delete, download)
   * @returns {Function} Middleware function
   */
  requireFileAccess(action = 'read') {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        const fileId = req.params.fileId || req.params.id;

        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
        }

        // Admin siempre tiene acceso
        if (req.user.es_administrador) {
          next();
          return;
        }

        if (!fileId) {
          // Para subida de archivos, verificar acceso a la tarea
          const taskId = req.params.taskId || req.body.tarea_id;
          
          if (!taskId) {
            return res.status(400).json({
              success: false,
              message: 'ID de la tarea es requerido'
            });
          }

          // Usar el middleware de tareas para verificar acceso
          return this.requireTaskAccess(action)(req, res, next);
        }

        // Obtener información del archivo
        const file = await this.fileRepository.findById(parseInt(fileId));
        
        if (!file) {
          return res.status(404).json({
            success: false,
            message: 'Archivo no encontrado'
          });
        }

        // Verificar si el usuario subió el archivo
        if (file.subido_por === userId) {
          next();
          return;
        }

        // Verificar si es responsable del proyecto al que pertenece el archivo
        let projectId = file.proyecto_id;
        
        // Si el archivo está asociado a una tarea, obtener el proyecto de la tarea
        if (file.tarea_id && !projectId) {
          const task = await this.taskRepository.findById(file.tarea_id);
          projectId = task?.proyecto_id;
        }

        if (!projectId) {
          return res.status(403).json({
            success: false,
            message: 'No se puede determinar el proyecto del archivo'
          });
        }

        const isProjectResponsible = await this.projectResponsibleRepository.isUserResponsible(userId, projectId);
        
        if (!isProjectResponsible) {
          return res.status(403).json({
            success: false,
            message: 'Solo quien subió el archivo, responsables del proyecto y administradores pueden acceder a este recurso'
          });
        }

        next();

      } catch (error) {
        console.error('Error verificando acceso al archivo:', error);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    };
  }

  /**
   * Middleware para verificar acceso a archivos por tarea
   * Utilizado para endpoints como /api/files/task/:taskId
   */
  requireTaskFileAccess() {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        const taskId = req.params.taskId;

        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
        }

        // Admin siempre tiene acceso
        if (req.user.es_administrador) {
          next();
          return;
        }

        if (!taskId) {
          return res.status(400).json({
            success: false,
            message: 'ID de la tarea es requerido'
          });
        }

        // Obtener información de la tarea
        const task = await this.taskRepository.findById(parseInt(taskId));
        
        if (!task) {
          return res.status(404).json({
            success: false,
            message: 'Tarea no encontrada'
          });
        }

        // Verificar si el usuario está asignado a la tarea
        if (task.usuario_asignado_id === userId) {
          next();
          return;
        }

        // Verificar si es responsable del proyecto
        const isProjectResponsible = await this.projectResponsibleRepository.isUserResponsible(userId, task.proyecto_id);
        
        if (!isProjectResponsible) {
          return res.status(403).json({
            success: false,
            message: 'Solo los usuarios asignados a la tarea, responsables del proyecto y administradores pueden acceder a los archivos de esta tarea'
          });
        }

        next();

      } catch (error) {
        console.error('Error verificando acceso a archivos de la tarea:', error);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    };
  }

  /**
   * Middleware para verificar acceso a archivos por proyecto
   * Utilizado para endpoints como /api/files/project/:projectId
   */
  requireProjectFileAccess() {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        const projectId = req.params.projectId;

        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
        }

        // Admin siempre tiene acceso
        if (req.user.es_administrador) {
          next();
          return;
        }

        if (!projectId) {
          return res.status(400).json({
            success: false,
            message: 'ID del proyecto es requerido'
          });
        }

        // Verificar si es responsable del proyecto
        const isProjectResponsible = await this.projectResponsibleRepository.isUserResponsible(userId, parseInt(projectId));
        
        if (!isProjectResponsible) {
          return res.status(403).json({
            success: false,
            message: 'Solo los responsables del proyecto y administradores pueden acceder a los archivos del proyecto'
          });
        }

        next();

      } catch (error) {
        console.error('Error verificando acceso a archivos del proyecto:', error);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    };
  }
}

// Crear instancia singleton
const granularAccessMiddleware = new GranularAccessMiddleware();

// Exportar métodos como funciones independientes para facilitar el uso
module.exports = {
  requireProjectAccess: (action) => granularAccessMiddleware.requireProjectAccess(action),
  requireTaskAccess: (action) => granularAccessMiddleware.requireTaskAccess(action),
  requireFileAccess: (action) => granularAccessMiddleware.requireFileAccess(action),
  requireTaskFileAccess: () => granularAccessMiddleware.requireTaskFileAccess(),
  requireProjectFileAccess: () => granularAccessMiddleware.requireProjectFileAccess(),
  
  // Exportar la clase para casos avanzados
  GranularAccessMiddleware
};
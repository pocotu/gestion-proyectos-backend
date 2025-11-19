/**
 * LogsController - Controlador para logs de actividad
 * 
 * NOTA: Este controlador es un WRAPPER que utiliza LogActivityRepository
 * para mantener consistencia con el patrón de diseño existente.
 * La funcionalidad real está implementada en activityRoutes.js
 * 
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja operaciones de consulta de logs
 * - Open/Closed: Abierto para extensión sin modificar código existente
 * - Dependency Inversion: Depende de LogActivityRepository (abstracción)
 * - DRY: No duplica código, reutiliza LogActivityRepository existente
 */

const LogActivityRepository = require('../repositories/LogActivityRepository');

class LogsController {
  constructor() {
    this.logRepository = new LogActivityRepository();
  }

  /**
   * Obtener todos los logs con filtros opcionales
   * GET /api/logs
   * Query params: page, limit, startDate, endDate, entityType, action
   * Permisos: Solo administradores
   */
  async getAllLogs(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        startDate, 
        endDate, 
        entityType, 
        action 
      } = req.query;
      
      // Validación de parámetros
      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(parseInt(limit) || 50, 100);
      const offset = (pageNum - 1) * limitNum;

      let logs;

      // Aplicar filtros según los parámetros proporcionados
      if (startDate && endDate) {
        logs = await this.logRepository.getByDateRange(
          new Date(startDate),
          new Date(endDate),
          limitNum,
          offset
        );
      } else if (action) {
        logs = await this.logRepository.getByAction(action, limitNum, offset);
      } else if (entityType) {
        // Si se proporciona entityType sin entityId, buscar por tipo
        // Sanitizar offset y limitNum ya que se usan en el query
        const safeOffset = Math.max(0, parseInt(offset) || 0);
        const safeLimit = Math.max(1, Math.min(parseInt(limitNum) || 50, 100));
        
        logs = await this.logRepository.raw(`
          SELECT logs_actividad.*, usuarios.nombre as usuario_nombre, usuarios.email as usuario_email
          FROM logs_actividad
          LEFT JOIN usuarios ON logs_actividad.usuario_id = usuarios.id
          WHERE logs_actividad.entidad_tipo = ?
          ORDER BY logs_actividad.created_at DESC
          LIMIT ${safeOffset}, ${safeLimit}
        `, [entityType]);
      } else {
        logs = await this.logRepository.getRecentActivities(limitNum);
      }

      res.json({
        success: true,
        data: logs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          offset,
          total: logs.length
        }
      });

    } catch (error) {
      console.error('Error obteniendo todos los logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los logs de actividad',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtener logs de un usuario específico
   * GET /api/logs/user/:id
   * Query params: page, limit, days
   * Permisos: Admin o el propio usuario
   */
  async getUserLogs(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50, days = 30 } = req.query;
      
      const userId = parseInt(id);
      const requestingUserId = req.user.id;
      const isAdmin = req.user.es_administrador || req.user.roles?.includes('admin');

      // Verificar permisos: admin o el propio usuario
      if (!isAdmin && requestingUserId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver los logs de este usuario'
        });
      }

      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(parseInt(limit) || 50, 100);

      // Obtener logs del usuario (página y límite, no offset)
      const logs = await this.logRepository.getByUser(userId, pageNum, limitNum);
      
      // Obtener estadísticas del usuario
      const stats = await this.logRepository.getUserActivityStats(userId);

      res.json({
        success: true,
        data: {
          logs,
          stats,
          userId
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          offset: (pageNum - 1) * limitNum,
          total: logs.length
        }
      });

    } catch (error) {
      console.error('Error obteniendo logs del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los logs del usuario',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtener logs de un proyecto específico
   * GET /api/logs/project/:id
   * Query params: page, limit
   * Permisos: Admin o responsable del proyecto
   */
  async getProjectLogs(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;
      
      const projectId = parseInt(id);
      const requestingUserId = req.user.id;
      const isAdmin = req.user.es_administrador || req.user.roles?.includes('admin');
      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(parseInt(limit) || 50, 100);
      const offset = (pageNum - 1) * limitNum;

      // Verificar permisos: admin o responsable del proyecto
      if (!isAdmin) {
        // Verificar si el usuario es responsable del proyecto
        const [isResponsible] = await this.logRepository.raw(
          'SELECT COUNT(*) as count FROM proyecto_responsables WHERE proyecto_id = ? AND usuario_id = ?',
          [projectId, requestingUserId]
        );

        if (!isResponsible || isResponsible.count === 0) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para ver los logs de este proyecto'
          });
        }
      }

      // Obtener logs del proyecto
      const logs = await this.logRepository.getByEntity('proyecto', projectId, limitNum, offset);

      // Obtener historial completo del proyecto (ordenado cronológicamente)
      const history = await this.logRepository.getEntityHistory('proyecto', projectId, 20, 0);

      res.json({
        success: true,
        data: {
          logs,
          history,
          projectId,
          entityType: 'proyecto'
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          offset,
          total: logs.length
        }
      });

    } catch (error) {
      console.error('Error obteniendo logs del proyecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los logs del proyecto',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtener logs de una tarea específica
   * GET /api/logs/task/:id
   * Query params: page, limit
   * Permisos: Admin, responsable del proyecto o asignado a la tarea
   */
  async getTaskLogs(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;
      
      const taskId = parseInt(id);
      const requestingUserId = req.user.id;
      const isAdmin = req.user.es_administrador || req.user.roles?.includes('admin');
      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(parseInt(limit) || 50, 100);
      const offset = (pageNum - 1) * limitNum;

      // Verificar permisos: admin, responsable del proyecto o asignado a la tarea
      if (!isAdmin) {
        // Verificar si el usuario es el asignado a la tarea o responsable del proyecto
        const taskInfo = await this.logRepository.raw(`
          SELECT 
            t.usuario_asignado_id,
            t.proyecto_id,
            (SELECT COUNT(*) FROM proyecto_responsables pr 
             WHERE pr.proyecto_id = t.proyecto_id AND pr.usuario_id = ?) as es_responsable
          FROM tareas t
          WHERE t.id = ?
        `, [requestingUserId, taskId]);

        if (!taskInfo || taskInfo.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Tarea no encontrada'
          });
        }

        const isAssigned = taskInfo[0].usuario_asignado_id === requestingUserId;
        const isProjectResponsible = taskInfo[0].es_responsable > 0;

        if (!isAssigned && !isProjectResponsible) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para ver los logs de esta tarea'
          });
        }
      }

      // Obtener logs de la tarea
      const logs = await this.logRepository.getByEntity('tarea', taskId, limitNum, offset);

      // Obtener historial completo de la tarea (ordenado cronológicamente)
      const history = await this.logRepository.getEntityHistory('tarea', taskId, 20, 0);

      res.json({
        success: true,
        data: {
          logs,
          history,
          taskId,
          entityType: 'tarea'
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          offset,
          total: logs.length
        }
      });

    } catch (error) {
      console.error('Error obteniendo logs de la tarea:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los logs de la tarea',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtener resumen de actividad del sistema
   * GET /api/logs/summary
   * Permisos: Solo administradores
   */
  async getActivitySummary(req, res) {
    try {
      const summary = await this.logRepository.getActivitySummary();

      res.json({
        success: true,
        data: summary
      });

    } catch (error) {
      console.error('Error obteniendo resumen de actividad:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el resumen de actividad',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Buscar logs por descripción
   * GET /api/logs/search
   * Query params: q (query), page, limit
   * Permisos: Solo administradores
   */
  async searchLogs(req, res) {
    try {
      const { q, page = 1, limit = 50 } = req.query;

      if (!q || q.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un término de búsqueda'
        });
      }

      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(parseInt(limit) || 50, 100);
      const offset = (pageNum - 1) * limitNum;

      const logs = await this.logRepository.searchActivities(q.trim(), limitNum, offset);

      res.json({
        success: true,
        data: logs,
        searchTerm: q,
        pagination: {
          page: pageNum,
          limit: limitNum,
          offset,
          total: logs.length
        }
      });

    } catch (error) {
      console.error('Error buscando logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar logs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = LogsController;

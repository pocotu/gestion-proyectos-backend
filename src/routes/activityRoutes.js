/**
 * Rutas para el sistema de logs de actividad
 * Siguiendo principios SOLID y arquitectura RESTful
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireAnyRole } = require('../middleware/roleMiddleware');
const LogActivityRepository = require('../repositories/LogActivityRepository');

// Instancia del repositorio
const logRepository = new LogActivityRepository();

/**
 * Obtener logs de actividad con filtros
 * GET /api/activity/logs
 * Query params: page, limit, startDate, endDate, userId, entityType, action
 * Acceso: solo admin
 */
router.get('/logs', 
  authenticate,
  requireAnyRole(['admin']),
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 50, 
        startDate, 
        endDate, 
        userId, 
        entityType, 
        entityId,
        action 
      } = req.query;
      
      // Validación de parámetros
      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(parseInt(limit) || 50, 100);
      const offset = (pageNum - 1) * limitNum;

      let logs;

      // Aplicar filtros según los parámetros
      if (startDate && endDate) {
        logs = await logRepository.getByDateRange(
          new Date(startDate),
          new Date(endDate),
          limitNum,
          offset
        );
      } else if (userId) {
        logs = await logRepository.getByUser(parseInt(userId), limitNum, offset);
      } else if (entityType && entityId) {
        logs = await logRepository.getByEntity(entityType, parseInt(entityId), limitNum, offset);
      } else if (action) {
        logs = await logRepository.getByAction(action, limitNum, offset);
      } else {
        logs = await logRepository.getRecentActivities(limitNum);
      }

      res.json({
        success: true,
        data: logs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          offset
        }
      });

    } catch (error) {
      console.error('Error fetching activity logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los logs de actividad'
      });
    }
  }
);

/**
 * Obtener estadísticas de actividad
 * GET /api/activity/stats
 * Query params: days (default: 30)
 * Acceso: solo admin
 */
router.get('/stats', 
  authenticate,
  requireAnyRole(['admin']),
  async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const daysNum = Math.min(parseInt(days) || 30, 365);

      const stats = await logRepository.getSystemStats(daysNum);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error fetching activity stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las estadísticas de actividad'
      });
    }
  }
);

/**
 * Obtener actividad de un usuario específico
 * GET /api/activity/user/:userId
 * Query params: page, limit, days
 * Acceso: admin o el propio usuario
 */
router.get('/user/:userId', 
  authenticate,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 50, days = 30 } = req.query;
      
      const userIdNum = parseInt(userId);
      const requestingUserId = req.user.id;
      const isAdmin = req.user.roles?.includes('admin');

      // Verificar permisos: admin o el propio usuario
      if (!isAdmin && requestingUserId !== userIdNum) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver esta información'
        });
      }

      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(parseInt(limit) || 50, 100);
      const offset = (pageNum - 1) * limitNum;

      const logs = await logRepository.getByUser(userIdNum, limitNum, offset);
      const stats = await logRepository.getUserActivityStats(userIdNum, parseInt(days) || 30);

      res.json({
        success: true,
        data: {
          logs,
          stats
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          offset
        }
      });

    } catch (error) {
      console.error('Error fetching user activity:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener la actividad del usuario'
      });
    }
  }
);

/**
 * Obtener actividad de una entidad específica
 * GET /api/activity/entity/:entityType/:entityId
 * Query params: page, limit
 * Acceso: admin o usuarios con acceso a la entidad
 */
router.get('/entity/:entityType/:entityId', 
  authenticate,
  async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      
      const entityIdNum = parseInt(entityId);
      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(parseInt(limit) || 50, 100);
      const offset = (pageNum - 1) * limitNum;

      // Validar tipos de entidad permitidos
      const allowedEntityTypes = ['proyecto', 'tarea', 'usuario', 'archivo', 'rol'];
      if (!allowedEntityTypes.includes(entityType)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de entidad no válido'
        });
      }

      const logs = await logRepository.getByEntity(entityType, entityIdNum, limitNum, offset);

      res.json({
        success: true,
        data: logs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          offset
        }
      });

    } catch (error) {
      console.error('Error fetching entity activity:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener la actividad de la entidad'
      });
    }
  }
);

/**
 * Exportar logs para auditoría
 * GET /api/activity/export
 * Query params: startDate, endDate, userId, format (json|csv)
 * Acceso: solo admin
 */
router.get('/export', 
  authenticate,
  requireAnyRole(['admin']),
  async (req, res) => {
    try {
      const { startDate, endDate, userId, format = 'json' } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren fechas de inicio y fin para la exportación'
        });
      }

      const logs = await logRepository.exportLogsForAudit(
        new Date(startDate),
        new Date(endDate),
        userId ? parseInt(userId) : null
      );

      if (format === 'csv') {
        // Convertir a CSV
        const csvHeader = 'ID,Usuario,Email,Acción,Entidad,Entidad ID,Descripción,Fecha,IP\n';
        const csvData = logs.map(log => 
          `${log.id},"${log.usuario_nombre || ''}","${log.usuario_email || ''}","${log.accion}","${log.entidad_tipo}",${log.entidad_id || ''},"${log.descripcion || ''}","${log.created_at}","${log.ip_address || ''}"`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="activity_logs_${startDate}_${endDate}.csv"`);
        res.send(csvHeader + csvData);
      } else {
        res.json({
          success: true,
          data: logs,
          exportInfo: {
            startDate,
            endDate,
            totalRecords: logs.length,
            exportedAt: new Date().toISOString()
          }
        });
      }

    } catch (error) {
      console.error('Error exporting activity logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error al exportar los logs de actividad'
      });
    }
  }
);

module.exports = router;
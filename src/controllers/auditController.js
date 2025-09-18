/**
 * Controlador de Auditoría
 * Maneja las consultas de logs de auditoría de roles y permisos
 * Siguiendo principios SOLID
 */

const LogActivityModel = require('../models/logActivityModel');

class AuditController {
  constructor() {
    this.logModel = new LogActivityModel();
  }

  /**
   * Obtiene todos los logs de auditoría de roles
   * Principio de Responsabilidad Única: solo maneja consultas de logs de roles
   */
  async getRoleAuditLogs(req, res) {
    try {
      const { page = 1, limit = 50, startDate, endDate, userId, action } = req.query;
      
      // Validación de parámetros
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      
      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          message: 'Parámetros de paginación inválidos'
        });
      }

      // Construir filtros
      const filters = {
        entityType: 'role'
      };

      if (userId) filters.userId = parseInt(userId);
      if (action) filters.action = action;

      // Obtener logs con filtros
      let logs;
      if (startDate && endDate) {
        logs = await this.logModel.getLogsByDateRange(
          new Date(startDate),
          new Date(endDate),
          filters,
          pageNum,
          limitNum
        );
      } else {
        logs = await this.logModel.getLogsByEntity('role', filters, pageNum, limitNum);
      }

      res.json({
        success: true,
        data: logs,
        pagination: {
          page: pageNum,
          limit: limitNum
        }
      });

    } catch (error) {
      console.error('Error al obtener logs de auditoría de roles:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene logs de auditoría por usuario específico
   * Principio Abierto/Cerrado: extensible para diferentes tipos de filtros
   */
  async getUserRoleAuditLogs(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 50, startDate, endDate, action } = req.query;
      
      // Validación
      const userIdNum = parseInt(userId);
      if (!userIdNum) {
        return res.status(400).json({
          success: false,
          message: 'ID de usuario inválido'
        });
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      const filters = {
        entityType: 'role',
        userId: userIdNum
      };

      if (action) filters.action = action;

      let logs;
      if (startDate && endDate) {
        logs = await this.logModel.getLogsByDateRange(
          new Date(startDate),
          new Date(endDate),
          filters,
          pageNum,
          limitNum
        );
      } else {
        logs = await this.logModel.getLogsByUser(userIdNum, filters, pageNum, limitNum);
      }

      res.json({
        success: true,
        data: logs,
        pagination: {
          page: pageNum,
          limit: limitNum
        }
      });

    } catch (error) {
      console.error('Error al obtener logs de usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene logs de auditoría por acción específica
   * Principio de Segregación de Interfaces: método específico para consultas por acción
   */
  async getRoleAuditLogsByAction(req, res) {
    try {
      const { action } = req.params;
      const { page = 1, limit = 50, startDate, endDate, userId } = req.query;
      
      // Validar acción
      const validActions = ['role_assigned', 'role_removed', 'roles_synced', 'permission_changed'];
      if (!validActions.includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Acción inválida'
        });
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      const filters = {
        entityType: 'role',
        action: action
      };

      if (userId) filters.userId = parseInt(userId);

      let logs;
      if (startDate && endDate) {
        logs = await this.logModel.getLogsByDateRange(
          new Date(startDate),
          new Date(endDate),
          filters,
          pageNum,
          limitNum
        );
      } else {
        logs = await this.logModel.getLogsByAction(action, filters, pageNum, limitNum);
      }

      res.json({
        success: true,
        data: logs,
        pagination: {
          page: pageNum,
          limit: limitNum
        }
      });

    } catch (error) {
      console.error('Error al obtener logs por acción:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene resumen de auditoría de roles
   * Principio de Inversión de Dependencias: depende de abstracciones del modelo
   */
  async getRoleAuditSummary(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Fechas de inicio y fin son requeridas'
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: 'La fecha de inicio debe ser anterior a la fecha de fin'
        });
      }

      // Obtener resumen de logs
      const summary = await this.logModel.getLogsSummary(start, end, {
        entityType: 'role'
      });

      res.json({
        success: true,
        data: summary,
        period: {
          startDate: start.toISOString(),
          endDate: end.toISOString()
        }
      });

    } catch (error) {
      console.error('Error al obtener resumen de auditoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = AuditController;
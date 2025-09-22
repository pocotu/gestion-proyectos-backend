/**
 * DashboardController - Controlador para estadísticas del dashboard
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja operaciones del dashboard
 * - Open/Closed: Abierto para extensión (nuevas estadísticas)
 * - Liskov Substitution: Puede ser sustituido por otros controladores
 * - Interface Segregation: Métodos específicos para cada tipo de estadística
 * - Dependency Inversion: Depende de abstracciones (servicios)
 */

const UserService = require('../services/userService');
const ProjectService = require('../services/projectService');
const TaskService = require('../services/taskService');
const LogActivityRepository = require('../repositories/LogActivityRepository');

class DashboardController {
  constructor() {
    this.userService = new UserService();
    this.projectService = new ProjectService();
    this.taskService = new TaskService();
    this.logRepository = new LogActivityRepository();
  }

  /**
   * Obtener resumen completo del dashboard
   * GET /api/dashboard/summary
   * Permisos: Usuario autenticado
   */
  async getDashboardSummary(req, res) {
    try {
      console.log('=== DASHBOARD SUMMARY DEBUG ===');
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;
      console.log('Usuario ID:', userId, 'Es Admin:', isAdmin);

      // Obtener estadísticas según el rol del usuario
      let projectStats, taskStats, userStats;

      if (isAdmin) {
        console.log('Obteniendo estadísticas de admin...');
        // Admin puede ver todas las estadísticas
        try {
          console.log('Obteniendo projectStats...');
          projectStats = await this.projectService.getProjectsOverview(null, true);
          console.log('ProjectStats obtenidas:', projectStats);
        } catch (error) {
          console.error('Error en projectStats:', error);
          throw error;
        }

        try {
          console.log('Obteniendo taskStats...');
          taskStats = await this.taskService.getTaskStatistics(null, true);
          console.log('TaskStats obtenidas:', taskStats);
        } catch (error) {
          console.error('Error en taskStats:', error);
          throw error;
        }

        try {
          console.log('Obteniendo userStats...');
          userStats = await this.userService.getUserStatistics();
          console.log('UserStats obtenidas:', userStats);
        } catch (error) {
          console.error('Error en userStats:', error);
          throw error;
        }
      } else {
        console.log('Obteniendo estadísticas de usuario normal...');
        // Usuario normal solo ve sus propias estadísticas
        projectStats = await this.projectService.getProjectsOverview(userId, false);
        taskStats = await this.taskService.getTaskStatistics(userId, false);
        userStats = null; // Los usuarios normales no ven estadísticas de usuarios
      }

      const summary = {
        projects: projectStats,
        tasks: taskStats,
        ...(userStats && { users: userStats })
      };

      console.log('Summary final:', summary);
      console.log('=== FIN DEBUG ===');

      res.json({
        success: true,
        data: summary
      });

    } catch (error) {
      console.error('Error obteniendo resumen del dashboard:', error);
      console.error('Stack trace:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener estadísticas de proyectos para el dashboard
   * GET /api/dashboard/projects/stats
   * Permisos: Usuario autenticado
   */
  async getProjectStats(req, res) {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      const stats = await this.projectService.getProjectsOverview(userId, isAdmin);

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas de proyectos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estadísticas de tareas para el dashboard
   * GET /api/dashboard/tasks/stats
   * Permisos: Usuario autenticado
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

  /**
   * Obtener estadísticas administrativas
   * GET /api/dashboard/admin/stats
   * Permisos: Solo administradores
   */
  async getAdminStats(req, res) {
    try {
      const [userStats, projectStats, taskStats] = await Promise.all([
        this.userService.getUserStatistics(),
        this.projectService.getProjectsOverview(null, true),
        this.taskService.getTaskStatistics(null, true)
      ]);

      const adminStats = {
        users: userStats,
        projects: projectStats,
        tasks: taskStats,
        summary: {
          totalUsers: userStats.total || 0,
          activeUsers: userStats.active || 0,
          totalProjects: projectStats.total || 0,
          totalTasks: taskStats.total || 0
        }
      };

      res.json({
        success: true,
        data: adminStats
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas administrativas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener proyectos recientes
   * GET /api/dashboard/projects/recent
   * Permisos: Usuario autenticado
   */
  async getRecentProjects(req, res) {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;
      const limit = parseInt(req.query.limit) || 5;

      const recentProjects = await this.projectService.getRecentProjects(userId, isAdmin, limit);

      res.json({
        success: true,
        data: recentProjects
      });

    } catch (error) {
      console.error('Error obteniendo proyectos recientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener tareas recientes
   * GET /api/dashboard/tasks/recent
   * Permisos: Usuario autenticado
   */
  async getRecentTasks(req, res) {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;
      const limit = parseInt(req.query.limit) || 5;

      const recentTasks = await this.taskService.getRecentTasks(userId, isAdmin, limit);

      res.json({
        success: true,
        data: recentTasks
      });

    } catch (error) {
      console.error('Error obteniendo tareas recientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener tareas pendientes
   * GET /api/dashboard/tasks/pending
   * Permisos: Usuario autenticado
   */
  async getPendingTasks(req, res) {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.es_administrador;

      const pendingTasks = await this.taskService.getPendingTasks(userId, isAdmin);

      res.json({
        success: true,
        data: pendingTasks
      });

    } catch (error) {
      console.error('Error obteniendo tareas pendientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene la actividad reciente del sistema (solo para admins)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async getRecentActivity(req, res) {
    try {
      const { limit = 20, offset = 0, userId, entityType, action } = req.query;
      
      // Validar parámetros
      const limitNum = Math.min(parseInt(limit) || 20, 100);
      const offsetNum = parseInt(offset) || 0;

      let activities;

      if (userId) {
        activities = await this.logRepository.getByUser(parseInt(userId), limitNum, offsetNum);
      } else if (entityType && req.query.entityId) {
        activities = await this.logRepository.getByEntity(entityType, parseInt(req.query.entityId), limitNum, offsetNum);
      } else if (action) {
        activities = await this.logRepository.getByAction(action, limitNum, offsetNum);
      } else {
        activities = await this.logRepository.getRecentActivities(limitNum);
      }

      // Formatear las actividades para el frontend
      const formattedActivities = activities.map(activity => ({
        id: activity.id,
        tipo: activity.entidad_tipo,
        accion: activity.accion,
        elemento: activity.descripcion || `${activity.entidad_tipo} ID ${activity.entidad_id}`,
        usuario: activity.usuario_nombre || 'Usuario desconocido',
        fecha: activity.created_at,
        ip_address: activity.ip_address,
        detalles: {
          entidad_id: activity.entidad_id,
          datos_anteriores: activity.datos_anteriores,
          datos_nuevos: activity.datos_nuevos
        }
      }));

      res.json({
        success: true,
        data: formattedActivities,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: formattedActivities.length
        }
      });

    } catch (error) {
      console.error('Error fetching recent activity:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener la actividad reciente'
      });
    }
  }
}

module.exports = DashboardController;
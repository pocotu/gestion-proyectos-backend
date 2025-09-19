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

class DashboardController {
  constructor() {
    this.userService = new UserService();
    this.projectService = new ProjectService();
    this.taskService = new TaskService();
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
   * Obtener actividad reciente del sistema (solo admin)
   * GET /api/dashboard/admin/activity
   * Permisos: Solo administradores
   */
  async getRecentActivity(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;

      // Por ahora retornamos datos simulados
      // En el futuro se implementará con el sistema de logs
      const recentActivity = [
        {
          id: 1,
          tipo: 'proyecto_creado',
          descripcion: 'Nuevo proyecto creado: Sistema de Gestión',
          usuario: 'Admin',
          fecha: new Date().toISOString()
        },
        {
          id: 2,
          tipo: 'tarea_completada',
          descripcion: 'Tarea completada: Implementar autenticación',
          usuario: 'Juan Pérez',
          fecha: new Date(Date.now() - 3600000).toISOString()
        }
      ];

      res.json({
        success: true,
        data: recentActivity.slice(0, limit)
      });

    } catch (error) {
      console.error('Error obteniendo actividad reciente:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = DashboardController;
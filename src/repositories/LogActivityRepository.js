const BaseRepository = require('./BaseRepository');

/**
 * LogActivityRepository - Repositorio para operaciones de log de actividades
 * Siguiendo principios SOLID:
 * - Single Responsibility: Maneja operaciones específicas de logs de actividad
 * - Open/Closed: Extiende BaseRepository sin modificarlo
 * - Liskov Substitution: Puede sustituir a BaseRepository
 * - Interface Segregation: Métodos específicos para logs de actividad
 * - Dependency Inversion: Depende de BaseRepository (abstracción)
 */
class LogActivityRepository extends BaseRepository {
  constructor() {
    super('logs_actividad');
  }

  /**
   * Registra una nueva actividad en el log
   */
  async logActivity(activityData) {
    const {
      usuario_id,
      accion,
      entidad_tipo,
      entidad_id = null,
      descripcion = null
      // Nota: datos_anteriores, datos_nuevos, ip_address y user_agent no están en la tabla actual (MVP)
    } = activityData;

    // Validar acciones válidas
    const validActions = ['crear', 'actualizar', 'eliminar', 'login', 'logout', 'asignar', 'completar', 'cancelar'];
    if (!validActions.includes(accion)) {
      throw new Error('Acción inválida');
    }

    // Validar tipos de entidad válidos
    const validEntityTypes = ['usuario', 'proyecto', 'tarea', 'archivo', 'rol'];
    if (!validEntityTypes.includes(entidad_tipo)) {
      throw new Error('Tipo de entidad inválido');
    }

    return await this.insert({
      usuario_id,
      accion,
      entidad_tipo,
      entidad_id,
      descripcion,
      user_agent,
      created_at: new Date()
    });
  }

  /**
   * Obtiene actividades por usuario con información relacionada
   * Principio de Responsabilidad Única: Solo obtiene actividades por usuario
   * Maneja casos donde el usuario fue eliminado
   */
  async getByUser(userId, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      const sanitizedLimit = Math.max(1, Math.min(parseInt(limit) || 50, 100));
      const sanitizedOffset = Math.max(0, parseInt(offset) || 0);
      
      const results = await this.raw(`
        SELECT 
          la.*,
          COALESCE(u.nombre, 'Usuario Eliminado') as usuario_nombre,
          COALESCE(u.email, 'eliminado@sistema') as usuario_email
        FROM logs_actividad la
        LEFT JOIN usuarios u ON la.usuario_id = u.id
        WHERE la.usuario_id = ?
        ORDER BY la.created_at DESC
        LIMIT ${sanitizedOffset}, ${sanitizedLimit}
      `, [userId]);
      
      return results;
    } catch (error) {
      console.error('Error in getByUser:', error);
      throw error;
    }
  }

  /**
   * Obtiene actividades por entidad específica
   * Principio de Responsabilidad Única: Solo obtiene actividades por entidad
   * Maneja casos donde el usuario fue eliminado o es NULL
   */
  async getByEntity(entidad_tipo, entidad_id, limit = 50, offset = 0) {
    const sanitizedLimit = Math.max(1, Math.min(parseInt(limit) || 50, 100));
    const sanitizedOffset = Math.max(0, parseInt(offset) || 0);
    
    return await this.raw(`
      SELECT 
        logs_actividad.*,
        COALESCE(usuarios.nombre, 'Sistema') as usuario_nombre,
        COALESCE(usuarios.email, 'sistema@interno') as usuario_email
      FROM logs_actividad
      LEFT JOIN usuarios ON logs_actividad.usuario_id = usuarios.id
      WHERE logs_actividad.entidad_tipo = ? AND logs_actividad.entidad_id = ?
      ORDER BY logs_actividad.created_at DESC
      LIMIT ${sanitizedOffset}, ${sanitizedLimit}
    `, [entidad_tipo, entidad_id]);
  }

  /**
   * Obtiene actividades por tipo de acción
   * Principio de Responsabilidad Única: Solo obtiene actividades por acción
   * Maneja casos donde el usuario fue eliminado o es NULL
   */
  async getByAction(accion, limit = 50, offset = 0) {
    const sanitizedLimit = Math.max(1, Math.min(parseInt(limit) || 50, 100));
    const sanitizedOffset = Math.max(0, parseInt(offset) || 0);
    
    return await this.raw(`
      SELECT 
        logs_actividad.*,
        COALESCE(usuarios.nombre, 'Sistema') as usuario_nombre,
        COALESCE(usuarios.email, 'sistema@interno') as usuario_email
      FROM logs_actividad
      LEFT JOIN usuarios ON logs_actividad.usuario_id = usuarios.id
      WHERE logs_actividad.accion = ?
      ORDER BY logs_actividad.created_at DESC
      LIMIT ${sanitizedOffset}, ${sanitizedLimit}
    `, [accion]);
  }

  /**
   * Obtiene actividades por rango de fechas
   * Principio de Responsabilidad Única: Solo obtiene actividades por rango de fechas
   * Maneja casos donde el usuario fue eliminado o es NULL
   */
  async getByDateRange(fecha_inicio, fecha_fin, limit = 50, offset = 0) {
    const sanitizedLimit = Math.max(1, Math.min(parseInt(limit) || 50, 100));
    const sanitizedOffset = Math.max(0, parseInt(offset) || 0);
    
    return await this.raw(`
      SELECT 
        logs_actividad.*,
        COALESCE(usuarios.nombre, 'Sistema') as usuario_nombre,
        COALESCE(usuarios.email, 'sistema@interno') as usuario_email
      FROM logs_actividad
      LEFT JOIN usuarios ON logs_actividad.usuario_id = usuarios.id
      WHERE logs_actividad.created_at BETWEEN ? AND ?
      ORDER BY logs_actividad.created_at DESC
      LIMIT ${sanitizedOffset}, ${sanitizedLimit}
    `, [fecha_inicio, fecha_fin]);
  }

  /**
   * Obtiene actividades recientes del sistema
   * Principio de Responsabilidad Única: Solo obtiene actividades recientes
   * Maneja casos donde el usuario fue eliminado o es NULL
   */
  async getRecentActivities(limit = 20) {
    // Validar y sanitizar limit para evitar SQL injection
    const sanitizedLimit = Math.max(1, Math.min(parseInt(limit) || 20, 1000));
    
    return await this.raw(`
      SELECT 
        logs_actividad.*,
        COALESCE(usuarios.nombre, 'Sistema') as usuario_nombre,
        COALESCE(usuarios.email, 'sistema@interno') as usuario_email
      FROM logs_actividad
      LEFT JOIN usuarios ON logs_actividad.usuario_id = usuarios.id
      ORDER BY logs_actividad.created_at DESC
      LIMIT ${sanitizedLimit}
    `, []);
  }

  /**
   * Obtiene estadísticas de actividad por usuario
   */
  async getUserActivityStats(usuario_id) {
    const stats = await this.raw(`
      SELECT 
        accion,
        COUNT(*) as total,
        DATE(created_at) as fecha
      FROM logs_actividad
      WHERE usuario_id = ?
      GROUP BY accion, DATE(created_at)
      ORDER BY fecha DESC
    `, [usuario_id]);

    const totalActivities = await this.raw(`
      SELECT COUNT(*) as total
      FROM logs_actividad
      WHERE usuario_id = ?
    `, [usuario_id]);

    const recentActivities = await this.raw(`
      SELECT COUNT(*) as total
      FROM logs_actividad
      WHERE usuario_id = ? 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `, [usuario_id]);

    return {
      stats,
      total: totalActivities[0].total,
      recent: recentActivities[0].total
    };
  }

  /**
   * Obtiene el historial de cambios de una entidad específica
   * Principio de Responsabilidad Única: Solo obtiene historial de entidad
   * Maneja casos donde el usuario fue eliminado o es NULL
   */
  async getEntityHistory(entidad_tipo, entidad_id, limit = 50, offset = 0) {
    const sanitizedLimit = Math.max(1, Math.min(parseInt(limit) || 50, 100));
    const sanitizedOffset = Math.max(0, parseInt(offset) || 0);
    
    return await this.raw(`
      SELECT 
        logs_actividad.*,
        COALESCE(usuarios.nombre, 'Sistema') as usuario_nombre,
        COALESCE(usuarios.email, 'sistema@interno') as usuario_email
      FROM logs_actividad
      LEFT JOIN usuarios ON logs_actividad.usuario_id = usuarios.id
      WHERE logs_actividad.entidad_tipo = ? AND logs_actividad.entidad_id = ?
      ORDER BY logs_actividad.created_at ASC
      LIMIT ${sanitizedOffset}, ${sanitizedLimit}
    `, [entidad_tipo, entidad_id]);
  }

  /**
   * Busca actividades por descripción
   * Principio de Responsabilidad Única: Solo busca actividades por descripción
   * Maneja casos donde el usuario fue eliminado o es NULL
   */
  async searchActivities(searchTerm, limit = 50, offset = 0) {
    const sanitizedLimit = Math.max(1, Math.min(parseInt(limit) || 50, 100));
    const sanitizedOffset = Math.max(0, parseInt(offset) || 0);
    
    return await this.raw(`
      SELECT 
        logs_actividad.*,
        COALESCE(usuarios.nombre, 'Sistema') as usuario_nombre,
        COALESCE(usuarios.email, 'sistema@interno') as usuario_email
      FROM logs_actividad
      LEFT JOIN usuarios ON logs_actividad.usuario_id = usuarios.id
      WHERE logs_actividad.descripcion LIKE ?
      ORDER BY logs_actividad.created_at DESC
      LIMIT ${sanitizedOffset}, ${sanitizedLimit}
    `, [`%${searchTerm}%`]);
  }

  /**
   * Obtiene actividades por IP
   * Principio de Responsabilidad Única: Solo obtiene actividades por IP
   * Maneja casos donde el usuario fue eliminado o es NULL
   */
  async getByIpAddress(ip_address, limit = 50, offset = 0) {
    const sanitizedLimit = Math.max(1, Math.min(parseInt(limit) || 50, 100));
    const sanitizedOffset = Math.max(0, parseInt(offset) || 0);
    
    return await this.raw(`
      SELECT 
        logs_actividad.*,
        COALESCE(usuarios.nombre, 'Sistema') as usuario_nombre,
        COALESCE(usuarios.email, 'sistema@interno') as usuario_email
      FROM logs_actividad
      LEFT JOIN usuarios ON logs_actividad.usuario_id = usuarios.id
      WHERE logs_actividad.ip_address = ?
      ORDER BY logs_actividad.created_at DESC
      LIMIT ${sanitizedOffset}, ${sanitizedLimit}
    `, [ip_address]);
  }

  /**
   * Obtiene resumen de actividades del sistema
   */
  async getActivitySummary() {
    const totalActivities = await this.raw(`
      SELECT COUNT(*) as total
      FROM logs_actividad
    `);

    const activitiesByAction = await this.raw(`
      SELECT 
        accion,
        COUNT(*) as total
      FROM logs_actividad
      GROUP BY accion
      ORDER BY total DESC
    `);

    const activitiesByEntity = await this.raw(`
      SELECT 
        entidad_tipo,
        COUNT(*) as total
      FROM logs_actividad
      GROUP BY entidad_tipo
      ORDER BY total DESC
    `);

    const recentActivities = await this.raw(`
      SELECT COUNT(*) as total
      FROM logs_actividad
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);

    const topUsers = await this.raw(`
      SELECT 
        u.nombre,
        u.email,
        COUNT(la.id) as total_activities
      FROM logs_actividad la
      LEFT JOIN usuarios u ON la.usuario_id = u.id
      GROUP BY la.usuario_id, u.nombre, u.email
      ORDER BY total_activities DESC
      LIMIT 10
    `);

    const activitiesByHour = await this.raw(`
      SELECT 
        HOUR(created_at) as hora,
        COUNT(*) as total
      FROM logs_actividad
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY HOUR(created_at)
      ORDER BY hora
    `);

    return {
      total: totalActivities[0].total,
      by_action: activitiesByAction,
      by_entity: activitiesByEntity,
      recent: recentActivities[0].total,
      top_users: topUsers,
      by_hour: activitiesByHour
    };
  }

  /**
   * Obtiene actividades en un rango de fechas
   * Principio de Responsabilidad Única: Solo obtiene actividades en rango de fechas
   * Maneja casos donde el usuario fue eliminado o es NULL
   */
  async getActivitiesInDateRange(startDate, endDate, usuario_id = null) {
    const baseQuery = `
      SELECT 
        logs_actividad.*,
        COALESCE(usuarios.nombre, 'Sistema') as usuario_nombre,
        COALESCE(usuarios.email, 'sistema@interno') as usuario_email
      FROM logs_actividad
      LEFT JOIN usuarios ON logs_actividad.usuario_id = usuarios.id
      WHERE logs_actividad.created_at BETWEEN ? AND ?
    `;
    
    if (usuario_id) {
      return await this.raw(`
        ${baseQuery}
        AND logs_actividad.usuario_id = ?
        ORDER BY logs_actividad.created_at ASC
      `, [startDate, endDate, usuario_id]);
    }
    
    return await this.raw(`
      ${baseQuery}
      ORDER BY logs_actividad.created_at ASC
    `, [startDate, endDate]);
  }

  /**
   * Registra un login
   */
  async logLogin(usuario_id, ip_address, user_agent) {
    return await this.logActivity({
      usuario_id,
      accion: 'login',
      entidad_tipo: 'usuario',
      entidad_id: usuario_id,
      descripcion: 'Usuario inició sesión',
      ip_address,
      user_agent
    });
  }

  /**
   * Registra un logout
   */
  async logLogout(usuario_id, ip_address) {
    return await this.logActivity({
      usuario_id,
      accion: 'logout',
      entidad_tipo: 'usuario',
      entidad_id: usuario_id,
      descripcion: 'Usuario cerró sesión',
      ip_address
    });
  }

  /**
   * Registra la creación de una entidad
   */
  async logCreate(usuario_id, entidad_tipo, entidad_id, datos_nuevos, ip_address = null) {
    return await this.logActivity({
      usuario_id,
      accion: 'crear',
      entidad_tipo,
      entidad_id,
      descripcion: `Se creó ${entidad_tipo} con ID ${entidad_id}`,
      datos_nuevos,
      ip_address
    });
  }

  /**
   * Registra la actualización de una entidad
   */
  async logUpdate(usuario_id, entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, ip_address = null) {
    return await this.logActivity({
      usuario_id,
      accion: 'actualizar',
      entidad_tipo,
      entidad_id,
      descripcion: `Se actualizó ${entidad_tipo} con ID ${entidad_id}`,
      datos_anteriores,
      datos_nuevos,
      ip_address
    });
  }

  /**
   * Registra la eliminación de una entidad
   */
  async logDelete(usuario_id, entidad_tipo, entidad_id, datos_anteriores, ip_address = null) {
    return await this.logActivity({
      usuario_id,
      accion: 'eliminar',
      entidad_tipo,
      entidad_id,
      descripcion: `Se eliminó ${entidad_tipo} con ID ${entidad_id}`,
      datos_anteriores,
      ip_address
    });
  }

  /**
   * Limpia logs antiguos
   */
  async cleanupOldLogs(daysOld = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await this.where('created_at', '<', cutoffDate).delete();
  }

  /**
   * Exporta logs para auditoría
   * Principio de Responsabilidad Única: Solo exporta logs para auditoría
   * Maneja casos donde el usuario fue eliminado o es NULL
   */
  async exportLogsForAudit(startDate, endDate, usuario_id = null) {
    const baseQuery = `
      SELECT 
        logs_actividad.*,
        COALESCE(usuarios.nombre, 'Sistema') as usuario_nombre,
        COALESCE(usuarios.email, 'sistema@interno') as usuario_email
      FROM logs_actividad
      LEFT JOIN usuarios ON logs_actividad.usuario_id = usuarios.id
      WHERE logs_actividad.created_at BETWEEN ? AND ?
    `;
    
    let logs;
    if (usuario_id) {
      logs = await this.raw(`
        ${baseQuery}
        AND logs_actividad.usuario_id = ?
        ORDER BY logs_actividad.created_at ASC
      `, [startDate, endDate, usuario_id]);
    } else {
      logs = await this.raw(`
        ${baseQuery}
        ORDER BY logs_actividad.created_at ASC
      `, [startDate, endDate]);
    }

    // Parsear los datos JSON para la exportación
    return logs.map(log => ({
      ...log,
      datos_anteriores: log.datos_anteriores ? JSON.parse(log.datos_anteriores) : null,
      datos_nuevos: log.datos_nuevos ? JSON.parse(log.datos_nuevos) : null
    }));
  }

  /**
   * Obtener estadísticas del sistema para un período de días
   * Principio de Responsabilidad Única: Solo obtiene estadísticas del sistema
   */
  async getSystemStats(days = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Total de actividades en el período
      const [totalResult] = await this.raw(`
        SELECT COUNT(*) as total
        FROM logs_actividad
        WHERE created_at >= ?
      `, [cutoffDate]);

      // Actividades por acción
      const byAction = await this.raw(`
        SELECT 
          accion,
          COUNT(*) as total
        FROM logs_actividad
        WHERE created_at >= ?
        GROUP BY accion
        ORDER BY total DESC
      `, [cutoffDate]);

      // Actividades por tipo de entidad
      const byEntity = await this.raw(`
        SELECT 
          entidad_tipo,
          COUNT(*) as total
        FROM logs_actividad
        WHERE created_at >= ?
        GROUP BY entidad_tipo
        ORDER BY total DESC
      `, [cutoffDate]);

      // Usuarios más activos
      const topUsers = await this.raw(`
        SELECT 
          COALESCE(u.nombre, 'Sistema') as usuario_nombre,
          COALESCE(u.email, 'sistema@interno') as usuario_email,
          COUNT(la.id) as total_activities
        FROM logs_actividad la
        LEFT JOIN usuarios u ON la.usuario_id = u.id
        WHERE la.created_at >= ?
        GROUP BY la.usuario_id, u.nombre, u.email
        ORDER BY total_activities DESC
        LIMIT 10
      `, [cutoffDate]);

      // Actividades por día
      const byDay = await this.raw(`
        SELECT 
          DATE(created_at) as fecha,
          COUNT(*) as total
        FROM logs_actividad
        WHERE created_at >= ?
        GROUP BY DATE(created_at)
        ORDER BY fecha DESC
      `, [cutoffDate]);

      return {
        period: {
          days,
          startDate: cutoffDate,
          endDate: new Date()
        },
        total: totalResult.total,
        byAction,
        byEntity,
        topUsers,
        byDay
      };
    } catch (error) {
      console.error('Error en getSystemStats:', error);
      throw error;
    }
  }
}

module.exports = LogActivityRepository;

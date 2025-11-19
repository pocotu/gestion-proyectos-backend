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
   */
  async getByUser(userId, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      
      const results = await this
        .select('la.*, u.nombre as usuario_nombre, u.email as usuario_email')
        .from('logs_actividad la')
        .leftJoin('usuarios u', 'la.usuario_id', 'u.id')
        .where('la.usuario_id', userId)
        .orderBy('la.created_at', 'DESC')
        .limit(limit, offset)
        .get();
      
      return results;
    } catch (error) {
      console.error('Error in getByUser:', error);
      throw error;
    }
  }

  /**
   * Obtiene actividades por entidad específica
   */
  async getByEntity(entidad_tipo, entidad_id, limit = 50, offset = 0) {
    const sanitizedLimit = Math.max(1, Math.min(parseInt(limit) || 50, 100));
    const sanitizedOffset = Math.max(0, parseInt(offset) || 0);
    
    return await this.raw(`
      SELECT 
        logs_actividad.*,
        usuarios.nombre as usuario_nombre,
        usuarios.email as usuario_email
      FROM logs_actividad
      LEFT JOIN usuarios ON logs_actividad.usuario_id = usuarios.id
      WHERE logs_actividad.entidad_tipo = ? AND logs_actividad.entidad_id = ?
      ORDER BY logs_actividad.created_at DESC
      LIMIT ${sanitizedOffset}, ${sanitizedLimit}
    `, [entidad_tipo, entidad_id]);
  }

  /**
   * Obtiene actividades por tipo de acción
   */
  async getByAction(accion, limit = 50, offset = 0) {
    return await this
      .select(`
        logs_actividad.*,
        usuarios.nombre as usuario_nombre,
        usuarios.email as usuario_email
      `)
      .leftJoin('usuarios', 'logs_actividad.usuario_id', 'usuarios.id')
      .where('logs_actividad.accion', accion)
      .orderBy('logs_actividad.created_at', 'DESC')
      .limit(limit, offset)
      .get();
  }

  /**
   * Obtiene actividades por rango de fechas
   */
  async getByDateRange(fecha_inicio, fecha_fin, limit = 50, offset = 0) {
    return await this
      .select(`
        logs_actividad.*,
        usuarios.nombre as usuario_nombre,
        usuarios.email as usuario_email
      `)
      .leftJoin('usuarios', 'logs_actividad.usuario_id', 'usuarios.id')
      .whereBetween('logs_actividad.created_at', fecha_inicio, fecha_fin)
      .orderBy('logs_actividad.created_at', 'DESC')
      .limit(limit, offset)
      .get();
  }

  /**
   * Obtiene actividades recientes del sistema
   */
  async getRecentActivities(limit = 20) {
    // Validar y sanitizar limit para evitar SQL injection
    const sanitizedLimit = Math.max(1, Math.min(parseInt(limit) || 20, 1000));
    
    return await this.raw(`
      SELECT 
        logs_actividad.*,
        usuarios.nombre as usuario_nombre,
        usuarios.email as usuario_email
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
   */
  async getEntityHistory(entidad_tipo, entidad_id, limit = 50, offset = 0) {
    const sanitizedLimit = Math.max(1, Math.min(parseInt(limit) || 50, 100));
    const sanitizedOffset = Math.max(0, parseInt(offset) || 0);
    
    return await this.raw(`
      SELECT 
        logs_actividad.*,
        usuarios.nombre as usuario_nombre,
        usuarios.email as usuario_email
      FROM logs_actividad
      LEFT JOIN usuarios ON logs_actividad.usuario_id = usuarios.id
      WHERE logs_actividad.entidad_tipo = ? AND logs_actividad.entidad_id = ?
      ORDER BY logs_actividad.created_at ASC
      LIMIT ${sanitizedOffset}, ${sanitizedLimit}
    `, [entidad_tipo, entidad_id]);
  }

  /**
   * Busca actividades por descripción
   */
  async searchActivities(searchTerm, limit = 50, offset = 0) {
    return await this
      .select(`
        logs_actividad.*,
        usuarios.nombre as usuario_nombre,
        usuarios.email as usuario_email
      `)
      .leftJoin('usuarios', 'logs_actividad.usuario_id', 'usuarios.id')
      .where('logs_actividad.descripcion', 'LIKE', `%${searchTerm}%`)
      .orderBy('logs_actividad.created_at', 'DESC')
      .limit(limit, offset)
      .get();
  }

  /**
   * Obtiene actividades por IP
   */
  async getByIpAddress(ip_address, limit = 50, offset = 0) {
    return await this
      .select(`
        logs_actividad.*,
        usuarios.nombre as usuario_nombre,
        usuarios.email as usuario_email
      `)
      .leftJoin('usuarios', 'logs_actividad.usuario_id', 'usuarios.id')
      .where('logs_actividad.ip_address', ip_address)
      .orderBy('logs_actividad.created_at', 'DESC')
      .limit(limit, offset)
      .get();
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
   */
  async getActivitiesInDateRange(startDate, endDate, usuario_id = null) {
    let query = this
      .select(`
        logs_actividad.*,
        usuarios.nombre as usuario_nombre,
        usuarios.email as usuario_email
      `)
      .leftJoin('usuarios', 'logs_actividad.usuario_id', 'usuarios.id')
      .whereBetween('logs_actividad.created_at', [startDate, endDate]);

    if (usuario_id) {
      query = query.where('logs_actividad.usuario_id', usuario_id);
    }

    return await query
      .orderBy('logs_actividad.created_at', 'ASC')
      .get();
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
   */
  async exportLogsForAudit(startDate, endDate, usuario_id = null) {
    let query = this
      .select(`
        logs_actividad.*,
        usuarios.nombre as usuario_nombre,
        usuarios.email as usuario_email
      `)
      .leftJoin('usuarios', 'logs_actividad.usuario_id', 'usuarios.id')
      .whereBetween('logs_actividad.created_at', [startDate, endDate]);

    if (usuario_id) {
      query = query.where('logs_actividad.usuario_id', usuario_id);
    }

    const logs = await query
      .orderBy('logs_actividad.created_at', 'ASC')
      .get();

    // Parsear los datos JSON para la exportación
    return logs.map(log => ({
      ...log,
      datos_anteriores: log.datos_anteriores ? JSON.parse(log.datos_anteriores) : null,
      datos_nuevos: log.datos_nuevos ? JSON.parse(log.datos_nuevos) : null
    }));
  }
}

module.exports = LogActivityRepository;

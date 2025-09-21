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
    super('log_actividades');
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
      descripcion = null,
      datos_anteriores = null,
      datos_nuevos = null,
      ip_address = null,
      user_agent = null
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
      datos_anteriores: datos_anteriores ? JSON.stringify(datos_anteriores) : null,
      datos_nuevos: datos_nuevos ? JSON.stringify(datos_nuevos) : null,
      ip_address,
      user_agent,
      created_at: new Date()
    });
  }

  /**
   * Obtiene actividades por usuario con información relacionada
   */
  async getByUser(usuario_id, limit = 50, offset = 0) {
    return await this
      .select(`
        log_actividades.*,
        usuarios.nombre as usuario_nombre,
        usuarios.email as usuario_email
      `)
      .leftJoin('usuarios', 'log_actividades.usuario_id', 'usuarios.id')
      .where('log_actividades.usuario_id', usuario_id)
      .orderBy('log_actividades.created_at', 'DESC')
      .limit(limit)
      .offset(offset)
      .get();
  }

  /**
   * Obtiene actividades por entidad específica
   */
  async getByEntity(entidad_tipo, entidad_id, limit = 50, offset = 0) {
    return await this
      .select(`
        log_actividades.*,
        usuarios.nombre as usuario_nombre,
        usuarios.email as usuario_email
      `)
      .leftJoin('usuarios', 'log_actividades.usuario_id', 'usuarios.id')
      .where('log_actividades.entidad_tipo', entidad_tipo)
      .where('log_actividades.entidad_id', entidad_id)
      .orderBy('log_actividades.created_at', 'DESC')
      .limit(limit)
      .offset(offset)
      .get();
  }

  /**
   * Obtiene actividades por tipo de acción
   */
  async getByAction(accion, limit = 50, offset = 0) {
    return await this
      .select(`
        log_actividades.*,
        usuarios.nombre as usuario_nombre,
        usuarios.email as usuario_email
      `)
      .leftJoin('usuarios', 'log_actividades.usuario_id', 'usuarios.id')
      .where('log_actividades.accion', accion)
      .orderBy('log_actividades.created_at', 'DESC')
      .limit(limit)
      .offset(offset)
      .get();
  }

  /**
   * Obtiene actividades por rango de fechas
   */
  async getByDateRange(fecha_inicio, fecha_fin, limit = 100, offset = 0) {
    return await this
      .select(`
        log_actividades.*,
        usuarios.nombre as usuario_nombre,
        usuarios.email as usuario_email
      `)
      .leftJoin('usuarios', 'log_actividades.usuario_id', 'usuarios.id')
      .whereBetween('log_actividades.created_at', [fecha_inicio, fecha_fin])
      .orderBy('log_actividades.created_at', 'DESC')
      .limit(limit)
      .offset(offset)
      .get();
  }

  /**
   * Obtiene resumen de actividades
   */
  async getActivitySummary(usuario_id = null, dias = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dias);

    let baseQuery = this.where('created_at', '>=', startDate);
    
    if (usuario_id) {
      baseQuery = baseQuery.where('usuario_id', usuario_id);
    }

    const totalActivities = await baseQuery.count();

    const byAction = await this.raw(`
      SELECT accion, COUNT(*) as count
      FROM log_actividades
      WHERE created_at >= ? ${usuario_id ? 'AND usuario_id = ?' : ''}
      GROUP BY accion
      ORDER BY count DESC
    `, usuario_id ? [startDate, usuario_id] : [startDate]);

    const byEntity = await this.raw(`
      SELECT entidad_tipo, COUNT(*) as count
      FROM log_actividades
      WHERE created_at >= ? ${usuario_id ? 'AND usuario_id = ?' : ''}
      GROUP BY entidad_tipo
      ORDER BY count DESC
    `, usuario_id ? [startDate, usuario_id] : [startDate]);

    const dailyActivity = await this.raw(`
      SELECT 
        DATE(created_at) as fecha,
        COUNT(*) as actividades
      FROM log_actividades
      WHERE created_at >= ? ${usuario_id ? 'AND usuario_id = ?' : ''}
      GROUP BY DATE(created_at)
      ORDER BY fecha DESC
    `, usuario_id ? [startDate, usuario_id] : [startDate]);

    return {
      totalActivities,
      byAction: byAction.reduce((acc, item) => {
        acc[item.accion] = item.count;
        return acc;
      }, {}),
      byEntity: byEntity.reduce((acc, item) => {
        acc[item.entidad_tipo] = item.count;
        return acc;
      }, {}),
      dailyActivity
    };
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
   * Registra la asignación de una entidad
   */
  async logAssign(usuario_id, entidad_tipo, entidad_id, descripcion, datos_nuevos = null, ip_address = null) {
    return await this.logActivity({
      usuario_id,
      accion: 'asignar',
      entidad_tipo,
      entidad_id,
      descripcion,
      datos_nuevos,
      ip_address
    });
  }

  /**
   * Registra la finalización de una entidad
   */
  async logComplete(usuario_id, entidad_tipo, entidad_id, descripcion, datos_nuevos = null, ip_address = null) {
    return await this.logActivity({
      usuario_id,
      accion: 'completar',
      entidad_tipo,
      entidad_id,
      descripcion,
      datos_nuevos,
      ip_address
    });
  }

  /**
   * Registra la cancelación de una entidad
   */
  async logCancel(usuario_id, entidad_tipo, entidad_id, descripcion, datos_nuevos = null, ip_address = null) {
    return await this.logActivity({
      usuario_id,
      accion: 'cancelar',
      entidad_tipo,
      entidad_id,
      descripcion,
      datos_nuevos,
      ip_address
    });
  }

  /**
   * Obtiene actividades recientes del sistema
   */
  async getRecentActivities(limit = 20) {
    return await this
      .select(`
        log_actividades.*,
        usuarios.nombre as usuario_nombre,
        usuarios.email as usuario_email
      `)
      .leftJoin('usuarios', 'log_actividades.usuario_id', 'usuarios.id')
      .orderBy('log_actividades.created_at', 'DESC')
      .limit(limit)
      .get();
  }

  /**
   * Obtiene estadísticas de actividad por usuario
   */
  async getUserActivityStats(usuario_id, dias = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dias);

    const totalActivities = await this
      .where('usuario_id', usuario_id)
      .where('created_at', '>=', startDate)
      .count();

    const byAction = await this.raw(`
      SELECT accion, COUNT(*) as count
      FROM log_actividades
      WHERE usuario_id = ? AND created_at >= ?
      GROUP BY accion
      ORDER BY count DESC
    `, [usuario_id, startDate]);

    const byEntity = await this.raw(`
      SELECT entidad_tipo, COUNT(*) as count
      FROM log_actividades
      WHERE usuario_id = ? AND created_at >= ?
      GROUP BY entidad_tipo
      ORDER BY count DESC
    `, [usuario_id, startDate]);

    const hourlyDistribution = await this.raw(`
      SELECT 
        HOUR(created_at) as hora,
        COUNT(*) as actividades
      FROM log_actividades
      WHERE usuario_id = ? AND created_at >= ?
      GROUP BY HOUR(created_at)
      ORDER BY hora
    `, [usuario_id, startDate]);

    const lastLogin = await this
      .where('usuario_id', usuario_id)
      .where('accion', 'login')
      .orderBy('created_at', 'DESC')
      .first();

    return {
      totalActivities,
      byAction: byAction.reduce((acc, item) => {
        acc[item.accion] = item.count;
        return acc;
      }, {}),
      byEntity: byEntity.reduce((acc, item) => {
        acc[item.entidad_tipo] = item.count;
        return acc;
      }, {}),
      hourlyDistribution,
      lastLogin: lastLogin ? lastLogin.created_at : null
    };
  }

  /**
   * Obtiene el historial de cambios de una entidad específica
   */
  async getEntityHistory(entidad_tipo, entidad_id) {
    const activities = await this
      .select(`
        log_actividades.*,
        usuarios.nombre as usuario_nombre,
        usuarios.email as usuario_email
      `)
      .leftJoin('usuarios', 'log_actividades.usuario_id', 'usuarios.id')
      .where('log_actividades.entidad_tipo', entidad_tipo)
      .where('log_actividades.entidad_id', entidad_id)
      .orderBy('log_actividades.created_at', 'ASC')
      .get();

    // Parsear los datos JSON
    return activities.map(activity => ({
      ...activity,
      datos_anteriores: activity.datos_anteriores ? JSON.parse(activity.datos_anteriores) : null,
      datos_nuevos: activity.datos_nuevos ? JSON.parse(activity.datos_nuevos) : null
    }));
  }

  /**
   * Busca actividades por descripción
   */
  async searchByDescription(searchTerm, limit = 50, offset = 0) {
    return await this
      .select(`
        log_actividades.*,
        usuarios.nombre as usuario_nombre,
        usuarios.email as usuario_email
      `)
      .leftJoin('usuarios', 'log_actividades.usuario_id', 'usuarios.id')
      .where('log_actividades.descripcion', 'LIKE', `%${searchTerm}%`)
      .orderBy('log_actividades.created_at', 'DESC')
      .limit(limit)
      .offset(offset)
      .get();
  }

  /**
   * Obtiene actividades por IP
   */
  async getByIpAddress(ip_address, limit = 50, offset = 0) {
    return await this
      .select(`
        log_actividades.*,
        usuarios.nombre as usuario_nombre,
        usuarios.email as usuario_email
      `)
      .leftJoin('usuarios', 'log_actividades.usuario_id', 'usuarios.id')
      .where('log_actividades.ip_address', ip_address)
      .orderBy('log_actividades.created_at', 'DESC')
      .limit(limit)
      .offset(offset)
      .get();
  }

  /**
   * Obtener estadísticas del sistema
   * @param {number} days - Días hacia atrás para las estadísticas
   * @returns {Promise<Object>} Estadísticas del sistema
   */
  async getSystemStats(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const query = `
        SELECT 
          accion,
          entidad_tipo,
          COUNT(*) as total,
          DATE(created_at) as fecha
        FROM logs_actividad 
        WHERE created_at >= ?
        GROUP BY accion, entidad_tipo, DATE(created_at)
        ORDER BY fecha DESC, total DESC
      `;

      const [rows] = await this.pool.execute(query, [startDate]);
      return rows;
    } catch (error) {
      console.error('Error getting system stats:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de actividad de un usuario específico
   * @param {number} userId - ID del usuario
   * @param {number} days - Días hacia atrás para las estadísticas
   * @returns {Promise<Object>} Estadísticas del usuario
   */
  async getUserActivityStats(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const query = `
        SELECT 
          accion,
          entidad_tipo,
          COUNT(*) as total,
          DATE(created_at) as fecha
        FROM logs_actividad 
        WHERE usuario_id = ? AND created_at >= ?
        GROUP BY accion, entidad_tipo, DATE(created_at)
        ORDER BY fecha DESC, total DESC
      `;

      const [rows] = await this.pool.execute(query, [userId, startDate]);
      return rows;
    } catch (error) {
      console.error('Error getting user activity stats:', error);
      throw error;
    }
  }

  /**
   * Obtener logs por rango de fechas
   * @param {Date} startDate - Fecha de inicio
   * @param {Date} endDate - Fecha de fin
   * @param {number} limit - Límite de resultados
   * @param {number} offset - Offset para paginación
   * @returns {Promise<Array>} Lista de logs
   */
  async getByDateRange(startDate, endDate, limit = 50, offset = 0) {
    try {
      const query = `
        SELECT 
          la.*,
          u.nombre as usuario_nombre,
          u.email as usuario_email
        FROM logs_actividad la
        LEFT JOIN usuarios u ON la.usuario_id = u.id
        WHERE la.created_at BETWEEN ? AND ?
        ORDER BY la.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const [rows] = await this.pool.execute(query, [startDate, endDate, limit, offset]);
      
      return rows.map(row => ({
        ...row,
        datos_anteriores: row.datos_anteriores ? JSON.parse(row.datos_anteriores) : null,
        datos_nuevos: row.datos_nuevos ? JSON.parse(row.datos_nuevos) : null
      }));
    } catch (error) {
      console.error('Error getting logs by date range:', error);
      throw error;
    }
  }

  /**
   * Obtener logs por acción específica
   * @param {string} action - Acción a filtrar
   * @param {number} limit - Límite de resultados
   * @param {number} offset - Offset para paginación
   * @returns {Promise<Array>} Lista de logs
   */
  async getByAction(action, limit = 50, offset = 0) {
    try {
      const query = `
        SELECT 
          la.*,
          u.nombre as usuario_nombre,
          u.email as usuario_email
        FROM logs_actividad la
        LEFT JOIN usuarios u ON la.usuario_id = u.id
        WHERE la.accion = ?
        ORDER BY la.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const [rows] = await this.pool.execute(query, [action, limit, offset]);
      
      return rows.map(row => ({
        ...row,
        datos_anteriores: row.datos_anteriores ? JSON.parse(row.datos_anteriores) : null,
        datos_nuevos: row.datos_nuevos ? JSON.parse(row.datos_nuevos) : null
      }));
    } catch (error) {
      console.error('Error getting logs by action:', error);
      throw error;
    }
  }

  /**
   * Exportar logs para auditoría
   * @param {Date} startDate - Fecha de inicio
   * @param {Date} endDate - Fecha de fin
   * @param {number|null} userId - ID del usuario (opcional)
   * @returns {Promise<Array>} Lista completa de logs para exportación
   */
  async exportLogsForAudit(startDate, endDate, userId = null) {
    try {
      let query = `
        SELECT 
          la.*,
          u.nombre as usuario_nombre,
          u.email as usuario_email
        FROM logs_actividad la
        LEFT JOIN usuarios u ON la.usuario_id = u.id
        WHERE la.created_at BETWEEN ? AND ?
      `;
      
      const params = [startDate, endDate];
      
      if (userId) {
        query += ' AND la.usuario_id = ?';
        params.push(userId);
      }
      
      query += ' ORDER BY la.created_at DESC';

      const [rows] = await this.pool.execute(query, params);
      
      return rows.map(row => ({
        ...row,
        datos_anteriores: row.datos_anteriores ? JSON.parse(row.datos_anteriores) : null,
        datos_nuevos: row.datos_nuevos ? JSON.parse(row.datos_nuevos) : null
      }));
    } catch (error) {
      console.error('Error exporting logs for audit:', error);
      throw error;
    }
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
   * Obtiene actividades sospechosas (múltiples intentos de login fallidos, etc.)
   */
  async getSuspiciousActivities(limit = 50) {
    // Múltiples logins desde diferentes IPs en poco tiempo
    const suspiciousLogins = await this.raw(`
      SELECT 
        usuario_id,
        COUNT(DISTINCT ip_address) as ips_diferentes,
        COUNT(*) as intentos_login,
        MIN(created_at) as primer_intento,
        MAX(created_at) as ultimo_intento
      FROM log_actividades
      WHERE accion = 'login' 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      GROUP BY usuario_id
      HAVING ips_diferentes > 3 OR intentos_login > 10
      ORDER BY intentos_login DESC
      LIMIT ?
    `, [limit]);

    // Actividades desde IPs con muchos usuarios diferentes
    const suspiciousIPs = await this.raw(`
      SELECT 
        ip_address,
        COUNT(DISTINCT usuario_id) as usuarios_diferentes,
        COUNT(*) as total_actividades
      FROM log_actividades
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND ip_address IS NOT NULL
      GROUP BY ip_address
      HAVING usuarios_diferentes > 5
      ORDER BY usuarios_diferentes DESC
      LIMIT ?
    `, [limit]);

    return {
      suspiciousLogins,
      suspiciousIPs
    };
  }

  /**
   * Obtiene el resumen de actividades de un proyecto
   */
  async getProjectActivitySummary(proyecto_id, dias = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dias);

    // Actividades directas del proyecto
    const projectActivities = await this
      .where('entidad_tipo', 'proyecto')
      .where('entidad_id', proyecto_id)
      .where('created_at', '>=', startDate)
      .count();

    // Actividades de tareas del proyecto
    const taskActivities = await this.raw(`
      SELECT COUNT(*) as count
      FROM log_actividades la
      INNER JOIN tareas t ON la.entidad_id = t.id
      WHERE la.entidad_tipo = 'tarea' 
        AND t.proyecto_id = ?
        AND la.created_at >= ?
    `, [proyecto_id, startDate]);

    // Usuarios más activos en el proyecto
    const activeUsers = await this.raw(`
      SELECT 
        u.nombre,
        u.email,
        COUNT(la.id) as actividades
      FROM log_actividades la
      INNER JOIN usuarios u ON la.usuario_id = u.id
      LEFT JOIN tareas t ON la.entidad_id = t.id AND la.entidad_tipo = 'tarea'
      WHERE (
        (la.entidad_tipo = 'proyecto' AND la.entidad_id = ?) OR
        (la.entidad_tipo = 'tarea' AND t.proyecto_id = ?)
      ) AND la.created_at >= ?
      GROUP BY la.usuario_id, u.nombre, u.email
      ORDER BY actividades DESC
      LIMIT 10
    `, [proyecto_id, proyecto_id, startDate]);

    return {
      projectActivities,
      taskActivities: taskActivities[0]?.count || 0,
      totalActivities: projectActivities + (taskActivities[0]?.count || 0),
      activeUsers
    };
  }

  /**
   * Exporta logs para auditoría
   */
  async exportLogsForAudit(startDate, endDate, usuario_id = null) {
    let query = this
      .select(`
        log_actividades.*,
        usuarios.nombre as usuario_nombre,
        usuarios.email as usuario_email
      `)
      .leftJoin('usuarios', 'log_actividades.usuario_id', 'usuarios.id')
      .whereBetween('log_actividades.created_at', [startDate, endDate]);

    if (usuario_id) {
      query = query.where('log_actividades.usuario_id', usuario_id);
    }

    const logs = await query
      .orderBy('log_actividades.created_at', 'ASC')
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
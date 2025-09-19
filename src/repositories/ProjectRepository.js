const BaseRepository = require('./BaseRepository');

/**
 * ProjectRepository - Repositorio para operaciones de proyectos
 * Siguiendo principios SOLID:
 * - Single Responsibility: Maneja operaciones específicas de proyectos
 * - Open/Closed: Extiende BaseRepository sin modificarlo
 * - Liskov Substitution: Puede sustituir a BaseRepository
 * - Interface Segregation: Métodos específicos para proyectos
 * - Dependency Inversion: Depende de BaseRepository (abstracción)
 */
class ProjectRepository extends BaseRepository {
  constructor() {
    super('proyectos');
  }

  /**
   * Busca un proyecto por ID
   */
  async findById(id) {
    return await this.where('id', id).first();
  }

  /**
   * Busca un proyecto por ID con información del creador
   */
  async findByIdWithCreator(id) {
    return await this
      .select('proyectos.*, usuarios.nombre as creador_nombre, usuarios.email as creador_email')
      .leftJoin('usuarios', 'proyectos.creado_por', 'usuarios.id')
      .where('proyectos.id', id)
      .first();
  }

  /**
   * Obtiene todos los proyectos ordenados por fecha de creación
   */
  async findAll() {
    return await this.orderBy('created_at', 'DESC').get();
  }

  /**
   * Busca proyectos por estado
   */
  async findByStatus(estado) {
    const validStates = ['planificacion', 'en_progreso', 'completado', 'cancelado'];
    if (!validStates.includes(estado)) {
      throw new Error('Estado inválido');
    }
    return await this.where('estado', estado).orderBy('created_at', 'DESC').get();
  }

  /**
   * Busca proyectos activos (no completados ni cancelados)
   */
  async findActive() {
    return await this
      .whereIn('estado', ['planificacion', 'en_progreso'])
      .orderBy('created_at', 'DESC')
      .get();
  }

  /**
   * Busca proyectos creados por un usuario específico
   */
  async findByCreator(creado_por) {
    return await this
      .where('creado_por', creado_por)
      .orderBy('created_at', 'DESC')
      .get();
  }

  /**
   * Busca un proyecto por título exacto
   */
  async findByTitle(titulo) {
    return await this
      .where('titulo', titulo)
      .first();
  }

  /**
   * Busca proyectos por título (búsqueda parcial)
   */
  async searchByTitle(titulo) {
    return await this
      .whereLike('titulo', `%${titulo}%`)
      .orderBy('created_at', 'DESC')
      .get();
  }

  /**
   * Buscar proyectos con filtros avanzados
   */
  async search(query = '', { limit = 10, offset = 0, userId = null, isAdmin = false } = {}) {
    let sql = `
      SELECT p.* 
      FROM proyectos p
    `;
    
    let whereConditions = [];
    let params = [];
    
    // Filtro por query de búsqueda
    if (query) {
      whereConditions.push('(p.titulo LIKE ? OR p.descripcion LIKE ?)');
      params.push(`%${query}%`, `%${query}%`);
    }
    
    // Si no es admin, filtrar por acceso del usuario
    if (!isAdmin && userId) {
      whereConditions.push(`(
        EXISTS (
          SELECT 1 FROM proyecto_responsables pr 
          WHERE pr.proyecto_id = p.id 
          AND pr.usuario_id = ? 
          AND pr.activo = true
        ) 
        OR EXISTS (
          SELECT 1 FROM tareas t 
          WHERE t.proyecto_id = p.id 
          AND t.asignado_a = ?
        )
      )`);
      params.push(userId, userId);
    }
    
    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    return await this.rawQuery(sql, params);
  }

  /**
   * Contar resultados de búsqueda
   */
  async countSearch(query = '', userId = null, isAdmin = false) {
    let sql = `
      SELECT COUNT(p.id) as count 
      FROM proyectos p
    `;
    
    let whereConditions = [];
    let params = [];
    
    // Filtro por query de búsqueda
    if (query) {
      whereConditions.push('(p.titulo LIKE ? OR p.descripcion LIKE ?)');
      params.push(`%${query}%`, `%${query}%`);
    }
    
    // Si no es admin, filtrar por acceso del usuario
    if (!isAdmin && userId) {
      whereConditions.push(`(
        EXISTS (
          SELECT 1 FROM proyecto_responsables pr 
          WHERE pr.proyecto_id = p.id 
          AND pr.usuario_id = ? 
          AND pr.activo = true
        ) 
        OR EXISTS (
          SELECT 1 FROM tareas t 
          WHERE t.proyecto_id = p.id 
          AND t.asignado_a = ?
        )
      )`);
      params.push(userId, userId);
    }
    
    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    return await this.rawCount(sql, params);
  }

  /**
   * Busca proyectos por rango de fechas de inicio
   */
  async findByStartDateRange(startDate, endDate) {
    return await this
      .whereBetween('fecha_inicio', startDate, endDate)
      .orderBy('fecha_inicio', 'ASC')
      .get();
  }

  /**
   * Busca proyectos por rango de fechas de fin
   */
  async findByEndDateRange(startDate, endDate) {
    return await this
      .whereBetween('fecha_fin', startDate, endDate)
      .orderBy('fecha_fin', 'ASC')
      .get();
  }

  /**
   * Busca proyectos con paginación y filtros
   */
  async findWithPagination(page = 1, limit = 10, filters = {}) {
    let query = this.select('proyectos.*, usuarios.nombre as creador_nombre')
      .leftJoin('usuarios', 'proyectos.creado_por', 'usuarios.id');

    // Aplicar filtros
    if (filters.estado) {
      query = query.where('proyectos.estado', filters.estado);
    }

    if (filters.creado_por) {
      query = query.where('proyectos.creado_por', filters.creado_por);
    }

    if (filters.titulo) {
      query = query.whereLike('proyectos.titulo', `%${filters.titulo}%`);
    }

    if (filters.fecha_inicio_desde) {
      query = query.where('proyectos.fecha_inicio', '>=', filters.fecha_inicio_desde);
    }

    if (filters.fecha_inicio_hasta) {
      query = query.where('proyectos.fecha_inicio', '<=', filters.fecha_inicio_hasta);
    }

    if (filters.fecha_fin_desde) {
      query = query.where('proyectos.fecha_fin', '>=', filters.fecha_fin_desde);
    }

    if (filters.fecha_fin_hasta) {
      query = query.where('proyectos.fecha_fin', '<=', filters.fecha_fin_hasta);
    }

    // Calcular offset
    const offset = (page - 1) * limit;

    // Obtener total de registros
    const totalQuery = this.select('COUNT(*) as total');
    if (filters.estado) {
      totalQuery.where('estado', filters.estado);
    }
    if (filters.creado_por) {
      totalQuery.where('creado_por', filters.creado_por);
    }
    if (filters.titulo) {
      totalQuery.whereLike('titulo', `%${filters.titulo}%`);
    }
    if (filters.fecha_inicio_desde) {
      totalQuery.where('fecha_inicio', '>=', filters.fecha_inicio_desde);
    }
    if (filters.fecha_inicio_hasta) {
      totalQuery.where('fecha_inicio', '<=', filters.fecha_inicio_hasta);
    }
    if (filters.fecha_fin_desde) {
      totalQuery.where('fecha_fin', '>=', filters.fecha_fin_desde);
    }
    if (filters.fecha_fin_hasta) {
      totalQuery.where('fecha_fin', '<=', filters.fecha_fin_hasta);
    }

    const totalResult = await totalQuery.first();
    const total = totalResult.total;

    // Obtener registros paginados
    const projects = await query
      .orderBy('proyectos.created_at', 'DESC')
      .limit(limit, offset)
      .get();

    return {
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Crea un nuevo proyecto
   */
  async create(projectData) {
    const { titulo, descripcion, fecha_inicio, fecha_fin, creado_por, estado } = projectData;

    const data = {
      titulo,
      descripcion: descripcion || null,
      fecha_inicio: fecha_inicio || null,
      fecha_fin: fecha_fin || null,
      creado_por: creado_por,
      estado: estado || 'planificacion',
      created_at: new Date(),
      updated_at: new Date()
    };

    console.log('ProjectRepository.create - datos a insertar:', data);
    return await this.insert(data);
  }

  /**
   * Actualiza un proyecto por ID
   */
  async updateById(id, projectData) {
    try {
      const updateData = { ...projectData };
      updateData.updated_at = new Date();

      // Usar el query builder del BaseRepository correctamente
      this.reset(); // Resetear el query builder
      const result = await this.where('id', id).update(updateData);
      
      if (result === 0) {
        throw new Error('Proyecto no encontrado');
      }
      
      // Retornar el proyecto actualizado
      return await this.findById(id);
    } catch (error) {
      console.error('Error en ProjectRepository.updateById:', error);
      throw error;
    }
  }

  /**
   * Cambia el estado de un proyecto
   */
  async changeStatus(id, estado) {
    const validStates = ['planificacion', 'en_progreso', 'completado', 'cancelado'];
    if (!validStates.includes(estado)) {
      throw new Error('Estado inválido');
    }

    return await this.where('id', id).update({
      estado,
      updated_at: new Date()
    });
  }

  /**
   * Marca un proyecto como completado
   */
  async complete(id) {
    return await this.changeStatus(id, 'completado');
  }

  /**
   * Marca un proyecto como cancelado
   */
  async cancel(id) {
    return await this.changeStatus(id, 'cancelado');
  }

  /**
   * Inicia un proyecto (cambia a en_progreso)
   */
  async start(id) {
    return await this.changeStatus(id, 'en_progreso');
  }

  /**
   * Elimina un proyecto por ID
   */
  async deleteById(id) {
    this.reset(); // Resetear el query builder
    return await this.where('id', id).delete();
  }

  /**
   * Obtiene estadísticas de proyectos
   */
  async getStatistics() {
    const total = await this.count();
    
    const byStatus = await this.raw(`
      SELECT estado, COUNT(*) as count
      FROM proyectos
      GROUP BY estado
    `);

    const byCreator = await this.raw(`
      SELECT u.nombre, COUNT(p.id) as project_count
      FROM usuarios u
      LEFT JOIN proyectos p ON u.id = p.creado_por
      GROUP BY u.id, u.nombre
      HAVING project_count > 0
      ORDER BY project_count DESC
      LIMIT 5
    `);

    const recentProjects = await this
      .select('titulo, estado, created_at')
      .orderBy('created_at', 'DESC')
      .limit(5)
      .get();

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.estado] = item.count;
        return acc;
      }, {}),
      topCreators: byCreator,
      recentProjects
    };
  }

  /**
   * Busca proyectos con sus responsables
   */
  async findWithResponsibles(projectId = null) {
    let query = this.raw(`
      SELECT p.*, 
             GROUP_CONCAT(CONCAT(u.nombre, ' (', pr.rol_responsabilidad, ')') SEPARATOR ', ') as responsables
      FROM proyectos p
      LEFT JOIN proyecto_responsables pr ON p.id = pr.proyecto_id AND pr.activo = TRUE
      LEFT JOIN usuarios u ON pr.usuario_id = u.id
      ${projectId ? 'WHERE p.id = ?' : ''}
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, projectId ? [projectId] : []);

    const results = await query;
    return projectId ? results[0] || null : results;
  }

  /**
   * Busca proyectos donde un usuario es responsable
   */
  async findByResponsible(userId, { limit = 10, offset = 0 } = {}) {
    try {
      console.log('🔍 [PROJECT-REPO] findByResponsible - userId:', userId, 'limit:', limit, 'offset:', offset);
      
      // Convertir a números para evitar problemas con MySQL
      const numericLimit = parseInt(limit, 10);
      const numericOffset = parseInt(offset, 10);
      const numericUserId = parseInt(userId, 10);
      
      console.log('🔍 [PROJECT-REPO] findByResponsible - Parámetros convertidos:', {
        userId: numericUserId,
        limit: numericLimit,
        offset: numericOffset
      });
      
      // Usar query sin prepared statements para LIMIT y OFFSET
      const query = `
        SELECT DISTINCT p.*, pr.rol_responsabilidad
        FROM proyectos p
        INNER JOIN proyecto_responsables pr ON p.id = pr.proyecto_id
        WHERE pr.usuario_id = ${numericUserId} AND pr.activo = TRUE
        ORDER BY p.created_at DESC
        LIMIT ${numericLimit} OFFSET ${numericOffset}
      `;
      
      console.log('🔍 [PROJECT-REPO] findByResponsible - Ejecutando query:', query);
      
      const result = await this.raw(query, []);
      
      console.log('🔍 [PROJECT-REPO] findByResponsible - Resultado:', result.length, 'proyectos encontrados');
      
      return result;
    } catch (error) {
      console.error('🔍 [PROJECT-REPO] findByResponsible - Error:', error.message);
      console.error('🔍 [PROJECT-REPO] findByResponsible - Stack:', error.stack);
      throw error;
    }
  }

  /**
   * Cuenta proyectos donde un usuario es responsable
   */
  async countByResponsible(userId) {
    try {
      const numericUserId = parseInt(userId, 10);
      
      const query = `
        SELECT COUNT(DISTINCT p.id) as total
        FROM proyectos p
        INNER JOIN proyecto_responsables pr ON p.id = pr.proyecto_id
        WHERE pr.usuario_id = ? AND pr.activo = TRUE
      `;
      
      const result = await this.raw(query, [numericUserId]);
      return result[0]?.total || 0;
    } catch (error) {
      console.error('Error contando proyectos por responsable:', error);
      throw error;
    }
  }

  /**
   * Busca proyectos próximos a vencer
   */
  async findUpcoming(days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await this
      .where('estado', 'en_progreso')
      .whereNotNull('fecha_fin')
      .where('fecha_fin', '<=', futureDate.toISOString().split('T')[0])
      .orderBy('fecha_fin', 'ASC')
      .get();
  }

  /**
   * Busca proyectos vencidos
   */
  async findOverdue() {
    const today = new Date().toISOString().split('T')[0];

    return await this
      .where('estado', 'en_progreso')
      .whereNotNull('fecha_fin')
      .where('fecha_fin', '<', today)
      .orderBy('fecha_fin', 'ASC')
      .get();
  }

  /**
   * Obtiene el progreso de un proyecto basado en sus tareas
   */
  async getProgress(projectId) {
    const result = await this.raw(`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as completed_tasks,
        ROUND((SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as progress_percentage
      FROM tareas
      WHERE proyecto_id = ?
    `, [projectId]);

    return result[0] || { total_tasks: 0, completed_tasks: 0, progress_percentage: 0 };
  }

  /**
   * Busca proyectos por rango de fechas de creación
   */
  async findByCreationDateRange(startDate, endDate) {
    return await this
      .whereBetween('created_at', startDate, endDate)
      .orderBy('created_at', 'DESC')
      .get();
  }

  /**
   * Cuenta proyectos por estado
   */
  async countByStatus() {
    const planificacion = await this.where('estado', 'planificacion').count();
    const en_progreso = await this.where('estado', 'en_progreso').count();
    const completado = await this.where('estado', 'completado').count();
    const cancelado = await this.where('estado', 'cancelado').count();

    return {
      planificacion,
      en_progreso,
      completado,
      cancelado,
      total: planificacion + en_progreso + completado + cancelado
    };
  }

  /**
   * Busca proyectos sin responsables asignados
   */
  async findWithoutResponsibles() {
    return await this.raw(`
      SELECT p.*
      FROM proyectos p
      LEFT JOIN proyecto_responsables pr ON p.id = pr.proyecto_id AND pr.activo = TRUE
      WHERE pr.proyecto_id IS NULL
      ORDER BY p.created_at DESC
    `);
  }

  /**
   * Verifica si un usuario tiene acceso a un proyecto específico
   * Un usuario tiene acceso si:
   * - Es el creador del proyecto
   * - Es responsable del proyecto
   */
  async hasUserAccess(projectId, userId) {
    try {
      // Verificar si es el creador
      const creatorCheck = await this
        .select('1')
        .where('id', projectId)
        .where('creado_por', userId)
        .first();
      
      if (creatorCheck) {
        return true;
      }

      // Verificar si es responsable del proyecto
      const responsibleCheck = await this.db('proyecto_responsables')
        .select('1')
        .where('proyecto_id', projectId)
        .where('usuario_id', userId)
        .where('activo', true)
        .first();

      return !!responsibleCheck;
    } catch (error) {
      console.error('Error en ProjectRepository.hasUserAccess:', error);
      return false;
    }
  }

  /**
   * Obtener estadísticas generales de proyectos
   */
  async getOverviewStats(userId = null, isAdmin = false) {
    try {
      const { pool } = require('../config/db');
      let baseQuery = 'SELECT COUNT(*) as count FROM proyectos';
      let whereClause = '';
      let params = [];
      
      if (!isAdmin && userId) {
        baseQuery = 'SELECT COUNT(DISTINCT proyectos.id) as count FROM proyectos LEFT JOIN proyecto_responsables ON proyectos.id = proyecto_responsables.proyecto_id';
        whereClause = ' WHERE proyecto_responsables.usuario_id = ? AND proyecto_responsables.activo = true';
        params = [userId];
      }

      const [total] = await pool.execute(baseQuery + whereClause, params);
      const [completados] = await pool.execute(baseQuery + whereClause + (whereClause ? ' AND' : ' WHERE') + ' proyectos.estado = ?', [...params, 'completado']);
      const [planificacion] = await pool.execute(baseQuery + whereClause + (whereClause ? ' AND' : ' WHERE') + ' proyectos.estado = ?', [...params, 'planificacion']);
      const [en_progreso] = await pool.execute(baseQuery + whereClause + (whereClause ? ' AND' : ' WHERE') + ' proyectos.estado = ?', [...params, 'en_progreso']);
      const [cancelados] = await pool.execute(baseQuery + whereClause + (whereClause ? ' AND' : ' WHERE') + ' proyectos.estado = ?', [...params, 'cancelado']);

      // Calculamos activos como la suma de planificacion + en_progreso
      const activos = parseInt(planificacion[0].count) + parseInt(en_progreso[0].count);

      return {
        total: parseInt(total[0].count) || 0,
        activos: activos || 0,
        completados: parseInt(completados[0].count) || 0,
        planificacion: parseInt(planificacion[0].count) || 0,
        en_progreso: parseInt(en_progreso[0].count) || 0,
        cancelados: parseInt(cancelados[0].count) || 0
      };
    } catch (error) {
      console.error('Error en ProjectRepository.getOverviewStats:', error);
      throw error;
    }
  }

  /**
   * Obtener proyectos recientes
   */
  async findRecent(userId = null, isAdmin = false, limit = 5) {
    try {
      const { pool } = require('../config/db');
      let query = 'SELECT proyectos.* FROM proyectos';
      let whereClause = '';
      let params = [];
      
      if (!isAdmin && userId) {
        query += ' LEFT JOIN proyecto_responsables ON proyectos.id = proyecto_responsables.proyecto_id';
        whereClause = ' WHERE proyecto_responsables.usuario_id = ? AND proyecto_responsables.activo = true';
        params = [userId];
      }

      query += whereClause + ' ORDER BY proyectos.fecha_creacion DESC LIMIT ?';
      params.push(limit);

      const [rows] = await pool.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Error en ProjectRepository.findRecent:', error);
      throw error;
    }
  }

  /**
   * Obtener tareas del proyecto
   */
  async getProjectTasks(projectId) {
    try {
      const { pool } = require('../config/db');
      const query = `
        SELECT 
          t.*,
          u.nombre as asignado_a_nombre,
          u.email as asignado_a_email
        FROM tareas t
        LEFT JOIN usuarios u ON t.asignado_a = u.id
        WHERE t.proyecto_id = ?
        ORDER BY t.fecha_creacion DESC
      `;
      
      const [rows] = await pool.execute(query, [projectId]);
      return rows;
    } catch (error) {
      console.error('Error en ProjectRepository.getProjectTasks:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas del proyecto
   */
  async getProjectStats(projectId) {
    try {
      const { pool } = require('../config/db');
      
      // Obtener estadísticas de tareas
      const taskStatsQuery = `
        SELECT 
          COUNT(*) as total_tareas,
          SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as tareas_completadas,
          SUM(CASE WHEN estado = 'en_progreso' THEN 1 ELSE 0 END) as tareas_en_progreso,
          SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as tareas_pendientes
        FROM tareas 
        WHERE proyecto_id = ?
      `;
      
      // Obtener estadísticas de responsables
      const responsibleStatsQuery = `
        SELECT COUNT(*) as total_responsables
        FROM proyecto_responsables 
        WHERE proyecto_id = ? AND activo = true
      `;
      
      const [taskStats] = await pool.execute(taskStatsQuery, [projectId]);
      const [responsibleStats] = await pool.execute(responsibleStatsQuery, [projectId]);
      
      const stats = {
        tareas: {
          total: parseInt(taskStats[0].total_tareas) || 0,
          completadas: parseInt(taskStats[0].tareas_completadas) || 0,
          en_progreso: parseInt(taskStats[0].tareas_en_progreso) || 0,
          pendientes: parseInt(taskStats[0].tareas_pendientes) || 0
        },
        responsables: {
          total: parseInt(responsibleStats[0].total_responsables) || 0
        }
      };
      
      // Calcular progreso
      if (stats.tareas.total > 0) {
        stats.progreso = Math.round((stats.tareas.completadas / stats.tareas.total) * 100);
      } else {
        stats.progreso = 0;
      }
      
      return stats;
    } catch (error) {
      console.error('Error en ProjectRepository.getProjectStats:', error);
      throw error;
    }
  }
}

module.exports = ProjectRepository;
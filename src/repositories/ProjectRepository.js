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
   * Busca proyectos por título (búsqueda parcial)
   */
  async findByTitle(titulo) {
    return await this
      .whereLike('titulo', `%${titulo}%`)
      .orderBy('created_at', 'DESC')
      .get();
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
    const { titulo, descripcion, fecha_inicio, fecha_fin, creado_por } = projectData;

    const data = {
      titulo,
      descripcion: descripcion || null,
      fecha_inicio: fecha_inicio || null,
      fecha_fin: fecha_fin || null,
      creado_por: creado_por || null,
      estado: 'planificacion',
      created_at: new Date(),
      updated_at: new Date()
    };

    return await this.insert(data);
  }

  /**
   * Actualiza un proyecto por ID
   */
  async updateById(id, projectData) {
    const updateData = { ...projectData };
    updateData.updated_at = new Date();

    return await this.where('id', id).update(updateData);
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
  async findByResponsible(userId) {
    return await this.raw(`
      SELECT DISTINCT p.*, pr.rol_responsabilidad
      FROM proyectos p
      INNER JOIN proyecto_responsables pr ON p.id = pr.proyecto_id
      WHERE pr.usuario_id = ? AND pr.activo = TRUE
      ORDER BY p.created_at DESC
    `, [userId]);
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
}

module.exports = ProjectRepository;
const BaseRepository = require('./BaseRepository');

/**
 * TaskRepository - Repositorio para operaciones de tareas
 * Siguiendo principios SOLID:
 * - Single Responsibility: Maneja operaciones específicas de tareas
 * - Open/Closed: Extiende BaseRepository sin modificarlo
 * - Liskov Substitution: Puede sustituir a BaseRepository
 * - Interface Segregation: Métodos específicos para tareas
 * - Dependency Inversion: Depende de BaseRepository (abstracción)
 */
class TaskRepository extends BaseRepository {
  constructor() {
    super('tareas');
  }

  /**
   * Crea una nueva tarea
   */
  async createTask(taskData) {
    const {
      proyecto_id,
      titulo,
      descripcion,
      estado = 'pendiente',
      prioridad = 'media',
      fecha_inicio,
      fecha_fin,
      fecha_limite,
      estimacion_horas,
      asignado_a,
      creado_por,
      padre_tarea_id = null,
      porcentaje_completado = 0
    } = taskData;

    // Validar estados y prioridades válidas
    const validStates = ['pendiente', 'en_progreso', 'en_revision', 'completada', 'cancelada'];
    const validPriorities = ['baja', 'media', 'alta', 'critica'];

    if (!validStates.includes(estado)) {
      throw new Error('Estado de tarea inválido');
    }

    if (!validPriorities.includes(prioridad)) {
      throw new Error('Prioridad de tarea inválida');
    }

    if (porcentaje_completado < 0 || porcentaje_completado > 100) {
      throw new Error('El porcentaje completado debe estar entre 0 y 100');
    }

    return await this.insert({
      proyecto_id,
      titulo,
      descripcion,
      estado,
      prioridad,
      fecha_inicio,
      fecha_fin,
      fecha_limite,
      estimacion_horas,
      horas_trabajadas: 0,
      asignado_a,
      creado_por,
      padre_tarea_id,
      porcentaje_completado,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  /**
   * Busca una tarea por ID con información relacionada
   */
  async findByIdWithDetails(id) {
    return await this
      .select(`
        tareas.*,
        proyectos.titulo as proyecto_titulo,
        asignado.nombre as asignado_nombre,
        asignado.email as asignado_email,
        creador.nombre as creador_nombre,
        padre.titulo as padre_titulo
      `)
      .leftJoin('proyectos', 'tareas.proyecto_id', 'proyectos.id')
      .leftJoin('usuarios as asignado', 'tareas.asignado_a', 'asignado.id')
      .leftJoin('usuarios as creador', 'tareas.creado_por', 'creador.id')
      .leftJoin('tareas as padre', 'tareas.padre_tarea_id', 'padre.id')
      .where('tareas.id', id)
      .first();
  }

  /**
   * Obtiene todas las tareas de un proyecto
   */
  async findByProject(proyecto_id, includeSubtasks = true) {
    let query = this
      .select(`
        tareas.*,
        asignado.nombre as asignado_nombre,
        asignado.email as asignado_email,
        creador.nombre as creador_nombre
      `)
      .leftJoin('usuarios as asignado', 'tareas.asignado_a', 'asignado.id')
      .leftJoin('usuarios as creador', 'tareas.creado_por', 'creador.id')
      .where('tareas.proyecto_id', proyecto_id);

    if (!includeSubtasks) {
      query = query.whereNull('tareas.padre_tarea_id');
    }

    return await query
      .orderBy('tareas.prioridad', 'DESC')
      .orderBy('tareas.fecha_limite', 'ASC')
      .get();
  }

  /**
   * Obtiene tareas asignadas a un usuario
   */
  async findByUser(usuario_id, estado = null) {
    let query = this
      .select(`
        tareas.*,
        proyectos.titulo as proyecto_titulo,
        creador.nombre as creador_nombre
      `)
      .join('proyectos', 'tareas.proyecto_id', 'proyectos.id')
      .leftJoin('usuarios as creador', 'tareas.creado_por', 'creador.id')
      .where('tareas.asignado_a', usuario_id);

    if (estado) {
      query = query.where('tareas.estado', estado);
    }

    return await query
      .orderBy('tareas.fecha_limite', 'ASC')
      .orderBy('tareas.prioridad', 'DESC')
      .get();
  }

  /**
   * Actualiza el estado de una tarea
   */
  async updateStatus(id, estado, porcentaje_completado = null) {
    const validStates = ['pendiente', 'en_progreso', 'en_revision', 'completada', 'cancelada'];
    if (!validStates.includes(estado)) {
      throw new Error('Estado de tarea inválido');
    }

    const updateData = {
      estado,
      updated_at: new Date()
    };

    if (porcentaje_completado !== null) {
      if (porcentaje_completado < 0 || porcentaje_completado > 100) {
        throw new Error('El porcentaje completado debe estar entre 0 y 100');
      }
      updateData.porcentaje_completado = porcentaje_completado;
    }

    // Si se marca como completada, establecer porcentaje al 100%
    if (estado === 'completada') {
      updateData.porcentaje_completado = 100;
    }

    return await this.where('id', id).update(updateData);
  }

  /**
   * Actualiza las horas trabajadas en una tarea
   */
  async updateHours(id, horas_trabajadas) {
    if (horas_trabajadas < 0) {
      throw new Error('Las horas trabajadas no pueden ser negativas');
    }

    return await this.where('id', id).update({
      horas_trabajadas,
      updated_at: new Date()
    });
  }

  /**
   * Incrementa las horas trabajadas en una tarea
   */
  async addHours(id, horas_adicionales) {
    if (horas_adicionales <= 0) {
      throw new Error('Las horas adicionales deben ser positivas');
    }

    return await this.raw(`
      UPDATE tareas 
      SET horas_trabajadas = horas_trabajadas + ?, updated_at = NOW()
      WHERE id = ?
    `, [horas_adicionales, id]);
  }

  /**
   * Obtiene subtareas de una tarea padre
   */
  async getSubtasks(padre_tarea_id) {
    return await this
      .select(`
        tareas.*,
        asignado.nombre as asignado_nombre,
        asignado.email as asignado_email
      `)
      .leftJoin('usuarios as asignado', 'tareas.asignado_a', 'asignado.id')
      .where('tareas.padre_tarea_id', padre_tarea_id)
      .orderBy('tareas.created_at', 'ASC')
      .get();
  }

  /**
   * Obtiene tareas principales (sin padre) de un proyecto
   */
  async getMainTasks(proyecto_id) {
    return await this
      .select(`
        tareas.*,
        asignado.nombre as asignado_nombre,
        asignado.email as asignado_email,
        creador.nombre as creador_nombre
      `)
      .leftJoin('usuarios as asignado', 'tareas.asignado_a', 'asignado.id')
      .leftJoin('usuarios as creador', 'tareas.creado_por', 'creador.id')
      .where('tareas.proyecto_id', proyecto_id)
      .whereNull('tareas.padre_tarea_id')
      .orderBy('tareas.prioridad', 'DESC')
      .orderBy('tareas.fecha_limite', 'ASC')
      .get();
  }

  /**
   * Asigna una tarea a un usuario
   */
  async assignTask(id, usuario_id) {
    return await this.where('id', id).update({
      asignado_a: usuario_id,
      updated_at: new Date()
    });
  }

  /**
   * Desasigna una tarea
   */
  async unassignTask(id) {
    return await this.where('id', id).update({
      asignado_a: null,
      updated_at: new Date()
    });
  }

  /**
   * Busca tareas por estado
   */
  async findByStatus(estado, proyecto_id = null) {
    let query = this
      .select(`
        tareas.*,
        proyectos.titulo as proyecto_titulo,
        asignado.nombre as asignado_nombre,
        asignado.email as asignado_email
      `)
      .join('proyectos', 'tareas.proyecto_id', 'proyectos.id')
      .leftJoin('usuarios as asignado', 'tareas.asignado_a', 'asignado.id')
      .where('tareas.estado', estado);

    if (proyecto_id) {
      query = query.where('tareas.proyecto_id', proyecto_id);
    }

    return await query
      .orderBy('tareas.fecha_limite', 'ASC')
      .orderBy('tareas.prioridad', 'DESC')
      .get();
  }

  /**
   * Busca tareas por prioridad
   */
  async findByPriority(prioridad, proyecto_id = null) {
    let query = this
      .select(`
        tareas.*,
        proyectos.titulo as proyecto_titulo,
        asignado.nombre as asignado_nombre,
        asignado.email as asignado_email
      `)
      .join('proyectos', 'tareas.proyecto_id', 'proyectos.id')
      .leftJoin('usuarios as asignado', 'tareas.asignado_a', 'asignado.id')
      .where('tareas.prioridad', prioridad);

    if (proyecto_id) {
      query = query.where('tareas.proyecto_id', proyecto_id);
    }

    return await query
      .orderBy('tareas.fecha_limite', 'ASC')
      .get();
  }

  /**
   * Obtiene tareas vencidas
   */
  async getOverdueTasks(proyecto_id = null) {
    let query = this
      .select(`
        tareas.*,
        proyectos.titulo as proyecto_titulo,
        asignado.nombre as asignado_nombre,
        asignado.email as asignado_email
      `)
      .join('proyectos', 'tareas.proyecto_id', 'proyectos.id')
      .leftJoin('usuarios as asignado', 'tareas.asignado_a', 'asignado.id')
      .where('tareas.fecha_limite', '<', new Date())
      .whereNotIn('tareas.estado', ['completada', 'cancelada']);

    if (proyecto_id) {
      query = query.where('tareas.proyecto_id', proyecto_id);
    }

    return await query
      .orderBy('tareas.fecha_limite', 'ASC')
      .get();
  }

  /**
   * Obtiene tareas que vencen pronto
   */
  async getTasksDueSoon(days = 7, proyecto_id = null) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    let query = this
      .select(`
        tareas.*,
        proyectos.titulo as proyecto_titulo,
        asignado.nombre as asignado_nombre,
        asignado.email as asignado_email
      `)
      .join('proyectos', 'tareas.proyecto_id', 'proyectos.id')
      .leftJoin('usuarios as asignado', 'tareas.asignado_a', 'asignado.id')
      .whereBetween('tareas.fecha_limite', [new Date(), futureDate])
      .whereNotIn('tareas.estado', ['completada', 'cancelada']);

    if (proyecto_id) {
      query = query.where('tareas.proyecto_id', proyecto_id);
    }

    return await query
      .orderBy('tareas.fecha_limite', 'ASC')
      .get();
  }

  /**
   * Obtiene estadísticas de tareas de un proyecto
   */
  async getProjectTaskStats(proyecto_id) {
    const totalTasks = await this.where('proyecto_id', proyecto_id).count();
    
    const byStatus = await this.raw(`
      SELECT estado, COUNT(*) as count
      FROM tareas
      WHERE proyecto_id = ?
      GROUP BY estado
    `, [proyecto_id]);

    const byPriority = await this.raw(`
      SELECT prioridad, COUNT(*) as count
      FROM tareas
      WHERE proyecto_id = ?
      GROUP BY prioridad
    `, [proyecto_id]);

    const completionStats = await this.raw(`
      SELECT 
        AVG(porcentaje_completado) as avg_completion,
        SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as completed_count,
        SUM(estimacion_horas) as total_estimated_hours,
        SUM(horas_trabajadas) as total_worked_hours
      FROM tareas
      WHERE proyecto_id = ?
    `, [proyecto_id]);

    const overdueTasks = await this
      .where('proyecto_id', proyecto_id)
      .where('fecha_limite', '<', new Date())
      .whereNotIn('estado', ['completada', 'cancelada'])
      .count();

    return {
      totalTasks,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.estado] = item.count;
        return acc;
      }, {}),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.prioridad] = item.count;
        return acc;
      }, {}),
      averageCompletion: completionStats[0]?.avg_completion || 0,
      completedTasks: completionStats[0]?.completed_count || 0,
      totalEstimatedHours: completionStats[0]?.total_estimated_hours || 0,
      totalWorkedHours: completionStats[0]?.total_worked_hours || 0,
      overdueTasks
    };
  }

  /**
   * Obtiene estadísticas de tareas de un usuario
   */
  async getUserTaskStats(usuario_id) {
    const totalAssigned = await this.where('asignado_a', usuario_id).count();
    
    const byStatus = await this.raw(`
      SELECT estado, COUNT(*) as count
      FROM tareas
      WHERE asignado_a = ?
      GROUP BY estado
    `, [usuario_id]);

    const workloadStats = await this.raw(`
      SELECT 
        SUM(estimacion_horas) as total_estimated_hours,
        SUM(horas_trabajadas) as total_worked_hours,
        AVG(porcentaje_completado) as avg_completion
      FROM tareas
      WHERE asignado_a = ? AND estado NOT IN ('completada', 'cancelada')
    `, [usuario_id]);

    const overdueTasks = await this
      .where('asignado_a', usuario_id)
      .where('fecha_limite', '<', new Date())
      .whereNotIn('estado', ['completada', 'cancelada'])
      .count();

    return {
      totalAssignedTasks: totalAssigned,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.estado] = item.count;
        return acc;
      }, {}),
      totalEstimatedHours: workloadStats[0]?.total_estimated_hours || 0,
      totalWorkedHours: workloadStats[0]?.total_worked_hours || 0,
      averageCompletion: workloadStats[0]?.avg_completion || 0,
      overdueTasks
    };
  }

  /**
   * Busca tareas por texto en título o descripción
   */
  async searchTasks(searchTerm, proyecto_id = null) {
    let query = this
      .select(`
        tareas.*,
        proyectos.titulo as proyecto_titulo,
        asignado.nombre as asignado_nombre,
        asignado.email as asignado_email
      `)
      .join('proyectos', 'tareas.proyecto_id', 'proyectos.id')
      .leftJoin('usuarios as asignado', 'tareas.asignado_a', 'asignado.id')
      .where(function() {
        this.where('tareas.titulo', 'LIKE', `%${searchTerm}%`)
            .orWhere('tareas.descripcion', 'LIKE', `%${searchTerm}%`);
      });

    if (proyecto_id) {
      query = query.where('tareas.proyecto_id', proyecto_id);
    }

    return await query
      .orderBy('tareas.created_at', 'DESC')
      .get();
  }

  /**
   * Clona una tarea
   */
  async cloneTask(id, newData = {}) {
    const originalTask = await this.findById(id);
    if (!originalTask) {
      throw new Error('Tarea no encontrada');
    }

    const clonedTaskData = {
      ...originalTask,
      titulo: newData.titulo || `${originalTask.titulo} (Copia)`,
      descripcion: newData.descripcion || originalTask.descripcion,
      estado: newData.estado || 'pendiente',
      porcentaje_completado: 0,
      horas_trabajadas: 0,
      asignado_a: newData.asignado_a || null,
      padre_tarea_id: newData.padre_tarea_id || originalTask.padre_tarea_id,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Remover campos que no deben clonarse
    delete clonedTaskData.id;

    return await this.insert(clonedTaskData);
  }

  /**
   * Mueve una tarea a otro proyecto
   */
  async moveTaskToProject(id, nuevo_proyecto_id) {
    return await this.where('id', id).update({
      proyecto_id: nuevo_proyecto_id,
      updated_at: new Date()
    });
  }

  /**
   * Obtiene el progreso general de un proyecto basado en sus tareas
   */
  async getProjectProgress(proyecto_id) {
    const result = await this.raw(`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as completed_tasks,
        AVG(porcentaje_completado) as avg_completion,
        SUM(estimacion_horas) as total_estimated_hours,
        SUM(horas_trabajadas) as total_worked_hours
      FROM tareas
      WHERE proyecto_id = ?
    `, [proyecto_id]);

    const stats = result[0];
    const completionPercentage = stats.total_tasks > 0 
      ? (stats.completed_tasks / stats.total_tasks) * 100 
      : 0;

    return {
      totalTasks: stats.total_tasks,
      completedTasks: stats.completed_tasks,
      completionPercentage: Math.round(completionPercentage * 100) / 100,
      averageTaskCompletion: Math.round(stats.avg_completion * 100) / 100,
      totalEstimatedHours: stats.total_estimated_hours || 0,
      totalWorkedHours: stats.total_worked_hours || 0,
      hoursEfficiency: stats.total_estimated_hours > 0 
        ? Math.round((stats.total_worked_hours / stats.total_estimated_hours) * 100 * 100) / 100
        : 0
    };
  }

  /**
   * Actualiza múltiples tareas en lote
   */
  async bulkUpdateTasks(taskIds, updateData) {
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      throw new Error('Se requiere un array de IDs de tareas');
    }

    const allowedFields = ['estado', 'prioridad', 'asignado_a', 'fecha_limite', 'porcentaje_completado'];
    const filteredData = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    filteredData.updated_at = new Date();

    return await this.whereIn('id', taskIds).update(filteredData);
  }

  /**
   * Elimina tareas completadas antiguas
   */
  async cleanupOldCompletedTasks(daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await this
      .where('estado', 'completada')
      .where('updated_at', '<', cutoffDate)
      .delete();
  }
}

module.exports = TaskRepository;
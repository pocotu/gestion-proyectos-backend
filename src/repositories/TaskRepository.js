const BaseRepository = require('./BaseRepository');
const { pool } = require('../config/db');

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
      usuario_asignado_id,
      creado_por
    } = taskData;

    // Validar estados y prioridades válidas
    const validStates = ['pendiente', 'en_progreso', 'completada', 'cancelada'];
    const validPriorities = ['baja', 'media', 'alta']; // Sincronizado con TaskController

    if (!validStates.includes(estado)) {
      throw new Error('Estado de tarea inválido');
    }

    if (!validPriorities.includes(prioridad)) {
      throw new Error('Prioridad de tarea inválida');
    }

    return await this.insert({
      proyecto_id,
      titulo,
      descripcion,
      estado,
      prioridad,
      fecha_inicio,
      fecha_fin,
      usuario_asignado_id: usuario_asignado_id || null,
      creado_por,
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
      .leftJoin('usuarios as asignado', 'tareas.usuario_asignado_id', 'asignado.id')
      .leftJoin('usuarios as creador', 'tareas.creado_por', 'creador.id')
      .leftJoin('tareas as padre', 'tareas.padre_tarea_id', 'padre.id')
      .where('tareas.id', id)
      .first();
  }

  /**
   * Obtiene todas las tareas con filtros y paginación
   */
  async findAll(options = {}) {
    const { limit = 10, offset = 0, filters = {}, userId, isAdmin } = options;
    
    try {
      // Usar el query builder del BaseRepository
      let query = this.select('*');
  
      // Aplicar filtros básicos
      if (filters.estado) {
        query = query.where('estado', filters.estado);
      }
      
      if (filters.prioridad) {
        query = query.where('prioridad', filters.prioridad);
      }
      
      if (filters.proyecto_id) {
        query = query.where('proyecto_id', filters.proyecto_id);
      }
  
      // Si no es admin, filtrar por acceso del usuario
      if (!isAdmin && userId) {
        query = query.where('usuario_asignado_id', userId);
      }
  
      query = query.orderBy('created_at', 'DESC');
      
      if (limit) {
        query = query.limit(limit);
        if (offset) {
          query = query.offset(offset);
        }
      }
  
      const rows = await query.get();
      
      return rows;
    } catch (error) {
      console.error('Error en TaskRepository.findAll:', error);
      throw error;
    }
  }

  /**
   * Cuenta el total de tareas con filtros
   */
  async count(options = {}) {
    const { filters = {}, userId, isAdmin } = options;
    
    try {
      // Usar el query builder del BaseRepository para count
      let query = this.select('COUNT(*) as total');
  
      // Aplicar filtros básicos
      if (filters.estado) {
        query = query.where('estado', filters.estado);
      }
      
      if (filters.prioridad) {
        query = query.where('prioridad', filters.prioridad);
      }
      
      if (filters.proyecto_id) {
        query = query.where('proyecto_id', filters.proyecto_id);
      }
  
      // Si no es admin, filtrar por acceso del usuario
      if (!isAdmin && userId) {
        query = query.where('usuario_asignado_id', userId);
      }
  
      const result = await query.first();
      const total = result?.total || 0;
  
      return total;
    } catch (error) {
      console.error('Error en TaskRepository.count:', error);
      throw error;
    }
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
      .leftJoin('usuarios as asignado', 'tareas.usuario_asignado_id', 'asignado.id')
      .leftJoin('usuarios as creador', 'tareas.creado_por', 'creador.id')
      .where('tareas.proyecto_id', proyecto_id);

    if (!includeSubtasks) {
      query = query.whereNull('tareas.padre_tarea_id');
    }

    return await query
      .orderBy('tareas.prioridad', 'DESC')
      .orderBy('tareas.fecha_fin', 'ASC')
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
      .where('tareas.usuario_asignado_id', usuario_id);

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
      .leftJoin('usuarios as asignado', 'tareas.usuario_asignado_id', 'asignado.id')
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
      .leftJoin('usuarios as asignado', 'tareas.usuario_asignado_id', 'asignado.id')
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
      usuario_asignado_id: usuario_id,
      updated_at: new Date()
    });
  }

  /**
   * Desasigna una tarea
   */
  async unassignTask(id) {
    return await this.where('id', id).update({
      usuario_asignado_id: null,
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
      .leftJoin('usuarios as asignado', 'tareas.usuario_asignado_id', 'asignado.id')
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
      .leftJoin('usuarios as asignado', 'tareas.usuario_asignado_id', 'asignado.id')
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
      .leftJoin('usuarios as asignado', 'tareas.usuario_asignado_id', 'asignado.id')
      .where('tareas.fecha_fin', '<', new Date())
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
      .leftJoin('usuarios as asignado', 'tareas.usuario_asignado_id', 'asignado.id')
      .whereBetween('tareas.fecha_fin', [new Date(), futureDate])
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
        SUM(horas_trabajadas) as total_worked_hours
      FROM tareas
      WHERE proyecto_id = ?
    `, [proyecto_id]);

    const overdueTasks = await this
      .where('proyecto_id', proyecto_id)
      .where('fecha_fin', '<', new Date())
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
      totalEstimatedHours: 0, // Campo removido de la base de datos
      totalWorkedHours: completionStats[0]?.total_worked_hours || 0,
      overdueTasks
    };
  }

  /**
   * Obtiene estadísticas de tareas de un usuario
   */
  async getUserTaskStats(usuario_id) {
    const totalAssigned = await this.where('usuario_asignado_id', usuario_id).count();
    
    const byStatus = await this.raw(`
      SELECT estado, COUNT(*) as count
      FROM tareas
      WHERE usuario_asignado_id = ?
      GROUP BY estado
    `, [usuario_id]);

    const workloadStats = await this.raw(`
      SELECT 
        SUM(horas_trabajadas) as total_worked_hours,
        AVG(porcentaje_completado) as avg_completion
      FROM tareas
      WHERE usuario_asignado_id = ? AND estado NOT IN ('completada', 'cancelada')
    `, [usuario_id]);

    const overdueTasks = await this
      .where('usuario_asignado_id', usuario_id)
      .where('fecha_fin', '<', new Date())
      .whereNotIn('estado', ['completada', 'cancelada'])
      .count();

    return {
      totalAssignedTasks: totalAssigned,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.estado] = item.count;
        return acc;
      }, {}),
      totalEstimatedHours: 0, // Campo removido de la base de datos
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
      .leftJoin('usuarios as asignado', 'tareas.usuario_asignado_id', 'asignado.id')
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
      usuario_asignado_id: newData.usuario_asignado_id || null,
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
      totalEstimatedHours: 0, // Campo removido de la base de datos
      totalWorkedHours: stats.total_worked_hours || 0,
      hoursEfficiency: 0 // Sin horas estimadas, no se puede calcular eficiencia
    };
  }

  /**
   * Actualiza múltiples tareas en lote
   */
  async bulkUpdateTasks(taskIds, updateData) {
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      throw new Error('Se requiere un array de IDs de tareas');
    }

    const allowedFields = [
      'titulo', 'descripcion', 'estado', 'prioridad', 'fecha_inicio', 'fecha_fin',
      'usuario_asignado_id', 'padre_tarea_id', 'porcentaje_completado'
    ];
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

  /**
   * Eliminar tarea por ID
   */
  async deleteById(id) {
    this.reset(); // Resetear el query builder
    return await this.where('id', id).delete();
  }

  /**
   * Verificar si un proyecto existe
   */
  async projectExists(proyecto_id) {
    const query = 'SELECT COUNT(*) as count FROM proyectos WHERE id = ?';
    const result = await this.db.query(query, [proyecto_id]);
    const exists = result.rows[0].count > 0;
    return exists;
  }

  /**
   * Verificar si un usuario existe
   */
  async userExists(usuario_id) {
    const query = 'SELECT COUNT(*) as count FROM usuarios WHERE id = ?';
    const result = await this.db.query(query, [usuario_id]);
    const exists = result.rows[0].count > 0;
    return exists;
  }

  /**
   * Verifica si un usuario tiene acceso a una tarea específica
   * Un usuario tiene acceso si:
   * - Es el usuario asignado a la tarea
   * - Es el creador de la tarea
   * - Es responsable del proyecto al que pertenece la tarea
   */
  async hasUserAccess(taskId, userId) {
    try {
      // Verificar si es el usuario asignado o el creador
      const taskCheck = await this.raw(
        'SELECT 1 FROM tareas WHERE id = ? AND (usuario_asignado_id = ? OR creado_por = ?) LIMIT 1',
        [taskId, userId, userId]
      );
      
      if (taskCheck.length > 0) {
        return true;
      }

      // Verificar si es responsable del proyecto
      const projectCheck = await this.raw(
        `SELECT 1 FROM tareas t 
         JOIN proyecto_responsables pr ON t.proyecto_id = pr.proyecto_id 
         WHERE t.id = ? AND pr.usuario_id = ? AND pr.activo = 1 LIMIT 1`,
        [taskId, userId]
      );

      return projectCheck.length > 0;
    } catch (error) {
      console.error('Error en TaskRepository.hasUserAccess:', error);
      return false;
    }
  }



  /**
   * Actualizar una tarea por ID
   */
  async updateTask(id, taskData) {
    try {
      console.log('TaskRepository.updateTask - Iniciando actualización:', { id, taskData });
      
      const updateData = { ...taskData };
      updateData.updated_at = new Date();
      
      console.log('TaskRepository.updateTask - Datos a actualizar:', updateData);
  
      // Usar el query builder del BaseRepository correctamente
      this.reset(); // Resetear el query builder
      const result = await this.where('id', id).update(updateData);
      
      console.log('TaskRepository.updateTask - Resultado de update:', result);
      
      if (result === 0) {
        throw new Error('Tarea no encontrada');
      }
      
      // Retornar la tarea actualizada
      const updatedTask = await this.findById(id);
      console.log('TaskRepository.updateTask - Tarea actualizada obtenida:', updatedTask);
      
      return updatedTask;
    } catch (error) {
      console.error('Error en TaskRepository.updateTask:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de tareas
   */
  async getStatistics(userId = null, isAdmin = false) {
    try {
      const { pool } = require('../config/db');
      let baseQuery = 'SELECT COUNT(*) as count FROM tareas';
      let whereClause = '';
      let params = [];
      
      if (!isAdmin && userId) {
        whereClause = ' WHERE usuario_asignado_id = ?';
        params = [userId];
      }

      const [total] = await pool.execute(baseQuery + whereClause, params);
      const [pendientes] = await pool.execute(baseQuery + whereClause + (whereClause ? ' AND' : ' WHERE') + ' estado = ?', [...params, 'pendiente']);
      const [en_progreso] = await pool.execute(baseQuery + whereClause + (whereClause ? ' AND' : ' WHERE') + ' estado = ?', [...params, 'en_progreso']);
      const [en_revision] = await pool.execute(baseQuery + whereClause + (whereClause ? ' AND' : ' WHERE') + ' estado = ?', [...params, 'en_revision']);
      const [completadas] = await pool.execute(baseQuery + whereClause + (whereClause ? ' AND' : ' WHERE') + ' estado = ?', [...params, 'completada']);
      const [canceladas] = await pool.execute(baseQuery + whereClause + (whereClause ? ' AND' : ' WHERE') + ' estado = ?', [...params, 'cancelada']);
      const [alta] = await pool.execute(baseQuery + whereClause + (whereClause ? ' AND' : ' WHERE') + ' prioridad = ?', [...params, 'alta']);
      const [media] = await pool.execute(baseQuery + whereClause + (whereClause ? ' AND' : ' WHERE') + ' prioridad = ?', [...params, 'media']);
      const [baja] = await pool.execute(baseQuery + whereClause + (whereClause ? ' AND' : ' WHERE') + ' prioridad = ?', [...params, 'baja']);

      return {
        total: parseInt(total[0].count) || 0,
        pendientes: parseInt(pendientes[0].count) || 0,
        en_progreso: parseInt(en_progreso[0].count) || 0,
        en_revision: parseInt(en_revision[0].count) || 0,
        completadas: parseInt(completadas[0].count) || 0,
        canceladas: parseInt(canceladas[0].count) || 0,
        alta: parseInt(alta[0].count) || 0,
        media: parseInt(media[0].count) || 0,
        baja: parseInt(baja[0].count) || 0
      };
    } catch (error) {
      console.error('Error en TaskRepository.getStatistics:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas generales de tareas para el dashboard
   */
  async getOverviewStats(userId = null, isAdmin = false) {
    try {
      const { pool } = require('../config/db');
      let baseQuery = 'SELECT COUNT(*) as count FROM tareas';
      let whereClause = '';
      let params = [];
      
      if (!isAdmin && userId) {
        whereClause = ' WHERE usuario_asignado_id = ?';
        params = [userId];
      }

      const [total] = await pool.execute(baseQuery + whereClause, params);
      const [pendientes] = await pool.execute(baseQuery + whereClause + (whereClause ? ' AND' : ' WHERE') + ' estado = ?', [...params, 'pendiente']);
      const [en_progreso] = await pool.execute(baseQuery + whereClause + (whereClause ? ' AND' : ' WHERE') + ' estado = ?', [...params, 'en_progreso']);
      const [en_revision] = await pool.execute(baseQuery + whereClause + (whereClause ? ' AND' : ' WHERE') + ' estado = ?', [...params, 'en_revision']);
      const [completadas] = await pool.execute(baseQuery + whereClause + (whereClause ? ' AND' : ' WHERE') + ' estado = ?', [...params, 'completada']);
      const [canceladas] = await pool.execute(baseQuery + whereClause + (whereClause ? ' AND' : ' WHERE') + ' estado = ?', [...params, 'cancelada']);

      return {
        total: parseInt(total[0].count) || 0,
        pending: parseInt(pendientes[0].count) || 0, // Frontend espera 'pending', no 'pendientes'
        en_progreso: parseInt(en_progreso[0].count) || 0,
        en_revision: parseInt(en_revision[0].count) || 0,
        completed: parseInt(completadas[0].count) || 0, // Frontend espera 'completed', no 'completadas'
        canceladas: parseInt(canceladas[0].count) || 0,
        // Mantener compatibilidad con versiones anteriores
        pendientes: parseInt(pendientes[0].count) || 0,
        completadas: parseInt(completadas[0].count) || 0
      };
    } catch (error) {
      console.error('Error en TaskRepository.getOverviewStats:', error);
      throw error;
    }
  }

  /**
   * Obtener tareas recientes
   */
  async findRecent(userId = null, isAdmin = false, limit = 5) {
    try {
      this.reset()
        .select('tareas.*, proyectos.titulo as proyecto_titulo')
        .from('tareas')
        .leftJoin('proyectos', 'tareas.proyecto_id', '=', 'proyectos.id')
        .orderBy('tareas.created_at', 'desc')
        .limit(limit);

      if (!isAdmin && userId) {
        this.where('tareas.usuario_asignado_id', '=', userId);
      }

      return await this.get();
    } catch (error) {
      console.error('Error en TaskRepository.findRecent:', error);
      throw error;
    }
  }

  /**
   * Obtener tareas pendientes
   */
  async findPending(userId = null, isAdmin = false) {
    try {
      this.reset()
        .select('tareas.*, proyectos.titulo as proyecto_titulo')
        .from('tareas')
        .leftJoin('proyectos', 'tareas.proyecto_id', '=', 'proyectos.id')
        .where('tareas.estado', '=', 'pendiente')
        .orderBy('tareas.prioridad', 'desc')
        .orderBy('tareas.fecha_fin', 'asc');

      if (!isAdmin && userId) {
        this.where('tareas.usuario_asignado_id', '=', userId);
      }

      return await this.get();
    } catch (error) {
      console.error('Error en TaskRepository.findPending:', error);
      throw error;
    }
  }
}

module.exports = TaskRepository;
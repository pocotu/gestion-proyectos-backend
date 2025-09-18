const BaseRepository = require('./BaseRepository');

/**
 * Repositorio para gestionar las asignaciones de tareas
 * Maneja las operaciones CRUD para la tabla task_assignments
 */
class TaskAssignmentRepository extends BaseRepository {
  constructor() {
    super('task_assignments');
  }

  /**
   * Asignar usuario a una tarea
   * @param {number} taskId - ID de la tarea
   * @param {number} userId - ID del usuario
   * @param {number} assignedBy - ID del usuario que asigna
   * @returns {Promise<Object>} - Asignación creada
   */
  async assignUserToTask(taskId, userId, assignedBy) {
    const query = `
      INSERT INTO ${this.tableName} (tarea_id, usuario_id, asignado_por, fecha_asignacion)
      VALUES (?, ?, ?, NOW())
    `;
    
    const result = await this.raw(query, [taskId, userId, assignedBy]);
    return this.findById(result.insertId);
  }

  /**
   * Remover asignación de tarea
   * @param {number} taskId - ID de la tarea
   * @param {number} userId - ID del usuario
   * @returns {Promise<boolean>} - True si se removió exitosamente
   */
  async removeUserFromTask(taskId, userId) {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE tarea_id = ? AND usuario_id = ?
    `;
    
    const result = await this.raw(query, [taskId, userId]);
    return result.affectedRows > 0;
  }

  /**
   * Obtener usuarios asignados a una tarea
   * @param {number} taskId - ID de la tarea
   * @returns {Promise<Array>} - Lista de usuarios asignados
   */
  async getTaskAssignments(taskId) {
    const query = `
      SELECT 
        ta.*,
        u.nombre,
        u.email,
        u.es_activo,
        assigner.nombre as asignado_por_nombre
      FROM ${this.tableName} ta
      JOIN usuarios u ON ta.usuario_id = u.id
      LEFT JOIN usuarios assigner ON ta.asignado_por = assigner.id
      WHERE ta.tarea_id = ?
      ORDER BY ta.fecha_asignacion DESC
    `;
    
    return await this.raw(query, [taskId]);
  }

  /**
   * Obtener tareas asignadas a un usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<Array>} - Lista de tareas asignadas
   */
  async getUserTaskAssignments(userId) {
    const query = `
      SELECT 
        ta.*,
        t.titulo,
        t.descripcion,
        t.estado,
        t.prioridad,
        t.fecha_vencimiento,
        p.nombre as proyecto_nombre
      FROM ${this.tableName} ta
      JOIN tareas t ON ta.tarea_id = t.id
      LEFT JOIN proyectos p ON t.proyecto_id = p.id
      WHERE ta.usuario_id = ?
      ORDER BY ta.fecha_asignacion DESC
    `;
    
    return await this.raw(query, [userId]);
  }

  /**
   * Verificar si un usuario está asignado a una tarea
   * @param {number} taskId - ID de la tarea
   * @param {number} userId - ID del usuario
   * @returns {Promise<boolean>} - True si está asignado
   */
  async isUserAssignedToTask(taskId, userId) {
    const query = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE tarea_id = ? AND usuario_id = ?
    `;
    
    const result = await this.raw(query, [taskId, userId]);
    return result[0].count > 0;
  }

  /**
   * Obtener estadísticas de asignaciones
   * @returns {Promise<Object>} - Estadísticas de asignaciones
   */
  async getAssignmentStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total_assignments,
        COUNT(DISTINCT tarea_id) as tasks_with_assignments,
        COUNT(DISTINCT usuario_id) as users_with_assignments,
        AVG(assignments_per_task.count) as avg_assignments_per_task
      FROM ${this.tableName}
      LEFT JOIN (
        SELECT tarea_id, COUNT(*) as count
        FROM ${this.tableName}
        GROUP BY tarea_id
      ) assignments_per_task ON ${this.tableName}.tarea_id = assignments_per_task.tarea_id
    `;
    
    const result = await this.raw(query);
    return result[0];
  }
}

module.exports = TaskAssignmentRepository;
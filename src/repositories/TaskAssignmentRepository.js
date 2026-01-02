const { pool } = require('../config/db');

/**
 * TaskAssignmentRepository
 * Maneja las operaciones de base de datos para asignaciones de tareas
 * Siguiendo Single Responsibility Principle: Solo maneja persistencia de asignaciones
 */
class TaskAssignmentRepository {
  /**
   * Obtener todas las asignaciones de una tarea
   * @param {number} taskId - ID de la tarea
   * @returns {Promise<Array>} Lista de asignaciones
   */
  async getAssignmentsByTaskId(taskId) {
    const query = `
      SELECT 
        ta.id,
        ta.tarea_id,
        ta.usuario_id,
        ta.rol_asignacion,
        ta.fecha_asignacion,
        ta.asignado_por,
        ta.activo,
        u.nombre as usuario_nombre,
        u.email as usuario_email,
        asignador.nombre as asignado_por_nombre
      FROM tarea_asignaciones ta
      INNER JOIN usuarios u ON ta.usuario_id = u.id
      LEFT JOIN usuarios asignador ON ta.asignado_por = asignador.id
      WHERE ta.tarea_id = ? AND ta.activo = TRUE
      ORDER BY 
        CASE ta.rol_asignacion
          WHEN 'responsable_principal' THEN 1
          WHEN 'colaborador' THEN 2
          WHEN 'revisor' THEN 3
        END,
        ta.fecha_asignacion ASC
    `;
    
    const [rows] = await pool.execute(query, [taskId]);
    return rows;
  }

  /**
   * Obtener todas las tareas asignadas a un usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<Array>} Lista de tareas asignadas
   */
  async getAssignmentsByUserId(userId) {
    const query = `
      SELECT 
        ta.id,
        ta.tarea_id,
        ta.usuario_id,
        ta.rol_asignacion,
        ta.fecha_asignacion,
        t.titulo as tarea_titulo,
        t.estado as tarea_estado,
        t.prioridad as tarea_prioridad,
        t.proyecto_id,
        p.titulo as proyecto_titulo
      FROM tarea_asignaciones ta
      INNER JOIN tareas t ON ta.tarea_id = t.id
      INNER JOIN proyectos p ON t.proyecto_id = p.id
      WHERE ta.usuario_id = ? AND ta.activo = TRUE
      ORDER BY t.fecha_fin ASC
    `;
    
    const [rows] = await pool.execute(query, [userId]);
    return rows;
  }

  /**
   * Crear una nueva asignación
   * @param {Object} assignmentData - Datos de la asignación
   * @returns {Promise<Object>} Asignación creada
   */
  async createAssignment(assignmentData) {
    const { tarea_id, usuario_id, rol_asignacion = 'colaborador', asignado_por } = assignmentData;
    
    const query = `
      INSERT INTO tarea_asignaciones 
        (tarea_id, usuario_id, rol_asignacion, asignado_por, activo)
      VALUES (?, ?, ?, ?, TRUE)
    `;
    
    const [result] = await pool.execute(query, [
      tarea_id,
      usuario_id,
      rol_asignacion,
      asignado_por
    ]);
    
    return {
      id: result.insertId,
      tarea_id,
      usuario_id,
      rol_asignacion,
      asignado_por,
      activo: true
    };
  }

  /**
   * Verificar si existe una asignación activa
   * @param {number} taskId - ID de la tarea
   * @param {number} userId - ID del usuario
   * @returns {Promise<boolean>} True si existe
   */
  async assignmentExists(taskId, userId) {
    const query = `
      SELECT COUNT(*) as count 
      FROM tarea_asignaciones 
      WHERE tarea_id = ? AND usuario_id = ? AND activo = TRUE
    `;
    
    const [rows] = await pool.execute(query, [taskId, userId]);
    return rows[0].count > 0;
  }

  /**
   * Eliminar una asignación (soft delete)
   * @param {number} taskId - ID de la tarea
   * @param {number} userId - ID del usuario
   * @returns {Promise<boolean>} True si se eliminó
   */
  async deleteAssignment(taskId, userId) {
    const query = `
      UPDATE tarea_asignaciones 
      SET activo = FALSE 
      WHERE tarea_id = ? AND usuario_id = ?
    `;
    
    const [result] = await pool.execute(query, [taskId, userId]);
    return result.affectedRows > 0;
  }

  /**
   * Eliminar todas las asignaciones de una tarea
   * @param {number} taskId - ID de la tarea
   * @returns {Promise<number>} Número de asignaciones eliminadas
   */
  async deleteAllAssignments(taskId) {
    const query = `
      UPDATE tarea_asignaciones 
      SET activo = FALSE 
      WHERE tarea_id = ?
    `;
    
    const [result] = await pool.execute(query, [taskId]);
    return result.affectedRows;
  }

  /**
   * Actualizar el rol de una asignación
   * @param {number} taskId - ID de la tarea
   * @param {number} userId - ID del usuario
   * @param {string} newRole - Nuevo rol
   * @returns {Promise<boolean>} True si se actualizó
   */
  async updateAssignmentRole(taskId, userId, newRole) {
    const query = `
      UPDATE tarea_asignaciones 
      SET rol_asignacion = ? 
      WHERE tarea_id = ? AND usuario_id = ? AND activo = TRUE
    `;
    
    const [result] = await pool.execute(query, [newRole, taskId, userId]);
    return result.affectedRows > 0;
  }

  /**
   * Sincronizar asignaciones de una tarea
   * Elimina las que no están en la lista y agrega las nuevas
   * @param {number} taskId - ID de la tarea
   * @param {Array} userIds - Lista de IDs de usuarios
   * @param {number} assignedBy - ID del usuario que asigna
   * @returns {Promise<Object>} Resultado de la sincronización
   */
  async syncAssignments(taskId, userIds, assignedBy) {
    // Obtener asignaciones actuales
    const currentAssignments = await this.getAssignmentsByTaskId(taskId);
    const currentUserIds = currentAssignments.map(a => a.usuario_id);
    
    // Determinar qué agregar y qué eliminar
    const toAdd = userIds.filter(id => !currentUserIds.includes(id));
    const toRemove = currentUserIds.filter(id => !userIds.includes(id));
    
    // Eliminar asignaciones que ya no están
    for (const userId of toRemove) {
      await this.deleteAssignment(taskId, userId);
    }
    
    // Agregar nuevas asignaciones
    const added = [];
    for (const userId of toAdd) {
      const assignment = await this.createAssignment({
        tarea_id: taskId,
        usuario_id: userId,
        rol_asignacion: 'colaborador',
        asignado_por: assignedBy
      });
      added.push(assignment);
    }
    
    return {
      added: added.length,
      removed: toRemove.length,
      total: userIds.length
    };
  }
}

module.exports = TaskAssignmentRepository;

const BaseRepository = require('./BaseRepository');

/**
 * Repositorio para gestionar los comentarios de tareas
 * Maneja las operaciones CRUD para la tabla task_comments
 */
class TaskCommentRepository extends BaseRepository {
  constructor() {
    super('task_comments');
  }

  /**
   * Crear un comentario en una tarea
   * @param {number} taskId - ID de la tarea
   * @param {number} userId - ID del usuario que comenta
   * @param {string} content - Contenido del comentario
   * @returns {Promise<Object>} - Comentario creado
   */
  async createComment(taskId, userId, content) {
    const query = `
      INSERT INTO ${this.tableName} (tarea_id, usuario_id, contenido, fecha_creacion)
      VALUES (?, ?, ?, NOW())
    `;
    
    const result = await this.raw(query, [taskId, userId, content]);
    return this.findById(result.insertId);
  }

  /**
   * Obtener comentarios de una tarea
   * @param {number} taskId - ID de la tarea
   * @param {Object} options - Opciones de paginación
   * @returns {Promise<Array>} - Lista de comentarios
   */
  async getTaskComments(taskId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    const query = `
      SELECT 
        tc.*,
        u.nombre as usuario_nombre,
        u.email as usuario_email
      FROM ${this.tableName} tc
      JOIN usuarios u ON tc.usuario_id = u.id
      WHERE tc.tarea_id = ?
      ORDER BY tc.fecha_creacion DESC
      LIMIT ? OFFSET ?
    `;
    
    return await this.raw(query, [taskId, limit, offset]);
  }

  /**
   * Actualizar un comentario
   * @param {number} commentId - ID del comentario
   * @param {string} content - Nuevo contenido
   * @param {number} userId - ID del usuario (para verificar permisos)
   * @returns {Promise<Object>} - Comentario actualizado
   */
  async updateComment(commentId, content, userId) {
    // Verificar que el usuario sea el autor del comentario
    const comment = await this.findById(commentId);
    if (!comment || comment.usuario_id !== userId) {
      throw new Error('No tienes permisos para editar este comentario');
    }

    const query = `
      UPDATE ${this.tableName}
      SET contenido = ?, fecha_actualizacion = NOW()
      WHERE id = ?
    `;
    
    await this.raw(query, [content, commentId]);
    return this.findById(commentId);
  }

  /**
   * Eliminar un comentario
   * @param {number} commentId - ID del comentario
   * @param {number} userId - ID del usuario (para verificar permisos)
   * @returns {Promise<boolean>} - True si se eliminó exitosamente
   */
  async deleteComment(commentId, userId) {
    // Verificar que el usuario sea el autor del comentario
    const comment = await this.findById(commentId);
    if (!comment || comment.usuario_id !== userId) {
      throw new Error('No tienes permisos para eliminar este comentario');
    }

    const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = await this.raw(query, [commentId]);
    return result.affectedRows > 0;
  }

  /**
   * Obtener comentarios de un usuario
   * @param {number} userId - ID del usuario
   * @param {Object} options - Opciones de paginación
   * @returns {Promise<Array>} - Lista de comentarios del usuario
   */
  async getUserComments(userId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    const query = `
      SELECT 
        tc.*,
        t.titulo as tarea_titulo,
        p.nombre as proyecto_nombre
      FROM ${this.tableName} tc
      JOIN tareas t ON tc.tarea_id = t.id
      LEFT JOIN proyectos p ON t.proyecto_id = p.id
      WHERE tc.usuario_id = ?
      ORDER BY tc.fecha_creacion DESC
      LIMIT ? OFFSET ?
    `;
    
    return await this.raw(query, [userId, limit, offset]);
  }

  /**
   * Contar comentarios de una tarea
   * @param {number} taskId - ID de la tarea
   * @returns {Promise<number>} - Número de comentarios
   */
  async countTaskComments(taskId) {
    const query = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE tarea_id = ?
    `;
    
    const result = await this.raw(query, [taskId]);
    return result[0].count;
  }

  /**
   * Obtener estadísticas de comentarios
   * @returns {Promise<Object>} - Estadísticas de comentarios
   */
  async getCommentStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total_comments,
        COUNT(DISTINCT tarea_id) as tasks_with_comments,
        COUNT(DISTINCT usuario_id) as users_with_comments,
        AVG(comments_per_task.count) as avg_comments_per_task
      FROM ${this.tableName}
      LEFT JOIN (
        SELECT tarea_id, COUNT(*) as count
        FROM ${this.tableName}
        GROUP BY tarea_id
      ) comments_per_task ON ${this.tableName}.tarea_id = comments_per_task.tarea_id
    `;
    
    const result = await this.raw(query);
    return result[0];
  }
}

module.exports = TaskCommentRepository;
const BaseRepository = require('./BaseRepository');

/**
 * UserRoleRepository - Repositorio para la relación muchos-a-muchos usuarios-roles
 * Siguiendo principios SOLID:
 * - Single Responsibility: Maneja operaciones específicas de usuario-roles
 * - Open/Closed: Extiende BaseRepository sin modificarlo
 * - Liskov Substitution: Puede sustituir a BaseRepository
 * - Interface Segregation: Métodos específicos para relaciones usuario-rol
 * - Dependency Inversion: Depende de BaseRepository (abstracción)
 */
class UserRoleRepository extends BaseRepository {
  constructor() {
    super('usuario_roles');
  }

  /**
   * Asigna un rol a un usuario
   */
  async assignRole(usuario_id, rol_id, asignado_por = null) {
    // Verificar si la relación ya existe
    const existing = await this
      .where('usuario_id', usuario_id)
      .where('rol_id', rol_id)
      .first();

    if (existing) {
      // Si existe pero está inactivo, reactivarlo
      if (!existing.activo) {
        return await this
          .where('usuario_id', usuario_id)
          .where('rol_id', rol_id)
          .update({
            activo: true,
            asignado_por,
            updated_at: new Date()
          });
      }
      // Si ya existe y está activo, no hacer nada
      return { affectedRows: 0, message: 'El usuario ya tiene este rol asignado' };
    }

    // Crear nueva asignación
    return await this.insert({
      usuario_id,
      rol_id,
      asignado_por,
      activo: true,
      fecha_asignacion: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  /**
   * Remueve un rol de un usuario (soft delete)
   */
  async removeRole(usuario_id, rol_id) {
    return await this
      .where('usuario_id', usuario_id)
      .where('rol_id', rol_id)
      .update({
        activo: false,
        updated_at: new Date()
      });
  }

  /**
   * Elimina permanentemente la relación usuario-rol
   */
  async deleteRole(usuario_id, rol_id) {
    return await this
      .where('usuario_id', usuario_id)
      .where('rol_id', rol_id)
      .delete();
  }

  /**
   * Obtiene todos los roles activos de un usuario
   */
  async getUserRoles(usuario_id) {
    return await this
      .select('usuario_roles.*, roles.nombre as rol_nombre')
      .join('roles', 'usuario_roles.rol_id', 'roles.id')
      .where('usuario_roles.usuario_id', usuario_id)
      .where('usuario_roles.activo', true)
      .orderBy('roles.nombre', 'ASC')
      .get();
  }

  /**
   * Obtiene todos los usuarios que tienen un rol específico
   */
  async getUsersByRole(rol_id) {
    return await this
      .select('usuario_roles.*, usuarios.nombre as usuario_nombre, usuarios.email')
      .join('usuarios', 'usuario_roles.usuario_id', 'usuarios.id')
      .where('usuario_roles.rol_id', rol_id)
      .where('usuario_roles.activo', true)
      .where('usuarios.estado', 'activo')
      .orderBy('usuarios.nombre', 'ASC')
      .get();
  }

  /**
   * Verifica si un usuario tiene un rol específico
   */
  async hasRole(usuario_id, rol_id) {
    return await this
      .where('usuario_id', usuario_id)
      .where('rol_id', rol_id)
      .where('activo', true)
      .exists();
  }

  /**
   * Verifica si un usuario tiene un rol específico por nombre
   */
  async hasRoleByName(usuario_id, rol_nombre) {
    const result = await this.raw(`
      SELECT COUNT(*) as count 
      FROM usuario_roles ur 
      INNER JOIN roles r ON ur.rol_id = r.id 
      WHERE ur.usuario_id = ? AND r.nombre = ? AND ur.activo = TRUE
    `, [usuario_id, rol_nombre]);
    
    return result[0].count > 0;
  }

  /**
   * Obtiene el historial completo de roles de un usuario (incluyendo inactivos)
   */
  async getUserRoleHistory(usuario_id) {
    return await this
      .select('usuario_roles.*, roles.nombre as rol_nombre, asignador.nombre as asignado_por_nombre')
      .join('roles', 'usuario_roles.rol_id', 'roles.id')
      .leftJoin('usuarios as asignador', 'usuario_roles.asignado_por', 'asignador.id')
      .where('usuario_roles.usuario_id', usuario_id)
      .orderBy('usuario_roles.fecha_asignacion', 'DESC')
      .get();
  }

  /**
   * Asigna múltiples roles a un usuario
   */
  async assignMultipleRoles(usuario_id, rol_ids, asignado_por = null) {
    const results = [];
    
    for (const rol_id of rol_ids) {
      try {
        const result = await this.assignRole(usuario_id, rol_id, asignado_por);
        results.push({ success: true, rol_id, result });
      } catch (error) {
        results.push({ success: false, rol_id, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Remueve múltiples roles de un usuario
   */
  async removeMultipleRoles(usuario_id, rol_ids) {
    const results = [];
    
    for (const rol_id of rol_ids) {
      try {
        const result = await this.removeRole(usuario_id, rol_id);
        results.push({ success: true, rol_id, result });
      } catch (error) {
        results.push({ success: false, rol_id, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Sincroniza los roles de un usuario (remueve los no especificados y agrega los nuevos)
   */
  async syncUserRoles(usuario_id, rol_ids, asignado_por = null) {
    return await this.transaction(async (connection) => {
      // Desactivar todos los roles actuales
      await this.raw(
        'UPDATE usuario_roles SET activo = FALSE WHERE usuario_id = ?',
        [usuario_id]
      );

      // Asignar los nuevos roles
      const results = [];
      for (const rol_id of rol_ids) {
        const result = await this.assignRole(usuario_id, rol_id, asignado_por);
        results.push(result);
      }

      return results;
    });
  }

  /**
   * Obtiene estadísticas de asignaciones de roles
   */
  async getStatistics() {
    const totalAssignments = await this.where('activo', true).count();
    
    const mostAssignedRole = await this.raw(`
      SELECT r.nombre, COUNT(ur.id) as assignment_count
      FROM usuario_roles ur
      INNER JOIN roles r ON ur.rol_id = r.id
      WHERE ur.activo = TRUE
      GROUP BY ur.rol_id, r.nombre
      ORDER BY assignment_count DESC
      LIMIT 1
    `);

    const userWithMostRoles = await this.raw(`
      SELECT u.nombre, u.email, COUNT(ur.id) as role_count
      FROM usuario_roles ur
      INNER JOIN usuarios u ON ur.usuario_id = u.id
      WHERE ur.activo = TRUE
      GROUP BY ur.usuario_id, u.nombre, u.email
      ORDER BY role_count DESC
      LIMIT 1
    `);

    const rolesDistribution = await this.raw(`
      SELECT r.nombre, COUNT(ur.id) as user_count
      FROM roles r
      LEFT JOIN usuario_roles ur ON r.id = ur.rol_id AND ur.activo = TRUE
      GROUP BY r.id, r.nombre
      ORDER BY user_count DESC
    `);

    return {
      totalActiveAssignments: totalAssignments,
      mostAssignedRole: mostAssignedRole[0] || null,
      userWithMostRoles: userWithMostRoles[0] || null,
      rolesDistribution
    };
  }

  /**
   * Busca usuarios con roles específicos
   */
  async findUsersWithRoles(rol_names) {
    if (!Array.isArray(rol_names) || rol_names.length === 0) {
      return [];
    }

    const placeholders = rol_names.map(() => '?').join(', ');
    
    return await this.raw(`
      SELECT DISTINCT u.*, GROUP_CONCAT(r.nombre) as roles
      FROM usuarios u
      INNER JOIN usuario_roles ur ON u.id = ur.usuario_id
      INNER JOIN roles r ON ur.rol_id = r.id
      WHERE r.nombre IN (${placeholders}) AND ur.activo = TRUE AND u.estado = 'activo'
      GROUP BY u.id
      ORDER BY u.nombre ASC
    `, rol_names);
  }

  /**
   * Obtiene usuarios sin roles asignados
   */
  async findUsersWithoutRoles() {
    return await this.raw(`
      SELECT u.*
      FROM usuarios u
      LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id AND ur.activo = TRUE
      WHERE ur.usuario_id IS NULL AND u.estado = 'activo'
      ORDER BY u.nombre ASC
    `);
  }

  /**
   * Busca asignaciones por rango de fechas
   */
  async findByDateRange(startDate, endDate) {
    return await this
      .select('usuario_roles.*, usuarios.nombre as usuario_nombre, roles.nombre as rol_nombre')
      .join('usuarios', 'usuario_roles.usuario_id', 'usuarios.id')
      .join('roles', 'usuario_roles.rol_id', 'roles.id')
      .whereBetween('usuario_roles.fecha_asignacion', startDate, endDate)
      .orderBy('usuario_roles.fecha_asignacion', 'DESC')
      .get();
  }

  /**
   * Obtiene las asignaciones realizadas por un usuario específico
   */
  async findAssignmentsByAssigner(asignado_por) {
    return await this
      .select('usuario_roles.*, usuarios.nombre as usuario_nombre, roles.nombre as rol_nombre')
      .join('usuarios', 'usuario_roles.usuario_id', 'usuarios.id')
      .join('roles', 'usuario_roles.rol_id', 'roles.id')
      .where('usuario_roles.asignado_por', asignado_por)
      .orderBy('usuario_roles.fecha_asignacion', 'DESC')
      .get();
  }

  /**
   * Reactiva un rol previamente desactivado
   */
  async reactivateRole(usuario_id, rol_id, asignado_por = null) {
    return await this
      .where('usuario_id', usuario_id)
      .where('rol_id', rol_id)
      .update({
        activo: true,
        asignado_por,
        updated_at: new Date()
      });
  }

  /**
   * Obtiene el conteo de roles por usuario
   */
  async getRoleCountByUser() {
    return await this.raw(`
      SELECT u.id, u.nombre, u.email, COUNT(ur.id) as role_count
      FROM usuarios u
      LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id AND ur.activo = TRUE
      WHERE u.estado = 'activo'
      GROUP BY u.id, u.nombre, u.email
      ORDER BY role_count DESC, u.nombre ASC
    `);
  }
}

module.exports = UserRoleRepository;
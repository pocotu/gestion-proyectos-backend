const BaseRepository = require('./BaseRepository');
const { pool } = require('../config/db');

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
    // Verificar si ya existe la asignación
    const existing = await this
      .where('usuario_id', usuario_id)
      .where('rol_id', rol_id)
      .first();

    if (existing) {
      throw new Error('El usuario ya tiene este rol asignado');
    }

    return await this.insert({
      usuario_id,
      rol_id,
      created_at: new Date()
    });
  }

  /**
   * Remueve un rol de un usuario (eliminación permanente)
   */
  async removeRole(usuario_id, rol_id) {
    return await this
      .where('usuario_id', usuario_id)
      .where('rol_id', rol_id)
      .delete();
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
  /**
   * Obtiene los roles de un usuario específico
   * Método estático que usa el pool de conexiones correctamente
   */
  static async getUserRolesStatic(userId) {
    try {
      console.log('🔍 [USER-ROLE-REPO] getUserRolesStatic - Iniciando para userId:', userId);
      
      // Usar el pool en lugar de crear una conexión individual
      const query = `
        SELECT 
          ur.id,
          ur.usuario_id,
          ur.rol_id,
          ur.created_at,
          r.nombre as rol_nombre
        FROM usuario_roles ur
        INNER JOIN roles r ON ur.rol_id = r.id
        WHERE ur.usuario_id = ?
        ORDER BY r.nombre ASC
      `;
      
      console.log('🔍 [USER-ROLE-REPO] Ejecutando query con pool...');
      
      const [result] = await pool.execute(query, [userId]);
      
      console.log('🔍 [USER-ROLE-REPO] Resultado obtenido:', result.length, 'roles');
      
      if (result.length > 0) {
        console.log('🔍 [USER-ROLE-REPO] Roles encontrados:', result.map(r => r.rol_nombre));
      } else {
        console.log('🔍 [USER-ROLE-REPO] No se encontraron roles para el usuario:', userId);
      }
      
      return result;
    } catch (error) {
      console.error('🔍 [USER-ROLE-REPO] getUserRolesStatic - Error:', error.message);
      console.error('🔍 [USER-ROLE-REPO] getUserRolesStatic - Stack:', error.stack);
      throw error;
    }
  }

  async getUserRoles(userId) {
    // Delegar al método estático para evitar conflictos de herencia
    return UserRoleRepository.getUserRolesStatic(userId);
  }

  /**
   * Obtiene todos los usuarios que tienen un rol específico
   */
  async getUsersByRole(rol_id) {
    // Resetear el query builder para evitar conflictos
    this.reset();
    
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
    // Resetear el query builder para evitar conflictos
    this.reset();
    
    const result = await this.where('usuario_id', usuario_id).where('rol_id', rol_id).where('activo', true).first();
    return !!result;
  }

  /**
   * Verifica si un usuario tiene un rol específico por nombre
   */
  async hasRoleByName(usuario_id, rol_nombre) {
    const result = await this.raw(`
      SELECT COUNT(*) as count 
      FROM usuario_roles ur 
      INNER JOIN roles user_role_check_table ON ur.rol_id = user_role_check_table.id 
      WHERE ur.usuario_id = ? AND user_role_check_table.nombre = ? AND ur.activo = TRUE
    `, [usuario_id, rol_nombre]);
    
    return result[0].count > 0;
  }

  /**
   * Obtiene el historial completo de roles de un usuario (incluyendo inactivos)
   */
  async getUserRoleHistory(usuario_id) {
    // Resetear el query builder para evitar conflictos
    this.reset();
    
    return await this
      .select('usuario_roles.*, roles.nombre as rol_nombre')
      .join('roles', 'usuario_roles.rol_id', 'roles.id')
      .where('usuario_roles.usuario_id', usuario_id)
      .orderBy('usuario_roles.created_at', 'DESC')
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
        results.push(result);
      } catch (error) {
        results.push({ error: error.message, rol_id });
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
        results.push(result);
      } catch (error) {
        results.push({ error: error.message, rol_id });
      }
    }
    return results;
  }

  /**
   * Sincroniza los roles de un usuario (remueve los no especificados y agrega los nuevos)
   */
  async syncUserRoles(usuario_id, rol_ids, asignado_por = null) {
    try {
      // Desactivar todos los roles actuales
      await this.where('usuario_id', usuario_id).update({ activo: false });

      // Asignar los nuevos roles
      const results = [];
      for (const rol_id of rol_ids) {
        const result = await this.assignRole(usuario_id, rol_id, asignado_por);
        results.push(result);
      }

      return results;
    } catch (error) {
      throw new Error(`Error sincronizando roles: ${error.message}`);
    }
  }

  /**
   * Obtiene estadísticas de asignaciones de roles
   */
  async getStatistics() {
    try {
      const totalAssignments = await this.where('activo', true).count();
      
      const mostAssignedRole = await this.raw(`
        SELECT role_stats_table.nombre, COUNT(ur.id) as assignment_count
        FROM usuario_roles ur
        INNER JOIN roles role_stats_table ON ur.rol_id = role_stats_table.id
        WHERE ur.activo = TRUE
        GROUP BY ur.rol_id, role_stats_table.nombre
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
        SELECT role_distribution_table.nombre, COUNT(ur.id) as user_count
        FROM roles role_distribution_table
        LEFT JOIN usuario_roles ur ON role_distribution_table.id = ur.rol_id AND ur.activo = TRUE
        GROUP BY role_distribution_table.id, role_distribution_table.nombre
        ORDER BY user_count DESC
      `);

      return {
        totalActiveAssignments: totalAssignments,
        mostAssignedRole: mostAssignedRole[0] || null,
        userWithMostRoles: userWithMostRoles[0] || null,
        rolesDistribution
      };
    } catch (error) {
      throw new Error(`Error obteniendo estadísticas: ${error.message}`);
    }
  }

  /**
   * Busca usuarios con roles específicos
   */
  async findUsersWithRoles(rol_names) {
    try {
      if (!Array.isArray(rol_names) || rol_names.length === 0) {
        return [];
      }

      const placeholders = rol_names.map(() => '?').join(', ');
      
      return await this.raw(`
        SELECT DISTINCT u.*, GROUP_CONCAT(user_roles_search_table.nombre) as roles
        FROM usuarios u
        INNER JOIN usuario_roles ur ON u.id = ur.usuario_id
        INNER JOIN roles user_roles_search_table ON ur.rol_id = user_roles_search_table.id
        WHERE user_roles_search_table.nombre IN (${placeholders}) AND ur.activo = TRUE AND u.estado = 'activo'
        GROUP BY u.id
        ORDER BY u.nombre ASC
      `, rol_names);
    } catch (error) {
      throw new Error(`Error buscando usuarios con roles: ${error.message}`);
    }
  }

  /**
   * Busca usuarios sin roles asignados
   */
  async findUsersWithoutRoles() {
    try {
      return await this.raw(`
        SELECT u.*
        FROM usuarios u
        LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id AND ur.activo = TRUE
        WHERE ur.id IS NULL AND u.estado = 'activo'
        ORDER BY u.nombre ASC
      `);
    } catch (error) {
      throw new Error(`Error buscando usuarios sin roles: ${error.message}`);
    }
  }

  /**
   * Busca asignaciones de roles por rango de fechas
   */
  async findByDateRange(startDate, endDate) {
    // Resetear el query builder para evitar conflictos
    this.reset();
    
    return await this
      .select('usuario_roles.*, usuarios.nombre as usuario_nombre, roles.nombre as rol_nombre')
      .join('usuarios', 'usuario_roles.usuario_id', 'usuarios.id')
      .join('roles', 'usuario_roles.rol_id', 'roles.id')
      .whereBetween('usuario_roles.fecha_asignacion', startDate, endDate)
      .orderBy('usuario_roles.fecha_asignacion', 'DESC')
      .get();
  }

  /**
   * Busca asignaciones realizadas por un usuario específico
   */
  async findAssignmentsByAssigner(asignado_por) {
    // Resetear el query builder para evitar conflictos
    this.reset();
    
    return await this
      .select('usuario_roles.*, usuarios.nombre as usuario_nombre, roles.nombre as rol_nombre, asignador.nombre as asignado_por_nombre')
      .join('usuarios', 'usuario_roles.usuario_id', 'usuarios.id')
      .join('roles', 'usuario_roles.rol_id', 'roles.id')
      .leftJoin('usuarios as asignador', 'usuario_roles.asignado_por', 'asignador.id')
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
    try {
      return await this.raw(`
        SELECT u.id, u.nombre, u.email, COUNT(ur.id) as role_count
        FROM usuarios u
        LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id AND ur.activo = TRUE
        WHERE u.estado = 'activo'
        GROUP BY u.id, u.nombre, u.email
        ORDER BY role_count DESC, u.nombre ASC
      `);
    } catch (error) {
      throw new Error(`Error obteniendo conteo de roles por usuario: ${error.message}`);
    }
  }

  async findByUserId(userId) {
    const query = `
      SELECT 
        ur.id,
        ur.usuario_id,
        ur.rol_id,
        ur.created_at,
        user_role_check_table.nombre as rol_nombre
      FROM usuario_roles ur
      LEFT JOIN roles user_role_check_table ON ur.rol_id = user_role_check_table.id
      WHERE ur.usuario_id = ?
    `;
    
    const [result] = await pool.execute(query, [userId]);
    return result;
  }

  async hasRole(userId, roleName) {
    const query = `
      SELECT COUNT(*) as count
      FROM usuario_roles ur
      LEFT JOIN roles user_role_check_table ON ur.rol_id = user_role_check_table.id
      WHERE ur.usuario_id = ? AND user_role_check_table.nombre = ?
    `;
    
    const [result] = await pool.execute(query, [userId, roleName]);
    return result[0].count > 0;
  }

  async userWithMostRoles() {
    const query = `
      SELECT 
        u.id,
        u.nombre,
        u.email,
        COUNT(ur.id) as total_roles
      FROM usuarios u
      LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id
      WHERE ur.id IS NOT NULL
      GROUP BY u.id, u.nombre, u.email
      ORDER BY total_roles DESC
      LIMIT 1
    `;
    
    const [result] = await pool.execute(query);
    return result[0] || null;
  }

  async rolesDistribution() {
    const query = `
      SELECT 
        role_distribution_table.nombre as rol_nombre,
        COUNT(ur.id) as total_usuarios
      FROM roles role_distribution_table
      LEFT JOIN usuario_roles ur ON role_distribution_table.id = ur.rol_id
      GROUP BY role_distribution_table.id, role_distribution_table.nombre
      ORDER BY total_usuarios DESC
    `;
    
    const [result] = await pool.execute(query);
    return result;
  }

  async findUsersWithRoles(roleNames = []) {
    if (!roleNames.length) return [];
    
    const placeholders = roleNames.map(() => '?').join(',');
    const query = `
      SELECT DISTINCT
        u.id,
        u.nombre,
        u.email,
        u.estado,
        GROUP_CONCAT(user_roles_search_table.nombre) as roles
      FROM usuarios u
      LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id
      LEFT JOIN roles user_roles_search_table ON ur.rol_id = user_roles_search_table.id
      WHERE user_roles_search_table.nombre IN (${placeholders}) AND u.estado = 'activo'
      GROUP BY u.id, u.nombre, u.email, u.estado
    `;
    
    const [result] = await pool.execute(query, roleNames);
    return result;
  }

  async findActiveUsersWithRoles() {
    const query = `
      SELECT 
        u.id,
        u.nombre,
        u.email,
        u.estado,
        GROUP_CONCAT(user_roles_active_table.nombre) as roles
      FROM usuarios u
      LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id
      LEFT JOIN roles user_roles_active_table ON ur.rol_id = user_roles_active_table.id
      WHERE u.estado = 'activo'
      GROUP BY u.id, u.nombre, u.email, u.estado
    `;
    
    const [result] = await pool.execute(query);
    return result;
  }

  async getRoleAssignmentHistory(startDate = null, endDate = null) {
    let query = this
      .select('usuario_roles.*, usuarios.nombre as usuario_nombre, roles.nombre as rol_nombre')
      .join('usuarios', 'usuario_roles.usuario_id', 'usuarios.id')
      .join('roles', 'usuario_roles.rol_id', 'roles.id');

    if (startDate && endDate) {
      query = query
        .whereBetween('usuario_roles.created_at', startDate, endDate);
    }

    return await query
      .orderBy('usuario_roles.created_at', 'DESC')
      .get();
  }

  async getUsersWithRoleStats() {
    return await this
      .select('usuarios.id', 'usuarios.nombre', 'usuarios.email')
      .selectRaw('COUNT(usuario_roles.id) as total_roles')
      .join('usuarios', 'usuario_roles.usuario_id', 'usuarios.id')
      .groupBy('usuarios.id', 'usuarios.nombre', 'usuarios.email')
      .orderBy('usuario_roles.created_at', 'DESC')
      .get();
  }
}

module.exports = UserRoleRepository;
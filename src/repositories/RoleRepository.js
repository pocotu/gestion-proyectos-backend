const BaseRepository = require('./BaseRepository');

/**
 * RoleRepository - Repositorio para operaciones de roles
 * Siguiendo principios SOLID:
 * - Single Responsibility: Maneja operaciones específicas de roles
 * - Open/Closed: Extiende BaseRepository sin modificarlo
 * - Liskov Substitution: Puede sustituir a BaseRepository
 * - Interface Segregation: Métodos específicos para roles
 * - Dependency Inversion: Depende de BaseRepository (abstracción)
 */
class RoleRepository extends BaseRepository {
  constructor() {
    super('roles');
  }

  /**
   * Busca un rol por ID
   */
  async findById(id) {
    return await this.where('id', id).first();
  }

  /**
   * Busca un rol por nombre
   */
  async findByName(nombre) {
    return await this.where('nombre', nombre).first();
  }

  /**
   * Obtiene todos los roles ordenados por nombre
   */
  async findAll() {
    return await this.orderBy('nombre', 'ASC').get();
  }

  /**
   * Busca roles por nombres (múltiples)
   */
  async findByNames(nombres) {
    if (!Array.isArray(nombres) || nombres.length === 0) {
      return [];
    }
    return await this.whereIn('nombre', nombres).get();
  }

  /**
   * Crea un nuevo rol
   */
  async create(roleData) {
    const { nombre } = roleData;

    // Verificar si el rol ya existe
    const existingRole = await this.findByName(nombre);
    if (existingRole) {
      throw new Error('El rol ya existe');
    }

    return await this.insert({ nombre });
  }

  /**
   * Actualiza un rol por ID
   */
  async updateById(id, roleData) {
    const { nombre } = roleData;

    // Verificar si el nuevo nombre ya existe (excluyendo el rol actual)
    const existingRole = await this.where('nombre', nombre).where('id', '!=', id).first();
    if (existingRole) {
      throw new Error('Ya existe un rol con ese nombre');
    }

    return await this.where('id', id).update({ nombre });
  }

  /**
   * Elimina un rol por ID
   */
  async deleteById(id) {
    // Verificar si el rol está siendo usado por usuarios
    const isUsed = await this.isRoleInUse(id);
    if (isUsed) {
      throw new Error('No se puede eliminar el rol porque está siendo usado por usuarios');
    }

    return await this.where('id', id).delete();
  }

  /**
   * Verifica si un rol está siendo usado por usuarios
   */
  async isRoleInUse(roleId) {
    const result = await this.raw(
      'SELECT COUNT(*) as count FROM usuario_roles WHERE rol_id = ?',
      [roleId]
    );
    return result[0].count > 0;
  }

  /**
   * Obtiene roles con el conteo de usuarios asignados
   */
  async findWithUserCount() {
    // Resetear el query builder para evitar conflictos
    this.reset();
    
    return await this
      .select('role_count_table.*, COUNT(usuario_roles.usuario_id) as user_count')
      .from('roles as role_count_table')
      .leftJoin('usuario_roles', 'role_count_table.id', 'usuario_roles.rol_id')
      .groupBy('role_count_table.id')
      .orderBy('role_count_table.nombre', 'ASC')
      .get();
  }

  /**
   * Busca roles asignados a un usuario específico
   */
  async findByUserId(userId) {
    // Resetear el query builder para evitar conflictos
    this.reset();
    
    return await this
      .select('role_user_table.*')
      .from('roles as role_user_table')
      .join('usuario_roles', 'role_user_table.id', 'usuario_roles.rol_id')
      .where('usuario_roles.usuario_id', userId)
      .orderBy('role_user_table.nombre', 'ASC')
      .get();
  }

  /**
   * Busca usuarios que tienen un rol específico
   */
  async findUsersWithRole(roleId) {
    return await this.raw(`
      SELECT usuarios.* 
      FROM usuarios 
      INNER JOIN usuario_roles ON usuarios.id = usuario_roles.usuario_id 
      INNER JOIN roles role_users_table ON usuario_roles.rol_id = role_users_table.id
      WHERE role_users_table.id = ?
      ORDER BY usuarios.nombre ASC
    `, [roleId]);
  }

  /**
   * Verifica si un usuario tiene un rol específico
   */
  async userHasRole(userId, roleId) {
    const result = await this.raw(
      'SELECT COUNT(*) as count FROM usuario_roles WHERE usuario_id = ? AND rol_id = ?',
      [userId, roleId]
    );
    return result[0].count > 0;
  }

  /**
   * Verifica si un usuario tiene un rol específico por nombre
   */
  async userHasRoleByName(userId, roleName) {
    const result = await this.raw(`
      SELECT COUNT(*) as count 
      FROM usuario_roles ur 
      INNER JOIN roles role_check_table ON ur.rol_id = role_check_table.id 
      WHERE ur.usuario_id = ? AND role_check_table.nombre = ?
    `, [userId, roleName]);
    return result[0].count > 0;
  }

  /**
   * Obtiene estadísticas de roles
   */
  async getStatistics() {
    const totalRoles = await this.count();
    const rolesWithUsers = await this.raw(`
      SELECT COUNT(DISTINCT rol_id) as count 
      FROM usuario_roles
    `);
    const rolesWithoutUsers = totalRoles - rolesWithUsers[0].count;

    const mostUsedRole = await this.raw(`
      SELECT role_stats_table.nombre, COUNT(ur.usuario_id) as user_count
      FROM roles role_stats_table
      LEFT JOIN usuario_roles ur ON role_stats_table.id = ur.rol_id
      GROUP BY role_stats_table.id, role_stats_table.nombre
      ORDER BY user_count DESC
      LIMIT 1
    `);

    return {
      total: totalRoles,
      withUsers: rolesWithUsers[0].count,
      withoutUsers: rolesWithoutUsers,
      mostUsed: mostUsedRole[0] || null
    };
  }

  /**
   * Busca roles que no están siendo usados
   */
  async findUnusedRoles() {
    // Resetear el query builder para evitar conflictos
    this.reset();
    
    return await this
      .select('role_unused_table.*')
      .from('roles as role_unused_table')
      .leftJoin('usuario_roles', 'role_unused_table.id', 'usuario_roles.rol_id')
      .whereNull('usuario_roles.rol_id')
      .orderBy('role_unused_table.nombre', 'ASC')
      .get();
  }

  /**
   * Crea múltiples roles de una vez
   */
  async createMultiple(rolesData) {
    const results = [];
    
    for (const roleData of rolesData) {
      try {
        const result = await this.create(roleData);
        results.push({ success: true, data: result, role: roleData.nombre });
      } catch (error) {
        results.push({ success: false, error: error.message, role: roleData.nombre });
      }
    }
    
    return results;
  }

  /**
   * Busca roles con paginación
   */
  async findWithPagination(page = 1, limit = 10, search = '') {
    let query = this.select();

    // Aplicar búsqueda si se proporciona
    if (search) {
      query = query.whereLike('nombre', `%${search}%`);
    }

    // Calcular offset
    const offset = (page - 1) * limit;

    // Obtener total de registros
    const totalQuery = this.select('COUNT(*) as total');
    if (search) {
      totalQuery.whereLike('nombre', `%${search}%`);
    }

    const totalResult = await totalQuery.first();
    const total = totalResult.total;

    // Obtener registros paginados
    const roles = await query
      .orderBy('nombre', 'ASC')
      .limit(limit, offset)
      .get();

    return {
      data: roles,
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
   * Verifica si existe un rol con el nombre dado
   */
  async existsByName(nombre) {
    return await this.where('nombre', nombre).exists();
  }

  /**
   * Obtiene los roles por defecto del sistema
   */
  async getDefaultRoles() {
    const defaultRoleNames = ['admin', 'responsable_proyecto', 'responsable_tarea'];
    return await this.whereIn('nombre', defaultRoleNames).get();
  }
}

module.exports = RoleRepository;
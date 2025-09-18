const BaseRepository = require('./BaseRepository');
const bcrypt = require('bcryptjs');

/**
 * UserRepository - Repositorio para operaciones de usuarios
 * Siguiendo principios SOLID:
 * - Single Responsibility: Maneja operaciones específicas de usuarios
 * - Open/Closed: Extiende BaseRepository sin modificarlo
 * - Liskov Substitution: Puede sustituir a BaseRepository
 * - Interface Segregation: Métodos específicos para usuarios
 * - Dependency Inversion: Depende de BaseRepository (abstracción)
 */
class UserRepository extends BaseRepository {
  constructor() {
    super('usuarios');
  }

  /**
   * Busca un usuario por ID
   */
  async findById(id) {
    this.reset();
    return this.where('id', id).first();
  }

  /**
   * Busca un usuario por email
   */
  async findByEmail(email) {
    this.reset();
    return await this.where('email', email).first();
  }

  /**
   * Busca usuarios activos
   */
  async findActive() {
    return await this.where('estado', 'activo').get();
  }

  /**
   * Busca usuarios inactivos
   */
  async findInactive() {
    return await this.where('estado', 'inactivo').get();
  }

  /**
   * Busca administradores
   */
  async findAdministrators() {
    return await this.where('es_administrador', 1).get();
  }

  /**
   * Obtiene todos los usuarios con filtros opcionales
   */
  async findAll(options = {}) {
    try {
      console.log('UserRepository.findAll - Iniciando con opciones:', options);
      
      // Usar query SQL directa por ahora para diagnosticar
      const { pool } = require('../config/db');
      const [rows] = await pool.execute('SELECT * FROM usuarios ORDER BY created_at DESC LIMIT 10');
      
      console.log('UserRepository.findAll - Usuarios encontrados:', rows.length);
      return rows;
    } catch (error) {
      console.error('Error en UserRepository.findAll:', error);
      throw error;
    }
  }

  /**
   * Cuenta usuarios con filtros opcionales
   */
  async count(filters = {}) {
    try {
      this.reset(); // Asegurar que el query builder esté limpio
      
      let query = this.select('COUNT(*) as total');

      // Aplicar filtros
      if (filters.estado) {
        query = query.where('estado', filters.estado);
      }

      if (filters.es_administrador !== undefined) {
        query = query.where('es_administrador', filters.es_administrador);
      }

      if (filters.search) {
        query = query.where(function() {
          this.whereLike('nombre', `%${filters.search}%`)
              .orWhereLike('email', `%${filters.search}%`);
        });
      }

      const result = await query.first();
      return result.total;
    } catch (error) {
      console.error('Error en UserRepository.count:', error);
      throw error;
    }
  }

  /**
   * Busca usuarios por nombre (búsqueda parcial)
   */
  async findByName(name) {
    return await this.whereLike('nombre', `%${name}%`).get();
  }

  /**
   * Busca usuarios con paginación
   */
  async findWithPagination(page = 1, limit = 10, filters = {}) {
    let query = this.select();

    // Aplicar filtros
    if (filters.estado) {
      query = query.where('estado', filters.estado);
    }

    if (filters.es_administrador !== undefined) {
      query = query.where('es_administrador', filters.es_administrador);
    }

    if (filters.nombre) {
      query = query.whereLike('nombre', `%${filters.nombre}%`);
    }

    if (filters.email) {
      query = query.whereLike('email', `%${filters.email}%`);
    }

    // Calcular offset
    const offset = (page - 1) * limit;

    // Obtener total de registros
    const totalQuery = this.select('COUNT(*) as total');
    if (filters.estado) {
      totalQuery.where('estado', filters.estado);
    }
    if (filters.es_administrador !== undefined) {
      totalQuery.where('es_administrador', filters.es_administrador);
    }
    if (filters.nombre) {
      totalQuery.whereLike('nombre', `%${filters.nombre}%`);
    }
    if (filters.email) {
      totalQuery.whereLike('email', `%${filters.email}%`);
    }

    const totalResult = await totalQuery.first();
    const total = totalResult.total;

    // Obtener registros paginados
    const users = await query
      .orderBy('created_at', 'DESC')
      .limit(limit, offset)
      .get();

    return {
      data: users,
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
   * Crea un nuevo usuario con contraseña encriptada
   */
  async create(userData) {
    this.reset();
    const { nombre, email, contraseña, telefono, es_administrador = 0 } = userData;

    // Verificar si el email ya existe
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new Error('El email ya está registrado');
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(contraseña, 10);

    const data = {
      nombre,
      email,
      contraseña: hashedPassword,
      telefono: telefono || null,
      es_administrador,
      estado: 1, // Agregar estado por defecto
      created_at: new Date(),
      updated_at: new Date()
    };

    return await this.insert(data);
  }

  /**
   * Actualiza un usuario por ID
   */
  async updateById(id, userData) {
    const updateData = { ...userData };

    // Si se actualiza la contraseña, encriptarla
    if (updateData.contraseña) {
      updateData.contraseña = await bcrypt.hash(updateData.contraseña, 10);
    }

    // Agregar timestamp de actualización
    updateData.updated_at = new Date();

    return await this.where('id', id).update(updateData);
  }

  /**
   * Cambia el estado de un usuario
   */
  async changeStatus(id, estado) {
    if (!['activo', 'inactivo'].includes(estado)) {
      throw new Error('Estado inválido. Debe ser "activo" o "inactivo"');
    }

    return await this.where('id', id).update({
      estado,
      updated_at: new Date()
    });
  }

  /**
   * Activa un usuario
   */
  async activate(id) {
    return await this.changeStatus(id, 'activo');
  }

  /**
   * Desactiva un usuario
   */
  async deactivate(id) {
    return await this.changeStatus(id, 'inactivo');
  }

  /**
   * Cambia permisos de administrador
   */
  async changeAdminStatus(id, isAdmin) {
    return await this.where('id', id).update({
      es_administrador: isAdmin ? 1 : 0,
      updated_at: new Date()
    });
  }

  /**
   * Elimina un usuario (soft delete cambiando estado)
   */
  async softDelete(id) {
    return await this.deactivate(id);
  }

  /**
   * Elimina un usuario permanentemente
   */
  async hardDelete(id) {
    return await this.where('id', id).delete();
  }

  /**
   * Verifica las credenciales de un usuario
   */
  async verifyCredentials(email, contraseña) {
    const user = await this.findByEmail(email);
    
    if (!user) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(contraseña, user.contraseña);
    
    if (!isValidPassword) {
      return null;
    }

    // Retornar usuario sin la contraseña
    const { contraseña: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Busca usuarios con sus roles (usando JOIN)
   */
  async findWithRoles(userId = null) {
    // Resetear el query builder para evitar conflictos
    this.reset();
    
    // Usar query SQL directa para evitar conflictos de alias
    const { pool } = require('../config/db');
    
    if (userId) {
      const query = `
        SELECT 
          u.*, 
          GROUP_CONCAT(user_roles_table.nombre) as roles
        FROM usuarios u
        LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id
        LEFT JOIN roles user_roles_table ON ur.rol_id = user_roles_table.id
        WHERE u.id = ?
        GROUP BY u.id
      `;
      
      const [result] = await pool.execute(query, [userId]);
      return result[0] || null;
    }

    const query = `
      SELECT 
        u.*, 
        GROUP_CONCAT(user_roles_table.nombre) as roles
      FROM usuarios u
      LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id
      LEFT JOIN roles user_roles_table ON ur.rol_id = user_roles_table.id
      GROUP BY u.id
    `;
    
    const [result] = await pool.execute(query);
    return result;
  }

  /**
   * Busca usuarios por rango de fechas de creación
   */
  async findByDateRange(startDate, endDate) {
    return await this
      .whereBetween('created_at', startDate, endDate)
      .orderBy('created_at', 'DESC')
      .get();
  }

  /**
   * Cuenta usuarios por estado
   */
  async countByStatus() {
    const active = await this.where('estado', 'activo').count();
    const inactive = await this.where('estado', 'inactivo').count();
    
    return {
      activo: active,
      inactivo: inactive,
      total: active + inactive
    };
  }

  /**
   * Busca usuarios que no tienen roles asignados
   */
  async findWithoutRoles() {
    // Resetear el query builder para evitar conflictos
    this.reset();
    
    return await this
      .leftJoin('usuario_roles', 'usuarios.id', 'usuario_roles.usuario_id')
      .whereNull('usuario_roles.usuario_id')
      .get();
  }

  /**
   * Actualiza la última fecha de acceso
   */
  async updateLastAccess(id) {
    return await this.where('id', id).update({
      updated_at: new Date()
    });
  }
}

module.exports = UserRepository;
const BaseRepository = require('./BaseRepository');
const { pool } = require('../config/db');

/**
 * ProjectResponsibleRepository - Repositorio para la relación muchos-a-muchos proyectos-responsables
 * Siguiendo principios SOLID:
 * - Single Responsibility: Maneja operaciones específicas de proyecto-responsables
 * - Open/Closed: Extiende BaseRepository sin modificarlo
 * - Liskov Substitution: Puede sustituir a BaseRepository
 * - Interface Segregation: Métodos específicos para relaciones proyecto-responsable
 * - Dependency Inversion: Depende de BaseRepository (abstracción)
 */
class ProjectResponsibleRepository extends BaseRepository {
  constructor() {
    super('proyecto_responsables');
  }

  /**
   * Asigna un responsable a un proyecto
   */
  async assignResponsible(proyecto_id, usuario_id, rol_responsabilidad = 'colaborador', asignado_por = null, fecha_fin = null) {
    // Verificar si la relación ya existe
    const existing = await this
      .where('proyecto_id', proyecto_id)
      .where('usuario_id', usuario_id)
      .where('rol_responsabilidad', rol_responsabilidad)
      .first();

    if (existing) {
      // Si existe pero está inactivo, reactivarlo
      if (!existing.activo) {
        return await this
          .where('proyecto_id', proyecto_id)
          .where('usuario_id', usuario_id)
          .where('rol_responsabilidad', rol_responsabilidad)
          .update({
            activo: true,
            asignado_por,
            fecha_fin,
            updated_at: new Date()
          });
      }
      // Si ya existe y está activo, no hacer nada
      return { affectedRows: 0, message: 'El usuario ya tiene este rol asignado en el proyecto' };
    }

    // Crear nueva asignación
    return await this.insert({
      proyecto_id,
      usuario_id,
      rol_responsabilidad,
      asignado_por,
      activo: true
    });
  }

  /**
   * Remueve un responsable de un proyecto (soft delete)
   */
  async removeResponsible(proyecto_id, usuario_id, rol_responsabilidad = null) {
    let query = this.where('proyecto_id', proyecto_id).where('usuario_id', usuario_id);
    
    if (rol_responsabilidad) {
      query = query.where('rol_responsabilidad', rol_responsabilidad);
    }

    return await query.update({
      activo: false,
      updated_at: new Date()
    });
  }

  /**
   * Elimina permanentemente la relación proyecto-responsable
   */
  async deleteResponsible(proyecto_id, usuario_id, rol_responsabilidad = null) {
    let query = this.where('proyecto_id', proyecto_id).where('usuario_id', usuario_id);
    
    if (rol_responsabilidad) {
      query = query.where('rol_responsabilidad', rol_responsabilidad);
    }

    return await query.delete();
  }

  /**
   * Obtiene todos los responsables activos de un proyecto
   */
  async getProjectResponsibles(proyecto_id) {
    // Usar consulta SQL directa para evitar problemas con el query builder
    const query = `
      SELECT 
        pr.*, 
        u.nombre as usuario_nombre, 
        u.email, 
        asignador.nombre as asignado_por_nombre
      FROM proyecto_responsables pr
      INNER JOIN usuarios u ON pr.usuario_id = u.id
      LEFT JOIN usuarios asignador ON pr.asignado_por = asignador.id
      WHERE pr.proyecto_id = ? AND pr.activo = ?
      ORDER BY pr.rol_responsabilidad ASC
    `;
    
    const [rows] = await pool.execute(query, [proyecto_id, true]);
    return rows;
  }

  /**
   * Obtiene todos los proyectos donde un usuario es responsable
   */
  async getUserProjects(usuario_id) {
    return await this
      .select('proyecto_responsables.*, proyectos.titulo, proyectos.descripcion, proyectos.estado as proyecto_estado')
      .join('proyectos', 'proyecto_responsables.proyecto_id', 'proyectos.id')
      .where('proyecto_responsables.usuario_id', usuario_id)
      .where('proyecto_responsables.activo', true)
      .orderBy('proyecto_responsables.fecha_asignacion', 'DESC')
      .get();
  }

  /**
   * Obtiene responsables por rol específico en un proyecto
   */
  async getResponsiblesByRole(proyecto_id, rol_responsabilidad) {
    const validRoles = ['responsable_principal', 'responsable_secundario', 'colaborador', 'supervisor'];
    if (!validRoles.includes(rol_responsabilidad)) {
      throw new Error('Rol de responsabilidad inválido');
    }

    return await this
      .select('proyecto_responsables.*, usuarios.nombre as usuario_nombre, usuarios.email')
      .join('usuarios', 'proyecto_responsables.usuario_id', 'usuarios.id')
      .where('proyecto_responsables.proyecto_id', proyecto_id)
      .where('proyecto_responsables.rol_responsabilidad', rol_responsabilidad)
      .where('proyecto_responsables.activo', true)
      .orderBy('usuarios.nombre', 'ASC')
      .get();
  }

  /**
   * Obtiene el responsable principal de un proyecto
   */
  async getPrincipalResponsible(proyecto_id) {
    return await this
      .select('proyecto_responsables.*, usuarios.nombre as usuario_nombre, usuarios.email')
      .join('usuarios', 'proyecto_responsables.usuario_id', 'usuarios.id')
      .where('proyecto_responsables.proyecto_id', proyecto_id)
      .where('proyecto_responsables.rol_responsabilidad', 'responsable_principal')
      .where('proyecto_responsables.activo', true)
      .first();
  }

  /**
   * Verifica si un usuario es responsable de un proyecto
   */
  async isUserResponsible(proyecto_id, usuario_id, rol_responsabilidad = null) {
    let query = this
      .where('proyecto_id', proyecto_id)
      .where('usuario_id', usuario_id)
      .where('activo', true);

    if (rol_responsabilidad) {
      query = query.where('rol_responsabilidad', rol_responsabilidad);
    }

    return await query.exists();
  }

  /**
   * Actualiza el rol de responsabilidad de un usuario en un proyecto
   */
  async updateResponsibleRole(proyecto_id, usuario_id, rol_actual, nuevo_rol, asignado_por = null) {
    const validRoles = ['responsable_principal', 'responsable_secundario', 'colaborador', 'supervisor'];
    if (!validRoles.includes(nuevo_rol)) {
      throw new Error('Rol de responsabilidad inválido');
    }

    return await this
      .where('proyecto_id', proyecto_id)
      .where('usuario_id', usuario_id)
      .where('rol_responsabilidad', rol_actual)
      .update({
        rol_responsabilidad: nuevo_rol,
        asignado_por,
        updated_at: new Date()
      });
  }

  /**
   * Obtiene estadísticas de responsables de un proyecto
   */
  async getProjectStats(proyecto_id) {
    const stats = await this.raw(`
      SELECT 
        rol_responsabilidad,
        COUNT(*) as count
      FROM proyecto_responsables
      WHERE proyecto_id = ? AND activo = TRUE
      GROUP BY rol_responsabilidad
    `, [proyecto_id]);

    const total = await this
      .where('proyecto_id', proyecto_id)
      .where('activo', true)
      .count();

    return {
      total,
      byRole: stats.reduce((acc, item) => {
        acc[item.rol_responsabilidad] = item.count;
        return acc;
      }, {})
    };
  }

  /**
   * Transfiere responsabilidad de un usuario a otro
   */
  async transferResponsibility(proyecto_id, usuario_actual, usuario_nuevo, rol_responsabilidad, asignado_por = null) {
    return await this.transaction(async (connection) => {
      // Desactivar la responsabilidad actual
      await this
        .where('proyecto_id', proyecto_id)
        .where('usuario_id', usuario_actual)
        .where('rol_responsabilidad', rol_responsabilidad)
        .update({ activo: false, updated_at: new Date() });

      // Asignar al nuevo usuario
      return await this.assignResponsible(proyecto_id, usuario_nuevo, rol_responsabilidad, asignado_por);
    });
  }

  /**
   * Asigna múltiples responsables a un proyecto
   */
  async assignMultipleResponsibles(proyecto_id, responsibles, asignado_por = null) {
    const results = [];
    
    for (const responsible of responsibles) {
      try {
        const result = await this.assignResponsible(
          proyecto_id,
          responsible.usuario_id,
          responsible.rol_responsabilidad || 'colaborador',
          asignado_por,
          responsible.fecha_fin || null
        );
        results.push({ success: true, usuario_id: responsible.usuario_id, result });
      } catch (error) {
        results.push({ success: false, usuario_id: responsible.usuario_id, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Remueve múltiples responsables de un proyecto
   */
  async removeMultipleResponsibles(proyecto_id, usuario_ids) {
    const results = [];
    
    for (const usuario_id of usuario_ids) {
      try {
        const result = await this.removeResponsible(proyecto_id, usuario_id);
        results.push({ success: true, usuario_id, result });
      } catch (error) {
        results.push({ success: false, usuario_id, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Sincroniza los responsables de un proyecto
   */
  async syncProjectResponsibles(proyecto_id, responsibles, asignado_por = null) {
    return await this.transaction(async (connection) => {
      // Desactivar todos los responsables actuales
      await this
        .where('proyecto_id', proyecto_id)
        .update({ activo: false, updated_at: new Date() });

      // Asignar los nuevos responsables
      return await this.assignMultipleResponsibles(proyecto_id, responsibles, asignado_por);
    });
  }

  /**
   * Obtiene el historial completo de responsables de un proyecto
   */
  async getProjectResponsibleHistory(proyecto_id) {
    return await this
      .select('proyecto_responsables.*, usuarios.nombre as usuario_nombre, usuarios.email, asignador.nombre as asignado_por_nombre')
      .join('usuarios', 'proyecto_responsables.usuario_id', 'usuarios.id')
      .leftJoin('usuarios as asignador', 'proyecto_responsables.asignado_por', 'asignador.id')
      .where('proyecto_responsables.proyecto_id', proyecto_id)
      .orderBy('proyecto_responsables.fecha_asignacion', 'DESC')
      .get();
  }

  /**
   * Busca proyectos por responsable y rol
   */
  async findProjectsByResponsibleAndRole(usuario_id, rol_responsabilidad) {
    return await this
      .select('proyecto_responsables.*, proyectos.titulo, proyectos.descripcion, proyectos.estado')
      .join('proyectos', 'proyecto_responsables.proyecto_id', 'proyectos.id')
      .where('proyecto_responsables.usuario_id', usuario_id)
      .where('proyecto_responsables.rol_responsabilidad', rol_responsabilidad)
      .where('proyecto_responsables.activo', true)
      .orderBy('proyectos.created_at', 'DESC')
      .get();
  }

  /**
   * Obtiene estadísticas generales de responsabilidades
   */
  async getGeneralStatistics() {
    const totalAssignments = await this.where('activo', true).count();
    
    const byRole = await this.raw(`
      SELECT rol_responsabilidad, COUNT(*) as count
      FROM proyecto_responsables
      WHERE activo = TRUE
      GROUP BY rol_responsabilidad
      ORDER BY count DESC
    `);

    const mostActiveUser = await this.raw(`
      SELECT u.nombre, u.email, COUNT(pr.id) as project_count
      FROM proyecto_responsables pr
      INNER JOIN usuarios u ON pr.usuario_id = u.id
      WHERE pr.activo = TRUE
      GROUP BY pr.usuario_id, u.nombre, u.email
      ORDER BY project_count DESC
      LIMIT 1
    `);

    const projectsWithMostResponsibles = await this.raw(`
      SELECT p.titulo, COUNT(pr.id) as responsible_count
      FROM proyecto_responsables pr
      INNER JOIN proyectos p ON pr.proyecto_id = p.id
      WHERE pr.activo = TRUE
      GROUP BY pr.proyecto_id, p.titulo
      ORDER BY responsible_count DESC
      LIMIT 5
    `);

    return {
      totalActiveAssignments: totalAssignments,
      distributionByRole: byRole,
      mostActiveUser: mostActiveUser[0] || null,
      projectsWithMostResponsibles
    };
  }

  /**
   * Busca responsables por rango de fechas de asignación
   */
  async findByAssignmentDateRange(startDate, endDate) {
    return await this
      .select('proyecto_responsables.*, usuarios.nombre as usuario_nombre, proyectos.titulo as proyecto_titulo')
      .join('usuarios', 'proyecto_responsables.usuario_id', 'usuarios.id')
      .join('proyectos', 'proyecto_responsables.proyecto_id', 'proyectos.id')
      .whereBetween('proyecto_responsables.fecha_asignacion', startDate, endDate)
      .orderBy('proyecto_responsables.fecha_asignacion', 'DESC')
      .get();
  }

  /**
   * Obtiene proyectos sin responsables asignados
   */
  async findProjectsWithoutResponsibles() {
    return await this.raw(`
      SELECT p.*
      FROM proyectos p
      LEFT JOIN proyecto_responsables pr ON p.id = pr.proyecto_id AND pr.activo = TRUE
      WHERE pr.proyecto_id IS NULL
      ORDER BY p.created_at DESC
    `);
  }

  /**
   * Obtiene usuarios que no son responsables de ningún proyecto
   */
  async findUsersWithoutProjects() {
    return await this.raw(`
      SELECT u.*
      FROM usuarios u
      LEFT JOIN proyecto_responsables pr ON u.id = pr.usuario_id AND pr.activo = TRUE
      WHERE pr.usuario_id IS NULL AND u.estado = 'activo'
      ORDER BY u.nombre ASC
    `);
  }

  /**
   * Reactiva una responsabilidad previamente desactivada
   */
  async reactivateResponsible(proyecto_id, usuario_id, rol_responsabilidad, asignado_por = null) {
    return await this
      .where('proyecto_id', proyecto_id)
      .where('usuario_id', usuario_id)
      .where('rol_responsabilidad', rol_responsabilidad)
      .update({
        activo: true,
        asignado_por,
        updated_at: new Date()
      });
  }

  /**
   * Obtiene el conteo de proyectos por usuario responsable
   */
  async getProjectCountByUser() {
    return await this.raw(`
      SELECT u.id, u.nombre, u.email, COUNT(DISTINCT pr.proyecto_id) as project_count
      FROM usuarios u
      LEFT JOIN proyecto_responsables pr ON u.id = pr.usuario_id AND pr.activo = TRUE
      WHERE u.estado = 'activo'
      GROUP BY u.id, u.nombre, u.email
      ORDER BY project_count DESC, u.nombre ASC
    `);
  }
}

module.exports = ProjectResponsibleRepository;
const BaseSeeder = require('./BaseSeeder');

/**
 * RoleSeeder - Seeder para roles básicos del sistema
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja la creación de roles
 * - Open/Closed: Extiende BaseSeeder sin modificarlo
 * - Liskov Substitution: Puede sustituir a BaseSeeder
 * - Interface Segregation: Implementa solo lo necesario para roles
 * - Dependency Inversion: Depende de BaseSeeder (abstracción)
 */
class RoleSeeder extends BaseSeeder {
  constructor() {
    super('RoleSeeder');
  }

  /**
   * Ejecuta el seeding de roles básicos
   */
  async seed() {
    const roles = [
      {
        nombre: 'admin',
        descripcion: 'Administrador del sistema con acceso completo'
      },
      {
        nombre: 'responsable_proyecto',
        descripcion: 'Responsable de proyectos con permisos de gestión'
      },
      {
        nombre: 'responsable_tarea',
        descripcion: 'Responsable de tareas con permisos limitados'
      }
    ];

    for (const roleData of roles) {
      await this.insertIfNotExists('roles', roleData, ['nombre']);
    }

    // Verificar que todos los roles fueron creados
    const totalRoles = await this.execute('SELECT COUNT(*) as count FROM roles');
    if (totalRoles[0].count >= 3) {
      console.log(`✅ Roles seeded successfully. Total roles: ${totalRoles[0].count}`);
    }
  }

  /**
   * Método para obtener el ID de un rol por nombre
   */
  async getRoleId(roleName) {
    return await this.getId('roles', { nombre: roleName });
  }

  /**
   * Método para verificar si todos los roles básicos existen
   */
  async validateRoles() {
    const requiredRoles = ['admin', 'responsable_proyecto', 'responsable_tarea'];
    const missingRoles = [];

    for (const roleName of requiredRoles) {
      const exists = await this.exists('roles', { nombre: roleName });
      if (!exists) {
        missingRoles.push(roleName);
      }
    }

    if (missingRoles.length > 0) {
      throw new Error(`Missing required roles: ${missingRoles.join(', ')}`);
    }

    return true;
  }
}

module.exports = RoleSeeder;
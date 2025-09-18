const BaseSeeder = require('./BaseSeeder');
const bcrypt = require('bcryptjs');

/**
 * UserSeeder - Seeder para usuario administrador por defecto
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja la creación de usuarios
 * - Open/Closed: Extiende BaseSeeder sin modificarlo
 * - Liskov Substitution: Puede sustituir a BaseSeeder
 * - Interface Segregation: Implementa solo lo necesario para usuarios
 * - Dependency Inversion: Depende de BaseSeeder (abstracción)
 */
class UserSeeder extends BaseSeeder {
  constructor() {
    super('UserSeeder');
  }

  /**
   * Ejecuta el seeding del usuario administrador por defecto
   */
  async seed() {
    // Crear usuario administrador por defecto
    const adminUser = {
      nombre: 'Administrador del Sistema',
      email: 'admin@gestion-proyectos.com',
      contraseña: await this.hashPassword('admin123'),
      telefono: '+1234567890',
      estado: 1,
      es_administrador: 1
    };

    const adminId = await this.insertIfNotExists('usuarios', adminUser, ['email']);

    // Si se creó el usuario, asignar rol de admin
    if (adminId) {
      const adminRoleId = await this.getId('roles', { nombre: 'admin' });
      
      if (adminRoleId) {
        await this.insertIfNotExists('usuario_roles', {
          usuario_id: adminId,
          rol_id: adminRoleId
        }, ['usuario_id', 'rol_id']);
      }
    }

    // Crear usuarios de ejemplo para testing
    const testUsers = [
      {
        nombre: 'Juan Pérez',
        email: 'juan.perez@empresa.com',
        contraseña: await this.hashPassword('password123'),
        telefono: '+1234567891',
        estado: 1,
        es_administrador: 0
      },
      {
        nombre: 'María García',
        email: 'maria.garcia@empresa.com',
        contraseña: await this.hashPassword('password123'),
        telefono: '+1234567892',
        estado: 1,
        es_administrador: 0
      },
      {
        nombre: 'Carlos López',
        email: 'carlos.lopez@empresa.com',
        contraseña: await this.hashPassword('password123'),
        telefono: '+1234567893',
        estado: 1,
        es_administrador: 0
      },
      {
        nombre: 'Ana Martínez',
        email: 'ana.martinez@empresa.com',
        contraseña: await this.hashPassword('password123'),
        telefono: '+1234567894',
        estado: 1,
        es_administrador: 0
      }
    ];

    // Crear usuarios de prueba y asignar roles
    for (const userData of testUsers) {
      const userId = await this.insertIfNotExists('usuarios', userData, ['email']);
      
      if (userId) {
        // Asignar rol aleatorio (responsable_proyecto o responsable_tarea)
        const roles = ['responsable_proyecto', 'responsable_tarea'];
        const randomRole = this.randomChoice(roles);
        const roleId = await this.getId('roles', { nombre: randomRole });
        
        if (roleId) {
          await this.insertIfNotExists('usuario_roles', {
            usuario_id: userId,
            rol_id: roleId
          }, ['usuario_id', 'rol_id']);
        }
      }
    }

    // Verificar que los usuarios fueron creados
    const totalUsers = await this.execute('SELECT COUNT(*) as count FROM usuarios');
    console.log(`✅ Users seeded successfully. Total users: ${totalUsers[0].count}`);
  }

  /**
   * Hashea una contraseña usando bcrypt
   */
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Obtiene el ID de un usuario por email
   */
  async getUserId(email) {
    return await this.getId('usuarios', { email });
  }

  /**
   * Verifica si el usuario administrador existe
   */
  async validateAdminUser() {
    const adminExists = await this.exists('usuarios', { 
      email: 'admin@gestion-proyectos.com',
      es_administrador: 1 
    });

    if (!adminExists) {
      throw new Error('Admin user not found');
    }

    return true;
  }

  /**
   * Obtiene estadísticas de usuarios creados
   */
  async getUserStats() {
    const stats = await this.execute(`
      SELECT 
        COUNT(*) as total_users,
        SUM(es_administrador) as admin_users,
        COUNT(*) - SUM(es_administrador) as regular_users
      FROM usuarios
    `);

    return stats[0];
  }
}

module.exports = UserSeeder;
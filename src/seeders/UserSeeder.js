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
      contraseña: await this.hashPassword('Proyecto123!'), // Hash único
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

    // Obtener rol de gestor de proyectos
    const managerRoleId = await this.getId('roles', { nombre: 'gestor_proyectos' });

    // Crear 5 usuarios gestores de proyectos
    // Cada uno con su propio hash único (aunque la contraseña sea la misma)
    const projectManagers = [
      {
        nombre: 'Carlos Rodríguez',
        email: 'carlos.rodriguez@gestion-proyectos.com',
        contraseña: await this.hashPassword('Proyecto123!'), // Hash único
        telefono: '+1234567891',
        estado: 1,
        es_administrador: 0
      },
      {
        nombre: 'María González',
        email: 'maria.gonzalez@gestion-proyectos.com',
        contraseña: await this.hashPassword('Proyecto123!'), // Hash único
        telefono: '+1234567892',
        estado: 1,
        es_administrador: 0
      },
      {
        nombre: 'Juan Martínez',
        email: 'juan.martinez@gestion-proyectos.com',
        contraseña: await this.hashPassword('Proyecto123!'), // Hash único
        telefono: '+1234567893',
        estado: 1,
        es_administrador: 0
      },
      {
        nombre: 'Ana López',
        email: 'ana.lopez@gestion-proyectos.com',
        contraseña: await this.hashPassword('Proyecto123!'), // Hash único
        telefono: '+1234567894',
        estado: 1,
        es_administrador: 0
      },
      {
        nombre: 'Pedro Sánchez',
        email: 'pedro.sanchez@gestion-proyectos.com',
        contraseña: await this.hashPassword('Proyecto123!'), // Hash único
        telefono: '+1234567895',
        estado: 1,
        es_administrador: 0
      }
    ];

    // Crear cada gestor de proyectos
    for (const manager of projectManagers) {
      const managerId = await this.insertIfNotExists('usuarios', manager, ['email']);
      
      // Asignar rol de gestor de proyectos
      if (managerId && managerRoleId) {
        await this.insertIfNotExists('usuario_roles', {
          usuario_id: managerId,
          rol_id: managerRoleId
        }, ['usuario_id', 'rol_id']);
      }
    }

    // Verificar que los usuarios fueron creados
    const totalUsers = await this.execute('SELECT COUNT(*) as count FROM usuarios');
    console.log(`✅ Users seeded successfully. Total users: ${totalUsers[0].count}`);
    
    // Mostrar credenciales
    console.log('\n📋 CREDENCIALES DE USUARIOS:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('👤 ADMINISTRADOR:');
    console.log('   Email: admin@gestion-proyectos.com');
    console.log('   Contraseña: Proyecto123!');
    console.log('\n👥 GESTORES DE PROYECTOS:');
    console.log('   1. Carlos Rodríguez - carlos.rodriguez@gestion-proyectos.com');
    console.log('   2. María González - maria.gonzalez@gestion-proyectos.com');
    console.log('   3. Juan Martínez - juan.martinez@gestion-proyectos.com');
    console.log('   4. Ana López - ana.lopez@gestion-proyectos.com');
    console.log('   5. Pedro Sánchez - pedro.sanchez@gestion-proyectos.com');
    console.log('   Contraseña (todos): Proyecto123!');
    console.log('   ⚠️  Nota: Cada usuario tiene un hash único por seguridad');
    console.log('═══════════════════════════════════════════════════════════\n');
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
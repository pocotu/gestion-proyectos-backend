const RoleSeeder = require('./RoleSeeder');
const UserSeeder = require('./UserSeeder');
const ProjectSeeder = require('./ProjectSeeder');
const TaskSeeder = require('./TaskSeeder');
const ActivityLogSeeder = require('./ActivityLogSeeder');

/**
 * SeederManager - Gestor principal de seeders
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja la ejecución coordinada de seeders
 * - Open/Closed: Abierto para extensión (nuevos seeders), cerrado para modificación
 * - Liskov Substitution: Todos los seeders pueden sustituirse entre sí
 * - Interface Segregation: Cada seeder implementa solo lo que necesita
 * - Dependency Inversion: Depende de abstracciones (BaseSeeder)
 */
class SeederManager {
  constructor() {
    this.seeders = [
      new RoleSeeder(),
      new UserSeeder(),
      new ProjectSeeder(),
      new TaskSeeder(),
      new ActivityLogSeeder()
    ];
  }

  /**
   * Ejecuta todos los seeders en orden
   */
  async runAll() {
    console.log('🌱 Starting database seeding process...\n');
    
    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    for (const seeder of this.seeders) {
      try {
        console.log(`📦 Running ${seeder.constructor.name}...`);
        await seeder.run();
        successCount++;
        console.log(`✅ ${seeder.constructor.name} completed successfully\n`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error in ${seeder.constructor.name}:`, error.message);
        console.error('Stack trace:', error.stack);
        console.log(''); // Empty line for readability
        
        // Decidir si continuar o detener el proceso
        if (this.shouldStopOnError(seeder)) {
          console.log('🛑 Stopping seeding process due to critical error');
          break;
        }
      }
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Mostrar resumen final
    this.showSummary(successCount, errorCount, duration);

    // Mostrar estadísticas de la base de datos
    await this.showDatabaseStats();

    return { successCount, errorCount, duration };
  }

  /**
   * Ejecuta un seeder específico por nombre
   */
  async runSpecific(seederName) {
    const seeder = this.seeders.find(s => 
      s.constructor.name.toLowerCase() === seederName.toLowerCase() ||
      s.constructor.name.toLowerCase() === `${seederName.toLowerCase()}seeder`
    );

    if (!seeder) {
      throw new Error(`Seeder '${seederName}' not found. Available seeders: ${this.getAvailableSeeders().join(', ')}`);
    }

    console.log(`🌱 Running specific seeder: ${seeder.constructor.name}...\n`);
    
    try {
      await seeder.run(); // Usar run() en lugar de seed() para inicializar la conexión
      console.log(`✅ ${seeder.constructor.name} completed successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Error in ${seeder.constructor.name}:`, error.message);
      throw error;
    }
  }

  /**
   * Limpia todos los datos de las tablas (usar con precaución)
   */
  async truncateAll() {
    console.log('🗑️ Truncating all tables...\n');
    
    const tables = ['tareas', 'proyecto_responsables', 'usuario_roles', 'archivos', 'log_actividades', 'proyectos', 'usuarios', 'roles'];
    
    for (const seeder of this.seeders) {
      try {
        for (const table of tables) {
          await seeder.truncateTable(table);
        }
      } catch (error) {
        console.error(`Error truncating tables:`, error.message);
      }
      break; // Solo necesitamos usar un seeder para truncar
    }
    
    console.log('✅ All tables truncated successfully\n');
  }

  /**
   * Refresca todos los datos (trunca y vuelve a sembrar)
   */
  async refresh() {
    console.log('🔄 Refreshing database (truncate + seed)...\n');
    
    await this.truncateAll();
    return await this.runAll();
  }

  /**
   * Determina si debe detener el proceso en caso de error
   */
  shouldStopOnError(seeder) {
    // Los seeders críticos (roles y usuarios) deben detener el proceso
    const criticalSeeders = ['RoleSeeder', 'UserSeeder'];
    return criticalSeeders.includes(seeder.constructor.name);
  }

  /**
   * Muestra el resumen final del proceso de seeding
   */
  showSummary(successCount, errorCount, duration) {
    console.log('📊 SEEDING SUMMARY');
    console.log('==================');
    console.log(`✅ Successful seeders: ${successCount}`);
    console.log(`❌ Failed seeders: ${errorCount}`);
    console.log(`⏱️ Total duration: ${duration}s`);
    console.log(`📈 Success rate: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
    console.log('');
  }

  /**
   * Muestra estadísticas de la base de datos después del seeding
   */
  async showDatabaseStats() {
    if (this.seeders.length === 0) return;

    try {
      const seeder = this.seeders[0]; // Usar el primer seeder para consultas
      
      console.log('📈 DATABASE STATISTICS');
      console.log('======================');
      
      // Estadísticas de cada tabla
      const tables = ['roles', 'usuarios', 'proyectos', 'tareas'];
      
      for (const table of tables) {
        try {
          const count = await seeder.execute(`SELECT COUNT(*) as count FROM ${table}`);
          console.log(`${table.toUpperCase()}: ${count[0].count} records`);
        } catch (error) {
          console.log(`${table.toUpperCase()}: Error getting count`);
        }
      }

      // Estadísticas específicas si están disponibles
      try {
        if (this.seeders.find(s => s.constructor.name === 'UserSeeder')) {
          const userSeeder = this.seeders.find(s => s.constructor.name === 'UserSeeder');
          const userStats = await userSeeder.getUserStats();
          console.log(`\nUSER BREAKDOWN:`);
          console.log(`- Admin users: ${userStats.admin_users}`);
          console.log(`- Regular users: ${userStats.regular_users}`);
        }

        if (this.seeders.find(s => s.constructor.name === 'ProjectSeeder')) {
          const projectSeeder = this.seeders.find(s => s.constructor.name === 'ProjectSeeder');
          const projectStats = await projectSeeder.getProjectStats();
          console.log(`\nPROJECT BREAKDOWN:`);
          console.log(`- Completed: ${projectStats.completed_projects}`);
          console.log(`- In Progress: ${projectStats.in_progress_projects}`);
          console.log(`- Planning: ${projectStats.planning_projects}`);
          console.log(`- Avg Completion: ${parseFloat(projectStats.avg_completion).toFixed(1)}%`);
        }

        if (this.seeders.find(s => s.constructor.name === 'TaskSeeder')) {
          const taskSeeder = this.seeders.find(s => s.constructor.name === 'TaskSeeder');
          const taskStats = await taskSeeder.getTaskStats();
          console.log(`\nTASK BREAKDOWN:`);
          console.log(`- Completed: ${taskStats.completed_tasks}`);
          console.log(`- In Progress: ${taskStats.in_progress_tasks}`);
          console.log(`- Pending: ${taskStats.pending_tasks}`);
          console.log(`- Avg Completion: ${parseFloat(taskStats.avg_completion).toFixed(1)}%`);
        }

      } catch (error) {
        console.log('Note: Some detailed statistics unavailable');
      }

      console.log('');
    } catch (error) {
      console.log('❌ Error getting database statistics:', error.message);
    }
  }

  /**
   * Obtiene la lista de seeders disponibles
   */
  getAvailableSeeders() {
    return this.seeders.map(s => s.constructor.name);
  }

  /**
   * Valida que todos los seeders críticos se ejecutaron correctamente
   */
  async validateSeeding() {
    console.log('🔍 Validating seeding results...\n');
    
    const validations = [];

    for (const seeder of this.seeders) {
      try {
        if (typeof seeder.validate === 'function') {
          await seeder.validate();
          validations.push({ seeder: seeder.constructor.name, status: 'valid' });
        } else {
          validations.push({ seeder: seeder.constructor.name, status: 'no_validation' });
        }
      } catch (error) {
        validations.push({ 
          seeder: seeder.constructor.name, 
          status: 'invalid', 
          error: error.message 
        });
      }
    }

    // Mostrar resultados de validación
    console.log('VALIDATION RESULTS:');
    validations.forEach(v => {
      const icon = v.status === 'valid' ? '✅' : v.status === 'invalid' ? '❌' : '⚠️';
      console.log(`${icon} ${v.seeder}: ${v.status}`);
      if (v.error) {
        console.log(`   Error: ${v.error}`);
      }
    });

    return validations;
  }
}

// Función principal para ejecutar desde línea de comandos
async function main() {
  const manager = new SeederManager();
  const args = process.argv.slice(2);
  
  try {
    if (args.length === 0) {
      // Ejecutar todos los seeders
      await manager.runAll();
    } else {
      const command = args[0].toLowerCase();
      
      switch (command) {
        case 'refresh':
          await manager.refresh();
          break;
        case 'truncate':
          await manager.truncateAll();
          break;
        case 'validate':
          await manager.validateSeeding();
          break;
        default:
          // Ejecutar seeder específico
          await manager.runSpecific(command);
          break;
      }
    }
    
    console.log('🎉 Seeding process completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Seeding process failed:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = SeederManager;
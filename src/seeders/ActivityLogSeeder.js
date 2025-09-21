const BaseSeeder = require('./BaseSeeder');

/**
 * ActivityLogSeeder - Genera datos de prueba para logs de actividad
 * Siguiendo principios SOLID y patrones establecidos
 */
class ActivityLogSeeder extends BaseSeeder {
  constructor() {
    super('ActivityLogSeeder');
  }

  /**
   * Ejecuta el seeding de logs de actividad de ejemplo
   */
  async seed() {
    // Obtener usuarios existentes
    const users = await this.execute(`
      SELECT id, nombre, email 
      FROM usuarios 
      ORDER BY id 
      LIMIT 10
    `);

    if (users.length === 0) {
      console.log('⚠️ No users found for activity log seeding');
      return;
    }

    // Obtener proyectos existentes
    const projects = await this.execute(`
      SELECT id, titulo 
      FROM proyectos 
      ORDER BY id 
      LIMIT 5
    `);

    // Obtener tareas existentes
    const tasks = await this.execute(`
      SELECT id, titulo 
      FROM tareas 
      ORDER BY id 
      LIMIT 10
    `);

    const activityLogs = [];

    // Generar logs de actividad variados
    const actions = ['crear', 'actualizar', 'eliminar', 'login', 'logout', 'asignar', 'completar'];
    const entityTypes = ['usuario', 'proyecto', 'tarea', 'archivo', 'rol'];

    // Logs de login/logout para usuarios
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      // Log de login
      activityLogs.push({
        usuario_id: user.id,
        accion: 'login',
        entidad_tipo: 'usuario',
        entidad_id: user.id,
        descripcion: `Usuario ${user.nombre} inició sesión`,
        created_at: this.getRandomDate(30) // Últimos 30 días
      });

      // Algunos logs de logout
      if (i % 2 === 0) {
        activityLogs.push({
          usuario_id: user.id,
          accion: 'logout',
          entidad_tipo: 'usuario',
          entidad_id: user.id,
          descripcion: `Usuario ${user.nombre} cerró sesión`,
          created_at: this.getRandomDate(30)
        });
      }
    }

    // Logs de creación de proyectos
    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      const user = users[i % users.length];
      
      activityLogs.push({
        usuario_id: user.id,
        accion: 'crear',
        entidad_tipo: 'proyecto',
        entidad_id: project.id,
        descripcion: `Proyecto "${project.titulo}" creado por ${user.nombre}`,
        created_at: this.getRandomDate(25)
      });

      // Algunos logs de actualización
      if (i % 2 === 0) {
        activityLogs.push({
          usuario_id: user.id,
          accion: 'actualizar',
          entidad_tipo: 'proyecto',
          entidad_id: project.id,
          descripcion: `Proyecto "${project.titulo}" actualizado por ${user.nombre}`,
          created_at: this.getRandomDate(20)
        });
      }
    }

    // Logs de tareas
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const user = users[i % users.length];
      
      activityLogs.push({
        usuario_id: user.id,
        accion: 'crear',
        entidad_tipo: 'tarea',
        entidad_id: task.id,
        descripcion: `Tarea "${task.titulo}" creada por ${user.nombre}`,
        created_at: this.getRandomDate(20)
      });

      // Logs de asignación
      if (i % 3 === 0) {
        const assignedUser = users[(i + 1) % users.length];
        activityLogs.push({
          usuario_id: user.id,
          accion: 'asignar',
          entidad_tipo: 'tarea',
          entidad_id: task.id,
          descripcion: `Tarea "${task.titulo}" asignada a ${assignedUser.nombre}`,
          created_at: this.getRandomDate(15)
        });
      }

      // Algunos logs de completar
      if (i % 4 === 0) {
        activityLogs.push({
          usuario_id: user.id,
          accion: 'completar',
          entidad_tipo: 'tarea',
          entidad_id: task.id,
          descripcion: `Tarea "${task.titulo}" completada por ${user.nombre}`,
          created_at: this.getRandomDate(10)
        });
      }
    }

    // Logs de gestión de usuarios (solo admin)
    const adminUser = users.find(u => u.email === 'admin@gestion-proyectos.com') || users[0];
    
    for (let i = 1; i < Math.min(users.length, 5); i++) {
      const targetUser = users[i];
      
      activityLogs.push({
        usuario_id: adminUser.id,
        accion: 'crear',
        entidad_tipo: 'usuario',
        entidad_id: targetUser.id,
        descripcion: `Usuario ${targetUser.nombre} creado por administrador`,
        created_at: this.getRandomDate(35)
      });

      // Algunos logs de actualización de usuarios
      if (i % 2 === 0) {
        activityLogs.push({
          usuario_id: adminUser.id,
          accion: 'actualizar',
          entidad_tipo: 'usuario',
          entidad_id: targetUser.id,
          descripcion: `Información de usuario ${targetUser.nombre} actualizada`,
          created_at: this.getRandomDate(15)
        });
      }
    }

    // Logs de gestión de roles
    activityLogs.push({
      usuario_id: adminUser.id,
      accion: 'asignar',
      entidad_tipo: 'rol',
      entidad_id: 1,
      descripcion: 'Rol de administrador asignado',
      created_at: this.getRandomDate(40)
    });

    // Insertar todos los logs
    for (const logData of activityLogs) {
      await this.insertIfNotExists('logs_actividad', logData, ['usuario_id', 'accion', 'entidad_tipo', 'entidad_id', 'created_at']);
    }

    // Verificar que los logs fueron creados
    const totalLogs = await this.execute('SELECT COUNT(*) as count FROM logs_actividad');
    console.log(`✅ Activity logs seeded successfully. Total logs: ${totalLogs[0].count}`);
  }

  /**
   * Genera una fecha aleatoria en los últimos N días
   */
  getRandomDate(daysBack) {
    const now = new Date();
    const pastDate = new Date(now.getTime() - (Math.random() * daysBack * 24 * 60 * 60 * 1000));
    return pastDate.toISOString().slice(0, 19).replace('T', ' ');
  }

  /**
   * Valida que los logs fueron creados correctamente
   */
  async validate() {
    const count = await this.execute('SELECT COUNT(*) as count FROM logs_actividad');
    if (count[0].count === 0) {
      throw new Error('No activity logs were created');
    }

    // Verificar que hay logs de diferentes tipos
    const actionTypes = await this.execute(`
      SELECT DISTINCT accion 
      FROM logs_actividad 
      ORDER BY accion
    `);

    if (actionTypes.length < 3) {
      throw new Error('Not enough variety in activity log actions');
    }

    console.log(`✅ Activity logs validation passed. ${count[0].count} logs with ${actionTypes.length} different actions`);
  }
}

module.exports = ActivityLogSeeder;
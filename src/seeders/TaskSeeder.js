const BaseSeeder = require('./BaseSeeder');

/**
 * TaskSeeder - Seeder para tareas de ejemplo
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja la creación de tareas
 * - Open/Closed: Extiende BaseSeeder sin modificarlo
 * - Liskov Substitution: Puede sustituir a BaseSeeder
 * - Interface Segregation: Implementa solo lo necesario para tareas
 * - Dependency Inversion: Depende de BaseSeeder (abstracción)
 */
class TaskSeeder extends BaseSeeder {
  constructor() {
    super('TaskSeeder');
  }

  /**
   * Ejecuta el seeding de tareas de ejemplo
   */
  async seed() {
    // Obtener proyectos existentes
    const projects = await this.execute('SELECT id, titulo, fecha_inicio FROM proyectos ORDER BY id');
    
    if (projects.length === 0) {
      console.log('⚠️ No projects found for task assignment');
      return;
    }

    // Obtener usuario admin para asignar tareas
    const adminUser = await this.execute(`
      SELECT id, nombre, email 
      FROM usuarios 
      WHERE es_administrador = 1 
      LIMIT 1
    `);

    if (adminUser.length === 0) {
      console.log('⚠️ No admin user found for task assignment');
      return;
    }

    const admin = adminUser[0];

    const createdTasks = [];
    let totalTasksCreated = 0;
    let totalAssignmentsCreated = 0;

    // Obtener todos los usuarios para asignaciones
    const allUsers = await this.execute('SELECT id, nombre FROM usuarios');

    // Crear exactamente 20 tareas para cada proyecto
    for (const project of projects) {
      const tasksForProject = this.generateTasksForProject(project);
      
      console.log(`📝 Creating 20 tasks for project: ${project.titulo}`);
      
      for (const taskData of tasksForProject) {
        const taskId = await this.insertIfNotExists('tareas', {
          ...taskData,
          proyecto_id: project.id,
          usuario_asignado_id: admin.id,
          creado_por: admin.id
        }, ['titulo', 'proyecto_id']);

        if (taskId) {
          createdTasks.push({ id: taskId, ...taskData, proyecto_id: project.id });
          totalTasksCreated++;

          // Crear asignación en tarea_asignaciones
          const assignmentId = await this.insertIfNotExists('tarea_asignaciones', {
            tarea_id: taskId,
            usuario_id: admin.id,
            rol_asignacion: 'responsable_principal',
            asignado_por: admin.id,
            activo: true
          }, ['tarea_id', 'usuario_id']);

          if (assignmentId) {
            totalAssignmentsCreated++;
          }

          // Para algunas tareas, agregar colaboradores adicionales (30% de las tareas)
          if (Math.random() < 0.3 && allUsers.length > 1) {
            const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
            if (randomUser.id !== admin.id) {
              await this.insertIfNotExists('tarea_asignaciones', {
                tarea_id: taskId,
                usuario_id: randomUser.id,
                rol_asignacion: 'colaborador',
                asignado_por: admin.id,
                activo: true
              }, ['tarea_id', 'usuario_id']);
              totalAssignmentsCreated++;
            }
          }
        }
      }
    }

    // Verificar que las tareas fueron creadas
    const totalTasks = await this.execute('SELECT COUNT(*) as count FROM tareas');
    const totalAssignments = await this.execute('SELECT COUNT(*) as count FROM tarea_asignaciones WHERE activo = TRUE');
    console.log(`✅ Tasks seeded successfully. Total tasks: ${totalTasks[0].count}`);
    console.log(`✅ Task assignments created: ${totalAssignments[0].count}`);
    console.log(`📊 Tasks created in this run: ${totalTasksCreated}`);
    console.log(`📊 Assignments created in this run: ${totalAssignmentsCreated}`);
    console.log(`📊 Projects with tasks: ${projects.length}`);
    console.log(`📊 Average tasks per project: ${(totalTasks[0].count / projects.length).toFixed(1)}`);
    console.log(`📊 Average assignments per task: ${(totalAssignments[0].count / totalTasks[0].count).toFixed(1)}`);

    // Mostrar distribución por estado
    const distribution = await this.execute(`
      SELECT estado, COUNT(*) as count 
      FROM tareas 
      GROUP BY estado 
      ORDER BY count DESC
    `);
    console.log('📊 Task distribution by status:');
    distribution.forEach(d => {
      console.log(`   - ${d.estado}: ${d.count} tasks`);
    });

    return createdTasks;
  }

  /**
   * Genera exactamente 20 tareas para un proyecto
   */
  generateTasksForProject(project) {
    const tasks = [];
    const estados = ['completada', 'en_progreso', 'pendiente', 'cancelada'];
    const prioridades = ['baja', 'media', 'alta'];
    
    // Plantillas de tareas genéricas
    const taskTemplates = [
      { titulo: 'Análisis de requerimientos', descripcion: 'Documentar requerimientos funcionales y no funcionales del proyecto.' },
      { titulo: 'Diseño de arquitectura', descripcion: 'Definir la arquitectura técnica y componentes del sistema.' },
      { titulo: 'Diseño de base de datos', descripcion: 'Crear el modelo de datos y esquema de base de datos.' },
      { titulo: 'Configuración de entorno de desarrollo', descripcion: 'Preparar el entorno de desarrollo con todas las herramientas necesarias.' },
      { titulo: 'Implementación de autenticación', descripcion: 'Desarrollar sistema de autenticación y autorización de usuarios.' },
      { titulo: 'Desarrollo de API REST', descripcion: 'Crear endpoints de API para las funcionalidades principales.' },
      { titulo: 'Diseño de interfaz de usuario', descripcion: 'Crear mockups y prototipos de la interfaz de usuario.' },
      { titulo: 'Implementación de frontend', descripcion: 'Desarrollar componentes y vistas del frontend.' },
      { titulo: 'Integración frontend-backend', descripcion: 'Conectar el frontend con los servicios del backend.' },
      { titulo: 'Implementación de validaciones', descripcion: 'Agregar validaciones de datos en frontend y backend.' },
      { titulo: 'Desarrollo de reportes', descripcion: 'Crear módulo de reportes y exportación de datos.' },
      { titulo: 'Optimización de consultas', descripcion: 'Optimizar consultas de base de datos para mejor rendimiento.' },
      { titulo: 'Implementación de caché', descripcion: 'Agregar sistema de caché para mejorar tiempos de respuesta.' },
      { titulo: 'Testing unitario', descripcion: 'Escribir y ejecutar pruebas unitarias para componentes críticos.' },
      { titulo: 'Testing de integración', descripcion: 'Realizar pruebas de integración entre módulos del sistema.' },
      { titulo: 'Testing de seguridad', descripcion: 'Ejecutar pruebas de seguridad y vulnerabilidades.' },
      { titulo: 'Documentación técnica', descripcion: 'Crear documentación técnica completa del proyecto.' },
      { titulo: 'Documentación de usuario', descripcion: 'Elaborar manuales de usuario y guías de uso.' },
      { titulo: 'Despliegue en ambiente de pruebas', descripcion: 'Configurar y desplegar el sistema en ambiente de QA.' },
      { titulo: 'Capacitación de usuarios', descripcion: 'Realizar sesiones de capacitación para usuarios finales.' }
    ];

    // Generar 20 tareas con distribución realista de estados
    // 40% completadas, 30% en progreso, 25% pendientes, 5% canceladas
    const estadoDistribution = [
      ...Array(8).fill('completada'),
      ...Array(6).fill('en_progreso'),
      ...Array(5).fill('pendiente'),
      ...Array(1).fill('cancelada')
    ];

    // Mezclar la distribución de estados
    this.shuffleArray(estadoDistribution);

    for (let i = 0; i < 20; i++) {
      const template = taskTemplates[i];
      const estado = estadoDistribution[i];
      
      // Asignar prioridad basada en el tipo de tarea
      let prioridad = 'media';
      if (i < 5) prioridad = 'alta'; // Primeras 5 tareas son de alta prioridad
      else if (i > 15) prioridad = 'baja'; // Últimas 4 tareas son de baja prioridad
      
      // Calcular fechas basadas en el estado
      let fecha_inicio, fecha_fin;
      const baseDate = new Date(project.fecha_inicio || '2024-01-01');
      
      if (estado === 'completada') {
        // Tareas completadas: fechas en el pasado
        fecha_inicio = this.getDatePlusDays(baseDate.toISOString().split('T')[0], i * 3);
        fecha_fin = this.getDatePlusDays(fecha_inicio, 5 + Math.floor(Math.random() * 10));
      } else if (estado === 'en_progreso') {
        // Tareas en progreso: iniciadas pero no terminadas
        fecha_inicio = this.getDatePlusDays(baseDate.toISOString().split('T')[0], i * 3);
        fecha_fin = this.getDatePlusDays(this.getCurrentDate(), 5 + Math.floor(Math.random() * 15));
      } else if (estado === 'cancelada') {
        // Tareas canceladas: fechas en el pasado
        fecha_inicio = this.getDatePlusDays(baseDate.toISOString().split('T')[0], i * 3);
        fecha_fin = this.getDatePlusDays(fecha_inicio, 3);
      } else {
        // Tareas pendientes: fechas futuras
        fecha_inicio = this.getDatePlusDays(this.getCurrentDate(), 1 + Math.floor(Math.random() * 5));
        fecha_fin = this.getDatePlusDays(fecha_inicio, 7 + Math.floor(Math.random() * 14));
      }

      tasks.push({
        titulo: `${template.titulo} - ${project.titulo.substring(0, 30)}`,
        descripcion: template.descripcion,
        estado: estado,
        prioridad: prioridad,
        fecha_inicio: fecha_inicio,
        fecha_fin: fecha_fin
      });
    }

    return tasks;
  }

  /**
   * Mezcla un array aleatoriamente (Fisher-Yates shuffle)
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Obtiene estadísticas de tareas
   */
  async getTaskStats() {
    const stats = await this.execute(`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN estado = 'en_progreso' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pending_tasks
      FROM tareas
    `);

    return stats[0];
  }

  /**
   * Obtiene tareas por proyecto
   */
  async getTasksByProject(projectId) {
    return await this.execute(`
      SELECT 
        t.*,
        u.nombre as responsable_nombre,
        p.titulo as proyecto_nombre
      FROM tareas t
      LEFT JOIN usuarios u ON t.usuario_asignado_id = u.id
      LEFT JOIN proyectos p ON t.proyecto_id = p.id
      WHERE t.proyecto_id = ?
      ORDER BY t.created_at DESC
    `, [projectId]);
  }

  /**
   * Genera una fecha aleatoria entre dos fechas
   */
  getRandomDate(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
    return new Date(randomTime).toISOString().split('T')[0];
  }

  /**
   * Obtiene la fecha actual en formato YYYY-MM-DD
   */
  getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Suma días a una fecha
   */
  getDatePlusDays(dateString, days) {
    const date = new Date(dateString);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Resta días a una fecha
   */
  getDateMinusDays(dateString, days) {
    const date = new Date(dateString);
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Genera un número flotante aleatorio entre min y max
   */
  randomFloat(min, max) {
    return Math.round((Math.random() * (max - min) + min) * 10) / 10;
  }
}

module.exports = TaskSeeder;
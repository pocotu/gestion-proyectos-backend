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
    const projects = await this.execute('SELECT id, titulo FROM proyectos ORDER BY id');
    
    if (projects.length === 0) {
      console.log('⚠️ No projects found for task assignment');
      return;
    }

    // Obtener usuarios para asignar como responsables
    const users = await this.execute(`
      SELECT id, nombre, email 
      FROM usuarios 
      WHERE es_administrador = 0 
      ORDER BY id
    `);

    if (users.length === 0) {
      console.log('⚠️ No users found for task assignment');
      return;
    }

    const createdTasks = [];

    // Crear tareas para cada proyecto
    for (const project of projects) {
      const tasksForProject = this.generateTasksForProject(project);
      
      for (const taskData of tasksForProject) {
        const taskId = await this.insertIfNotExists('tareas', {
          ...taskData,
          proyecto_id: project.id,
          usuario_asignado_id: this.randomChoice(users).id,
          creado_por: project.creado_por || this.randomChoice(users).id // Usar el mismo usuario que creó el proyecto o uno aleatorio
        }, ['titulo', 'proyecto_id']);

        if (taskId) {
          createdTasks.push({ id: taskId, ...taskData, proyecto_id: project.id });
        }
      }
    }

    // Crear algunas tareas adicionales específicas
    await this.createSpecificTasks(projects, users);

    // Verificar que las tareas fueron creadas
    const totalTasks = await this.execute('SELECT COUNT(*) as count FROM tareas');
    console.log(`✅ Tasks seeded successfully. Total tasks: ${totalTasks[0].count}`);

    return createdTasks;
  }

  /**
   * Genera tareas específicas para un proyecto
   */
  generateTasksForProject(project) {
    const taskTemplates = {
      'Sistema de Gestión de Inventario': [
        {
          titulo: 'Diseño de base de datos para inventario',
          descripcion: 'Crear el esquema de base de datos para gestión de productos, categorías y stock.',
          estado: 'completada',
          prioridad: 'alta',
          fecha_inicio: '2024-01-15',
          fecha_fin: '2024-01-25'
        },
        {
          titulo: 'Implementación de API REST para productos',
          descripcion: 'Desarrollar endpoints para CRUD de productos con validaciones.',
          estado: 'en_progreso',
          prioridad: 'alta',
          fecha_inicio: '2024-01-26',
          fecha_fin: '2024-02-15'
        },
        {
          titulo: 'Sistema de alertas de stock bajo',
          descripcion: 'Implementar notificaciones automáticas cuando el stock esté por debajo del mínimo.',
          estado: 'pendiente',
          prioridad: 'media',
          fecha_inicio: '2024-02-16',
          fecha_fin: '2024-03-01'
        }
      ],
      'Aplicación Móvil de Delivery': [
        {
          titulo: 'Prototipo de interfaz de usuario',
          descripcion: 'Crear wireframes y mockups para la aplicación móvil.',
          estado: 'completada',
          prioridad: 'alta',
          fecha_inicio: '2024-02-01',
          fecha_fin: '2024-02-10'
        },
        {
          titulo: 'Integración con servicios de geolocalización',
          descripcion: 'Implementar funcionalidad de GPS y mapas para seguimiento de pedidos.',
          estado: 'en_progreso',
          prioridad: 'alta',
          fecha_inicio: '2024-02-11',
          fecha_fin: '2024-03-15'
        },
        {
          titulo: 'Sistema de pagos en línea',
          descripcion: 'Integrar pasarelas de pago seguras para la aplicación.',
          estado: 'pendiente',
          prioridad: 'alta',
          fecha_inicio: '2024-03-16',
          fecha_fin: '2024-04-30'
        }
      ],
      'Portal Web Corporativo': [
        {
          titulo: 'Análisis de requerimientos',
          descripcion: 'Documentar todos los requerimientos funcionales y no funcionales.',
          estado: 'completada',
          prioridad: 'alta',
          fecha_inicio: '2024-03-01',
          fecha_fin: '2024-03-08'
        },
        {
          titulo: 'Desarrollo del CMS',
          descripcion: 'Crear sistema de gestión de contenidos para el portal.',
          estado: 'en_progreso',
          prioridad: 'alta',
          fecha_inicio: '2024-03-09',
          fecha_fin: '2024-04-15'
        },
        {
          titulo: 'Optimización SEO',
          descripcion: 'Implementar mejores prácticas de SEO en todo el portal.',
          estado: 'pendiente',
          prioridad: 'media',
          fecha_inicio: '2024-04-16',
          fecha_fin: '2024-05-01'
        }
      ]
    };

    // Si el proyecto tiene tareas específicas, usarlas; sino, generar tareas genéricas
    if (taskTemplates[project.titulo]) {
      return taskTemplates[project.titulo];
    }

    // Tareas genéricas para proyectos sin plantilla específica
    return [
      {
        titulo: `Análisis de requerimientos - ${project.titulo}`,
        descripcion: `Documentar requerimientos funcionales y técnicos para ${project.titulo}.`,
        estado: 'completada',
        prioridad: 'alta',
        fecha_inicio: this.getRandomDate('2024-01-01', '2024-02-01'),
        fecha_fin: this.getRandomDate('2024-02-02', '2024-03-01')
      },
      {
        titulo: `Desarrollo de funcionalidades core - ${project.titulo}`,
        descripcion: `Implementar las funcionalidades principales del proyecto ${project.titulo}.`,
        estado: 'en_progreso',
        prioridad: 'alta',
        fecha_inicio: this.getRandomDate('2024-02-01', '2024-03-01'),
        fecha_fin: this.getRandomDate('2024-04-01', '2024-06-01')
      },
      {
        titulo: `Testing y QA - ${project.titulo}`,
        descripcion: `Realizar pruebas exhaustivas y control de calidad para ${project.titulo}.`,
        estado: 'pendiente',
        prioridad: 'media',
        fecha_inicio: this.getRandomDate('2024-05-01', '2024-06-01'),
        fecha_fin: this.getRandomDate('2024-06-15', '2024-07-31')
      }
    ];
  }

  /**
   * Crea tareas específicas adicionales
   */
  async createSpecificTasks(projects, users) {
    // Verificar que tenemos proyectos y usuarios válidos
    if (!projects || projects.length === 0 || !users || users.length === 0) {
      console.log('⚠️ No hay proyectos o usuarios disponibles para crear tareas específicas');
      return;
    }

    const specificTasks = [
      {
        titulo: 'Revisión de código general',
        descripcion: 'Realizar revisión de código para mantener estándares de calidad.',
        estado: 'pendiente',
        prioridad: 'alta',
        fecha_inicio: this.getCurrentDate(),
        fecha_fin: this.getDatePlusDays(this.getCurrentDate(), 3),
        proyecto_id: this.randomChoice(projects).id,
        usuario_asignado_id: this.randomChoice(users).id,
        creado_por: this.randomChoice(users).id
      },
      {
        titulo: 'Optimización de base de datos',
        descripcion: 'Optimizar consultas y estructura de base de datos.',
        estado: 'completada',
        prioridad: 'media',
        fecha_inicio: this.getDateMinusDays(this.getCurrentDate(), 15),
        fecha_fin: this.getDateMinusDays(this.getCurrentDate(), 5),
        proyecto_id: this.randomChoice(projects).id,
        usuario_asignado_id: this.randomChoice(users).id,
        creado_por: this.randomChoice(users).id
      },
      {
        titulo: 'Testing de integración',
        descripcion: 'Ejecutar tests de integración para validar funcionalidades.',
        estado: 'en_progreso',
        prioridad: 'alta',
        fecha_inicio: this.getDateMinusDays(this.getCurrentDate(), 5),
        fecha_fin: this.getDatePlusDays(this.getCurrentDate(), 10),
        proyecto_id: this.randomChoice(projects).id,
        usuario_asignado_id: this.randomChoice(users).id,
        creado_por: this.randomChoice(users).id
      },
      {
        titulo: 'Backup y recuperación',
        descripcion: 'Implementar sistema de backup y procedimientos de recuperación.',
        estado: 'pendiente',
        prioridad: 'baja',
        fecha_inicio: this.getCurrentDate(),
        fecha_fin: this.getDatePlusDays(this.getCurrentDate(), 7),
        proyecto_id: this.randomChoice(projects).id,
        usuario_asignado_id: this.randomChoice(users).id,
        creado_por: this.randomChoice(users).id
      },
      {
        titulo: 'Documentación técnica general',
        descripcion: 'Crear documentación técnica general para todos los proyectos.',
        estado: 'en_progreso',
        prioridad: 'media',
        fecha_inicio: this.getDateMinusDays(this.getCurrentDate(), 10),
        fecha_fin: this.getDatePlusDays(this.getCurrentDate(), 20),
        proyecto_id: this.randomChoice(projects).id,
        usuario_asignado_id: this.randomChoice(users).id,
        creado_por: this.randomChoice(users).id
      }
    ];

    for (const taskData of specificTasks) {
      await this.insertIfNotExists('tareas', taskData, ['titulo', 'proyecto_id']);
    }
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
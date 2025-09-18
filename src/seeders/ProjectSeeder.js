const BaseSeeder = require('./BaseSeeder');

/**
 * ProjectSeeder - Seeder para proyectos de ejemplo
 * Siguiendo principios SOLID:
 * - Single Responsibility: Solo maneja la creación de proyectos
 * - Open/Closed: Extiende BaseSeeder sin modificarlo
 * - Liskov Substitution: Puede sustituir a BaseSeeder
 * - Interface Segregation: Implementa solo lo necesario para proyectos
 * - Dependency Inversion: Depende de BaseSeeder (abstracción)
 */
class ProjectSeeder extends BaseSeeder {
  constructor() {
    super('ProjectSeeder');
  }

  /**
   * Ejecuta el seeding de proyectos de ejemplo
   */
  async seed() {
    // Obtener usuarios para asignar como responsables
    const users = await this.execute(`
      SELECT id, email 
      FROM usuarios 
      WHERE es_administrador = 0 
      ORDER BY id 
      LIMIT 4
    `);

    if (users.length === 0) {
      console.log('⚠️ No users found for project assignment');
      return;
    }

    const projectsData = [
      {
        titulo: 'Sistema de Gestión de Inventario',
        descripcion: 'Desarrollo de un sistema completo para gestión de inventario con control de stock, reportes y alertas automáticas.',
        fecha_inicio: '2024-01-15',
        fecha_fin: '2024-06-30',
        estado: 'en_progreso',
        creado_por: 2
      },
      {
        titulo: 'Aplicación Móvil de Delivery',
        descripcion: 'Aplicación móvil para servicio de delivery con geolocalización, pagos en línea y seguimiento en tiempo real.',
        fecha_inicio: '2024-02-01',
        fecha_fin: '2024-08-15',
        estado: 'planificacion',
        creado_por: 2
      },
      {
        titulo: 'Portal Web Corporativo',
        descripcion: 'Rediseño completo del portal web corporativo con CMS, blog integrado y panel de administración.',
        fecha_inicio: '2024-03-01',
        fecha_fin: '2024-07-31',
        estado: 'en_progreso',
        creado_por: 2
      },
      {
        titulo: 'Sistema de Recursos Humanos',
        descripcion: 'Plataforma integral para gestión de recursos humanos incluyendo nómina, evaluaciones y capacitaciones.',
        fecha_inicio: '2024-01-10',
        fecha_fin: '2024-12-31',
        estado: 'en_progreso',
        creado_por: 2
      },
      {
        titulo: 'API de Integración Bancaria',
        descripcion: 'Desarrollo de API REST para integración con servicios bancarios y procesamiento de pagos.',
        fecha_inicio: '2024-04-01',
        fecha_fin: '2024-09-30',
        estado: 'planificacion',
        creado_por: 2
      },
      {
        titulo: 'Dashboard de Analytics',
        descripcion: 'Dashboard interactivo para visualización de métricas y KPIs empresariales con reportes automatizados.',
        fecha_inicio: '2024-02-15',
        fecha_fin: '2024-05-30',
        estado: 'completado',
        creado_por: 2
      }
    ];

    const createdProjects = [];

    // Crear proyectos
    for (const projectData of projectsData) {
      const projectId = await this.insertIfNotExists('proyectos', projectData, ['titulo']);
      
      if (projectId) {
        createdProjects.push({ id: projectId, ...projectData });
        
        // Asignar responsables aleatorios a cada proyecto
        const numResponsibles = this.randomInt(1, Math.min(3, users.length));
        const selectedUsers = users.sort(() => 0.5 - Math.random()).slice(0, numResponsibles);
        
        for (const user of selectedUsers) {
          await this.insertIfNotExists('proyecto_responsables', {
            proyecto_id: projectId,
            usuario_id: user.id
          }, ['proyecto_id', 'usuario_id']);
        }
      }
    }

    // Verificar que los proyectos fueron creados
    const totalProjects = await this.execute('SELECT COUNT(*) as count FROM proyectos');
    console.log(`✅ Projects seeded successfully. Total projects: ${totalProjects[0].count}`);

    return createdProjects;
  }

  /**
   * Obtiene el ID de un proyecto por nombre
   */
  async getProjectId(projectName) {
    return await this.getId('proyectos', { nombre: projectName });
  }

  /**
   * Obtiene todos los proyectos creados
   */
  async getAllProjects() {
    return await this.execute(`
      SELECT 
        p.*,
        u.nombre as creador_nombre,
        COUNT(pr.usuario_id) as num_responsables
      FROM proyectos p
      LEFT JOIN usuarios u ON p.creado_por = u.id
      LEFT JOIN proyecto_responsables pr ON p.id = pr.proyecto_id AND pr.activo = 1
      GROUP BY p.id
      ORDER BY p.fecha_creacion DESC
    `);
  }

  /**
   * Obtiene estadísticas de proyectos
   */
  async getProjectStats() {
    const stats = await this.execute(`
      SELECT 
        COUNT(*) as total_projects,
        SUM(CASE WHEN estado = 'completado' THEN 1 ELSE 0 END) as completed_projects,
        SUM(CASE WHEN estado = 'en_progreso' THEN 1 ELSE 0 END) as in_progress_projects,
        SUM(CASE WHEN estado = 'planificacion' THEN 1 ELSE 0 END) as planning_projects,
        AVG(porcentaje_completado) as avg_completion,
        SUM(presupuesto) as total_budget
      FROM proyectos
    `);

    return stats[0];
  }

  /**
   * Valida que los proyectos de ejemplo existen
   */
  async validateProjects() {
    const requiredProjects = [
      'Sistema de Gestión de Inventario',
      'Aplicación Móvil de Delivery',
      'Portal Web Corporativo'
    ];

    const missingProjects = [];

    for (const projectName of requiredProjects) {
      const exists = await this.exists('proyectos', { nombre: projectName });
      if (!exists) {
        missingProjects.push(projectName);
      }
    }

    if (missingProjects.length > 0) {
      throw new Error(`Missing required projects: ${missingProjects.join(', ')}`);
    }

    return true;
  }
}

module.exports = ProjectSeeder;
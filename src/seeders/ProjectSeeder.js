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
      // Proyectos EN PROGRESO (activos)
      {
        titulo: 'Sistema de Gestión de Inventario',
        descripcion: 'Desarrollo de un sistema completo para gestión de inventario con control de stock, reportes y alertas automáticas.',
        fecha_inicio: '2024-01-15',
        fecha_fin: '2024-06-30',
        estado: 'en_progreso',
        creado_por: users[0].id
      },
      {
        titulo: 'Portal Web Corporativo',
        descripcion: 'Rediseño completo del portal web corporativo con CMS, blog integrado y panel de administración.',
        fecha_inicio: '2024-03-01',
        fecha_fin: '2024-07-31',
        estado: 'en_progreso',
        creado_por: users[2] ? users[2].id : users[0].id
      },
      {
        titulo: 'Sistema de Recursos Humanos',
        descripcion: 'Plataforma integral para gestión de recursos humanos incluyendo nómina, evaluaciones y capacitaciones.',
        fecha_inicio: '2024-01-10',
        fecha_fin: '2024-12-31',
        estado: 'en_progreso',
        creado_por: users[0].id
      },
      {
        titulo: 'E-commerce Platform',
        descripcion: 'Plataforma de comercio electrónico moderna con pagos integrados, gestión de inventario y analytics.',
        fecha_inicio: '2024-02-20',
        fecha_fin: '2024-09-15',
        estado: 'en_progreso',
        creado_por: users[1] ? users[1].id : users[0].id
      },
      {
        titulo: 'Sistema de Facturación Electrónica',
        descripcion: 'Sistema completo de facturación electrónica cumpliendo normativas fiscales con integración SAT.',
        fecha_inicio: '2024-04-01',
        fecha_fin: '2024-11-30',
        estado: 'en_progreso',
        creado_por: users[2] ? users[2].id : users[0].id
      },

      // Proyectos EN PLANIFICACIÓN (activos)
      {
        titulo: 'Aplicación Móvil de Delivery',
        descripcion: 'Aplicación móvil para servicio de delivery con geolocalización, pagos en línea y seguimiento en tiempo real.',
        fecha_inicio: '2024-02-01',
        fecha_fin: '2024-08-15',
        estado: 'planificacion',
        creado_por: users[1] ? users[1].id : users[0].id
      },
      {
        titulo: 'API de Integración Bancaria',
        descripcion: 'Desarrollo de API REST para integración con servicios bancarios y procesamiento de pagos.',
        fecha_inicio: '2024-04-01',
        fecha_fin: '2024-09-30',
        estado: 'planificacion',
        creado_por: users[1] ? users[1].id : users[0].id
      },
      {
        titulo: 'Sistema de Business Intelligence',
        descripcion: 'Plataforma de BI con dashboards interactivos, reportes automatizados y análisis predictivo.',
        fecha_inicio: '2024-06-01',
        fecha_fin: '2025-02-28',
        estado: 'planificacion',
        creado_por: users[0].id
      },
      {
        titulo: 'App de Gestión de Proyectos Móvil',
        descripcion: 'Versión móvil del sistema de gestión de proyectos con sincronización offline y notificaciones push.',
        fecha_inicio: '2024-07-01',
        fecha_fin: '2024-12-15',
        estado: 'planificacion',
        creado_por: users[2] ? users[2].id : users[0].id
      },

      // Proyectos COMPLETADOS
      {
        titulo: 'Dashboard de Analytics',
        descripcion: 'Dashboard interactivo para visualización de métricas y KPIs empresariales con reportes automatizados.',
        fecha_inicio: '2024-02-15',
        fecha_fin: '2024-05-30',
        estado: 'completado',
        creado_por: users[2] ? users[2].id : users[0].id
      },
      {
        titulo: 'Sistema de Autenticación SSO',
        descripcion: 'Implementación de Single Sign-On para todos los sistemas corporativos con integración LDAP.',
        fecha_inicio: '2023-11-01',
        fecha_fin: '2024-02-28',
        estado: 'completado',
        creado_por: users[0].id
      },
      {
        titulo: 'Migración a Cloud AWS',
        descripcion: 'Migración completa de infraestructura legacy a AWS con alta disponibilidad y escalabilidad.',
        fecha_inicio: '2023-09-15',
        fecha_fin: '2024-01-31',
        estado: 'completado',
        creado_por: users[1] ? users[1].id : users[0].id
      },

      // Proyecto EN PROGRESO (pausado → en_progreso)
      {
        titulo: 'Sistema de IoT Industrial',
        descripcion: 'Plataforma para monitoreo y control de dispositivos IoT en entornos industriales.',
        fecha_inicio: '2024-03-15',
        fecha_fin: '2024-10-30',
        estado: 'en_progreso', // Cambiar de 'pausado' a 'en_progreso'
        creado_por: users[2] ? users[2].id : users[0].id
      },

      // Proyecto CANCELADO
      {
        titulo: 'Blockchain Supply Chain',
        descripcion: 'Sistema de trazabilidad de cadena de suministro basado en blockchain (cancelado por presupuesto).',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-08-31',
        estado: 'cancelado',
        creado_por: users[1] ? users[1].id : users[0].id
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

    // Mostrar distribución por estado
    const distribution = await this.execute(`
      SELECT estado, COUNT(*) as count 
      FROM proyectos 
      GROUP BY estado 
      ORDER BY count DESC
    `);
    console.log('📊 Project distribution by status:');
    distribution.forEach(d => {
      console.log(`   - ${d.estado}: ${d.count} projects`);
    });

    return createdProjects;
  }

  /**
   * Valida que los proyectos fueron creados correctamente
   */
  async validate() {
    // Verificar que hay suficientes proyectos
    const totalProjects = await this.execute('SELECT COUNT(*) as count FROM proyectos');
    if (totalProjects[0].count < 10) {
      throw new Error(`Not enough projects created. Expected at least 10, got ${totalProjects[0].count}`);
    }

    // Verificar distribución de estados
    const distribution = await this.execute(`
      SELECT estado, COUNT(*) as count 
      FROM proyectos 
      GROUP BY estado 
      ORDER BY count DESC
    `);

    const states = distribution.map(d => d.estado);
    const requiredStates = ['en_progreso', 'planificacion', 'completado'];
    
    for (const requiredState of requiredStates) {
      if (!states.includes(requiredState)) {
        throw new Error(`Missing required project state: ${requiredState}`);
      }
    }

    // Verificar que hay proyectos activos (en_progreso + planificacion)
    const activeProjects = distribution
      .filter(d => d.estado === 'en_progreso' || d.estado === 'planificacion')
      .reduce((sum, d) => sum + d.count, 0);

    if (activeProjects === 0) {
      throw new Error('No active projects found (en_progreso + planificacion)');
    }

    console.log(`✅ Project validation passed. ${totalProjects[0].count} projects with ${activeProjects} active`);

    return true; // Validación exitosa
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
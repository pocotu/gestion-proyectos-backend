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
    // Obtener usuario admin para asignar proyectos
    const adminUser = await this.execute(`
      SELECT id, email 
      FROM usuarios 
      WHERE es_administrador = 1 
      LIMIT 1
    `);

    if (adminUser.length === 0) {
      console.log('⚠️ No admin user found for project assignment');
      return;
    }

    const adminId = adminUser[0].id;

    const projectsData = [
      // Proyectos EN PROGRESO (activos)
      {
        titulo: 'Sistema de Gestión de Inventario',
        descripcion: 'Desarrollo de un sistema completo para gestión de inventario con control de stock, reportes y alertas automáticas.',
        fecha_inicio: '2024-01-15',
        fecha_fin: '2024-06-30',
        estado: 'en_progreso',
        creado_por: adminId
      },
      {
        titulo: 'Portal Web Corporativo',
        descripcion: 'Rediseño completo del portal web corporativo con CMS, blog integrado y panel de administración.',
        fecha_inicio: '2024-03-01',
        fecha_fin: '2024-07-31',
        estado: 'en_progreso',
        creado_por: adminId
      },
      {
        titulo: 'Sistema de Recursos Humanos',
        descripcion: 'Plataforma integral para gestión de recursos humanos incluyendo nómina, evaluaciones y capacitaciones.',
        fecha_inicio: '2024-01-10',
        fecha_fin: '2024-12-31',
        estado: 'en_progreso',
        creado_por: adminId
      },
      {
        titulo: 'E-commerce Platform',
        descripcion: 'Plataforma de comercio electrónico moderna con pagos integrados, gestión de inventario y analytics.',
        fecha_inicio: '2024-02-20',
        fecha_fin: '2024-09-15',
        estado: 'en_progreso',
        creado_por: adminId
      },
      {
        titulo: 'Sistema de Facturación Electrónica',
        descripcion: 'Sistema completo de facturación electrónica cumpliendo normativas fiscales con integración SAT.',
        fecha_inicio: '2024-04-01',
        fecha_fin: '2024-11-30',
        estado: 'en_progreso',
        creado_por: adminId
      },

      // Proyectos EN PLANIFICACIÓN (activos)
      {
        titulo: 'Aplicación Móvil de Delivery',
        descripcion: 'Aplicación móvil para servicio de delivery con geolocalización, pagos en línea y seguimiento en tiempo real.',
        fecha_inicio: '2024-02-01',
        fecha_fin: '2024-08-15',
        estado: 'planificacion',
        creado_por: adminId
      },
      {
        titulo: 'API de Integración Bancaria',
        descripcion: 'Desarrollo de API REST para integración con servicios bancarios y procesamiento de pagos.',
        fecha_inicio: '2024-04-01',
        fecha_fin: '2024-09-30',
        estado: 'planificacion',
        creado_por: adminId
      },
      {
        titulo: 'Sistema de Business Intelligence',
        descripcion: 'Plataforma de BI con dashboards interactivos, reportes automatizados y análisis predictivo.',
        fecha_inicio: '2024-06-01',
        fecha_fin: '2025-02-28',
        estado: 'planificacion',
        creado_por: adminId
      },
      {
        titulo: 'App de Gestión de Proyectos Móvil',
        descripcion: 'Versión móvil del sistema de gestión de proyectos con sincronización offline y notificaciones push.',
        fecha_inicio: '2024-07-01',
        fecha_fin: '2024-12-15',
        estado: 'planificacion',
        creado_por: adminId
      },

      // Proyectos COMPLETADOS
      {
        titulo: 'Dashboard de Analytics',
        descripcion: 'Dashboard interactivo para visualización de métricas y KPIs empresariales con reportes automatizados.',
        fecha_inicio: '2024-02-15',
        fecha_fin: '2024-05-30',
        estado: 'completado',
        creado_por: adminId
      },
      {
        titulo: 'Sistema de Autenticación SSO',
        descripcion: 'Implementación de Single Sign-On para todos los sistemas corporativos con integración LDAP.',
        fecha_inicio: '2023-11-01',
        fecha_fin: '2024-02-28',
        estado: 'completado',
        creado_por: adminId
      },
      {
        titulo: 'Migración a Cloud AWS',
        descripcion: 'Migración completa de infraestructura legacy a AWS con alta disponibilidad y escalabilidad.',
        fecha_inicio: '2023-09-15',
        fecha_fin: '2024-01-31',
        estado: 'completado',
        creado_por: adminId
      },

      // Proyecto EN PROGRESO
      {
        titulo: 'Sistema de IoT Industrial',
        descripcion: 'Plataforma para monitoreo y control de dispositivos IoT en entornos industriales.',
        fecha_inicio: '2024-03-15',
        fecha_fin: '2024-10-30',
        estado: 'en_progreso',
        creado_por: adminId
      },

      // Proyecto CANCELADO
      {
        titulo: 'Blockchain Supply Chain',
        descripcion: 'Sistema de trazabilidad de cadena de suministro basado en blockchain (cancelado por presupuesto).',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-08-31',
        estado: 'cancelado',
        creado_por: adminId
      }
    ];

    const createdProjects = [];

    // Crear proyectos
    for (const projectData of projectsData) {
      const projectId = await this.insertIfNotExists('proyectos', projectData, ['titulo']);
      
      if (projectId) {
        createdProjects.push({ id: projectId, ...projectData });
        
        // Asignar admin como responsable del proyecto
        await this.insertIfNotExists('proyecto_responsables', {
          proyecto_id: projectId,
          usuario_id: adminId,
          rol_responsabilidad: 'responsable_principal'
        }, ['proyecto_id', 'usuario_id']);
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

    // Obtener TODOS los proyectos existentes para generar logs
    const allProjects = await this.execute(`
      SELECT id, titulo, fecha_inicio, estado 
      FROM proyectos
    `);
    
    console.log(`📝 Generating activity logs for ${allProjects.length} projects...`);
    await this.generateActivityLogs(allProjects, adminId);

    return createdProjects;
  }

  /**
   * Genera logs de actividad para los proyectos
   */
  async generateActivityLogs(projects, adminId) {
    const actions = [
      { accion: 'crear', descripcion: 'Proyecto creado' },
      { accion: 'actualizar', descripcion: 'Información del proyecto actualizada' },
      { accion: 'actualizar', descripcion: 'Fechas del proyecto modificadas' },
      { accion: 'actualizar', descripcion: 'Estado del proyecto cambiado' },
      { accion: 'actualizar', descripcion: 'Descripción del proyecto actualizada' },
      { accion: 'ver', descripcion: 'Proyecto visualizado' },
      { accion: 'ver', descripcion: 'Detalles del proyecto consultados' },
      { accion: 'asignacion', descripcion: 'Responsable asignado al proyecto' },
      { accion: 'asignacion', descripcion: 'Nuevo miembro agregado al equipo' },
      { accion: 'cambio_estado', descripcion: 'Estado del proyecto actualizado a En Progreso' },
      { accion: 'cambio_estado', descripcion: 'Estado del proyecto actualizado a Completado' },
      { accion: 'subir_archivo', descripcion: 'Documento adjuntado al proyecto' },
      { accion: 'subir_archivo', descripcion: 'Archivo de especificaciones subido' },
      { accion: 'descargar_archivo', descripcion: 'Documento del proyecto descargado' },
      { accion: 'actualizar', descripcion: 'Presupuesto del proyecto ajustado' },
      { accion: 'actualizar', descripcion: 'Prioridad del proyecto modificada' },
      { accion: 'ver', descripcion: 'Reporte de avance consultado' },
      { accion: 'ver', descripcion: 'Dashboard del proyecto visualizado' },
      { accion: 'actualizar', descripcion: 'Hitos del proyecto actualizados' },
      { accion: 'actualizar', descripcion: 'Recursos del proyecto reasignados' }
    ];

    let totalLogs = 0;

    for (const project of projects) {
      // Generar entre 25-35 logs por proyecto
      const numLogs = Math.floor(Math.random() * 11) + 25;
      
      for (let i = 0; i < numLogs; i++) {
        const action = actions[Math.floor(Math.random() * actions.length)];
        
        // Generar fecha aleatoria entre la fecha de inicio del proyecto y ahora
        const startDate = new Date(project.fecha_inicio);
        const now = new Date();
        const randomDate = new Date(startDate.getTime() + Math.random() * (now.getTime() - startDate.getTime()));
        
        const logData = {
          usuario_id: adminId,
          accion: action.accion,
          entidad_tipo: 'proyecto',
          entidad_id: project.id,
          descripcion: `${action.descripcion} - ${project.titulo}`,
          created_at: randomDate.toISOString().slice(0, 19).replace('T', ' ')
        };

        await this.execute(`
          INSERT INTO logs_actividad 
          (usuario_id, accion, entidad_tipo, entidad_id, descripcion, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          logData.usuario_id,
          logData.accion,
          logData.entidad_tipo,
          logData.entidad_id,
          logData.descripcion,
          logData.created_at
        ]);
        
        totalLogs++;
      }
    }

    console.log(`✅ Generated ${totalLogs} activity logs for ${projects.length} projects`);
    console.log(`   Average: ${Math.round(totalLogs / projects.length)} logs per project`);
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
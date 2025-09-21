const UserModel = require('./userModel');
const RoleModel = require('./roleModel');
const UserRoleModel = require('./userRoleModel');
const ProjectModel = require('./projectModel');
const ProjectResponsibleModel = require('./projectResponsibleModel');
const TaskModel = require('./taskModel');
const FileModel = require('./fileModel');
const LogActivityModel = require('./logActivityModel');
const { pool } = require('../config/db');
const logger = require('../config/logger');

async function createAllTables() {
  const startTime = Date.now();
  let connection;
  
  try {
    // Obtener conexión explícita para control de transacciones
    connection = await pool.getConnection();
    console.log('🔧 [DB-SETUP] Iniciando configuración de base de datos...');
    logger.info('Starting database setup with explicit connection');

    // Iniciar transacción explícita
    await connection.beginTransaction();
    console.log('🔧 [DB-SETUP] Transacción iniciada');

    const tables = [
      { name: 'usuarios', model: UserModel },
      { name: 'roles', model: RoleModel },
      { name: 'usuario_roles', model: UserRoleModel },
      { name: 'proyectos', model: ProjectModel },
      { name: 'proyecto_responsables', model: ProjectResponsibleModel },
      { name: 'tareas', model: TaskModel },
      { name: 'archivos_proyecto/tarea', model: FileModel },
      { name: 'logs_actividad', model: LogActivityModel }
    ];

    // Crear tablas en orden de dependencia
    console.log('🔧 [DB-SETUP] Creando tablas...');
    for (const table of tables) {
      try {
        console.log(`📋 [DB-SETUP] Creando tabla: ${table.name}`);
        await table.model.createTable();
        console.log(`✅ [DB-SETUP] Tabla ${table.name} creada exitosamente`);
        logger.info(`Table ${table.name} created successfully`);
      } catch (error) {
        console.error(`❌ [DB-SETUP] Error creando tabla ${table.name}:`, error.message);
        logger.error(`Error creating table ${table.name}:`, error);
        throw error;
      }
    }

    // Insertar datos por defecto de roles
    console.log('🌱 [DB-SETUP] Insertando roles por defecto...');
    await RoleModel.seedDefaults();
    console.log('✅ [DB-SETUP] Roles por defecto insertados');
    logger.info('Default roles seeded successfully');

    // Crear usuario administrador por defecto
    console.log('🌱 [DB-SETUP] Creando usuario administrador por defecto...');
    await UserModel.seedDefaultAdmin();
    console.log('✅ [DB-SETUP] Usuario administrador por defecto creado');
    logger.info('Default admin user seeded successfully');

    // Verificar que los datos se insertaron
    console.log('🔍 [DB-SETUP] Verificando datos insertados...');
    const [roleCount] = await connection.execute('SELECT COUNT(*) as count FROM roles');
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM usuarios WHERE es_administrador = 1');
    const rolesInserted = roleCount[0].count;
    const adminsInserted = userCount[0].count;
    console.log(`🔍 [DB-SETUP] Roles en DB: ${rolesInserted}`);
    console.log(`🔍 [DB-SETUP] Administradores en DB: ${adminsInserted}`);
    
    if (rolesInserted === 0) {
      throw new Error('No se insertaron roles - posible problema de transacción');
    }
    
    if (adminsInserted === 0) {
      throw new Error('No se creó usuario administrador - posible problema de transacción');
    }

    // COMMIT explícito - CRÍTICO para Render
    await connection.commit();
    console.log('✅ [DB-SETUP] Transacción confirmada (COMMIT)');
    logger.info('Database transaction committed successfully');

    const duration = Date.now() - startTime;
    console.log(`🎉 [DB-SETUP] Configuración completada en ${duration}ms`);
    logger.info(`Database setup completed in ${duration}ms`);

  } catch (error) {
    console.error('💥 [DB-SETUP] Error durante configuración:', error.message);
    console.error('💥 [DB-SETUP] Stack trace:', error.stack);
    logger.error('Database setup failed:', error);
    
    if (connection) {
      try {
        await connection.rollback();
        console.log('🔄 [DB-SETUP] Transacción revertida (ROLLBACK)');
        logger.info('Database transaction rolled back');
      } catch (rollbackError) {
        console.error('💥 [DB-SETUP] Error en rollback:', rollbackError.message);
        logger.error('Rollback failed:', rollbackError);
      }
    }
    
    throw error; // Re-lanzar para que server.js lo capture
  } finally {
    if (connection) {
      connection.release();
      console.log('🔌 [DB-SETUP] Conexión liberada');
    }
  }
}

module.exports = {
  UserModel,
  RoleModel,
  UserRoleModel,
  ProjectModel,
  ProjectResponsibleModel,
  TaskModel,
  FileModel,
  LogActivityModel,
  createAllTables,
};

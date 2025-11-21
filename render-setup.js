#!/usr/bin/env node
/**
 * Render Database Setup Script
 * 
 * Este script está diseñado específicamente para ejecutarse en Render
 * y configurar la base de datos con logs detallados para debugging.
 * 
 * Variables de entorno requeridas en Render:
 * - DB_HOST
 * - DB_PORT
 * - DB_NAME  
 * - DB_USER
 * - DB_PASSWORD
 * - SETUP_DB=true (para activar el setup automático)
 */

require('dotenv').config();

const { createAllTables } = require('./src/models');
const { testConnection } = require('./src/config/db');
const logger = require('./src/config/logger');

// Importar el seeder manager
const SeederManager = require('./src/seeders/index');

async function renderDatabaseSetup() {
  const startTime = Date.now();
  
  console.log('[RENDER-SETUP] Iniciando configuracion de base de datos para Render...');
  console.log('[RENDER-SETUP] Entorno:', process.env.NODE_ENV || 'development');
  console.log('[RENDER-SETUP] Base de datos:', process.env.DB_NAME);
  console.log('[RENDER-SETUP] Host:', process.env.DB_HOST);
  
  try {
    // Verificar conexión a la base de datos
    console.log('[RENDER-SETUP] Verificando conexion a la base de datos...');
    const connected = await testConnection();
    
    if (!connected) {
      throw new Error('[ERROR] No se pudo conectar a la base de datos en Render');
    }
    
    console.log('[SUCCESS] [RENDER-SETUP] Conexion a la base de datos establecida');
    
    // Limpiar base de datos si CLEAN_DATABASE=true
    if (process.env.CLEAN_DATABASE === 'true') {
      console.log('[RENDER-SETUP] CLEAN_DATABASE=true detectado, limpiando base de datos...');
      const { cleanDatabaseSync } = require('./scripts/clean-database');
      await cleanDatabaseSync();
      console.log('[SUCCESS] [RENDER-SETUP] Base de datos limpiada');
    } else {
      console.log('[RENDER-SETUP] CLEAN_DATABASE no esta activo, manteniendo datos existentes');
    }
    
    // Ejecutar configuración completa
    console.log('[RENDER-SETUP] Ejecutando configuracion completa de tablas y datos...');
    await createAllTables();
    
    // Ejecutar seeders para datos de ejemplo
    console.log('[RENDER-SETUP] Ejecutando seeders para datos de ejemplo...');
    const seederManager = new SeederManager();
    await seederManager.runAll();
    console.log('[SUCCESS] [RENDER-SETUP] Seeders ejecutados exitosamente');
    
    const duration = Date.now() - startTime;
    console.log(`[SUCCESS] [RENDER-SETUP] Configuracion completada exitosamente en ${duration}ms!`);
    console.log('[RENDER-SETUP] Resumen de lo configurado:');
    console.log('   [OK] Todas las tablas creadas/verificadas');
    console.log('   [OK] Roles por defecto insertados');
    console.log('   [OK] Usuario administrador por defecto creado');
    console.log('   [OK] Proyectos de ejemplo creados');
    console.log('   [OK] Tareas de ejemplo creadas');
    console.log('   [OK] Logs de actividad generados');
    console.log('   [OK] Transacciones confirmadas');
    
    // Información importante para el deploy
    console.log('');
    console.log('[CREDENTIALS] [RENDER-SETUP] CREDENCIALES DE ADMINISTRADOR:');
    console.log('   Email: admin@gestion-proyectos.com');
    console.log('   Password: Admin123!');
    console.log('   [WARNING] Cambia esta contraseña despues del primer login');
    console.log('');
    
    logger.info('Render database setup completed successfully', { duration });
    
  } catch (error) {
    console.error('[ERROR] [RENDER-SETUP] Error durante la configuracion:', error.message);
    console.error('[ERROR] [RENDER-SETUP] Stack trace:', error.stack);
    logger.error('Render database setup failed:', error);
    
    // En Render, es importante que el script falle claramente
    process.exit(1);
  }
  
  console.log('[SUCCESS] [RENDER-SETUP] Script de configuracion terminado exitosamente');
  process.exit(0);
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  renderDatabaseSetup();
}

module.exports = { renderDatabaseSetup };
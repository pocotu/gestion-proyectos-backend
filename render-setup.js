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

async function renderDatabaseSetup() {
  const startTime = Date.now();
  
  console.log('🚀 [RENDER-SETUP] Iniciando configuración de base de datos para Render...');
  console.log('🌍 [RENDER-SETUP] Entorno:', process.env.NODE_ENV || 'development');
  console.log('🗄️ [RENDER-SETUP] Base de datos:', process.env.DB_NAME);
  console.log('🖥️ [RENDER-SETUP] Host:', process.env.DB_HOST);
  
  try {
    // Verificar conexión a la base de datos
    console.log('🔍 [RENDER-SETUP] Verificando conexión a la base de datos...');
    const connected = await testConnection();
    
    if (!connected) {
      throw new Error('❌ No se pudo conectar a la base de datos en Render');
    }
    
    console.log('✅ [RENDER-SETUP] Conexión a la base de datos establecida');
    
    // Ejecutar configuración completa
    console.log('🔧 [RENDER-SETUP] Ejecutando configuración completa de tablas y datos...');
    await createAllTables();
    
    const duration = Date.now() - startTime;
    console.log(`🎉 [RENDER-SETUP] ¡Configuración completada exitosamente en ${duration}ms!`);
    console.log('📋 [RENDER-SETUP] Resumen de lo configurado:');
    console.log('   ✅ Todas las tablas creadas/verificadas');
    console.log('   ✅ Roles por defecto insertados');
    console.log('   ✅ Usuario administrador por defecto creado');
    console.log('   ✅ Transacciones confirmadas');
    
    // Información importante para el deploy
    console.log('');
    console.log('🔑 [RENDER-SETUP] CREDENCIALES DE ADMINISTRADOR:');
    console.log('   📧 Email: admin@gestion-proyectos.com');
    console.log('   🔒 Password: Admin123!');
    console.log('   ⚠️  Cambia esta contraseña después del primer login');
    console.log('');
    
    logger.info('Render database setup completed successfully', { duration });
    
  } catch (error) {
    console.error('💥 [RENDER-SETUP] Error durante la configuración:', error.message);
    console.error('💥 [RENDER-SETUP] Stack trace:', error.stack);
    logger.error('Render database setup failed:', error);
    
    // En Render, es importante que el script falle claramente
    process.exit(1);
  }
  
  console.log('✅ [RENDER-SETUP] Script de configuración terminado exitosamente');
  process.exit(0);
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  renderDatabaseSetup();
}

module.exports = { renderDatabaseSetup };
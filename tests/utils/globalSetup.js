/**
 * Setup global para Jest - configuración inicial de la base de datos de pruebas
 */

const mysql = require('mysql2/promise');

module.exports = async () => {
  console.log('🚀 Iniciando setup global de tests...');
  
  try {
    // Configurar variables de entorno para tests
    process.env.NODE_ENV = 'test';
    
    // Crear conexión temporal para setup de DB
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306
    });

    // Crear base de datos de test si no existe
    const testDbName = process.env.DB_NAME || 'gestion_proyectos_test';
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${testDbName}\``);
    
    await connection.end();
    
    console.log('✅ Setup global completado exitosamente');
  } catch (error) {
    console.error('❌ Error en setup global:', error.message);
    // No lanzar error para permitir que los tests continúen
  }
};
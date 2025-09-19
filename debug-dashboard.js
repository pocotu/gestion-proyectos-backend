const request = require('supertest');
const app = require('./src/app');
const AuthHelper = require('./tests/utils/AuthHelper');
const jwt = require('jsonwebtoken');
const config = require('./src/config/config');

async function debugDashboardAuth() {
  console.log('🔧 [DEBUG] ===== INICIANDO DEBUG DASHBOARD =====');
  
  // Crear instancia de DatabaseHelper para AuthHelper
  const DatabaseHelper = require('./tests/utils/DatabaseHelper');
  const dbHelper = new DatabaseHelper();
  await dbHelper.initialize();
  
  const authHelper = new AuthHelper(null, dbHelper);
  
  try {
    // 1. Limpiar datos previos (solo auth)
    console.log('🔧 [DEBUG] 1. Limpiando datos previos...');
    await authHelper.cleanup();
    
    // 2. Crear usuario administrador
    console.log('🔧 [DEBUG] 2. Creando usuario administrador...');
    const testAdmin = await authHelper.createTestAdmin();
    console.log('🔧 [DEBUG] Admin creado:', { 
      id: testAdmin.id, 
      email: testAdmin.email, 
      es_administrador: testAdmin.es_administrador 
    });
    
    // 3. Verificar que el usuario existe en la base de datos
    console.log('🔧 [DEBUG] 3. Verificando usuario en BD...');
    const { pool } = require('./src/config/db');
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE id = ?', [testAdmin.id]);
    console.log('🔧 [DEBUG] Usuario en BD:', rows.length > 0 ? {
      id: rows[0].id,
      email: rows[0].email,
      es_administrador: rows[0].es_administrador,
      estado: rows[0].estado
    } : 'No encontrado');
    
    if (rows.length === 0) {
      throw new Error('Usuario no encontrado en la base de datos después de crearlo');
    }
    
    // 4. Generar token
    console.log('🔧 [DEBUG] 4. Generando token...');
    const adminToken = authHelper.generateToken(testAdmin);
    console.log('🔧 [DEBUG] Token generado:', !!adminToken);
    console.log('🔧 [DEBUG] JWT_SECRET:', config.JWT_SECRET ? 'Presente' : 'Ausente');
    console.log('🔧 [DEBUG] Token snippet:', adminToken.substring(0, 50) + '...');
    
    // 5. Decodificar token para verificar
    console.log('🔧 [DEBUG] 5. Decodificando token...');
    const decoded = jwt.decode(adminToken);
    console.log('🔧 [DEBUG] Token decodificado:', {
      id: decoded.id,
      email: decoded.email,
      es_administrador: decoded.es_administrador,
      exp: new Date(decoded.exp * 1000).toISOString()
    });
    
    // 6. Verificar token con AuthService
    console.log('🔧 [DEBUG] 6. Verificando token con AuthService...');
    const AuthService = require('./src/services/authService');
    const authService = new AuthService();
    
    try {
      const verifiedUser = await authService.verifyToken(adminToken);
      console.log('🔧 [DEBUG] Token verificado exitosamente:', {
        id: verifiedUser.id,
        email: verifiedUser.email,
        es_administrador: verifiedUser.es_administrador
      });
    } catch (error) {
      console.log('🔧 [DEBUG] Error verificando token:', error.message);
      throw error;
    }
    
    // 7. Probar endpoint del dashboard
    console.log('🔧 [DEBUG] 7. Probando endpoint del dashboard...');
    const response = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    
    console.log('🔧 [DEBUG] Response status:', response.status);
    console.log('🔧 [DEBUG] Response body:', JSON.stringify(response.body, null, 2));
    
    if (response.status === 200) {
      console.log('✅ [DEBUG] ¡TEST EXITOSO! El dashboard funciona correctamente');
    } else {
      console.log('❌ [DEBUG] TEST FALLIDO - Status:', response.status);
    }
    
    return response.status === 200;
    
  } catch (error) {
    console.log('❌ [DEBUG] Error en debug:', error.message);
    console.log('❌ [DEBUG] Stack trace:', error.stack);
    return false;
  } finally {
    // Limpiar datos
    console.log('🔧 [DEBUG] Limpiando datos finales...');
    await authHelper.cleanup();
    process.exit(0);
  }
}

// Ejecutar el debug
debugDashboardAuth();
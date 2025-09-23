/**
 * Script para debuggear el problema con los tokens JWT
 */
const jwt = require('jsonwebtoken');
const config = require('./src/config/config');

// Simular datos de usuario
const userData = {
  id: 123,
  email: 'test@example.com',
  es_administrador: false
};

console.log('🔧 Debugging JWT Token Generation');
console.log('================================');

// Verificar configuración
console.log('JWT_SECRET:', config.JWT_SECRET ? 'Presente' : 'Ausente');
console.log('JWT_EXPIRES_IN:', config.JWT_EXPIRES_IN);

// Generar token
try {
  const token = jwt.sign(userData, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
    issuer: 'gestion-proyectos'
  });
  
  console.log('\n✅ Token generado exitosamente');
  console.log('Token length:', token.length);
  console.log('Token preview:', token.substring(0, 50) + '...');
  
  // Verificar token
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    console.log('\n✅ Token verificado exitosamente');
    console.log('Decoded payload:', decoded);
  } catch (verifyError) {
    console.log('\n❌ Error verificando token:', verifyError.message);
  }
  
} catch (signError) {
  console.log('\n❌ Error generando token:', signError.message);
}

// Probar con diferentes formatos
console.log('\n🧪 Probando diferentes formatos de Authorization header:');

const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJlc19hZG1pbmlzdHJhZG9yIjpmYWxzZSwiaWF0IjoxNjk1NDI0ODAwLCJleHAiOjE2OTU0MjU0MDAsImlzcyI6Imdlc3Rpb24tcHJveWVjdG9zIn0.test';

console.log('1. Solo token:', testToken.substring(0, 50) + '...');
console.log('2. Bearer + token:', `Bearer ${testToken}`.substring(0, 60) + '...');

// Simular extracción del middleware
const authHeader = `Bearer ${testToken}`;
if (authHeader && authHeader.startsWith('Bearer ')) {
  const extractedToken = authHeader.substring(7);
  console.log('3. Token extraído:', extractedToken.substring(0, 50) + '...');
  console.log('4. ¿Son iguales?', extractedToken === testToken);
}
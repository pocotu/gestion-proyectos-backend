const express = require('express');
const { requireUserManagement } = require('./src/middleware/permissionMiddleware');

// Crear una app express simple para probar el middleware
const app = express();
app.use(express.json());

// Mock de usuario administrador
const mockAdminUser = {
  id: 1,
  email: 'admin@test.com',
  es_administrador: 1
};

// Ruta de prueba que usa el middleware
app.post('/test-middleware', (req, res, next) => {
  // Simular que el usuario ya está autenticado
  req.user = mockAdminUser;
  console.log('🧪 [TEST] Usuario mock asignado:', req.user);
  next();
}, requireUserManagement(), (req, res) => {
  console.log('🧪 [TEST] ¡Llegamos al controlador final!');
  res.json({ success: true, message: 'Middleware funcionó correctamente' });
});

// Iniciar servidor de prueba
const server = app.listen(3001, () => {
  console.log('🧪 [TEST] Servidor de prueba iniciado en puerto 3001');
  
  // Hacer una petición de prueba
  const http = require('http');
  
  const postData = JSON.stringify({ test: true });
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/test-middleware',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  console.log('🧪 [TEST] Haciendo petición de prueba...');
  
  const req = http.request(options, (res) => {
    console.log('🧪 [TEST] Respuesta recibida - Status:', res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('🧪 [TEST] Respuesta completa:', data);
      server.close();
      process.exit(0);
    });
  });
  
  req.on('error', (e) => {
    console.error('🧪 [TEST] Error en petición:', e.message);
    server.close();
    process.exit(1);
  });
  
  // Timeout de 10 segundos
  req.setTimeout(10000, () => {
    console.error('🧪 [TEST] Timeout - El middleware no respondió');
    server.close();
    process.exit(1);
  });
  
  req.write(postData);
  req.end();
});
const { execSync } = require('child_process');
const path = require('path');

console.log('🔍 Ejecutando diagnóstico de Jest...');

try {
  // Test 1: Verificar que Jest funciona con un test simple
  console.log('\n1. Verificando Jest básico...');
  const result1 = execSync('npx jest --version', { encoding: 'utf8' });
  console.log('✅ Jest version:', result1.trim());

  // Test 2: Verificar configuración de Jest
  console.log('\n2. Verificando configuración...');
  const result2 = execSync('npx jest --showConfig', { encoding: 'utf8' });
  console.log('✅ Configuración cargada correctamente');

  // Test 3: Intentar ejecutar el test con máximo detalle
  console.log('\n3. Ejecutando test con máximo detalle...');
  try {
    const result3 = execSync('npx jest tests/integration/projects.test.js --verbose --no-cache --runInBand --forceExit --detectOpenHandles --logHeapUsage', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log('✅ Test ejecutado exitosamente:');
    console.log(result3);
  } catch (error) {
    console.log('❌ Error en test:');
    console.log('STDOUT:', error.stdout);
    console.log('STDERR:', error.stderr);
    console.log('Exit code:', error.status);
  }

} catch (error) {
  console.error('❌ Error general:', error.message);
  if (error.stdout) console.log('STDOUT:', error.stdout);
  if (error.stderr) console.log('STDERR:', error.stderr);
}
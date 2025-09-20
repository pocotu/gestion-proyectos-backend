const { execSync } = require('child_process');
const fs = require('fs');

console.log('Iniciando debug de Jest...');

try {
  console.log('Ejecutando Jest...');
  const output = execSync('node ./node_modules/jest/bin/jest.js tests/integration/users.test.js --verbose', {
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 30000
  });
  
  console.log('Jest ejecutado exitosamente');
  fs.writeFileSync('jest-output.txt', output);
  console.log('Output guardado en jest-output.txt');
  
} catch(error) {
  console.log('Error ejecutando Jest:');
  console.log('Status:', error.status);
  console.log('Signal:', error.signal);
  
  const errorOutput = `
ERROR STATUS: ${error.status}
ERROR SIGNAL: ${error.signal}

STDOUT:
${error.stdout || 'No stdout'}

STDERR:
${error.stderr || 'No stderr'}

MESSAGE:
${error.message || 'No message'}
`;
  
  fs.writeFileSync('jest-error.txt', errorOutput);
  console.log('Error guardado en jest-error.txt');
}
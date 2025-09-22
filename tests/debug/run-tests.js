#!/usr/bin/env node

/**
 * Script personalizado para ejecutar Jest en Windows
 * Evita problemas con los scripts de shell de .bin
 */

const { spawn } = require('child_process');
const path = require('path');

// Obtener argumentos de la línea de comandos
const args = process.argv.slice(2);

// Ruta al ejecutable de Jest
const jestPath = path.join(__dirname, 'node_modules', 'jest', 'bin', 'jest.js');

// Configurar argumentos por defecto
const defaultArgs = [
  '--verbose',
  '--no-cache',
  '--runInBand',
  '--forceExit'
];

// Combinar argumentos
const allArgs = [...defaultArgs, ...args];

console.log('🧪 Ejecutando Jest con los siguientes argumentos:');
console.log(`   node ${jestPath} ${allArgs.join(' ')}`);
console.log('');

// Ejecutar Jest
const jest = spawn('node', [jestPath, ...allArgs], {
  stdio: 'inherit',
  cwd: __dirname
});

jest.on('close', (code) => {
  console.log(`\n🏁 Jest terminó con código: ${code}`);
  process.exit(code);
});

jest.on('error', (error) => {
  console.error('❌ Error ejecutando Jest:', error);
  process.exit(1);
});
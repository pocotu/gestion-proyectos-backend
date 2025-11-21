#!/usr/bin/env node

/**
 * Script de prueba para verificar el comportamiento del clean-database.js
 * 
 * Uso:
 *   node scripts/test-clean.js          # Simula CLEAN_DATABASE=false
 *   node scripts/test-clean.js true     # Simula CLEAN_DATABASE=true
 */

const originalEnv = process.env.CLEAN_DATABASE;
const testValue = process.argv[2] === 'true' ? 'true' : 'false';

console.log('[TEST] Modo de prueba del script de limpieza');
console.log('='.repeat(50));
console.log(`[CONFIG] Configuracion de prueba: CLEAN_DATABASE=${testValue}`);
console.log('='.repeat(50));
console.log('');

// Establecer la variable de entorno para la prueba
process.env.CLEAN_DATABASE = testValue;

// Ejecutar el script de limpieza
require('./clean-database.js');

// Restaurar el valor original (aunque el proceso terminará de todos modos)
process.env.CLEAN_DATABASE = originalEnv;

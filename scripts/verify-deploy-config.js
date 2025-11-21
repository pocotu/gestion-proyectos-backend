#!/usr/bin/env node

/**
 * Script de verificación de configuración para deploy
 * Verifica que todas las variables de entorno necesarias estén configuradas
 */

require('dotenv').config();

const REQUIRED_VARS = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
];

const OPTIONAL_VARS = [
  'PORT',
  'NODE_ENV',
  'CLEAN_DATABASE',
  'SETUP_DB',
  'DB_PORT',
  'DB_CONNECTION_LIMIT',
  'JWT_EXPIRES_IN',
];

console.log('[VERIFY] Verificando configuracion de deploy...\n');

let hasErrors = false;
let hasWarnings = false;

// Verificar variables requeridas
console.log('[REQUIRED] Variables Requeridas:');
console.log('='.repeat(60));
REQUIRED_VARS.forEach((varName) => {
  const value = process.env[varName];
  if (!value) {
    console.log(`[X] ${varName}: NO CONFIGURADA`);
    hasErrors = true;
  } else {
    const displayValue = varName.includes('PASSWORD') || varName.includes('SECRET')
      ? '***' + value.slice(-4)
      : value.length > 30
      ? value.slice(0, 27) + '...'
      : value;
    console.log(`[OK] ${varName}: ${displayValue}`);
  }
});

console.log('');

// Verificar variables opcionales
console.log('[OPTIONAL] Variables Opcionales:');
console.log('='.repeat(60));
OPTIONAL_VARS.forEach((varName) => {
  const value = process.env[varName];
  if (!value) {
    console.log(`[!] ${varName}: No configurada (usando valor por defecto)`);
  } else {
    console.log(`[OK] ${varName}: ${value}`);
  }
});

console.log('');

// Verificar configuración de limpieza de base de datos
console.log('[CLEAN] Configuracion de Limpieza de Base de Datos:');
console.log('='.repeat(60));
const cleanDatabase = process.env.CLEAN_DATABASE;
if (cleanDatabase === 'true') {
  console.log('[WARNING] ADVERTENCIA: CLEAN_DATABASE esta en TRUE');
  console.log('[WARNING] La base de datos sera LIMPIADA en el proximo deploy');
  console.log('[INFO] Recuerda cambiar a "false" despues del deploy');
  hasWarnings = true;
} else {
  console.log('[OK] CLEAN_DATABASE esta en FALSE (seguro)');
}

console.log('');

// Verificar configuración de setup de base de datos
console.log('[SETUP] Configuracion de Setup de Base de Datos:');
console.log('='.repeat(60));
const setupDb = process.env.SETUP_DB;
if (setupDb === 'true') {
  console.log('[OK] SETUP_DB esta en TRUE (seeders se ejecutaran)');
} else {
  console.log('[!] SETUP_DB esta en FALSE (seeders NO se ejecutaran)');
  console.log('[INFO] Considera activarlo si necesitas datos iniciales');
}

console.log('');

// Resumen
console.log('[SUMMARY] Resumen:');
console.log('='.repeat(60));
if (hasErrors) {
  console.log('[ERROR] Hay errores en la configuracion');
  console.log('[INFO] Configura las variables requeridas antes de hacer deploy');
  process.exit(1);
} else if (hasWarnings) {
  console.log('[WARNING] Configuracion valida pero con advertencias');
  console.log('[INFO] Revisa las advertencias antes de continuar');
  process.exit(0);
} else {
  console.log('[SUCCESS] Configuracion valida y lista para deploy');
  process.exit(0);
}

#!/usr/bin/env node

/**
 * Script de diagnóstico para verificar tablas en la base de datos
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTables() {
  console.log('🔍 Verificando tablas en la base de datos...\n');
  console.log('Configuración:');
  console.log(`  Host: ${process.env.DB_HOST}`);
  console.log(`  Database: ${process.env.DB_NAME}`);
  console.log(`  User: ${process.env.DB_USER}\n`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Listar todas las tablas
    const [tables] = await connection.query('SHOW TABLES');
    
    console.log('📋 Tablas existentes:');
    console.log('='.repeat(50));
    
    if (tables.length === 0) {
      console.log('❌ No hay tablas en la base de datos');
      return;
    }

    for (const row of tables) {
      const tableName = Object.values(row)[0];
      
      // Contar registros en cada tabla
      try {
        const [count] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`✅ ${tableName.padEnd(30)} - ${count[0].count} registros`);
      } catch (error) {
        console.log(`⚠️  ${tableName.padEnd(30)} - Error al contar`);
      }
    }

    console.log('='.repeat(50));
    console.log(`\nTotal de tablas: ${tables.length}`);

    // Verificar tabla específica
    console.log('\n🔍 Verificando tabla tarea_asignaciones...');
    const tableExists = tables.some(row => Object.values(row)[0] === 'tarea_asignaciones');
    
    if (tableExists) {
      console.log('✅ La tabla tarea_asignaciones EXISTE');
      
      // Mostrar estructura
      const [structure] = await connection.query('DESCRIBE tarea_asignaciones');
      console.log('\n📐 Estructura de tarea_asignaciones:');
      console.table(structure);
    } else {
      console.log('❌ La tabla tarea_asignaciones NO EXISTE');
      console.log('\n🔧 Tablas que deberían existir:');
      const expectedTables = [
        'usuarios',
        'roles',
        'usuario_roles',
        'proyectos',
        'proyecto_responsables',
        'tareas',
        'tarea_asignaciones',
        'archivos_proyecto',
        'archivos_tarea',
        'logs_actividad',
        'migrations'
      ];
      
      for (const expected of expectedTables) {
        const exists = tables.some(row => Object.values(row)[0] === expected);
        console.log(`${exists ? '✅' : '❌'} ${expected}`);
      }
    }

    // Verificar migraciones ejecutadas
    console.log('\n📜 Migraciones ejecutadas:');
    try {
      const [migrations] = await connection.query('SELECT * FROM migrations ORDER BY executed_at');
      if (migrations.length === 0) {
        console.log('⚠️  No hay migraciones registradas');
      } else {
        console.table(migrations);
      }
    } catch (error) {
      console.log('❌ No se pudo leer la tabla migrations:', error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

checkTables()
  .then(() => {
    console.log('\n✅ Diagnóstico completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en diagnóstico:', error);
    process.exit(1);
  });

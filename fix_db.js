const { pool } = require('./src/config/db');

async function runMigration() {
  try {
    console.log('Ejecutando migración para agregar columna activo...');
    
    // Verificar si la columna ya existe
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'gestion_proyectos' 
      AND TABLE_NAME = 'proyecto_responsables' 
      AND COLUMN_NAME = 'activo'
    `);
    
    if (columns.length === 0) {
      // Agregar columna activo
      await pool.execute(`
        ALTER TABLE proyecto_responsables 
        ADD COLUMN activo BOOLEAN DEFAULT TRUE
      `);
      console.log('✓ Columna activo agregada');
      
      // Actualizar registros existentes
      await pool.execute(`
        UPDATE proyecto_responsables SET activo = TRUE WHERE activo IS NULL
      `);
      console.log('✓ Registros existentes actualizados');
    } else {
      console.log('✓ Columna activo ya existe');
    }
    
    // Verificar otras columnas
    const [rolColumns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'gestion_proyectos' 
      AND TABLE_NAME = 'proyecto_responsables' 
      AND COLUMN_NAME = 'rol_responsabilidad'
    `);
    
    if (rolColumns.length === 0) {
      await pool.execute(`
        ALTER TABLE proyecto_responsables 
        ADD COLUMN rol_responsabilidad VARCHAR(50) DEFAULT 'responsable'
      `);
      console.log('✓ Columna rol_responsabilidad agregada');
    } else {
      console.log('✓ Columna rol_responsabilidad ya existe');
    }
    
    const [asignadoColumns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'gestion_proyectos' 
      AND TABLE_NAME = 'proyecto_responsables' 
      AND COLUMN_NAME = 'asignado_por'
    `);
    
    if (asignadoColumns.length === 0) {
      await pool.execute(`
        ALTER TABLE proyecto_responsables 
        ADD COLUMN asignado_por INT
      `);
      console.log('✓ Columna asignado_por agregada');
    } else {
      console.log('✓ Columna asignado_por ya existe');
    }
    
    const [updatedColumns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'gestion_proyectos' 
      AND TABLE_NAME = 'proyecto_responsables' 
      AND COLUMN_NAME = 'updated_at'
    `);
    
    if (updatedColumns.length === 0) {
      await pool.execute(`
        ALTER TABLE proyecto_responsables 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
      console.log('✓ Columna updated_at agregada');
    } else {
      console.log('✓ Columna updated_at ya existe');
    }
    
    console.log('Migración completada exitosamente');
    
  } catch (error) {
    console.error('Error ejecutando migración:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
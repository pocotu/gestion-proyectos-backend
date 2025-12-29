-- Migración 003: Ampliar tipo de archivos y preparar para Cloudinary
-- Solo modifica el ENUM de tipo para soportar más formatos

-- Modificar archivos_proyecto
ALTER TABLE archivos_proyecto 
MODIFY COLUMN tipo VARCHAR(10) DEFAULT NULL;

-- Modificar archivos_tarea  
ALTER TABLE archivos_tarea 
MODIFY COLUMN tipo VARCHAR(10) DEFAULT NULL;

-- Verificar cambios
DESCRIBE archivos_proyecto;
DESCRIBE archivos_tarea;

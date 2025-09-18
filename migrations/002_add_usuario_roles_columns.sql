-- Migración para agregar columnas faltantes a la tabla usuario_roles
-- Fecha: 2025-01-18

USE gestion_proyectos;

-- Agregar columna activo si no existe
ALTER TABLE usuario_roles 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

-- Agregar columna asignado_por si no existe
ALTER TABLE usuario_roles 
ADD COLUMN IF NOT EXISTS asignado_por INT;

-- Agregar columna fecha_asignacion si no existe
ALTER TABLE usuario_roles 
ADD COLUMN IF NOT EXISTS fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Agregar columna updated_at si no existe
ALTER TABLE usuario_roles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Agregar foreign key para asignado_por si no existe
-- ALTER TABLE usuario_roles 
-- ADD CONSTRAINT IF NOT EXISTS fk_usuario_roles_asignado_por 
-- FOREIGN KEY (asignado_por) REFERENCES usuarios(id) ON DELETE SET NULL;

-- Actualizar registros existentes para que tengan activo = TRUE
UPDATE usuario_roles SET activo = TRUE WHERE activo IS NULL;

SELECT 'Migración completada: Columnas agregadas a usuario_roles' as mensaje;
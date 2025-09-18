-- Migración para agregar columna activo a proyecto_responsables
-- Esta columna es necesaria para el soft delete de responsables de proyecto

ALTER TABLE proyecto_responsables 
ADD COLUMN activo BOOLEAN DEFAULT TRUE;

-- Actualizar registros existentes para que estén activos
UPDATE proyecto_responsables SET activo = TRUE WHERE activo IS NULL;

-- Agregar columnas adicionales que faltan según el modelo
ALTER TABLE proyecto_responsables 
ADD COLUMN rol_responsabilidad VARCHAR(50) DEFAULT 'responsable',
ADD COLUMN asignado_por INT,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Agregar foreign key para asignado_por
ALTER TABLE proyecto_responsables 
ADD FOREIGN KEY (asignado_por) REFERENCES usuarios(id);
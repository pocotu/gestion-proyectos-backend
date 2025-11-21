-- ========================================
-- MIGRACION 002: Roles Iniciales
-- ========================================

INSERT IGNORE INTO roles (nombre) VALUES 
('admin'),
('responsable_proyecto'),
('responsable_tarea');

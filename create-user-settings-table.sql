-- Crear tabla configuraciones_usuario
CREATE TABLE IF NOT EXISTS configuraciones_usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    configuraciones JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_settings (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insertar configuraciones por defecto para usuarios existentes
INSERT IGNORE INTO configuraciones_usuario (usuario_id, configuraciones)
SELECT id, JSON_OBJECT(
    'theme', 'light',
    'language', 'es',
    'notifications', JSON_OBJECT(
        'email', true,
        'push', true,
        'taskReminders', true,
        'projectUpdates', true
    ),
    'dashboard', JSON_OBJECT(
        'showCompletedTasks', false,
        'tasksPerPage', 10,
        'defaultView', 'list'
    ),
    'privacy', JSON_OBJECT(
        'profileVisible', true,
        'showEmail', false,
        'showPhone', false
    )
) FROM usuarios;
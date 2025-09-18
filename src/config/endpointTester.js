const axios = require('axios');
const mysql = require('mysql2/promise');
const config = require('./config');

/**
 * Configuración base para las pruebas
 */
class TestConfig {
    constructor() {
        this.baseURL = config.TEST_BASE_URL;
        this.dbConfig = {
            host: config.TEST_DB_HOST,
            user: config.TEST_DB_USER,
            password: config.TEST_DB_PASSWORD,
            database: config.TEST_DB_NAME
        };
        this.testData = {
            users: [],
            projects: [],
            tasks: [],
            tokens: []
        };
    }
}

/**
 * Logger para mostrar información detallada de las pruebas
 */
class TestLogger {
    static info(message, data = null) {
        console.log(`\n🔵 [INFO] ${message}`);
        if (data) {
            console.log('   📋 Datos:', JSON.stringify(data, null, 2));
        }
    }

    static success(message, data = null) {
        console.log(`\n✅ [SUCCESS] ${message}`);
        if (data) {
            console.log('   📋 Respuesta:', JSON.stringify(data, null, 2));
        }
    }

    static error(message, error = null) {
        console.log(`\n❌ [ERROR] ${message}`);
        if (error) {
            console.log('   🚨 Detalles del error:', error.message || error);
            if (error.response) {
                console.log('   📋 Respuesta del servidor:', JSON.stringify(error.response.data, null, 2));
                console.log('   📊 Status Code:', error.response.status);
            }
        }
    }

    static warning(message, data = null) {
        console.log(`\n⚠️  [WARNING] ${message}`);
        if (data) {
            console.log('   📋 Datos:', JSON.stringify(data, null, 2));
        }
    }

    static section(title) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🧪 ${title.toUpperCase()}`);
        console.log(`${'='.repeat(60)}`);
    }

    static subsection(title) {
        console.log(`\n${'─'.repeat(40)}`);
        console.log(`📝 ${title}`);
        console.log(`${'─'.repeat(40)}`);
    }
}

/**
 * Clase base para todas las pruebas de endpoints
 */
class BaseEndpointTest {
    constructor(config) {
        this.config = config;
        this.axios = axios.create({
            baseURL: config.baseURL,
            timeout: 10000
        });
    }

    /**
     * Configura headers de autenticación
     */
    setAuthHeader(token) {
        TestLogger.info('Configurando header de autenticación', { token: token ? 'Token presente' : 'Sin token' });
        this.axios.defaults.headers.common['Authorization'] = token ? `Bearer ${token}` : '';
    }

    /**
     * Realiza una petición HTTP con logging detallado
     */
    async makeRequest(method, url, data = null, expectedStatus = 200) {
        try {
            TestLogger.info(`Realizando petición ${method.toUpperCase()}`, {
                url: `${this.config.baseURL}${url}`,
                data: data,
                expectedStatus
            });

            const config = { method, url };
            if (data) config.data = data;

            const response = await this.axios(config);
            
            TestLogger.success(`Petición ${method.toUpperCase()} exitosa`, {
                status: response.status,
                data: response.data
            });

            return response;
        } catch (error) {
            TestLogger.error(`Error en petición ${method.toUpperCase()} a ${url}`, error);
            throw error;
        }
    }
}

/**
 * Pruebas para endpoints de autenticación
 */
class AuthEndpointTest extends BaseEndpointTest {
    async testRegister() {
        TestLogger.subsection('Probando Registro de Usuario');
        
        const userData = {
            nombre: config.TEST_USER_NAME,
            email: `test${Date.now()}@example.com`,
            contraseña: config.TEST_USER_PASSWORD,
            telefono: config.TEST_USER_PHONE,
            es_administrador: true  // Crear como administrador para tener todos los permisos
        };

        TestLogger.info('Datos de registro preparados', userData);

        try {
            const response = await this.makeRequest('post', '/auth/register', userData, 201);
            
            if (response.data && response.data.data && response.data.data.user) {
                this.config.testData.users.push({
                    id: response.data.data.user.id,
                    email: userData.email,
                    password: userData.contraseña
                });
                TestLogger.success('Usuario administrador registrado y guardado en testData', {
                    userId: response.data.data.user.id,
                    email: userData.email,
                    esAdmin: userData.es_administrador
                });
            }

            return response.data;
        } catch (error) {
            TestLogger.error('Fallo en registro de usuario', error);
            throw error;
        }
    }

    async testLogin(email, password) {
        TestLogger.subsection('Probando Login de Usuario');
        
        const loginData = { email, contraseña: password };
        TestLogger.info('Intentando login', { email });

        try {
            const response = await this.makeRequest('post', '/auth/login', loginData);
            
            if (response.data && response.data.data && response.data.data.accessToken) {
                this.config.testData.tokens.push(response.data.data.accessToken);
                TestLogger.success('Login exitoso, token guardado', {
                    tokenLength: response.data.data.accessToken.length,
                    userInfo: response.data.data.user
                });
            }

            return response.data;
        } catch (error) {
            TestLogger.error('Fallo en login', error);
            throw error;
        }
    }

    async testLogout(token) {
        TestLogger.subsection('Probando Logout');
        
        this.setAuthHeader(token);
        
        try {
            // Enviar refreshToken vacío para evitar errores en el logout
            const response = await this.makeRequest('post', '/auth/logout', {
                refreshToken: null
            });
            TestLogger.success('Logout exitoso');
            return response.data;
        } catch (error) {
            TestLogger.error('Fallo en logout', error);
            throw error;
        }
    }
}

/**
 * Pruebas para endpoints de usuarios
 */
class UsersEndpointTest extends BaseEndpointTest {
    async testGetUsers(token) {
        TestLogger.subsection('Probando GET /users');
        
        this.setAuthHeader(token);
        
        try {
            const response = await this.makeRequest('get', '/users');
            TestLogger.success('Lista de usuarios obtenida', {
                totalUsers: response.data.data ? response.data.data.total : 0,
                usersCount: response.data.data && response.data.data.users ? response.data.data.users.length : 0
            });
            return response.data;
        } catch (error) {
            TestLogger.error('Fallo al obtener usuarios', error);
            throw error;
        }
    }

    async testGetUserById(token, userId) {
        TestLogger.subsection(`Probando GET /users/${userId}`);
        
        this.setAuthHeader(token);
        
        try {
            const response = await this.makeRequest('get', `/users/${userId}`);
            TestLogger.success('Usuario específico obtenido', response.data);
            return response.data;
        } catch (error) {
            TestLogger.error(`Fallo al obtener usuario ${userId}`, error);
            throw error;
        }
    }

    async testUpdateUser(token, userId, updateData) {
        TestLogger.subsection(`Probando PUT /users/${userId}`);
        
        this.setAuthHeader(token);
        TestLogger.info('Datos de actualización', updateData);
        
        try {
            const response = await this.makeRequest('put', `/users/${userId}`, updateData);
            TestLogger.success('Usuario actualizado exitosamente', response.data);
            return response.data;
        } catch (error) {
            TestLogger.error(`Fallo al actualizar usuario ${userId}`, error);
            throw error;
        }
    }
}

/**
 * Pruebas para endpoints de proyectos
 */
class ProjectsEndpointTest extends BaseEndpointTest {
    async testCreateProject(token) {
        TestLogger.subsection('Probando POST /projects');
        
        this.setAuthHeader(token);
        
        // Generar un título único usando timestamp y número aleatorio
        const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const projectData = {
            titulo: `Proyecto Test ${uniqueId}`,
            descripcion: config.TEST_PROJECT_DESCRIPTION,
            fecha_inicio: config.TEST_PROJECT_START_DATE,
            fecha_fin: config.TEST_PROJECT_END_DATE
        };

        TestLogger.info('Datos del proyecto a crear', projectData);
        
        try {
            const response = await this.makeRequest('post', '/projects', projectData, 201);
            
            TestLogger.info('Respuesta completa del servidor:', response.data);
            
            let projectId = null;
            
            // Intentar diferentes estructuras de respuesta
            if (response.data && response.data.data && response.data.data.project && response.data.data.project.id) {
                projectId = response.data.data.project.id;
            } else if (response.data && response.data.data && response.data.data.id) {
                projectId = response.data.data.id;
            } else if (response.data && response.data.project && response.data.project.id) {
                projectId = response.data.project.id;
            } else if (response.data && response.data.id) {
                projectId = response.data.id;
            }
            
            if (projectId) {
                this.config.testData.projects.push({
                    id: projectId,
                    titulo: projectData.titulo
                });
                TestLogger.success('Proyecto creado y guardado en testData', {
                    projectId: projectId,
                    titulo: projectData.titulo
                });
            } else {
                TestLogger.warning('No se pudo extraer el ID del proyecto de la respuesta');
                TestLogger.warning('Estructura de respuesta recibida:', JSON.stringify(response.data, null, 2));
            }

            return { ...response.data, projectId };
        } catch (error) {
            TestLogger.error('Fallo al crear proyecto', error);
            throw error;
        }
    }

    async testGetProjects(token) {
        TestLogger.subsection('Probando GET /projects');
        
        this.setAuthHeader(token);
        
        try {
            const response = await this.makeRequest('get', '/projects');
            TestLogger.success('Lista de proyectos obtenida', {
                totalProjects: response.data.data ? response.data.data.total : 0,
                projectsCount: response.data.data && response.data.data.projects ? response.data.data.projects.length : 0
            });
            return response.data;
        } catch (error) {
            TestLogger.error('Fallo al obtener proyectos', error);
            throw error;
        }
    }

    async testGetProjectById(token, projectId) {
        TestLogger.subsection(`Probando GET /projects/${projectId}`);
        
        this.setAuthHeader(token);
        
        try {
            const response = await this.makeRequest('get', `/projects/${projectId}`);
            TestLogger.success('Proyecto específico obtenido', response.data);
            return response.data;
        } catch (error) {
            TestLogger.error(`Fallo al obtener proyecto ${projectId}`, error);
            throw error;
        }
    }

    async testUpdateProject(token, projectId, updateData) {
        TestLogger.subsection(`Probando PUT /projects/${projectId}`);
        
        this.setAuthHeader(token);
        TestLogger.info('Datos de actualización del proyecto', updateData);
        
        try {
            const response = await this.makeRequest('put', `/projects/${projectId}`, updateData);
            TestLogger.success('Proyecto actualizado exitosamente', response.data);
            return response.data;
        } catch (error) {
            TestLogger.error(`Fallo al actualizar proyecto ${projectId}`, error);
            throw error;
        }
    }

    async testDeleteProject(token, projectId) {
        TestLogger.subsection(`Probando DELETE /projects/${projectId}`);
        
        this.setAuthHeader(token);
        
        try {
            const response = await this.makeRequest('delete', `/projects/${projectId}`);
            TestLogger.success('Proyecto eliminado exitosamente');
            return response.data;
        } catch (error) {
            TestLogger.error(`Fallo al eliminar proyecto ${projectId}`, error);
            throw error;
        }
    }
}

/**
 * Pruebas para endpoints de tareas
 */
class TasksEndpointTest extends BaseEndpointTest {
    async testCreateTask(token, projectId) {
        TestLogger.subsection('Probando POST /tasks');
        
        this.setAuthHeader(token);
        
        // Generar un título único usando timestamp y número aleatorio
        const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const taskData = {
            titulo: `Tarea Test ${uniqueId}`,
            descripcion: config.TEST_TASK_DESCRIPTION,
            fecha_inicio: config.TEST_TASK_START_DATE,
            fecha_fin: config.TEST_TASK_END_DATE,
            prioridad: config.TEST_TASK_PRIORITY,
            proyecto_id: projectId
        };

        TestLogger.info('Datos de la tarea a crear', taskData);
        
        try {
            const response = await this.makeRequest('post', '/tasks', taskData, 201);
            
            TestLogger.info('Respuesta completa del servidor para tarea:', response.data);
            
            let taskId = null;
            
            // El controlador devuelve { success: true, data: { task: { id, affectedRows } }, message }
            if (response.data && response.data.data && response.data.data.task && response.data.data.task.id) {
                taskId = response.data.data.task.id;
            } else if (response.data && response.data.data && response.data.data.id) {
                taskId = response.data.data.id;
            } else if (response.data && response.data.id) {
                taskId = response.data.id;
            }
            
            if (taskId) {
                this.config.testData.tasks.push({
                    id: taskId,
                    titulo: taskData.titulo,
                    proyecto_id: projectId
                });
                TestLogger.success('Tarea creada y guardada en testData', {
                    taskId: taskId,
                    titulo: taskData.titulo,
                    projectId: projectId
                });
            } else {
                TestLogger.warning('No se pudo extraer el ID de la tarea de la respuesta');
                TestLogger.warning('Estructura de respuesta recibida:', JSON.stringify(response.data, null, 2));
            }

            return { ...response.data, taskId };
        } catch (error) {
            TestLogger.error('Fallo al crear tarea', error);
            throw error;
        }
    }

    async testGetTasks(token) {
        TestLogger.subsection('Probando GET /tasks');
        
        this.setAuthHeader(token);
        
        try {
            const response = await this.makeRequest('get', '/tasks');
            TestLogger.success('Lista de tareas obtenida', {
                totalTasks: response.data.data ? response.data.data.total : 0,
                tasksCount: response.data.data && response.data.data.tasks ? response.data.data.tasks.length : 0
            });
            return response.data;
        } catch (error) {
            TestLogger.error('Fallo al obtener tareas', error);
            throw error;
        }
    }

    async testGetTaskById(token, taskId) {
        TestLogger.subsection(`Probando GET /tasks/${taskId}`);
        
        this.setAuthHeader(token);
        
        try {
            const response = await this.makeRequest('get', `/tasks/${taskId}`);
            TestLogger.success('Tarea específica obtenida', response.data);
            return response.data;
        } catch (error) {
            TestLogger.error(`Fallo al obtener tarea ${taskId}`, error);
            throw error;
        }
    }

    async testUpdateTask(token, taskId, updateData) {
        TestLogger.subsection(`Probando PUT /tasks/${taskId}`);
        
        this.setAuthHeader(token);
        TestLogger.info('Datos de actualización de la tarea', updateData);
        
        try {
            const response = await this.makeRequest('put', `/tasks/${taskId}`, updateData);
            TestLogger.success('Tarea actualizada exitosamente', response.data);
            return response.data;
        } catch (error) {
            TestLogger.error(`Fallo al actualizar tarea ${taskId}`, error);
            throw error;
        }
    }

    async testDeleteTask(token, taskId) {
        TestLogger.subsection(`Probando DELETE /tasks/${taskId}`);
        
        this.setAuthHeader(token);
        
        try {
            const response = await this.makeRequest('delete', `/tasks/${taskId}`);
            TestLogger.success('Tarea eliminada exitosamente');
            return response.data;
        } catch (error) {
            TestLogger.error(`Fallo al eliminar tarea ${taskId}`, error);
            throw error;
        }
    }
}

/**
 * Clase para limpiar datos de prueba
 */
class TestDataCleaner {
    constructor(config) {
        this.config = config;
    }

    async cleanupTestData() {
        TestLogger.section('Limpiando datos de prueba');
        
        let connection;
        try {
            connection = await mysql.createConnection(this.config.dbConfig);
            TestLogger.info('Conexión a base de datos establecida para limpieza');

            // Limpiar en orden correcto para evitar violaciones de claves foráneas
            // 1. Primero limpiar tareas (dependen de proyectos)
            await this.cleanTasks(connection);
            
            // 2. Luego limpiar proyectos (dependen de usuarios)
            await this.cleanProjects(connection);
            
            // 3. Limpiar tokens de usuarios de prueba
            await this.cleanTokens(connection);
            
            // 4. Finalmente limpiar usuarios de prueba
            await this.cleanUsers(connection);
            
            // 5. Limpieza adicional por patrones de email de prueba
            await this.cleanTestUsersByPattern(connection);

            TestLogger.success('Limpieza de datos completada exitosamente');
            
        } catch (error) {
            TestLogger.error('Error durante la limpieza de datos', error);
        } finally {
            if (connection) {
                await connection.end();
                TestLogger.info('Conexión a base de datos cerrada');
            }
        }
    }

    async cleanTasks(connection) {
        // Limpiar tareas por ID específico
        if (this.config.testData.tasks.length > 0) {
            TestLogger.info(`Limpiando ${this.config.testData.tasks.length} tareas de prueba por ID`);
            
            for (const task of this.config.testData.tasks) {
                try {
                    await connection.execute('DELETE FROM tareas WHERE id = ?', [task.id]);
                    TestLogger.success(`Tarea eliminada: ${task.titulo} (ID: ${task.id})`);
                } catch (error) {
                    TestLogger.warning(`No se pudo eliminar la tarea ${task.id}`, error.message);
                }
            }
        }

        // Limpiar tareas por patrón de título de prueba
        try {
            const [result] = await connection.execute(
                'DELETE FROM tareas WHERE titulo LIKE ? OR titulo LIKE ?', 
                ['%Test%', '%Prueba%']
            );
            if (result.affectedRows > 0) {
                TestLogger.success(`${result.affectedRows} tareas de prueba adicionales eliminadas por patrón`);
            }
        } catch (error) {
            TestLogger.warning('Error limpiando tareas por patrón', error.message);
        }
    }

    async cleanProjects(connection) {
        // Limpiar proyectos por ID específico
        if (this.config.testData.projects.length > 0) {
            TestLogger.info(`Limpiando ${this.config.testData.projects.length} proyectos de prueba por ID`);
            
            for (const project of this.config.testData.projects) {
                try {
                    await connection.execute('DELETE FROM proyectos WHERE id = ?', [project.id]);
                    TestLogger.success(`Proyecto eliminado: ${project.titulo} (ID: ${project.id})`);
                } catch (error) {
                    TestLogger.warning(`No se pudo eliminar el proyecto ${project.id}`, error.message);
                }
            }
        }

        // Limpiar proyectos por patrón de título de prueba
        try {
            const [result] = await connection.execute(
                'DELETE FROM proyectos WHERE titulo LIKE ? OR titulo LIKE ?', 
                ['%Test%', '%Prueba%']
            );
            if (result.affectedRows > 0) {
                TestLogger.success(`${result.affectedRows} proyectos de prueba adicionales eliminados por patrón`);
            }
        } catch (error) {
            TestLogger.warning('Error limpiando proyectos por patrón', error.message);
        }
    }

    async cleanUsers(connection) {
        // Limpiar usuarios por ID específico
        if (this.config.testData.users.length > 0) {
            TestLogger.info(`Limpiando ${this.config.testData.users.length} usuarios de prueba por ID`);
            
            for (const user of this.config.testData.users) {
                try {
                    await connection.execute('DELETE FROM usuarios WHERE id = ?', [user.id]);
                    TestLogger.success(`Usuario eliminado: ${user.email} (ID: ${user.id})`);
                } catch (error) {
                    TestLogger.warning(`No se pudo eliminar el usuario ${user.id}`, error.message);
                }
            }
        }
    }

    async cleanTestUsersByPattern(connection) {
        TestLogger.info('Limpiando usuarios de prueba por patrones de email');
        
        try {
            // Limpiar usuarios con emails de prueba
            const [result] = await connection.execute(
                'DELETE FROM usuarios WHERE email LIKE ? OR email LIKE ? OR email LIKE ? OR nombre LIKE ?', 
                ['%test%@%', '%prueba%@%', '%@example.com', '%Test%']
            );
            if (result.affectedRows > 0) {
                TestLogger.success(`${result.affectedRows} usuarios de prueba adicionales eliminados por patrón`);
            }
        } catch (error) {
            TestLogger.warning('Error limpiando usuarios por patrón', error.message);
        }
    }

    async cleanTokens(connection) {
        TestLogger.info('Limpiando tokens expirados y de prueba');
        
        try {
            // Limpiar tokens usando procedimiento almacenado
            await connection.execute('CALL CleanExpiredTokens()');
            TestLogger.success('Tokens expirados limpiados usando procedimiento almacenado');
        } catch (error) {
            TestLogger.warning('No se pudieron limpiar los tokens expirados con procedimiento', error.message);
        }

        try {
            // Limpiar tokens de usuarios de prueba manualmente
            const [result] = await connection.execute(`
                DELETE rt FROM refresh_tokens rt 
                INNER JOIN usuarios u ON rt.usuario_id = u.id 
                WHERE u.email LIKE '%test%@%' 
                   OR u.email LIKE '%prueba%@%' 
                   OR u.email LIKE '%@example.com'
                   OR u.nombre LIKE '%Test%'
            `);
            if (result.affectedRows > 0) {
                TestLogger.success(`${result.affectedRows} tokens de usuarios de prueba eliminados`);
            }
        } catch (error) {
            TestLogger.warning('Error limpiando tokens de usuarios de prueba', error.message);
        }
    }
}

/**
 * Clase principal que ejecuta todas las pruebas
 */
class EndpointTestRunner {
    constructor() {
        this.config = new TestConfig();
        this.authTest = new AuthEndpointTest(this.config);
        this.usersTest = new UsersEndpointTest(this.config);
        this.projectsTest = new ProjectsEndpointTest(this.config);
        this.tasksTest = new TasksEndpointTest(this.config);
        this.cleaner = new TestDataCleaner(this.config);
        this.testResults = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    async runTest(testName, testFunction) {
        try {
            TestLogger.info(`Iniciando prueba: ${testName}`);
            await testFunction();
            this.testResults.passed++;
            TestLogger.success(`Prueba completada: ${testName}`);
        } catch (error) {
            this.testResults.failed++;
            this.testResults.errors.push({ test: testName, error: error.message });
            TestLogger.error(`Prueba fallida: ${testName}`, error);
        }
    }

    async runAllTests() {
        TestLogger.section('Iniciando Suite Completa de Pruebas de Endpoints');
        TestLogger.info('Configuración inicial', {
            baseURL: this.config.baseURL,
            database: this.config.dbConfig.database
        });

        let adminToken = null;
        let testUserId = null;
        let testProjectId = null;
        let testTaskId = null;

        try {
            // 1. Pruebas de Autenticación
            TestLogger.section('Pruebas de Autenticación');
            
            await this.runTest('Registro de Usuario', async () => {
                const registerResult = await this.authTest.testRegister();
                testUserId = registerResult.data.user.id;
            });

            await this.runTest('Login de Usuario', async () => {
                const testUser = this.config.testData.users[0];
                const loginResult = await this.authTest.testLogin(testUser.email, testUser.password);
                adminToken = loginResult.data.accessToken;
            });

            // 2. Pruebas de Usuarios
            TestLogger.section('Pruebas de Endpoints de Usuarios');
            
            await this.runTest('Obtener Lista de Usuarios', async () => {
                await this.usersTest.testGetUsers(adminToken);
            });

            await this.runTest('Obtener Usuario por ID', async () => {
                await this.usersTest.testGetUserById(adminToken, testUserId);
            });

            await this.runTest('Actualizar Usuario', async () => {
                const updateData = { 
                    nombre: 'Usuario Test Actualizado',
                    telefono: '9876543210' 
                };
                await this.usersTest.testUpdateUser(adminToken, testUserId, updateData);
            });

            // 3. Pruebas de Proyectos
            TestLogger.section('Pruebas de Endpoints de Proyectos');
            
            await this.runTest('Crear Proyecto', async () => {
                const projectResult = await this.projectsTest.testCreateProject(adminToken);
                
                // Usar el projectId devuelto directamente
                testProjectId = projectResult.projectId;
                
                if (!testProjectId) {
                    // Intentar diferentes estructuras de respuesta como fallback
                    if (projectResult.data && projectResult.data.project && projectResult.data.project.id) {
                        testProjectId = projectResult.data.project.id;
                    } else if (projectResult.data && projectResult.data.id) {
                        testProjectId = projectResult.data.id;
                    } else if (projectResult.project && projectResult.project.id) {
                        testProjectId = projectResult.project.id;
                    } else if (projectResult.id) {
                        testProjectId = projectResult.id;
                    }
                }
                
                TestLogger.info('ID del proyecto extraído:', testProjectId);
                
                if (!testProjectId) {
                    throw new Error('No se pudo obtener el ID del proyecto creado');
                }
            });

            await this.runTest('Obtener Lista de Proyectos', async () => {
                await this.projectsTest.testGetProjects(adminToken);
            });

            await this.runTest('Obtener Proyecto por ID', async () => {
                await this.projectsTest.testGetProjectById(adminToken, testProjectId);
            });

            await this.runTest('Actualizar Proyecto', async () => {
                const updateData = { descripcion: 'Descripción actualizada del proyecto' };
                await this.projectsTest.testUpdateProject(adminToken, testProjectId, updateData);
            });

            // 4. Pruebas de Tareas
            TestLogger.section('Pruebas de Endpoints de Tareas');
            
            await this.runTest('Crear Tarea', async () => {
                TestLogger.info('Valor de testProjectId antes de crear tarea:', testProjectId);
                if (!testProjectId) {
                    throw new Error('testProjectId es undefined - no se puede crear la tarea');
                }
                const taskResult = await this.tasksTest.testCreateTask(adminToken, testProjectId);
                
                // Usar el taskId devuelto directamente
                testTaskId = taskResult.taskId;
                
                if (!testTaskId) {
                    // Intentar diferentes estructuras de respuesta como fallback
                    if (taskResult.data && taskResult.data.task && taskResult.data.task.id) {
                        testTaskId = taskResult.data.task.id;
                    } else if (taskResult.data && taskResult.data.id) {
                        testTaskId = taskResult.data.id;
                    } else if (taskResult.task && taskResult.task.id) {
                        testTaskId = taskResult.task.id;
                    } else if (taskResult.id) {
                        testTaskId = taskResult.id;
                    }
                }
                
                TestLogger.info('ID de la tarea extraído:', testTaskId);
                
                if (!testTaskId) {
                    throw new Error('No se pudo obtener el ID de la tarea creada');
                }
            });

            await this.runTest('Obtener Lista de Tareas', async () => {
                await this.tasksTest.testGetTasks(adminToken);
            });

            await this.runTest('Obtener Tarea por ID', async () => {
                await this.tasksTest.testGetTaskById(adminToken, testTaskId);
            });

            await this.runTest('Actualizar Tarea', async () => {
                const updateData = { estado: 'en_progreso' };
                await this.tasksTest.testUpdateTask(adminToken, testTaskId, updateData);
            });

            await this.runTest('Eliminar Tarea', async () => {
                await this.tasksTest.testDeleteTask(adminToken, testTaskId);
            });

            await this.runTest('Eliminar Proyecto', async () => {
                await this.projectsTest.testDeleteProject(adminToken, testProjectId);
            });

            // 5. Prueba de Logout
            await this.runTest('Logout de Usuario', async () => {
                await this.authTest.testLogout(adminToken);
            });

        } catch (error) {
            TestLogger.error('Error crítico durante las pruebas', error);
        } finally {
            // 6. Limpieza de datos
            await this.runTest('Limpieza de Datos de Prueba', async () => {
                await this.cleaner.cleanupTestData();
            });

            // 7. Resumen final
            this.showTestSummary();
        }
    }

    showTestSummary() {
        TestLogger.section('Resumen Final de Pruebas');
        
        const total = this.testResults.passed + this.testResults.failed;
        const successRate = total > 0 ? ((this.testResults.passed / total) * 100).toFixed(2) : 0;

        TestLogger.info('Estadísticas de Pruebas', {
            'Total de Pruebas': total,
            'Pruebas Exitosas': this.testResults.passed,
            'Pruebas Fallidas': this.testResults.failed,
            'Tasa de Éxito': `${successRate}%`
        });

        if (this.testResults.errors.length > 0) {
            TestLogger.warning('Errores Encontrados');
            this.testResults.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error.test}: ${error.error}`);
            });
        }

        if (this.testResults.failed === 0) {
            TestLogger.success('🎉 ¡Todas las pruebas pasaron exitosamente!');
        } else {
            TestLogger.warning(`⚠️  ${this.testResults.failed} prueba(s) fallaron. Revisar logs para más detalles.`);
        }

        TestLogger.info('Datos de prueba creados y limpiados', {
            'Usuarios creados': this.config.testData.users.length,
            'Proyectos creados': this.config.testData.projects.length,
            'Tareas creadas': this.config.testData.tasks.length,
            'Tokens utilizados': this.config.testData.tokens.length
        });
    }
}

// Función principal para ejecutar las pruebas
async function runEndpointTests() {
    const runner = new EndpointTestRunner();
    await runner.runAllTests();
}

// Ejecutar si se llama directamente
if (require.main === module) {
    runEndpointTests().catch(error => {
        TestLogger.error('Error fatal en la ejecución de pruebas', error);
        process.exit(1);
    });
}

module.exports = {
    EndpointTestRunner,
    TestConfig,
    TestLogger,
    AuthEndpointTest,
    UsersEndpointTest,
    ProjectsEndpointTest,
    TasksEndpointTest,
    TestDataCleaner
};
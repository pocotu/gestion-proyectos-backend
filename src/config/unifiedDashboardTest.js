const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const config = require('./config');

// Configuración usando el archivo de configuración
const BASE_URL = config.TEST_BASE_URL;
const execAsync = util.promisify(exec);

/**
 * Clase unificada para pruebas del dashboard que combina:
 * - Pruebas con axios (HTTP requests directos)
 * - Pruebas con curl (comandos de sistema)
 * - Pruebas como usuario regular (no admin)
 * - Logging detallado y manejo de errores
 */
class UnifiedDashboardTest {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
        
        this.tokens = {
            admin: null,
            regularUser: null
        };
        
        // Credenciales de prueba usando configuración
        this.adminCredentials = {
            email: 'admin@test.com',
            password: config.TEST_USER_PASSWORD
        };
        
        this.userCredentials = {
            email: 'user@test.com', 
            password: config.TEST_USER_PASSWORD
        };
    }

    // ==================== LOGGING METHODS ====================
    log(message, data = null) {
        console.log(`\n🔵 [INFO] ${message}`);
        if (data) {
            console.log('   📋 Datos:', JSON.stringify(data, null, 2));
        }
    }

    success(message, data = null) {
        console.log(`\n✅ [SUCCESS] ${message}`);
        if (data) {
            console.log('   📋 Respuesta:', JSON.stringify(data, null, 2));
        }
    }

    error(message, error = null) {
        console.log(`\n❌ [ERROR] ${message}`);
        if (error) {
            console.log('   🚨 Detalles:', error.message || error);
            if (error.response) {
                console.log('   📋 Status:', error.response.status);
                console.log('   📋 Data:', JSON.stringify(error.response.data, null, 2));
            }
        }
    }

    section(title) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🧪 ${title.toUpperCase()}`);
        console.log(`${'='.repeat(60)}`);
    }

    subsection(title) {
        console.log(`\n${'─'.repeat(40)}`);
        console.log(`📝 ${title}`);
        console.log(`${'─'.repeat(40)}`);
    }

    // ==================== HTTP REQUEST METHODS ====================
    async makeAxiosRequest(method, url, data = null, headers = {}) {
        try {
            const response = await axios({
                method,
                url: `${BASE_URL}${url}`,
                data,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                timeout: 10000
            });
            return response;
        } catch (error) {
            throw error;
        }
    }

    async runCurl(command) {
        try {
            const { stdout, stderr } = await execAsync(command);
            return { success: true, output: stdout, error: stderr };
        } catch (error) {
            return { success: false, output: error.stdout || '', error: error.stderr || error.message };
        }
    }

    // ==================== AUTHENTICATION METHODS ====================
    async authenticateWithAxios() {
        this.subsection('Autenticación con Axios (Admin)');
        
        try {
            // 1. Registro
            this.log('Registrando usuario administrador de prueba...');
            const userData = {
                nombre: 'Unified Dashboard Test Admin',
                email: `unified_admin_${Date.now()}@example.com`,
                contraseña: 'TestPassword123!',
                telefono: '1234567890',
                es_administrador: true
            };

            const registerResponse = await this.makeAxiosRequest('POST', '/auth/register', userData);
            this.success('Usuario administrador registrado exitosamente');
            
            const userId = registerResponse.data.data.user.id;

            // 2. Login
            this.log('Iniciando sesión como administrador...');
            const loginData = {
                email: userData.email,
                contraseña: userData.contraseña
            };

            const loginResponse = await this.makeAxiosRequest('POST', '/auth/login', loginData);
            
            // Extraer token de diferentes posibles estructuras
            let token = null;
            if (loginResponse.data?.data?.accessToken) {
                token = loginResponse.data.data.accessToken;
            } else if (loginResponse.data?.accessToken) {
                token = loginResponse.data.accessToken;
            } else if (loginResponse.data?.token) {
                token = loginResponse.data.token;
            }

            if (token) {
                this.tokens.admin = token;
                this.success('Login exitoso con Axios como admin, token obtenido');
                return true;
            } else {
                this.error('No se pudo obtener el token de acceso', loginResponse.data);
                return false;
            }

        } catch (error) {
            this.error('Error en autenticación con Axios', error);
            return false;
        }
    }

    async authenticateRegularUser() {
        this.subsection('Autenticación como Usuario Regular');
        
        try {
            // 1. Registro de usuario regular
            this.log('Registrando usuario regular de prueba...');
            const userData = {
                nombre: 'Regular Test User',
                email: `regular_user_${Date.now()}@example.com`,
                contraseña: 'TestPassword123!',
                telefono: '0987654321',
                es_administrador: false
            };

            const registerResponse = await this.makeAxiosRequest('POST', '/auth/register', userData);
            this.success('Usuario regular registrado exitosamente');
            
            const userId = registerResponse.data.data.user.id;

            // 2. Login como usuario regular
            this.log('Iniciando sesión como usuario regular...');
            const loginData = {
                email: userData.email,
                contraseña: userData.contraseña
            };

            const loginResponse = await this.makeAxiosRequest('POST', '/auth/login', loginData);
            
            // Extraer token
            let token = null;
            if (loginResponse.data?.data?.accessToken) {
                token = loginResponse.data.data.accessToken;
            } else if (loginResponse.data?.accessToken) {
                token = loginResponse.data.accessToken;
            } else if (loginResponse.data?.token) {
                token = loginResponse.data.token;
            }

            if (token) {
                this.tokens.regularUser = token;
                this.success('Login exitoso como usuario regular, token obtenido');
                return true;
            } else {
                this.error('No se pudo obtener el token de usuario regular', loginResponse.data);
                return false;
            }

        } catch (error) {
            this.error('Error en autenticación de usuario regular', error);
            return false;
        }
    }

    async authenticateWithCurl() {
        this.subsection('Autenticación con cURL');
        
        try {
            // 1. Registro
            this.log('Registrando usuario con cURL...');
            const userData = JSON.stringify({
                nombre: 'Curl Test User',
                email: `curl_test_${Date.now()}@example.com`,
                contraseña: 'TestPassword123!',
                telefono: '1234567890',
                es_administrador: true
            });

            const registerCmd = `curl -X POST "${this.baseURL}/auth/register" -H "Content-Type: application/json" -d '${userData}' --silent`;
            const registerResult = await this.runCurl(registerCmd);
            
            if (registerResult.success) {
                this.success('Usuario registrado con cURL');
            } else {
                this.error('Error en registro con cURL: ' + registerResult.error);
                return false;
            }

            // 2. Login
            this.log('Iniciando sesión con cURL...');
            const loginData = JSON.stringify({
                email: JSON.parse(userData).email,
                contraseña: 'TestPassword123!'
            });

            const loginCmd = `curl -X POST "${this.baseURL}/auth/login" -H "Content-Type: application/json" -d '${loginData}' --silent`;
            const loginResult = await this.runCurl(loginCmd);
            
            if (loginResult.success && loginResult.output) {
                try {
                    const loginResponse = JSON.parse(loginResult.output);
                    const token = loginResponse.data?.accessToken || loginResponse.accessToken || loginResponse.token;
                    
                    if (token) {
                        this.tokens.admin = token;
                        this.success('Login exitoso con cURL, token obtenido');
                        return true;
                    } else {
                        this.error('No se encontró token en la respuesta de cURL');
                        return false;
                    }
                } catch (parseError) {
                    this.error('Error al parsear respuesta de login con cURL: ' + parseError.message);
                    return false;
                }
            } else {
                this.error('Error en login con cURL: ' + loginResult.error);
                return false;
            }

        } catch (error) {
            this.error('Error en autenticación con cURL', error);
            return false;
        }
    }

    // ==================== DASHBOARD ENDPOINT TESTS ====================
    async testEndpointWithAxios(name, url, token = null) {
        try {
            this.log(`Probando ${name} con Axios...`);
            const headers = { 'Authorization': `Bearer ${token || this.tokens.admin}` };
            const response = await this.makeAxiosRequest('GET', url, null, headers);
            
            if (response.status === 200) {
                this.success(`${name} - OK (${response.status})`);
                return { success: true, data: response.data };
            } else {
                this.error(`${name} - Status inesperado: ${response.status}`);
                return { success: false, status: response.status };
            }
        } catch (error) {
            this.error(`${name} - Error con Axios`, error);
            return { success: false, error: error.message };
        }
    }

    async testEndpointWithCurl(name, url, token = null) {
        try {
            this.log(`Probando ${name} con cURL...`);
            const cmd = `curl -X GET "${BASE_URL}${url}" -H "Authorization: Bearer ${token || this.tokens.admin}" -H "Content-Type: application/json" --silent -w "\\nHTTP_CODE:%{http_code}"`;
            
            const result = await this.runCurl(cmd);
            
            if (result.success) {
                const lines = result.output.split('\n');
                const httpCodeLine = lines.find(line => line.startsWith('HTTP_CODE:'));
                const httpCode = httpCodeLine ? httpCodeLine.split(':')[1] : 'unknown';
                
                if (httpCode === '200') {
                    this.success(`${name} - OK (200) con cURL`);
                    return { success: true, httpCode };
                } else {
                    this.error(`${name} - HTTP ${httpCode} con cURL`);
                    return { success: false, httpCode };
                }
            } else {
                this.error(`${name} - Error de cURL: ${result.error}`);
                return { success: false, error: result.error };
            }
        } catch (error) {
            this.error(`${name} - Error con cURL`, error);
            return { success: false, error: error.message };
        }
    }

    async runTest(testName, testFunction) {
        try {
            this.log(`Iniciando prueba: ${testName}`);
            await testFunction();
            this.results.passed++;
            this.success(`Prueba completada: ${testName}`);
        } catch (error) {
            this.results.failed++;
            this.results.details.push({ test: testName, error: error.message });
            this.error(`Prueba fallida: ${testName}`, error);
        }
    }

    async testAllDashboardEndpoints() {
        this.section('Pruebas de Endpoints del Dashboard (Admin)');

        if (!this.tokens.admin) {
            this.error('No hay token de autenticación de admin disponible');
            return;
        }

        const endpoints = [
            { name: 'Dashboard Summary', url: '/dashboard/summary' },
            { name: 'Project Stats', url: '/dashboard/projects/stats' },
            { name: 'Task Stats', url: '/dashboard/tasks/stats' },
            { name: 'Admin Stats', url: '/dashboard/admin/stats' },
            { name: 'Recent Projects', url: '/dashboard/projects/recent?limit=5' },
            { name: 'Recent Tasks', url: '/dashboard/tasks/recent?limit=5' },
            { name: 'Pending Tasks', url: '/dashboard/tasks/pending?limit=5' },
            { name: 'Recent Activity', url: '/dashboard/admin/activity?limit=5' }
        ];

        for (const endpoint of endpoints) {
            await this.runTest(`${endpoint.name} - Axios (Admin)`, async () => {
                const result = await this.testEndpointWithAxios(endpoint.name, endpoint.url);
                if (!result.success) {
                    throw new Error(`Fallo en ${endpoint.name} con Axios`);
                }
            });

            await this.runTest(`${endpoint.name} - cURL (Admin)`, async () => {
                const result = await this.testEndpointWithCurl(endpoint.name, endpoint.url);
                if (!result.success) {
                    throw new Error(`Fallo en ${endpoint.name} con cURL`);
                }
            });
        }
    }

    async testEndpointsAsRegularUser() {
        this.section('Pruebas de Endpoints como Usuario Regular');

        if (!this.tokens.regularUser) {
            this.error('No hay token de usuario regular disponible');
            return;
        }

        // Endpoints que un usuario regular debería poder acceder
        const userEndpoints = [
            { name: 'Recent Tasks (User)', url: '/dashboard/tasks/recent' },
            { name: 'Pending Tasks (User)', url: '/dashboard/tasks/pending' }
        ];

        for (const endpoint of userEndpoints) {
            await this.runTest(`${endpoint.name} - Axios`, async () => {
                const result = await this.testEndpointWithAxios(endpoint.name, endpoint.url, this.tokens.regularUser);
                if (!result.success) {
                    throw new Error(`Fallo en ${endpoint.name} con Axios como usuario regular`);
                }
            });
        }

        // Endpoints que deberían fallar para usuario regular (solo admin)
        const adminOnlyEndpoints = [
            { name: 'Admin Stats (Should Fail)', url: '/dashboard/admin/stats' },
            { name: 'Recent Activity (Should Fail)', url: '/dashboard/admin/activity?limit=5' }
        ];

        for (const endpoint of adminOnlyEndpoints) {
            await this.runTest(`${endpoint.name} - Access Control Test`, async () => {
                try {
                    const result = await this.testEndpointWithAxios(endpoint.name, endpoint.url, this.tokens.regularUser);
                    if (result.success) {
                        throw new Error(`Usuario regular pudo acceder a endpoint de admin: ${endpoint.name}`);
                    } else {
                        this.success(`Control de acceso funcionando: ${endpoint.name} bloqueado para usuario regular`);
                    }
                } catch (error) {
                    if (error.response && (error.response.status === 403 || error.response.status === 401)) {
                        this.success(`Control de acceso funcionando: ${endpoint.name} correctamente bloqueado (${error.response.status})`);
                    } else {
                        throw error;
                    }
                }
            });
        }
    }

    showTestSummary() {
        this.section('Resumen Final de Pruebas');
        this.log(`✅ Pruebas exitosas: ${this.results.passed}`);
        this.log(`❌ Pruebas fallidas: ${this.results.failed}`);
        
        if (this.results.details.length > 0) {
            this.error('Errores encontrados:');
            this.results.details.forEach(error => {
                this.error(`- ${error.test}: ${error.error}`);
            });
        }
        
        const total = this.results.passed + this.results.failed;
        const successRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(2) : 0;
        this.log(`📊 Tasa de éxito: ${successRate}%`);
    }

    // ==================== MAIN EXECUTION METHOD ====================
    async run() {
        console.log('🧪 PRUEBAS UNIFICADAS DEL DASHBOARD');
        console.log('===================================');
        this.log('Configuración inicial', { baseURL: BASE_URL });

        try {
            // Probar autenticación con Axios como admin
            this.section('Autenticación');
            const axiosAuthSuccess = await this.authenticateWithAxios();
            
            // Probar autenticación como usuario regular
            const userAuthSuccess = await this.authenticateRegularUser();
            
            if (axiosAuthSuccess) {
                // Ejecutar todas las pruebas de endpoints como admin
                await this.testAllDashboardEndpoints();
            } else {
                this.error('No se pudo completar la autenticación de admin. Saltando pruebas de admin.');
            }

            if (userAuthSuccess) {
                // Ejecutar pruebas como usuario regular
                await this.testEndpointsAsRegularUser();
            } else {
                this.error('No se pudo completar la autenticación de usuario regular. Saltando pruebas de usuario.');
            }

            if (!axiosAuthSuccess && !userAuthSuccess) {
                this.error('No se pudo completar ninguna autenticación. Abortando pruebas.');
                return;
            }

        } catch (error) {
            this.error('Error fatal en las pruebas unificadas', error);
        } finally {
            this.showTestSummary();
        }
    }
}

// Ejecutar las pruebas unificadas
const tester = new UnifiedDashboardTest();
tester.run().catch(console.error);

module.exports = UnifiedDashboardTest;
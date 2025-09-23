/**
 * Test aislado para proyectos - Mimics Jest structure
 * Para identificar problemas específicos en los tests
 */

const request = require('supertest');
const app = require('./src/app');
const DatabaseHelper = require('./tests/utils/DatabaseHelper');
const TestLogger = require('./tests/utils/TestLogger');
const AuthHelper = require('./tests/utils/AuthHelper');

// Mock de Jest functions
const expect = Object.assign((actual) => ({
  toBe: (expected) => {
    if (actual !== expected) {
      throw new Error(`Expected ${expected}, got ${actual}`);
    }
  },
  toMatchObject: (expected) => {
    // Simplified object matching
    if (typeof actual !== 'object' || actual === null) {
      throw new Error(`Expected object, got ${typeof actual}`);
    }
    for (const key in expected) {
      if (expected[key] && typeof expected[key] === 'object' && expected[key].constructor && expected[key].constructor.name === 'Any') {
        // expect.any() equivalent
        continue;
      } else if (expected[key] && typeof expected[key] === 'object' && expected[key].constructor === Object) {
        // Nested object
        if (!actual[key] || typeof actual[key] !== 'object') {
          throw new Error(`Expected object at key ${key}, got ${typeof actual[key]}`);
        }
        // Recursive check would go here, simplified for now
      } else if (actual[key] !== expected[key]) {
        throw new Error(`Expected ${key} to be ${expected[key]}, got ${actual[key]}`);
      }
    }
  },
  toContain: (expected) => {
    if (!actual.includes(expected)) {
      throw new Error(`Expected "${actual}" to contain "${expected}"`);
    }
  },
  toBeGreaterThanOrEqual: (expected) => {
    if (actual < expected) {
      throw new Error(`Expected ${actual} to be >= ${expected}`);
    }
  }
}), {
  any: (type) => ({ constructor: { name: 'Any' }, type })
});

const mockJest = {
  describe: (name, fn) => {
    console.log(`\n📋 ${name}`);
    return fn();
  },
  test: async (name, fn) => {
    console.log(`\n  🧪 ${name}`);
    try {
      await fn();
      console.log(`  ✅ PASSED: ${name}`);
      return true;
    } catch (error) {
      console.log(`  ❌ FAILED: ${name}`);
      console.error(`     Error: ${error.message}`);
      if (error.response) {
        console.error(`     Response status: ${error.response.status}`);
        console.error(`     Response body:`, error.response.body);
      }
      return false;
    }
  },
  expect: (actual) => ({
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toMatchObject: (expected) => {
      // Simplified object matching
      if (typeof actual !== 'object' || actual === null) {
        throw new Error(`Expected object, got ${typeof actual}`);
      }
      for (const key in expected) {
        if (expected[key] && typeof expected[key] === 'object' && expected[key].constructor && expected[key].constructor.name === 'Any') {
          // expect.any() equivalent
          continue;
        } else if (expected[key] && typeof expected[key] === 'object' && expected[key].constructor === Object) {
          // Nested object
          if (!actual[key] || typeof actual[key] !== 'object') {
            throw new Error(`Expected object at key ${key}, got ${typeof actual[key]}`);
          }
          // Recursive check would go here, simplified for now
        } else if (actual[key] !== expected[key]) {
          throw new Error(`Expected ${key} to be ${expected[key]}, got ${actual[key]}`);
        }
      }
    },
    toContain: (expected) => {
      if (!actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
    },
    toBeGreaterThanOrEqual: (expected) => {
      if (actual < expected) {
        throw new Error(`Expected ${actual} to be >= ${expected}`);
      }
    }
  }),
  // Static expect.any function
  expect: Object.assign((actual) => ({
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toMatchObject: (expected) => {
      // Simplified object matching
      if (typeof actual !== 'object' || actual === null) {
        throw new Error(`Expected object, got ${typeof actual}`);
      }
      for (const key in expected) {
        if (expected[key] && typeof expected[key] === 'object' && expected[key].constructor === Object) {
          // Nested object
          if (!actual[key] || typeof actual[key] !== 'object') {
            throw new Error(`Expected object at key ${key}, got ${typeof actual[key]}`);
          }
          // Recursive check would go here, simplified for now
        } else if (expected[key] && expected[key].constructor && expected[key].constructor.name === 'Any') {
          // expect.any() equivalent
          continue;
        } else if (actual[key] !== expected[key]) {
          throw new Error(`Expected ${key} to be ${expected[key]}, got ${actual[key]}`);
        }
      }
    },
    toContain: (expected) => {
      if (!actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
    },
    toBeGreaterThanOrEqual: (expected) => {
      if (actual < expected) {
        throw new Error(`Expected ${actual} to be >= ${expected}`);
      }
    }
  }), {
    any: (type) => ({ constructor: { name: 'Any' }, type })
  })
};

// Global variables
let db;
let logger;
let authHelper;
let adminToken;
let userToken;
let adminUser;
let regularUser;

// Helper para crear proyecto de prueba
const createTestProject = async (projectData, token) => {
  const data = projectData || {
    titulo: 'Proyecto Test',
    descripcion: 'Descripción del proyecto test',
    fecha_inicio: '2024-01-01',
    fecha_fin: '2024-12-31'
  };
  
  const authToken = token || adminToken;
  
  const response = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${authToken}`)
    .send(data);
  
  return response.body.project;
};

async function runIsolatedTests() {
  console.log('🚀 Iniciando tests aislados de proyectos...\n');

  try {
    // Setup global
    logger = new TestLogger({ prefix: '[PROJECTS-TESTS]' });
    authHelper = new AuthHelper();
    
    logger.testStart('Configurando entorno de tests de proyectos MVP');
    
    // Inicializar helper de base de datos
    db = new DatabaseHelper();
    await db.initialize();
    
    // Crear usuarios usando AuthHelper
    const adminAuth = await authHelper.createAdminAndGetToken();
    const userAuth = await authHelper.createUserWithRoleAndGetToken('responsable_proyecto');
    
    adminToken = adminAuth.token;
    userToken = userAuth.token;
    adminUser = adminAuth.user;
    regularUser = userAuth.user;
    
    logger.success('Entorno de tests configurado exitosamente');

    // Ejecutar tests usando mock de Jest
    const { describe, test } = mockJest;

    let allPassed = true;

    await describe('Projects Integration Tests - MVP', async () => {
      await describe('POST /api/projects', async () => {
        const result1 = await test('Debe crear un proyecto exitosamente', async () => {
          logger.info('Test: Crear proyecto');
          
          const projectData = {
            titulo: 'Proyecto de Prueba',
            descripcion: 'Descripción del proyecto de prueba',
            fecha_inicio: '2024-01-01',
            fecha_fin: '2024-12-31'
          };
          
          console.log('Admin token:', adminToken ? 'Present' : 'Missing');
          console.log('Admin user:', adminUser ? adminUser.nombre : 'Missing');
          
          const response = await request(app)
            .post('/api/projects')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(projectData);
            
          console.log('Response status:', response.status);
          console.log('Response body:', JSON.stringify(response.body, null, 2));
          
          expect(response.status).toBe(201);

          expect(response.body).toMatchObject({
            success: true,
            project: {
              id: expect.any(Number),
              titulo: projectData.titulo,
              descripcion: projectData.descripcion,
              fecha_inicio: expect.any(String),
              fecha_fin: expect.any(String),
              estado: 'planificacion',
              creado_por: adminUser.id
            }
          });
          
          logger.success('Proyecto creado correctamente');
        });

        const result2 = await test('Debe fallar al crear proyecto sin autorización', async () => {
          const projectData = {
            titulo: 'Proyecto Sin Auth',
            descripcion: 'Descripción',
            fecha_inicio: '2024-01-01',
            fecha_fin: '2024-12-31'
          };
          
          const response = await request(app)
            .post('/api/projects')
            .send(projectData);

          expect(response.status).toBe(401);
          expect(response.body.success).toBe(false);
          expect(response.body.message).toContain('Token de acceso requerido');
          
          logger.success('Validación de autorización funcionando');
        });

        allPassed = allPassed && result1 && result2;
      });

      await describe('GET /api/projects', async () => {
        const result3 = await test('Debe listar proyectos como administrador', async () => {
          logger.info('Test: Listar proyectos como admin');
          
          // Crear algunos proyectos de prueba
          await createTestProject({
            titulo: 'Proyecto 1',
            descripcion: 'Descripción 1',
            fecha_inicio: '2024-01-01',
            fecha_fin: '2024-06-30'
          }, adminToken);

          await createTestProject({
            titulo: 'Proyecto 2',
            descripcion: 'Descripción 2',
            fecha_inicio: '2024-07-01',
            fecha_fin: '2024-12-31'
          }, adminToken);

          const response = await request(app)
            .get('/api/projects')
            .set('Authorization', `Bearer ${adminToken}`);

          expect(response.status).toBe(200);
          expect(response.body).toMatchObject({
            success: true,
            projects: expect.any(Array)
          });

          expect(response.body.projects.length).toBeGreaterThanOrEqual(2);
          
          logger.success('Lista de proyectos obtenida correctamente');
        });

        allPassed = allPassed && result3;
      });
    });

    if (allPassed) {
      console.log('\n🎉 ¡Todos los tests pasaron exitosamente!');
    } else {
      console.log('\n❌ Algunos tests fallaron');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error general en tests:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    if (db) {
      try {
        await db.cleanup();
        await db.close();
        console.log('\n🧹 Cleanup completado');
      } catch (cleanupError) {
        console.error('Error en cleanup:', cleanupError.message);
      }
    }
  }
}

// Ejecutar tests
runIsolatedTests();
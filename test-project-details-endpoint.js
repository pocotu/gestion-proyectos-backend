/**
 * Quick Test Script for Project Details Endpoint
 * 
 * This script helps verify the endpoint is working before manual testing.
 * Run with: node test-project-details-endpoint.js
 * 
 * Prerequisites:
 * - Backend server must be running (npm run dev)
 * - Database must be seeded with test data
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Test credentials (update these based on your seeded data)
const TEST_USERS = {
  admin: {
    email: 'admin@example.com',
    password: 'admin123'
  },
  responsible: {
    email: 'responsible@example.com',
    password: 'password123'
  },
  regular: {
    email: 'user@example.com',
    password: 'password123'
  }
};

const TEST_PROJECT_ID = 1; // Update this to a valid project ID in your database

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

async function login(email, password) {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email,
      password
    });
    return response.data.token;
  } catch (error) {
    throw new Error(`Login failed: ${error.response?.data?.message || error.message}`);
  }
}

async function getProjectDetails(projectId, token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/projects/${projectId}/details`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response;
  } catch (error) {
    return error.response;
  }
}

async function testAdminAccess() {
  log('\n=== Test 1: Admin User Access ===', 'blue');
  
  try {
    logInfo('Logging in as admin...');
    const token = await login(TEST_USERS.admin.email, TEST_USERS.admin.password);
    logSuccess('Admin login successful');

    logInfo(`Fetching project ${TEST_PROJECT_ID} details...`);
    const response = await getProjectDetails(TEST_PROJECT_ID, token);

    if (response.status === 200) {
      logSuccess('Admin can access project details');
      
      // Validate response structure
      const { data } = response.data;
      if (data.project && data.responsibles && data.tasks && data.files && data.activityLogs && data.statistics) {
        logSuccess('Response structure is correct');
        logInfo(`Project: ${data.project.titulo}`);
        logInfo(`Responsibles: ${data.responsibles.length}`);
        logInfo(`Tasks: ${data.tasks.length}`);
        logInfo(`Files: ${data.files.length}`);
        logInfo(`Activity Logs: ${data.activityLogs.length}`);
        logInfo(`Total Tasks: ${data.statistics.totalTasks}`);
      } else {
        logWarning('Response structure is incomplete');
      }
    } else {
      logError(`Unexpected status code: ${response.status}`);
    }
  } catch (error) {
    logError(`Test failed: ${error.message}`);
  }
}

async function testResponsibleAccess() {
  log('\n=== Test 2: Responsible User Access ===', 'blue');
  
  try {
    logInfo('Logging in as responsible user...');
    const token = await login(TEST_USERS.responsible.email, TEST_USERS.responsible.password);
    logSuccess('Responsible user login successful');

    logInfo(`Fetching project ${TEST_PROJECT_ID} details...`);
    const response = await getProjectDetails(TEST_PROJECT_ID, token);

    if (response.status === 200) {
      logSuccess('Responsible user can access assigned project');
    } else if (response.status === 403) {
      logWarning('User is not responsible for this project (expected if not assigned)');
    } else {
      logError(`Unexpected status code: ${response.status}`);
    }
  } catch (error) {
    logError(`Test failed: ${error.message}`);
  }
}

async function testUnauthorizedAccess() {
  log('\n=== Test 3: Unauthorized User Access ===', 'blue');
  
  try {
    logInfo('Logging in as regular user...');
    const token = await login(TEST_USERS.regular.email, TEST_USERS.regular.password);
    logSuccess('Regular user login successful');

    logInfo(`Attempting to fetch project ${TEST_PROJECT_ID} details...`);
    const response = await getProjectDetails(TEST_PROJECT_ID, token);

    if (response.status === 403) {
      logSuccess('Unauthorized access correctly denied (403)');
      logInfo(`Message: ${response.data.message}`);
    } else if (response.status === 200) {
      logWarning('User has access (might be responsible or admin)');
    } else {
      logError(`Unexpected status code: ${response.status}`);
    }
  } catch (error) {
    logError(`Test failed: ${error.message}`);
  }
}

async function testInvalidProjectId() {
  log('\n=== Test 4: Invalid Project ID ===', 'blue');
  
  try {
    logInfo('Logging in as admin...');
    const token = await login(TEST_USERS.admin.email, TEST_USERS.admin.password);

    logInfo('Testing with non-numeric ID...');
    const response1 = await getProjectDetails('abc', token);
    if (response1.status === 400) {
      logSuccess('Non-numeric ID correctly rejected (400)');
    } else {
      logError(`Expected 400, got ${response1.status}`);
    }

    logInfo('Testing with negative ID...');
    const response2 = await getProjectDetails(-1, token);
    if (response2.status === 400) {
      logSuccess('Negative ID correctly rejected (400)');
    } else {
      logError(`Expected 400, got ${response2.status}`);
    }

    logInfo('Testing with zero ID...');
    const response3 = await getProjectDetails(0, token);
    if (response3.status === 400) {
      logSuccess('Zero ID correctly rejected (400)');
    } else {
      logError(`Expected 400, got ${response3.status}`);
    }
  } catch (error) {
    logError(`Test failed: ${error.message}`);
  }
}

async function testNonExistentProject() {
  log('\n=== Test 5: Non-Existent Project ===', 'blue');
  
  try {
    logInfo('Logging in as admin...');
    const token = await login(TEST_USERS.admin.email, TEST_USERS.admin.password);

    logInfo('Testing with non-existent project ID...');
    const response = await getProjectDetails(999999, token);
    
    if (response.status === 404) {
      logSuccess('Non-existent project correctly returns 404');
      logInfo(`Message: ${response.data.message}`);
    } else {
      logError(`Expected 404, got ${response.status}`);
    }
  } catch (error) {
    logError(`Test failed: ${error.message}`);
  }
}

async function testUnauthenticatedAccess() {
  log('\n=== Test 6: Unauthenticated Access ===', 'blue');
  
  try {
    logInfo('Attempting to access without token...');
    const response = await axios.get(`${BASE_URL}/api/projects/${TEST_PROJECT_ID}/details`);
    
    logError(`Expected 401, got ${response.status}`);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      logSuccess('Unauthenticated access correctly denied (401)');
      logInfo(`Message: ${error.response.data.message}`);
    } else {
      logError(`Test failed: ${error.message}`);
    }
  }
}

async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║  Project Details Endpoint - Quick Test Suite          ║', 'cyan');
  log('╚════════════════════════════════════════════════════════╝', 'cyan');
  
  logInfo(`Testing endpoint: ${BASE_URL}/api/projects/:id/details`);
  logInfo(`Test project ID: ${TEST_PROJECT_ID}`);
  
  try {
    await testAdminAccess();
    await testResponsibleAccess();
    await testUnauthorizedAccess();
    await testInvalidProjectId();
    await testNonExistentProject();
    await testUnauthenticatedAccess();
    
    log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
    log('║  All Tests Completed                                   ║', 'cyan');
    log('╚════════════════════════════════════════════════════════╝', 'cyan');
    
    logInfo('\nNext steps:');
    logInfo('1. Review the test results above');
    logInfo('2. Perform manual testing with Postman/Thunder Client');
    logInfo('3. Refer to MANUAL_TESTING_GUIDE.md for detailed test cases');
    
  } catch (error) {
    logError(`\nTest suite failed: ${error.message}`);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});

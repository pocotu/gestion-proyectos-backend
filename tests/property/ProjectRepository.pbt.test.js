/**
 * Property-Based Tests - ProjectRepository
 * Property 16: Query Column Specificity
 * Validates: Requirements 14.5
 * 
 * Feature: project-detail-view, Property 16: Query Column Specificity
 * 
 * This test performs static code analysis and does not require database connection.
 * 
 * NOTE: This test file should be run independently without database setup.
 */

const fc = require('fast-check');
const fs = require('fs');
const path = require('path');

// Override the global setup to prevent database initialization for static analysis tests
jest.setTimeout(10000); // Shorter timeout for static analysis

describe('Property-Based Tests - ProjectRepository (Static Analysis)', () => {
  describe('Property 16: Query Column Specificity', () => {
    let repositoryCode;
    
    beforeAll(() => {
      // Read the ProjectRepository.js file once for all tests
      const repositoryPath = path.join(__dirname, '../../src/repositories/ProjectRepository.js');
      repositoryCode = fs.readFileSync(repositoryPath, 'utf8');
    });
    
    test('all SQL queries should explicitly list columns (no SELECT *)', () => {
      // Extract all SQL query strings from the file
      // Match both template literals and regular strings containing SELECT
      const queryRegex = /(?:const|let|var)\s+\w+\s*=\s*`([^`]*SELECT[^`]*)`|(?:const|let|var)\s+\w+\s*=\s*'([^']*SELECT[^']*)'|(?:const|let|var)\s+\w+\s*=\s*"([^"]*SELECT[^"]*)"/gi;
      
      const queries = [];
      let match;
      
      while ((match = queryRegex.exec(repositoryCode)) !== null) {
        // Get the matched query (could be in any of the three capture groups)
        const query = match[1] || match[2] || match[3];
        if (query) {
          queries.push(query.trim());
        }
      }
      
      // Ensure we found queries to test
      expect(queries.length).toBeGreaterThan(0);
      
      // Property: For any SQL query in the repository, it should NOT contain "SELECT *"
      fc.assert(
        fc.property(
          fc.constantFrom(...queries),
          (query) => {
            // Normalize the query: remove extra whitespace and convert to uppercase
            const normalizedQuery = query.replace(/\s+/g, ' ').toUpperCase();
            
            // Check that the query does not contain "SELECT *"
            // We need to be careful to match "SELECT *" but not "SELECT * FROM" in comments
            // or "SELECT COUNT(*)" which is valid
            const hasSelectStar = /SELECT\s+\*\s+FROM/i.test(normalizedQuery);
            
            // If SELECT * is found, fail the test with a descriptive message
            if (hasSelectStar) {
              console.error(`\nFound SELECT * in query:\n${query}\n`);
              return false;
            }
            
            return true;
          }
        ),
        {
          numRuns: Math.max(100, queries.length), // Run at least 100 times or once per query
          verbose: true
        }
      );
    });
    
    test('new detail view methods should explicitly list all columns', () => {
      // Define the new methods we added for the detail view
      const detailViewMethods = [
        'getProjectWithCreator',
        'getProjectResponsibles',
        'getProjectTasks',
        'getProjectFiles',
        'getProjectActivityLogs',
        'getProjectStatistics',
        'isUserProjectResponsible'
      ];
      
      // Property: For each detail view method, verify it explicitly lists columns
      fc.assert(
        fc.property(
          fc.constantFrom(...detailViewMethods),
          (methodName) => {
            // Extract the method body - handle nested braces
            const methodRegex = new RegExp(`async\\s+${methodName}\\s*\\([^)]*\\)\\s*{`, 's');
            const methodStart = repositoryCode.search(methodRegex);
            
            if (methodStart === -1) {
              console.error(`\nMethod ${methodName} not found in repository`);
              return false;
            }
            
            // Find the matching closing brace
            let braceCount = 0;
            let methodEnd = methodStart;
            let foundStart = false;
            
            for (let i = methodStart; i < repositoryCode.length; i++) {
              if (repositoryCode[i] === '{') {
                braceCount++;
                foundStart = true;
              } else if (repositoryCode[i] === '}') {
                braceCount--;
                if (foundStart && braceCount === 0) {
                  methodEnd = i;
                  break;
                }
              }
            }
            
            const methodBody = repositoryCode.substring(methodStart, methodEnd + 1);
            
            // Find all SELECT statements in the method
            const selectRegex = /SELECT\s+(.*?)\s+FROM/gis;
            let selectMatch;
            let foundSelect = false;
            
            while ((selectMatch = selectRegex.exec(methodBody)) !== null) {
              foundSelect = true;
              const selectedColumns = selectMatch[1].trim();
              
              // Check if it's SELECT *
              if (selectedColumns === '*') {
                console.error(`\nMethod ${methodName} uses SELECT * instead of explicit columns`);
                return false;
              }
              
              // Verify it has actual column names (not just whitespace)
              if (selectedColumns.length === 0) {
                console.error(`\nMethod ${methodName} has empty SELECT clause`);
                return false;
              }
            }
            
            // Ensure we found at least one SELECT statement
            if (!foundSelect) {
              console.error(`\nMethod ${methodName} does not contain any SELECT statements`);
              return false;
            }
            
            return true;
          }
        ),
        {
          numRuns: detailViewMethods.length, // Run once per method
          verbose: true
        }
      );
    });
    
    test('all queries should use parameterized values (no string concatenation)', () => {
      // Extract method bodies for detail view methods
      const detailViewMethods = [
        'getProjectWithCreator',
        'getProjectResponsibles',
        'getProjectTasks',
        'getProjectFiles',
        'getProjectActivityLogs',
        'getProjectStatistics',
        'isUserProjectResponsible'
      ];
      
      // Property: For each method, verify queries use ? placeholders
      fc.assert(
        fc.property(
          fc.constantFrom(...detailViewMethods),
          (methodName) => {
            // Extract the method body
            const methodRegex = new RegExp(`async\\s+${methodName}\\s*\\([^)]*\\)\\s*{`, 's');
            const methodStart = repositoryCode.search(methodRegex);
            
            if (methodStart === -1) {
              return true; // Skip if method not found
            }
            
            // Find the matching closing brace
            let braceCount = 0;
            let methodEnd = methodStart;
            let foundStart = false;
            
            for (let i = methodStart; i < repositoryCode.length; i++) {
              if (repositoryCode[i] === '{') {
                braceCount++;
                foundStart = true;
              } else if (repositoryCode[i] === '}') {
                braceCount--;
                if (foundStart && braceCount === 0) {
                  methodEnd = i;
                  break;
                }
              }
            }
            
            const methodBody = repositoryCode.substring(methodStart, methodEnd + 1);
            
            // Check for pool.execute calls
            const executeRegex = /pool\.execute\s*\(\s*([^,]+),\s*\[([^\]]*)\]/g;
            let executeMatch;
            
            while ((executeMatch = executeRegex.exec(methodBody)) !== null) {
              const queryVar = executeMatch[1].trim();
              
              // Look for the query definition
              const queryDefRegex = new RegExp(`${queryVar}\\s*=\\s*\`([^\`]+)\``, 's');
              const queryDefMatch = methodBody.match(queryDefRegex);
              
              if (queryDefMatch) {
                const query = queryDefMatch[1];
                
                // Check if query has WHERE clause
                if (/WHERE/i.test(query)) {
                  // Should have ? placeholders
                  const placeholderCount = (query.match(/\?/g) || []).length;
                  
                  if (placeholderCount === 0) {
                    // Exception: LIMIT with string interpolation is allowed (MySQL limitation)
                    if (!/LIMIT\s+\$\{/i.test(query)) {
                      console.error(`\nMethod ${methodName} has WHERE clause but no ? placeholders`);
                      return false;
                    }
                  }
                }
              }
            }
            
            return true;
          }
        ),
        {
          numRuns: detailViewMethods.length,
          verbose: true
        }
      );
    });
  });
});

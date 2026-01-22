/**
 * Tests for CMakeLists Parser
 */

import * as assert from 'assert';
import { parseSetCommands, parseProjectName, parseIncludes, parseOptions } from '../parsers/cmakeListsParser';

describe('CMakeLists Parser', () => {
    
    describe('parseSetCommands', () => {
        it('should parse a simple set command', () => {
            const content = 'set(MY_VAR "value")';
            const result = parseSetCommands(content, '/path/CMakeLists.txt');
            
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].name, 'MY_VAR');
            assert.strictEqual(result[0].value, 'value');
            assert.strictEqual(result[0].isCache, false);
        });
        
        it('should parse set command without quotes', () => {
            const content = 'set(MY_VAR value)';
            const result = parseSetCommands(content, '/path/CMakeLists.txt');
            
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].name, 'MY_VAR');
            assert.strictEqual(result[0].value, 'value');
        });
        
        it('should parse cache variable', () => {
            const content = 'set(CACHE_VAR "value" CACHE STRING "description")';
            const result = parseSetCommands(content, '/path/CMakeLists.txt');
            
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].name, 'CACHE_VAR');
            assert.strictEqual(result[0].isCache, true);
        });
        
        it('should parse multiple set commands', () => {
            const content = `
set(VAR1 "value1")
set(VAR2 "value2")
set(VAR3 value3)
`;
            const result = parseSetCommands(content, '/path/CMakeLists.txt');
            
            assert.strictEqual(result.length, 3);
            assert.strictEqual(result[0].name, 'VAR1');
            assert.strictEqual(result[1].name, 'VAR2');
            assert.strictEqual(result[2].name, 'VAR3');
        });
        
        it('should track line numbers', () => {
            const content = `# comment
set(VAR1 "value1")
# another comment
set(VAR2 "value2")`;
            const result = parseSetCommands(content, '/path/CMakeLists.txt');
            
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0].line, 2);
            assert.strictEqual(result[1].line, 4);
        });
        
        it('should skip commented lines', () => {
            const content = `# set(COMMENTED "value")
set(ACTUAL "value")`;
            const result = parseSetCommands(content, '/path/CMakeLists.txt');
            
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].name, 'ACTUAL');
        });
        
        it('should parse path values', () => {
            const content = 'set(MY_PATH "${CMAKE_SOURCE_DIR}/include")';
            const result = parseSetCommands(content, '/path/CMakeLists.txt');
            
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].value, '${CMAKE_SOURCE_DIR}/include');
        });
    });
    
    describe('parseProjectName', () => {
        it('should parse project name', () => {
            const content = 'project(MyProject)';
            const result = parseProjectName(content);
            
            assert.strictEqual(result, 'MyProject');
        });
        
        it('should parse project name with version', () => {
            const content = 'project(MyProject VERSION 1.0.0)';
            const result = parseProjectName(content);
            
            assert.strictEqual(result, 'MyProject');
        });
        
        it('should return null when no project found', () => {
            const content = 'set(VAR "value")';
            const result = parseProjectName(content);
            
            assert.strictEqual(result, null);
        });
    });
    
    describe('parseIncludes', () => {
        it('should parse include commands', () => {
            const content = `
include(cmake/utils.cmake)
include("cmake/config.cmake")
`;
            const result = parseIncludes(content);
            
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0], 'cmake/utils.cmake');
            assert.strictEqual(result[1], 'cmake/config.cmake');
        });
    });
    
    describe('parseOptions', () => {
        it('should parse option commands', () => {
            const content = `
option(ENABLE_TESTS "Enable tests" ON)
option(BUILD_SHARED "Build shared library" OFF)
option(USE_SSL "Use SSL")
`;
            const result = parseOptions(content, '/path/CMakeLists.txt');
            
            assert.strictEqual(result.length, 3);
            assert.strictEqual(result[0].name, 'ENABLE_TESTS');
            assert.strictEqual(result[0].value, 'ON');
            assert.strictEqual(result[1].name, 'BUILD_SHARED');
            assert.strictEqual(result[1].value, 'OFF');
            assert.strictEqual(result[2].name, 'USE_SSL');
            assert.strictEqual(result[2].value, 'OFF'); // Default
        });
    });
});

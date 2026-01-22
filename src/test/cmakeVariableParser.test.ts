/**
 * Tests for CMake Variable Parser
 */

import * as assert from 'assert';
import { parseVariables, parsePaths, containsVariables, extractVariableName } from '../parsers/cmakeVariableParser';

describe('CMake Variable Parser', () => {
    
    describe('parseVariables', () => {
        it('should parse a single variable', () => {
            const result = parseVariables('${MY_VAR}');
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].variableName, 'MY_VAR');
            assert.strictEqual(result[0].fullMatch, '${MY_VAR}');
            assert.strictEqual(result[0].startIndex, 0);
            assert.strictEqual(result[0].endIndex, 9);
        });
        
        it('should parse multiple variables', () => {
            const result = parseVariables('${VAR1} and ${VAR2}');
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0].variableName, 'VAR1');
            assert.strictEqual(result[1].variableName, 'VAR2');
        });
        
        it('should handle variables with underscores', () => {
            const result = parseVariables('${MY_LONG_VARIABLE_NAME}');
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].variableName, 'MY_LONG_VARIABLE_NAME');
        });
        
        it('should handle variables with numbers', () => {
            const result = parseVariables('${VAR123}');
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].variableName, 'VAR123');
        });
        
        it('should return empty array for no variables', () => {
            const result = parseVariables('no variables here');
            assert.strictEqual(result.length, 0);
        });
        
        it('should not match invalid variable names', () => {
            const result = parseVariables('${123VAR}');
            assert.strictEqual(result.length, 0);
        });
    });
    
    describe('parsePaths', () => {
        it('should parse a simple variable path', () => {
            const result = parsePaths('${PROJECT_SOURCE_DIR}/include');
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].fullPath, '${PROJECT_SOURCE_DIR}/include');
            assert.strictEqual(result[0].variables.length, 1);
            assert.strictEqual(result[0].variables[0].variableName, 'PROJECT_SOURCE_DIR');
        });
        
        it('should parse a path with multiple segments', () => {
            const result = parsePaths('${MY_PATH}/src/utils/file.cpp');
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].fullPath, '${MY_PATH}/src/utils/file.cpp');
        });
        
        it('should parse multiple paths', () => {
            const result = parsePaths('${PATH1}/file1.h ${PATH2}/file2.h');
            assert.strictEqual(result.length, 2);
        });
        
        it('should parse a variable without path', () => {
            const result = parsePaths('${JUST_A_VAR}');
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].fullPath, '${JUST_A_VAR}');
        });
    });
    
    describe('containsVariables', () => {
        it('should return true when variables exist', () => {
            assert.strictEqual(containsVariables('${VAR}'), true);
        });
        
        it('should return false when no variables exist', () => {
            assert.strictEqual(containsVariables('no variables'), false);
        });
    });
    
    describe('extractVariableName', () => {
        it('should extract variable name from valid reference', () => {
            assert.strictEqual(extractVariableName('${MY_VAR}'), 'MY_VAR');
        });
        
        it('should return null for invalid reference', () => {
            assert.strictEqual(extractVariableName('invalid'), null);
            assert.strictEqual(extractVariableName('${123}'), null);
        });
    });
});

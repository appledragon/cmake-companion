/**
 * Tests for Definition Provider Logic
 * Tests the variable definition jump functionality
 */

import * as assert from 'assert';
import {
    findVariableDefinitionLine,
    getVariableAtOffset,
    extractVariableReferences
} from '../utils/definitionUtils';

describe('Definition Provider Logic', () => {
    
    describe('findVariableDefinitionLine', () => {
        it('should find set() command definition', () => {
            const text = `
cmake_minimum_required(VERSION 3.16)
set(MY_VAR "value")
message(\${MY_VAR})
`;
            const line = findVariableDefinitionLine(text, 'MY_VAR');
            assert.strictEqual(line, 2);
        });
        
        it('should find option() command definition', () => {
            const text = `
cmake_minimum_required(VERSION 3.16)
option(ENABLE_TESTS "Enable testing" ON)
`;
            const line = findVariableDefinitionLine(text, 'ENABLE_TESTS');
            assert.strictEqual(line, 2);
        });
        
        it('should return -1 for undefined variable', () => {
            const text = `
set(OTHER_VAR "value")
`;
            const line = findVariableDefinitionLine(text, 'UNDEFINED');
            assert.strictEqual(line, -1);
        });
        
        it('should handle case insensitivity for commands', () => {
            const text = `
SET(MY_VAR "value")
`;
            const line = findVariableDefinitionLine(text, 'MY_VAR');
            assert.strictEqual(line, 1);
        });
        
        it('should find first definition if multiple exist', () => {
            const text = `
set(VAR "first")
set(VAR "second")
`;
            const line = findVariableDefinitionLine(text, 'VAR');
            assert.strictEqual(line, 1);
        });
        
        it('should handle indented definitions', () => {
            const text = `
if(CONDITION)
    set(INDENTED_VAR "value")
endif()
`;
            const line = findVariableDefinitionLine(text, 'INDENTED_VAR');
            assert.strictEqual(line, 2);
        });
        
        it('should not match partial variable names', () => {
            const text = `
set(MY_VAR_SUFFIX "value")
`;
            const line = findVariableDefinitionLine(text, 'MY_VAR');
            assert.strictEqual(line, -1);
        });
        
        it('should find variable at start of file', () => {
            const text = `set(FIRST_VAR "value")`;
            const line = findVariableDefinitionLine(text, 'FIRST_VAR');
            assert.strictEqual(line, 0);
        });
    });
    
    describe('getVariableAtOffset', () => {
        it('should return variable name when inside reference', () => {
            const text = 'message(${MY_VAR})';
            // ${MY_VAR} starts at 8, ends at 17
            assert.strictEqual(getVariableAtOffset(text, 8), 'MY_VAR');
            assert.strictEqual(getVariableAtOffset(text, 10), 'MY_VAR');
            assert.strictEqual(getVariableAtOffset(text, 16), 'MY_VAR');
        });
        
        it('should return null when outside reference', () => {
            const text = 'message(${MY_VAR})';
            assert.strictEqual(getVariableAtOffset(text, 0), null);
            assert.strictEqual(getVariableAtOffset(text, 7), null);
            assert.strictEqual(getVariableAtOffset(text, 18), null);
        });
        
        it('should handle multiple variables', () => {
            const text = '${VAR1}/${VAR2}';
            // ${VAR1} is 0-7 (end is exclusive at 7), ${VAR2} is 8-15
            assert.strictEqual(getVariableAtOffset(text, 3), 'VAR1');
            assert.strictEqual(getVariableAtOffset(text, 10), 'VAR2');
            // position 7 is '/', between variables
            assert.strictEqual(getVariableAtOffset(text, 7), 'VAR1'); // still on end of ${VAR1}
        });
        
        it('should return null for empty text', () => {
            assert.strictEqual(getVariableAtOffset('', 0), null);
        });
        
        it('should handle variable at start', () => {
            const text = '${START}';
            assert.strictEqual(getVariableAtOffset(text, 0), 'START');
            assert.strictEqual(getVariableAtOffset(text, 4), 'START');
        });
    });
    
    describe('extractVariableReferences', () => {
        it('should extract single variable', () => {
            const text = '${MY_VAR}';
            const refs = extractVariableReferences(text);
            assert.strictEqual(refs.length, 1);
            assert.strictEqual(refs[0].name, 'MY_VAR');
            assert.strictEqual(refs[0].start, 0);
            assert.strictEqual(refs[0].end, 9);
        });
        
        it('should extract multiple variables', () => {
            const text = '${VAR1} and ${VAR2}';
            const refs = extractVariableReferences(text);
            assert.strictEqual(refs.length, 2);
            assert.strictEqual(refs[0].name, 'VAR1');
            assert.strictEqual(refs[1].name, 'VAR2');
        });
        
        it('should handle path with variables', () => {
            const text = '${BASE_DIR}/src/${FILE_NAME}';
            const refs = extractVariableReferences(text);
            assert.strictEqual(refs.length, 2);
            assert.strictEqual(refs[0].name, 'BASE_DIR');
            assert.strictEqual(refs[1].name, 'FILE_NAME');
        });
        
        it('should return empty array for no variables', () => {
            const text = 'no variables here';
            const refs = extractVariableReferences(text);
            assert.strictEqual(refs.length, 0);
        });
        
        it('should extract variables from complex CMake', () => {
            const text = `
set(SRC_DIR \${CMAKE_SOURCE_DIR}/src)
target_include_directories(mylib PUBLIC \${PROJECT_SOURCE_DIR}/include)
message("Path: \${SRC_DIR}")
`;
            const refs = extractVariableReferences(text);
            assert.strictEqual(refs.length, 3);
            assert.ok(refs.some(r => r.name === 'CMAKE_SOURCE_DIR'));
            assert.ok(refs.some(r => r.name === 'PROJECT_SOURCE_DIR'));
            assert.ok(refs.some(r => r.name === 'SRC_DIR'));
        });
        
        it('should correctly calculate positions', () => {
            const text = 'prefix${VAR}suffix';
            const refs = extractVariableReferences(text);
            assert.strictEqual(refs.length, 1);
            assert.strictEqual(refs[0].start, 6);
            assert.strictEqual(refs[0].end, 12);
            assert.strictEqual(text.substring(refs[0].start, refs[0].end), '${VAR}');
        });
    });
    
    describe('integration scenarios', () => {
        it('should find definition for clicked variable', () => {
            const text = `
cmake_minimum_required(VERSION 3.16)
set(MY_SOURCE_DIR \${CMAKE_SOURCE_DIR}/src)
message("Source: \${MY_SOURCE_DIR}")
`;
            // Click on ${MY_SOURCE_DIR} in message line
            // Find the variable name at that position
            const lineWithUsage = 'message("Source: ${MY_SOURCE_DIR}")';
            const usageOffset = text.indexOf(lineWithUsage) + lineWithUsage.indexOf('${MY_SOURCE_DIR}') + 5;
            
            const varName = getVariableAtOffset(text, usageOffset);
            assert.strictEqual(varName, 'MY_SOURCE_DIR');
            
            // Find definition
            const defLine = findVariableDefinitionLine(text, varName!);
            assert.strictEqual(defLine, 2);
        });
        
        it('should handle nested variable references in set', () => {
            const text = `
set(BASE /home/user)
set(PROJECT \${BASE}/project)
message(\${PROJECT})
`;
            // Both BASE and PROJECT should be findable
            assert.strictEqual(findVariableDefinitionLine(text, 'BASE'), 1);
            assert.strictEqual(findVariableDefinitionLine(text, 'PROJECT'), 2);
        });
    });
});

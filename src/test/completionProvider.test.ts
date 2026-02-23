/**
 * Tests for Completion Provider Logic
 * Tests the context detection and completion logic without VS Code dependencies
 */

import * as assert from 'assert';
import {
    isInVariableContext,
    isAtCommandPosition,
    isInsideCommand,
    detectCommandContext,
    getRelevantKeywords,
    COMPLETION_VARIABLES,
    CMAKE_COMMANDS,
    CMAKE_KEYWORDS
} from '../utils/completionUtils';

describe('Completion Provider Logic', () => {
    
    describe('isInVariableContext', () => {
        it('should return true when inside ${', () => {
            assert.strictEqual(isInVariableContext('${'), true);
            assert.strictEqual(isInVariableContext('${MY'), true);
            assert.strictEqual(isInVariableContext('set(VAR ${'), true);
            assert.strictEqual(isInVariableContext('${CMAKE_'), true);
        });
        
        it('should return false when not inside ${', () => {
            assert.strictEqual(isInVariableContext(''), false);
            assert.strictEqual(isInVariableContext('set(VAR value)'), false);
            assert.strictEqual(isInVariableContext('${VAR}'), false);
            assert.strictEqual(isInVariableContext('${VAR}/path'), false);
        });
        
        it('should handle nested cases', () => {
            assert.strictEqual(isInVariableContext('${VAR}/${'), true);
            assert.strictEqual(isInVariableContext('${VAR}/${OTHER}'), false);
        });
        
        it('should handle $ without {', () => {
            assert.strictEqual(isInVariableContext('$'), false);
            assert.strictEqual(isInVariableContext('path$'), false);
        });
    });
    
    describe('isAtCommandPosition', () => {
        it('should return true at line start', () => {
            assert.strictEqual(isAtCommandPosition(''), true);
            assert.strictEqual(isAtCommandPosition('set'), true);
            assert.strictEqual(isAtCommandPosition('add_'), true);
            assert.strictEqual(isAtCommandPosition('cmake_minimum'), true);
        });
        
        it('should return true after whitespace', () => {
            assert.strictEqual(isAtCommandPosition('  '), true);
            assert.strictEqual(isAtCommandPosition('  set'), true);
            assert.strictEqual(isAtCommandPosition('\t'), true);
            assert.strictEqual(isAtCommandPosition('    if'), true);
        });
        
        it('should return false inside parentheses', () => {
            assert.strictEqual(isAtCommandPosition('set('), false);
            assert.strictEqual(isAtCommandPosition('set(VAR'), false);
            assert.strictEqual(isAtCommandPosition('add_library(mylib '), false);
        });
        
        it('should return false after command name with paren', () => {
            assert.strictEqual(isAtCommandPosition('set(VAR value)'), false);
        });
    });
    
    describe('isInsideCommand', () => {
        it('should return true when inside parentheses', () => {
            assert.strictEqual(isInsideCommand('set(VAR value)', 4), true);
            assert.strictEqual(isInsideCommand('set(VAR value)', 8), true);
            assert.strictEqual(isInsideCommand('add_library(mylib STATIC', 12), true);
        });
        
        it('should return false when outside parentheses', () => {
            assert.strictEqual(isInsideCommand('set', 3), false);
            assert.strictEqual(isInsideCommand('set(VAR)', 8), false);
            assert.strictEqual(isInsideCommand('set(VAR) # comment', 10), false);
        });
        
        it('should handle nested parentheses', () => {
            assert.strictEqual(isInsideCommand('if(NOT (DEFINED VAR))', 8), true);
            assert.strictEqual(isInsideCommand('if(NOT (DEFINED VAR))', 15), true);
            assert.strictEqual(isInsideCommand('if(NOT (DEFINED VAR))', 21), false);
        });
        
        it('should handle empty line', () => {
            assert.strictEqual(isInsideCommand('', 0), false);
        });
    });
    
    describe('detectCommandContext', () => {
        it('should detect command names', () => {
            assert.strictEqual(detectCommandContext('set(VAR value)'), 'set');
            assert.strictEqual(detectCommandContext('add_library(mylib STATIC'), 'add_library');
            assert.strictEqual(detectCommandContext('  target_link_libraries('), 'target_link_libraries');
            assert.strictEqual(detectCommandContext('IF(condition)'), 'if');
        });
        
        it('should return null for non-command lines', () => {
            assert.strictEqual(detectCommandContext(''), null);
            assert.strictEqual(detectCommandContext('# comment'), null);
            assert.strictEqual(detectCommandContext('  '), null);
        });
    });
    
    describe('getRelevantKeywords', () => {
        it('should return visibility keywords for target commands', () => {
            const keywords = getRelevantKeywords('target_link_libraries');
            const names = keywords.map(k => k.name);
            assert.ok(names.includes('PUBLIC'));
            assert.ok(names.includes('PRIVATE'));
            assert.ok(names.includes('INTERFACE'));
            assert.strictEqual(keywords.length, 3);
        });
        
        it('should return find_package keywords', () => {
            const keywords = getRelevantKeywords('find_package');
            const names = keywords.map(k => k.name);
            assert.ok(names.includes('REQUIRED'));
            assert.ok(names.includes('QUIET'));
            assert.ok(names.includes('COMPONENTS'));
        });
        
        it('should return library type keywords for add_library', () => {
            const keywords = getRelevantKeywords('add_library');
            const names = keywords.map(k => k.name);
            assert.ok(names.includes('STATIC'));
            assert.ok(names.includes('SHARED'));
            assert.ok(names.includes('OBJECT'));
        });
        
        it('should return boolean keywords for option/set', () => {
            const keywords = getRelevantKeywords('option');
            const names = keywords.map(k => k.name);
            assert.ok(names.includes('ON'));
            assert.ok(names.includes('OFF'));
        });
        
        it('should return condition keywords for if/elseif/while', () => {
            const keywords = getRelevantKeywords('if');
            const names = keywords.map(k => k.name);
            assert.ok(names.includes('AND'));
            assert.ok(names.includes('OR'));
            assert.ok(names.includes('NOT'));
            assert.ok(names.includes('DEFINED'));
        });
        
        it('should return all keywords for unknown commands', () => {
            const keywords = getRelevantKeywords('unknown_command');
            assert.strictEqual(keywords.length, CMAKE_KEYWORDS.length);
        });

        it('should return all keywords when no command context', () => {
            const keywords = getRelevantKeywords(null);
            assert.strictEqual(keywords.length, CMAKE_KEYWORDS.length);
        });
    });

    describe('Data constants', () => {
        it('should have built-in variables', () => {
            assert.ok(COMPLETION_VARIABLES.length > 0);
            const names = COMPLETION_VARIABLES.map(v => v.name);
            assert.ok(names.includes('CMAKE_SOURCE_DIR'));
            assert.ok(names.includes('PROJECT_NAME'));
            assert.ok(names.includes('CMAKE_BUILD_TYPE'));
        });

        it('should have CMake commands', () => {
            assert.ok(CMAKE_COMMANDS.length > 0);
            const names = CMAKE_COMMANDS.map(c => c.name);
            assert.ok(names.includes('add_executable'));
            assert.ok(names.includes('find_package'));
            assert.ok(names.includes('set'));
            assert.ok(names.includes('if'));
        });

        it('should have CMake keywords', () => {
            assert.ok(CMAKE_KEYWORDS.length > 0);
            const names = CMAKE_KEYWORDS.map(k => k.name);
            assert.ok(names.includes('PUBLIC'));
            assert.ok(names.includes('PRIVATE'));
            assert.ok(names.includes('REQUIRED'));
        });

        it('all variables should have name and description', () => {
            for (const v of COMPLETION_VARIABLES) {
                assert.ok(v.name, 'Variable should have a name');
                assert.ok(v.description, `Variable ${v.name} should have a description`);
            }
        });

        it('all commands should have name and description', () => {
            for (const c of CMAKE_COMMANDS) {
                assert.ok(c.name, 'Command should have a name');
                assert.ok(c.description, `Command ${c.name} should have a description`);
            }
        });

        it('all keywords should have name and description', () => {
            for (const k of CMAKE_KEYWORDS) {
                assert.ok(k.name, 'Keyword should have a name');
                assert.ok(k.description, `Keyword ${k.name} should have a description`);
            }
        });
    });
});

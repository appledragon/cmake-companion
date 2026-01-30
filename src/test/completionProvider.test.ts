/**
 * Tests for Completion Provider Logic
 * Tests the context detection and completion logic without VS Code dependencies
 */

import * as assert from 'assert';

// Re-implement the context detection logic for testing
// These mirror the private methods in CMakeCompletionProvider

/**
 * Check if cursor is in a variable context (after ${ )
 */
function isInVariableContext(linePrefix: string): boolean {
    const lastOpen = linePrefix.lastIndexOf('${');
    if (lastOpen === -1) {
        return false;
    }
    const afterOpen = linePrefix.substring(lastOpen);
    return !afterOpen.includes('}');
}

/**
 * Check if cursor is at a position where a command can be entered
 */
function isAtCommandPosition(linePrefix: string): boolean {
    return /^\s*[a-zA-Z_]*$/.test(linePrefix);
}

/**
 * Check if cursor is inside a command (within parentheses)
 */
function isInsideCommand(lineText: string, position: number): boolean {
    const beforeCursor = lineText.substring(0, position);
    let depth = 0;
    for (const char of beforeCursor) {
        if (char === '(') {
            depth++;
        }
        if (char === ')') {
            depth--;
        }
    }
    return depth > 0;
}

/**
 * Detect command name from line for context-aware completions
 */
function detectCommandContext(lineText: string): string | null {
    const match = lineText.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
    return match?.[1]?.toLowerCase() || null;
}

/**
 * Get relevant keywords for a command context
 */
function getRelevantKeywords(commandName: string | null): string[] {
    if (!commandName) {
        return ['PUBLIC', 'PRIVATE', 'INTERFACE', 'REQUIRED', 'QUIET', 'ON', 'OFF'];
    }
    
    const targetCommands = [
        'target_include_directories', 'target_link_libraries', 'target_sources',
        'target_compile_definitions', 'target_compile_options', 'target_compile_features',
        'target_link_options', 'target_precompile_headers'
    ];
    
    if (targetCommands.includes(commandName)) {
        return ['PUBLIC', 'PRIVATE', 'INTERFACE'];
    }
    if (commandName === 'find_package') {
        return ['REQUIRED', 'QUIET', 'COMPONENTS', 'CONFIG', 'MODULE'];
    }
    if (commandName === 'add_library') {
        return ['STATIC', 'SHARED', 'OBJECT', 'INTERFACE', 'IMPORTED', 'ALIAS'];
    }
    if (commandName === 'option' || commandName === 'set') {
        return ['ON', 'OFF', 'TRUE', 'FALSE', 'CACHE', 'PARENT_SCOPE'];
    }
    if (['if', 'elseif', 'while'].includes(commandName)) {
        return ['AND', 'OR', 'NOT', 'DEFINED', 'EXISTS', 'IS_DIRECTORY', 'MATCHES', 'STREQUAL'];
    }
    
    return [];
}

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
            assert.ok(keywords.includes('PUBLIC'));
            assert.ok(keywords.includes('PRIVATE'));
            assert.ok(keywords.includes('INTERFACE'));
            assert.strictEqual(keywords.length, 3);
        });
        
        it('should return find_package keywords', () => {
            const keywords = getRelevantKeywords('find_package');
            assert.ok(keywords.includes('REQUIRED'));
            assert.ok(keywords.includes('QUIET'));
            assert.ok(keywords.includes('COMPONENTS'));
        });
        
        it('should return library type keywords for add_library', () => {
            const keywords = getRelevantKeywords('add_library');
            assert.ok(keywords.includes('STATIC'));
            assert.ok(keywords.includes('SHARED'));
            assert.ok(keywords.includes('OBJECT'));
        });
        
        it('should return boolean keywords for option/set', () => {
            const keywords = getRelevantKeywords('option');
            assert.ok(keywords.includes('ON'));
            assert.ok(keywords.includes('OFF'));
        });
        
        it('should return condition keywords for if/elseif/while', () => {
            const keywords = getRelevantKeywords('if');
            assert.ok(keywords.includes('AND'));
            assert.ok(keywords.includes('OR'));
            assert.ok(keywords.includes('NOT'));
            assert.ok(keywords.includes('DEFINED'));
        });
        
        it('should return empty array for unknown commands', () => {
            const keywords = getRelevantKeywords('unknown_command');
            assert.strictEqual(keywords.length, 0);
        });
    });
});

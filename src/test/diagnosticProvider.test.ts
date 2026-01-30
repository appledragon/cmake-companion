/**
 * Tests for Diagnostic Provider Logic
 * Tests the linting and diagnostic detection logic without VS Code dependencies
 */

import * as assert from 'assert';
import { parseVariables } from '../parsers';

// Re-implement diagnostic logic for testing

/**
 * Built-in CMake variables that should not trigger undefined warnings
 */
const BUILTIN_VARIABLE_PREFIXES = [
    'CMAKE_', 'PROJECT_', 'CTEST_', 'CPACK_', '_', 
    'ARGC', 'ARGV', 'ARGN'
];

const BUILTIN_VARIABLES = new Set([
    'WIN32', 'UNIX', 'APPLE', 'MSVC', 'MINGW', 'CYGWIN',
    'BORLAND', 'WATCOM', 'MSYS', 'ANDROID', 'IOS',
    'TRUE', 'FALSE', 'ON', 'OFF', 'YES', 'NO',
    'BUILD_SHARED_LIBS', 'EXECUTABLE_OUTPUT_PATH', 'LIBRARY_OUTPUT_PATH'
]);

/**
 * CMake block pairs for matching
 */
const BLOCK_PAIRS = [
    { start: 'if', end: 'endif' },
    { start: 'foreach', end: 'endforeach' },
    { start: 'while', end: 'endwhile' },
    { start: 'function', end: 'endfunction' },
    { start: 'macro', end: 'endmacro' },
    { start: 'block', end: 'endblock' },
];

/**
 * Deprecated CMake commands with suggested alternatives
 */
const DEPRECATED_COMMANDS = new Map([
    ['include_directories', 'target_include_directories'],
    ['link_directories', 'target_link_directories'],
    ['link_libraries', 'target_link_libraries'],
    ['add_definitions', 'target_compile_definitions'],
    ['add_compile_options', 'target_compile_options (for target-specific)'],
]);

/**
 * Check if a variable name is a built-in CMake variable
 */
function isBuiltInVariable(name: string): boolean {
    if (BUILTIN_VARIABLES.has(name)) {
        return true;
    }
    return BUILTIN_VARIABLE_PREFIXES.some(prefix => name.startsWith(prefix));
}

/**
 * Find undefined variables in text
 */
function findUndefinedVariables(
    text: string, 
    definedVariables: Set<string>
): Array<{ name: string; startIndex: number; endIndex: number }> {
    const variables = parseVariables(text);
    const undefined: Array<{ name: string; startIndex: number; endIndex: number }> = [];
    
    // Collect locally defined variables
    const localVars = new Set<string>();
    const setRegex = /^\s*set\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/gim;
    let match;
    while ((match = setRegex.exec(text)) !== null) {
        localVars.add(match[1]);
    }
    
    // Collect foreach loop variables
    const foreachRegex = /^\s*foreach\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/gim;
    while ((match = foreachRegex.exec(text)) !== null) {
        localVars.add(match[1]);
    }
    
    for (const variable of variables) {
        const varName = variable.variableName;
        
        if (isBuiltInVariable(varName)) {
            continue;
        }
        
        if (definedVariables.has(varName) || localVars.has(varName)) {
            continue;
        }
        
        if (varName.startsWith('<') || varName.endsWith('>')) {
            continue;
        }
        
        undefined.push({
            name: varName,
            startIndex: variable.startIndex,
            endIndex: variable.endIndex
        });
    }
    
    return undefined;
}

interface BlockError {
    line: number;
    type: 'missing-end' | 'missing-start';
    blockName: string;
    expectedPair: string;
}

/**
 * Find unmatched block pairs
 */
function findUnmatchedBlocks(text: string): BlockError[] {
    const lines = text.split('\n');
    const errors: BlockError[] = [];
    
    interface BlockInfo {
        type: 'start' | 'end';
        name: string;
        line: number;
    }
    
    const blocks: BlockInfo[] = [];
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex].toLowerCase().trim();
        if (!line || line.startsWith('#')) {
            continue;
        }
        
        for (const pair of BLOCK_PAIRS) {
            const startRegex = new RegExp(`^${pair.start}\\s*\\(`);
            if (startRegex.test(line)) {
                blocks.push({ type: 'start', name: pair.start, line: lineIndex });
            }
            
            const endRegex = new RegExp(`^${pair.end}\\s*\\(`);
            if (endRegex.test(line)) {
                blocks.push({ type: 'end', name: pair.end, line: lineIndex });
            }
        }
    }
    
    // Match blocks using a stack
    const stack: BlockInfo[] = [];
    const unmatchedEnds: BlockInfo[] = [];
    
    for (const block of blocks) {
        if (block.type === 'start') {
            stack.push(block);
        } else {
            const pair = BLOCK_PAIRS.find(p => p.end === block.name);
            if (pair) {
                let found = false;
                for (let i = stack.length - 1; i >= 0; i--) {
                    if (stack[i].name === pair.start) {
                        stack.splice(i, 1);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    unmatchedEnds.push(block);
                }
            }
        }
    }
    
    // Report unmatched starts
    for (const block of stack) {
        const pair = BLOCK_PAIRS.find(p => p.start === block.name);
        errors.push({
            line: block.line,
            type: 'missing-end',
            blockName: block.name,
            expectedPair: pair?.end || ''
        });
    }
    
    // Report unmatched ends
    for (const block of unmatchedEnds) {
        const pair = BLOCK_PAIRS.find(p => p.end === block.name);
        errors.push({
            line: block.line,
            type: 'missing-start',
            blockName: block.name,
            expectedPair: pair?.start || ''
        });
    }
    
    return errors;
}

interface DeprecatedCommandInfo {
    line: number;
    command: string;
    replacement: string;
}

/**
 * Find deprecated commands
 */
function findDeprecatedCommands(text: string): DeprecatedCommandInfo[] {
    const lines = text.split('\n');
    const deprecated: DeprecatedCommandInfo[] = [];
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const trimmed = line.trim().toLowerCase();
        
        if (trimmed.startsWith('#')) {
            continue;
        }
        
        for (const [cmd, replacement] of DEPRECATED_COMMANDS) {
            const regex = new RegExp(`^\\s*${cmd}\\s*\\(`, 'i');
            if (regex.test(line)) {
                deprecated.push({
                    line: lineIndex,
                    command: cmd,
                    replacement
                });
            }
        }
    }
    
    return deprecated;
}

describe('Diagnostic Provider Logic', () => {
    
    describe('isBuiltInVariable', () => {
        it('should recognize CMAKE_ prefixed variables', () => {
            assert.strictEqual(isBuiltInVariable('CMAKE_SOURCE_DIR'), true);
            assert.strictEqual(isBuiltInVariable('CMAKE_CXX_STANDARD'), true);
            assert.strictEqual(isBuiltInVariable('CMAKE_BUILD_TYPE'), true);
        });
        
        it('should recognize PROJECT_ prefixed variables', () => {
            assert.strictEqual(isBuiltInVariable('PROJECT_NAME'), true);
            assert.strictEqual(isBuiltInVariable('PROJECT_VERSION'), true);
        });
        
        it('should recognize platform variables', () => {
            assert.strictEqual(isBuiltInVariable('WIN32'), true);
            assert.strictEqual(isBuiltInVariable('UNIX'), true);
            assert.strictEqual(isBuiltInVariable('APPLE'), true);
            assert.strictEqual(isBuiltInVariable('MSVC'), true);
        });
        
        it('should recognize boolean constants', () => {
            assert.strictEqual(isBuiltInVariable('TRUE'), true);
            assert.strictEqual(isBuiltInVariable('FALSE'), true);
            assert.strictEqual(isBuiltInVariable('ON'), true);
            assert.strictEqual(isBuiltInVariable('OFF'), true);
        });
        
        it('should recognize function argument variables', () => {
            assert.strictEqual(isBuiltInVariable('ARGC'), true);
            assert.strictEqual(isBuiltInVariable('ARGV'), true);
            assert.strictEqual(isBuiltInVariable('ARGV0'), true);
            assert.strictEqual(isBuiltInVariable('ARGN'), true);
        });
        
        it('should not recognize user-defined variables', () => {
            assert.strictEqual(isBuiltInVariable('MY_VAR'), false);
            assert.strictEqual(isBuiltInVariable('SOURCE_FILES'), false);
            assert.strictEqual(isBuiltInVariable('CUSTOM_PATH'), false);
        });
    });
    
    describe('findUndefinedVariables', () => {
        it('should find undefined variables', () => {
            const text = 'set(VAR ${UNDEFINED_VAR})';
            const undefined = findUndefinedVariables(text, new Set());
            assert.strictEqual(undefined.length, 1);
            assert.strictEqual(undefined[0].name, 'UNDEFINED_VAR');
        });
        
        it('should not report built-in variables', () => {
            const text = '${CMAKE_SOURCE_DIR}/${PROJECT_NAME}';
            const undefined = findUndefinedVariables(text, new Set());
            assert.strictEqual(undefined.length, 0);
        });
        
        it('should not report locally defined variables', () => {
            const text = `
                set(MY_VAR value)
                message(\${MY_VAR})
            `;
            const undefined = findUndefinedVariables(text, new Set());
            assert.strictEqual(undefined.length, 0);
        });
        
        it('should not report variables from resolver', () => {
            const text = '${EXTERNAL_VAR}';
            const undefined = findUndefinedVariables(text, new Set(['EXTERNAL_VAR']));
            assert.strictEqual(undefined.length, 0);
        });
        
        it('should not report foreach loop variables', () => {
            const text = `
                foreach(item IN ITEMS a b c)
                    message(\${item})
                endforeach()
            `;
            const undefined = findUndefinedVariables(text, new Set());
            assert.strictEqual(undefined.length, 0);
        });
        
        it('should find multiple undefined variables', () => {
            const text = '${VAR1} ${VAR2} ${VAR3}';
            const undefined = findUndefinedVariables(text, new Set());
            assert.strictEqual(undefined.length, 3);
        });
        
        it('should handle mixed defined and undefined', () => {
            const text = '${CMAKE_SOURCE_DIR}/${CUSTOM_VAR}/${UNDEFINED}';
            const undefined = findUndefinedVariables(text, new Set(['CUSTOM_VAR']));
            assert.strictEqual(undefined.length, 1);
            assert.strictEqual(undefined[0].name, 'UNDEFINED');
        });
    });
    
    describe('findUnmatchedBlocks', () => {
        it('should find missing endif', () => {
            const text = `
                if(CONDITION)
                    message("hello")
            `;
            const errors = findUnmatchedBlocks(text);
            assert.strictEqual(errors.length, 1);
            assert.strictEqual(errors[0].type, 'missing-end');
            assert.strictEqual(errors[0].blockName, 'if');
            assert.strictEqual(errors[0].expectedPair, 'endif');
        });
        
        it('should find missing if for endif', () => {
            const text = `
                message("hello")
                endif()
            `;
            const errors = findUnmatchedBlocks(text);
            assert.strictEqual(errors.length, 1);
            assert.strictEqual(errors[0].type, 'missing-start');
            assert.strictEqual(errors[0].blockName, 'endif');
            assert.strictEqual(errors[0].expectedPair, 'if');
        });
        
        it('should handle matched blocks correctly', () => {
            const text = `
                if(CONDITION)
                    message("hello")
                endif()
            `;
            const errors = findUnmatchedBlocks(text);
            assert.strictEqual(errors.length, 0);
        });
        
        it('should handle nested blocks', () => {
            const text = `
                if(OUTER)
                    if(INNER)
                        message("nested")
                    endif()
                endif()
            `;
            const errors = findUnmatchedBlocks(text);
            assert.strictEqual(errors.length, 0);
        });
        
        it('should find missing endfunction', () => {
            const text = `
                function(my_func)
                    message("hello")
            `;
            const errors = findUnmatchedBlocks(text);
            assert.strictEqual(errors.length, 1);
            assert.strictEqual(errors[0].blockName, 'function');
            assert.strictEqual(errors[0].expectedPair, 'endfunction');
        });
        
        it('should find missing endforeach', () => {
            const text = `
                foreach(item IN ITEMS a b c)
                    message(\${item})
            `;
            const errors = findUnmatchedBlocks(text);
            assert.strictEqual(errors.length, 1);
            assert.strictEqual(errors[0].blockName, 'foreach');
        });
        
        it('should handle while/endwhile', () => {
            const text = `
                while(CONDITION)
                    message("loop")
                endwhile()
            `;
            const errors = findUnmatchedBlocks(text);
            assert.strictEqual(errors.length, 0);
        });
        
        it('should handle macro/endmacro', () => {
            const text = `
                macro(my_macro)
                    message("macro")
                endmacro()
            `;
            const errors = findUnmatchedBlocks(text);
            assert.strictEqual(errors.length, 0);
        });
        
        it('should ignore commented blocks', () => {
            const text = `
                # if(COMMENTED)
                message("hello")
                # endif()
            `;
            const errors = findUnmatchedBlocks(text);
            assert.strictEqual(errors.length, 0);
        });
        
        it('should detect multiple errors', () => {
            const text = `
                if(COND1)
                foreach(item IN ITEMS a)
                endif()
            `;
            const errors = findUnmatchedBlocks(text);
            // Missing endforeach
            assert.ok(errors.length >= 1);
        });
    });
    
    describe('findDeprecatedCommands', () => {
        it('should find include_directories', () => {
            const text = 'include_directories(${CMAKE_SOURCE_DIR}/include)';
            const deprecated = findDeprecatedCommands(text);
            assert.strictEqual(deprecated.length, 1);
            assert.strictEqual(deprecated[0].command, 'include_directories');
            assert.strictEqual(deprecated[0].replacement, 'target_include_directories');
        });
        
        it('should find link_directories', () => {
            const text = 'link_directories(/usr/lib)';
            const deprecated = findDeprecatedCommands(text);
            assert.strictEqual(deprecated.length, 1);
            assert.strictEqual(deprecated[0].command, 'link_directories');
        });
        
        it('should find link_libraries', () => {
            const text = 'link_libraries(mylib)';
            const deprecated = findDeprecatedCommands(text);
            assert.strictEqual(deprecated.length, 1);
            assert.strictEqual(deprecated[0].command, 'link_libraries');
        });
        
        it('should find add_definitions', () => {
            const text = 'add_definitions(-DDEBUG)';
            const deprecated = findDeprecatedCommands(text);
            assert.strictEqual(deprecated.length, 1);
            assert.strictEqual(deprecated[0].command, 'add_definitions');
        });
        
        it('should not flag target_* commands', () => {
            const text = `
                target_include_directories(mylib PUBLIC include)
                target_link_libraries(mylib PRIVATE other)
            `;
            const deprecated = findDeprecatedCommands(text);
            assert.strictEqual(deprecated.length, 0);
        });
        
        it('should ignore commented lines', () => {
            const text = '# include_directories(old_path)';
            const deprecated = findDeprecatedCommands(text);
            assert.strictEqual(deprecated.length, 0);
        });
        
        it('should handle case insensitivity', () => {
            const text = 'INCLUDE_DIRECTORIES(path)';
            const deprecated = findDeprecatedCommands(text);
            assert.strictEqual(deprecated.length, 1);
        });
        
        it('should find multiple deprecated commands', () => {
            const text = `
                include_directories(inc)
                link_libraries(lib)
                add_definitions(-D)
            `;
            const deprecated = findDeprecatedCommands(text);
            assert.strictEqual(deprecated.length, 3);
        });
        
        it('should return correct line numbers', () => {
            const text = `cmake_minimum_required(VERSION 3.16)
project(Test)
include_directories(inc)
link_libraries(lib)`;
            const deprecated = findDeprecatedCommands(text);
            assert.strictEqual(deprecated.length, 2);
            assert.strictEqual(deprecated[0].line, 2);
            assert.strictEqual(deprecated[1].line, 3);
        });
    });
});

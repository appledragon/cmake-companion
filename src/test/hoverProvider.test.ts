/**
 * Unit tests for Hover Provider logic
 * Tests the pure logic functions without vscode dependencies
 */

import * as assert from 'assert';
import { getBuiltInVariableType, isBuiltInVariable, isNonPathVariable } from '../utils/cmakeBuiltins';

/**
 * Re-implementation of analyzePathVariables for testing
 */
function analyzePathVariables(variables: Array<{ variableName: string }>, fullPath: string): {
    isDirectoryPath: boolean;
    isFilePath: boolean;
    isNonPathVariable: boolean;
    hasOnlyBuiltInVariables: boolean;
} {
    if (!variables || variables.length === 0) {
        return {
            isDirectoryPath: false,
            isFilePath: false,
            isNonPathVariable: false,
            hasOnlyBuiltInVariables: true
        };
    }

    let isDirectoryPath = false;
    let isFilePath = false;
    let isNonPathVariable_ = false;
    let hasOnlyBuiltInVariables = true;

    for (const variable of variables) {
        const varName = variable.variableName;
        const varType = getBuiltInVariableType(varName);

        if (varType === 'directory') {
            isDirectoryPath = true;
        } else if (varType === 'file') {
            isFilePath = true;
        } else if (varType === 'value') {
            isNonPathVariable_ = true;
        }

        if (!isBuiltInVariable(varName)) {
            hasOnlyBuiltInVariables = false;
        }
    }

    // If path is just a single variable, check its type
    if (variables.length === 1 && fullPath === `\${${variables[0].variableName}}`) {
        const varType = getBuiltInVariableType(variables[0].variableName);
        if (varType === 'directory') {
            isDirectoryPath = true;
        } else if (varType === 'file') {
            isFilePath = true;
        } else if (varType === 'value') {
            isNonPathVariable_ = true;
        }
    }

    return {
        isDirectoryPath,
        isFilePath,
        isNonPathVariable: isNonPathVariable_,
        hasOnlyBuiltInVariables
    };
}

/**
 * Re-implementation of formatValueForDisplay for testing
 */
function formatValueForDisplay(value: string): string {
    if (value.includes(';')) {
        const items = value.split(';');
        return '\n' + items.map(item => `- \`${item}\``).join('\n');
    }
    return `\`${value}\``;
}

describe('Hover Provider Logic', () => {
    describe('analyzePathVariables', () => {
        it('should return defaults for no variables', () => {
            const result = analyzePathVariables([], 'some/path');
            assert.strictEqual(result.isDirectoryPath, false);
            assert.strictEqual(result.isFilePath, false);
            assert.strictEqual(result.isNonPathVariable, false);
            assert.strictEqual(result.hasOnlyBuiltInVariables, true);
        });

        it('should detect directory variable', () => {
            const result = analyzePathVariables(
                [{ variableName: 'CMAKE_SOURCE_DIR' }],
                '${CMAKE_SOURCE_DIR}'
            );
            assert.strictEqual(result.isDirectoryPath, true);
            assert.strictEqual(result.isFilePath, false);
            assert.strictEqual(result.isNonPathVariable, false);
        });

        it('should detect file variable', () => {
            const result = analyzePathVariables(
                [{ variableName: 'CMAKE_COMMAND' }],
                '${CMAKE_COMMAND}'
            );
            assert.strictEqual(result.isFilePath, true);
            assert.strictEqual(result.isDirectoryPath, false);
        });

        it('should detect non-path variable', () => {
            const result = analyzePathVariables(
                [{ variableName: 'CMAKE_CXX_STANDARD' }],
                '${CMAKE_CXX_STANDARD}'
            );
            assert.strictEqual(result.isNonPathVariable, true);
            assert.strictEqual(result.isDirectoryPath, false);
            assert.strictEqual(result.isFilePath, false);
        });

        it('should detect user-defined variables as non-built-in', () => {
            const result = analyzePathVariables(
                [{ variableName: 'TARGET_NAME' }],
                '${TARGET_NAME}'
            );
            assert.strictEqual(result.hasOnlyBuiltInVariables, false);
        });

        it('should detect all built-in when all are known', () => {
            const result = analyzePathVariables(
                [{ variableName: 'CMAKE_SOURCE_DIR' }, { variableName: 'CMAKE_BUILD_TYPE' }],
                '${CMAKE_SOURCE_DIR}/${CMAKE_BUILD_TYPE}'
            );
            assert.strictEqual(result.hasOnlyBuiltInVariables, true);
        });

        it('should handle mixed built-in and user variables', () => {
            const result = analyzePathVariables(
                [{ variableName: 'CMAKE_SOURCE_DIR' }, { variableName: 'MY_VAR' }],
                '${CMAKE_SOURCE_DIR}/${MY_VAR}'
            );
            assert.strictEqual(result.hasOnlyBuiltInVariables, false);
            assert.strictEqual(result.isDirectoryPath, true);
        });

        it('should detect directory path with suffix pattern', () => {
            const result = analyzePathVariables(
                [{ variableName: 'CMAKE_SOURCE_DIR' }],
                '${CMAKE_SOURCE_DIR}/output'
            );
            assert.strictEqual(result.isDirectoryPath, true);
        });

        it('should detect compiler as file variable', () => {
            const result = analyzePathVariables(
                [{ variableName: 'CMAKE_CXX_COMPILER' }],
                '${CMAKE_CXX_COMPILER}'
            );
            assert.strictEqual(result.isFilePath, true);
        });

        it('should handle value variable like PROJECT_NAME', () => {
            const result = analyzePathVariables(
                [{ variableName: 'PROJECT_NAME' }],
                '${PROJECT_NAME}'
            );
            assert.strictEqual(result.isNonPathVariable, true);
        });

        it('should detect CMAKE_BINARY_DIR as directory', () => {
            const result = analyzePathVariables(
                [{ variableName: 'CMAKE_BINARY_DIR' }],
                '${CMAKE_BINARY_DIR}/output'
            );
            assert.strictEqual(result.isDirectoryPath, true);
            assert.strictEqual(result.hasOnlyBuiltInVariables, true);
        });
    });

    describe('formatValueForDisplay', () => {
        it('should format single value with backticks', () => {
            assert.strictEqual(formatValueForDisplay('hello'), '`hello`');
        });

        it('should format path as single value', () => {
            assert.strictEqual(formatValueForDisplay('/path/to/file'), '`/path/to/file`');
        });

        it('should format semicolon-separated list as bullet list', () => {
            const result = formatValueForDisplay('a;b;c');
            assert.ok(result.includes('- `a`'));
            assert.ok(result.includes('- `b`'));
            assert.ok(result.includes('- `c`'));
        });

        it('should format file list correctly', () => {
            const result = formatValueForDisplay('/path/a.cpp;/path/b.cpp');
            assert.ok(result.includes('- `/path/a.cpp`'));
            assert.ok(result.includes('- `/path/b.cpp`'));
        });

        it('should handle single item (no semicolons)', () => {
            const result = formatValueForDisplay('single_value');
            assert.strictEqual(result, '`single_value`');
            assert.ok(!result.includes('-'));
        });

        it('should handle empty string', () => {
            const result = formatValueForDisplay('');
            assert.strictEqual(result, '``');
        });
    });
});

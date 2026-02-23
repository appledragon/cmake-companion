/**
 * Unit tests for Semantic Tokens Provider logic
 * Tests the pure logic functions without vscode dependencies
 */

import * as assert from 'assert';

// Re-implement the command category sets from semanticTokensProvider.ts
const CONTROL_FLOW_COMMANDS = new Set([
    'if', 'elseif', 'else', 'endif',
    'foreach', 'endforeach',
    'while', 'endwhile',
    'break', 'continue', 'return',
    'function', 'endfunction',
    'macro', 'endmacro',
    'block', 'endblock'
]);

const VARIABLE_COMMANDS = new Set([
    'set', 'unset', 'option',
    'set_property', 'get_property',
    'define_property',
    'set_directory_properties', 'get_directory_property',
    'set_source_files_properties', 'get_source_file_property',
    'set_target_properties', 'get_target_property',
    'set_tests_properties', 'get_test_property',
    'mark_as_advanced'
]);

const TARGET_COMMANDS = new Set([
    'add_executable', 'add_library',
    'add_custom_target', 'add_custom_command',
    'add_dependencies', 'add_subdirectory', 'add_test',
    'add_compile_definitions', 'add_compile_options', 'add_link_options',
    'target_sources', 'target_include_directories',
    'target_link_libraries', 'target_link_directories',
    'target_compile_definitions', 'target_compile_options',
    'target_compile_features', 'target_link_options',
    'target_precompile_headers'
]);

const INCLUDE_COMMANDS = new Set([
    'include', 'include_directories',
    'link_directories', 'link_libraries',
    'find_package', 'find_library', 'find_path',
    'find_file', 'find_program',
    'include_guard', 'include_external_msproject'
]);

const CMAKE_COMMANDS = new Set([
    'cmake_minimum_required', 'cmake_policy',
    'cmake_parse_arguments', 'cmake_host_system_information',
    'cmake_language', 'cmake_path',
    'project', 'enable_language', 'enable_testing'
]);

const UTILITY_COMMANDS = new Set([
    'message', 'math', 'string', 'list', 'file',
    'execute_process', 'configure_file',
    'install', 'export',
    'get_filename_component', 'separate_arguments'
]);

const tokenModifiers = [
    'declaration',
    'definition',
    'readonly',
    'deprecated',
    'modification',
    'documentation',
    'defaultLibrary'
];

/**
 * Re-implementation of isBuiltInVariable from semanticTokensProvider
 */
function isBuiltInVariable(name: string): boolean {
    const builtInPrefixes = ['CMAKE_', 'PROJECT_', 'CTEST_', 'CPACK_'];
    return builtInPrefixes.some(prefix => name.startsWith(prefix));
}

/**
 * Re-implementation of encodeModifiers from semanticTokensProvider
 */
function encodeModifiers(modifiers: string[]): number {
    let result = 0;
    for (const modifier of modifiers) {
        const index = tokenModifiers.indexOf(modifier);
        if (index >= 0) {
            result |= (1 << index);
        }
    }
    return result;
}

/**
 * Classify a command into its semantic category
 */
function classifyCommand(commandName: string): string {
    const lower = commandName.toLowerCase();
    if (CONTROL_FLOW_COMMANDS.has(lower)) { return 'control_flow'; }
    if (VARIABLE_COMMANDS.has(lower)) { return 'variable'; }
    if (TARGET_COMMANDS.has(lower)) { return 'target'; }
    if (INCLUDE_COMMANDS.has(lower)) { return 'include'; }
    if (CMAKE_COMMANDS.has(lower)) { return 'cmake'; }
    if (UTILITY_COMMANDS.has(lower)) { return 'utility'; }
    return 'user_defined';
}

describe('Semantic Tokens Provider Logic', () => {
    describe('encodeModifiers', () => {
        it('should return 0 for empty modifiers', () => {
            assert.strictEqual(encodeModifiers([]), 0);
        });

        it('should encode declaration modifier', () => {
            const result = encodeModifiers(['declaration']);
            assert.strictEqual(result, 1); // bit 0
        });

        it('should encode definition modifier', () => {
            const result = encodeModifiers(['definition']);
            assert.strictEqual(result, 2); // bit 1
        });

        it('should encode readonly modifier', () => {
            const result = encodeModifiers(['readonly']);
            assert.strictEqual(result, 4); // bit 2
        });

        it('should encode deprecated modifier', () => {
            const result = encodeModifiers(['deprecated']);
            assert.strictEqual(result, 8); // bit 3
        });

        it('should encode modification modifier', () => {
            const result = encodeModifiers(['modification']);
            assert.strictEqual(result, 16); // bit 4
        });

        it('should encode defaultLibrary modifier', () => {
            const result = encodeModifiers(['defaultLibrary']);
            assert.strictEqual(result, 64); // bit 6
        });

        it('should combine multiple modifiers', () => {
            const result = encodeModifiers(['declaration', 'readonly']);
            assert.strictEqual(result, 5); // bit 0 + bit 2
        });

        it('should combine all modifiers', () => {
            const result = encodeModifiers(['declaration', 'definition', 'readonly', 'deprecated', 'modification', 'documentation', 'defaultLibrary']);
            assert.strictEqual(result, 127); // all bits set
        });

        it('should ignore unknown modifiers', () => {
            const result = encodeModifiers(['unknown']);
            assert.strictEqual(result, 0);
        });

        it('should handle mixed known and unknown modifiers', () => {
            const result = encodeModifiers(['declaration', 'unknown', 'readonly']);
            assert.strictEqual(result, 5);
        });
    });

    describe('isBuiltInVariable', () => {
        it('should recognize CMAKE_ prefix', () => {
            assert.ok(isBuiltInVariable('CMAKE_SOURCE_DIR'));
            assert.ok(isBuiltInVariable('CMAKE_BUILD_TYPE'));
        });

        it('should recognize PROJECT_ prefix', () => {
            assert.ok(isBuiltInVariable('PROJECT_NAME'));
            assert.ok(isBuiltInVariable('PROJECT_VERSION'));
        });

        it('should recognize CTEST_ prefix', () => {
            assert.ok(isBuiltInVariable('CTEST_SOURCE_DIRECTORY'));
        });

        it('should recognize CPACK_ prefix', () => {
            assert.ok(isBuiltInVariable('CPACK_PACKAGE_NAME'));
        });

        it('should not recognize user variables', () => {
            assert.strictEqual(isBuiltInVariable('MY_VAR'), false);
            assert.strictEqual(isBuiltInVariable('TARGET_NAME'), false);
            assert.strictEqual(isBuiltInVariable('WIN32'), false); // This one is different from cmakeBuiltins
        });
    });

    describe('Command Classification', () => {
        describe('control flow commands', () => {
            it('should classify if/else/endif', () => {
                assert.strictEqual(classifyCommand('if'), 'control_flow');
                assert.strictEqual(classifyCommand('elseif'), 'control_flow');
                assert.strictEqual(classifyCommand('else'), 'control_flow');
                assert.strictEqual(classifyCommand('endif'), 'control_flow');
            });

            it('should classify loop commands', () => {
                assert.strictEqual(classifyCommand('foreach'), 'control_flow');
                assert.strictEqual(classifyCommand('endforeach'), 'control_flow');
                assert.strictEqual(classifyCommand('while'), 'control_flow');
                assert.strictEqual(classifyCommand('endwhile'), 'control_flow');
            });

            it('should classify function/macro', () => {
                assert.strictEqual(classifyCommand('function'), 'control_flow');
                assert.strictEqual(classifyCommand('endfunction'), 'control_flow');
                assert.strictEqual(classifyCommand('macro'), 'control_flow');
                assert.strictEqual(classifyCommand('endmacro'), 'control_flow');
            });

            it('should classify break/continue/return', () => {
                assert.strictEqual(classifyCommand('break'), 'control_flow');
                assert.strictEqual(classifyCommand('continue'), 'control_flow');
                assert.strictEqual(classifyCommand('return'), 'control_flow');
            });

            it('should classify block/endblock', () => {
                assert.strictEqual(classifyCommand('block'), 'control_flow');
                assert.strictEqual(classifyCommand('endblock'), 'control_flow');
            });
        });

        describe('variable commands', () => {
            it('should classify set/unset/option', () => {
                assert.strictEqual(classifyCommand('set'), 'variable');
                assert.strictEqual(classifyCommand('unset'), 'variable');
                assert.strictEqual(classifyCommand('option'), 'variable');
            });

            it('should classify property commands', () => {
                assert.strictEqual(classifyCommand('set_property'), 'variable');
                assert.strictEqual(classifyCommand('get_property'), 'variable');
                assert.strictEqual(classifyCommand('set_target_properties'), 'variable');
                assert.strictEqual(classifyCommand('get_target_property'), 'variable');
            });

            it('should classify mark_as_advanced', () => {
                assert.strictEqual(classifyCommand('mark_as_advanced'), 'variable');
            });
        });

        describe('target commands', () => {
            it('should classify add_executable/add_library', () => {
                assert.strictEqual(classifyCommand('add_executable'), 'target');
                assert.strictEqual(classifyCommand('add_library'), 'target');
            });

            it('should classify target_* commands', () => {
                assert.strictEqual(classifyCommand('target_sources'), 'target');
                assert.strictEqual(classifyCommand('target_include_directories'), 'target');
                assert.strictEqual(classifyCommand('target_link_libraries'), 'target');
                assert.strictEqual(classifyCommand('target_compile_definitions'), 'target');
                assert.strictEqual(classifyCommand('target_compile_options'), 'target');
            });

            it('should classify add_subdirectory/add_test', () => {
                assert.strictEqual(classifyCommand('add_subdirectory'), 'target');
                assert.strictEqual(classifyCommand('add_test'), 'target');
            });
        });

        describe('include commands', () => {
            it('should classify include/find commands', () => {
                assert.strictEqual(classifyCommand('include'), 'include');
                assert.strictEqual(classifyCommand('find_package'), 'include');
                assert.strictEqual(classifyCommand('find_library'), 'include');
                assert.strictEqual(classifyCommand('find_path'), 'include');
                assert.strictEqual(classifyCommand('find_file'), 'include');
                assert.strictEqual(classifyCommand('find_program'), 'include');
            });

            it('should classify deprecated include commands', () => {
                assert.strictEqual(classifyCommand('include_directories'), 'include');
                assert.strictEqual(classifyCommand('link_directories'), 'include');
                assert.strictEqual(classifyCommand('link_libraries'), 'include');
            });
        });

        describe('cmake commands', () => {
            it('should classify cmake_minimum_required', () => {
                assert.strictEqual(classifyCommand('cmake_minimum_required'), 'cmake');
            });

            it('should classify project', () => {
                assert.strictEqual(classifyCommand('project'), 'cmake');
            });

            it('should classify cmake_policy', () => {
                assert.strictEqual(classifyCommand('cmake_policy'), 'cmake');
            });

            it('should classify enable_testing', () => {
                assert.strictEqual(classifyCommand('enable_testing'), 'cmake');
            });
        });

        describe('utility commands', () => {
            it('should classify message/math/string/list/file', () => {
                assert.strictEqual(classifyCommand('message'), 'utility');
                assert.strictEqual(classifyCommand('math'), 'utility');
                assert.strictEqual(classifyCommand('string'), 'utility');
                assert.strictEqual(classifyCommand('list'), 'utility');
                assert.strictEqual(classifyCommand('file'), 'utility');
            });

            it('should classify install/export', () => {
                assert.strictEqual(classifyCommand('install'), 'utility');
                assert.strictEqual(classifyCommand('export'), 'utility');
            });

            it('should classify execute_process', () => {
                assert.strictEqual(classifyCommand('execute_process'), 'utility');
            });
        });

        describe('case insensitivity', () => {
            it('should handle uppercase commands', () => {
                assert.strictEqual(classifyCommand('IF'), 'control_flow');
                assert.strictEqual(classifyCommand('SET'), 'variable');
                assert.strictEqual(classifyCommand('ADD_EXECUTABLE'), 'target');
            });

            it('should handle mixed case commands', () => {
                assert.strictEqual(classifyCommand('ElseIf'), 'control_flow');
                assert.strictEqual(classifyCommand('Find_Package'), 'include');
            });
        });

        describe('user-defined commands', () => {
            it('should classify unknown commands as user_defined', () => {
                assert.strictEqual(classifyCommand('my_custom_function'), 'user_defined');
                assert.strictEqual(classifyCommand('do_stuff'), 'user_defined');
            });
        });
    });
});

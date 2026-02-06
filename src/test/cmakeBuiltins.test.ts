/**
 * Unit tests for CMake built-in variables utility
 */

import {
    isBuiltInVariable,
    isDirectoryVariable,
    isNonPathVariable,
    getBuiltInVariableType,
    BUILTIN_DIRECTORY_VARIABLES,
    BUILTIN_FILE_VARIABLES,
    BUILTIN_VALUE_VARIABLES,
    BUILTIN_VARIABLES,
    BUILTIN_VARIABLE_PREFIXES
} from '../utils/cmakeBuiltins';
import * as assert from 'assert';

describe('CMake Builtins', () => {
    describe('BUILTIN_VARIABLE_PREFIXES', () => {
        it('should contain CMAKE_ prefix', () => {
            assert.ok(BUILTIN_VARIABLE_PREFIXES.includes('CMAKE_'));
        });

        it('should contain PROJECT_ prefix', () => {
            assert.ok(BUILTIN_VARIABLE_PREFIXES.includes('PROJECT_'));
        });

        it('should contain CTEST_ prefix', () => {
            assert.ok(BUILTIN_VARIABLE_PREFIXES.includes('CTEST_'));
        });

        it('should contain CPACK_ prefix', () => {
            assert.ok(BUILTIN_VARIABLE_PREFIXES.includes('CPACK_'));
        });

        it('should contain ARGC', () => {
            assert.ok(BUILTIN_VARIABLE_PREFIXES.includes('ARGC'));
        });
    });

    describe('BUILTIN_VARIABLES', () => {
        it('should contain platform variables', () => {
            assert.ok(BUILTIN_VARIABLES.has('WIN32'));
            assert.ok(BUILTIN_VARIABLES.has('UNIX'));
            assert.ok(BUILTIN_VARIABLES.has('APPLE'));
            assert.ok(BUILTIN_VARIABLES.has('MSVC'));
        });

        it('should contain boolean constants', () => {
            assert.ok(BUILTIN_VARIABLES.has('TRUE'));
            assert.ok(BUILTIN_VARIABLES.has('FALSE'));
            assert.ok(BUILTIN_VARIABLES.has('ON'));
            assert.ok(BUILTIN_VARIABLES.has('OFF'));
        });
    });

    describe('BUILTIN_DIRECTORY_VARIABLES', () => {
        it('should contain common directory variables', () => {
            assert.ok(BUILTIN_DIRECTORY_VARIABLES.has('CMAKE_SOURCE_DIR'));
            assert.ok(BUILTIN_DIRECTORY_VARIABLES.has('CMAKE_BINARY_DIR'));
            assert.ok(BUILTIN_DIRECTORY_VARIABLES.has('CMAKE_CURRENT_SOURCE_DIR'));
            assert.ok(BUILTIN_DIRECTORY_VARIABLES.has('CMAKE_INSTALL_PREFIX'));
            assert.ok(BUILTIN_DIRECTORY_VARIABLES.has('PROJECT_SOURCE_DIR'));
            assert.ok(BUILTIN_DIRECTORY_VARIABLES.has('CMAKE_ROOT'));
        });
    });

    describe('BUILTIN_FILE_VARIABLES', () => {
        it('should contain file path variables', () => {
            assert.ok(BUILTIN_FILE_VARIABLES.has('CMAKE_COMMAND'));
            assert.ok(BUILTIN_FILE_VARIABLES.has('CMAKE_C_COMPILER'));
            assert.ok(BUILTIN_FILE_VARIABLES.has('CMAKE_CXX_COMPILER'));
            assert.ok(BUILTIN_FILE_VARIABLES.has('CMAKE_CURRENT_LIST_FILE'));
            assert.ok(BUILTIN_FILE_VARIABLES.has('CMAKE_TOOLCHAIN_FILE'));
        });
    });

    describe('BUILTIN_VALUE_VARIABLES', () => {
        it('should contain version variables', () => {
            assert.ok(BUILTIN_VALUE_VARIABLES.has('CMAKE_VERSION'));
            assert.ok(BUILTIN_VALUE_VARIABLES.has('PROJECT_VERSION'));
        });

        it('should contain standard variables', () => {
            assert.ok(BUILTIN_VALUE_VARIABLES.has('CMAKE_CXX_STANDARD'));
            assert.ok(BUILTIN_VALUE_VARIABLES.has('CMAKE_C_STANDARD'));
        });

        it('should contain flag variables', () => {
            assert.ok(BUILTIN_VALUE_VARIABLES.has('CMAKE_C_FLAGS'));
            assert.ok(BUILTIN_VALUE_VARIABLES.has('CMAKE_CXX_FLAGS'));
        });

        it('should contain build type', () => {
            assert.ok(BUILTIN_VALUE_VARIABLES.has('CMAKE_BUILD_TYPE'));
        });

        it('should contain generator variables', () => {
            assert.ok(BUILTIN_VALUE_VARIABLES.has('CMAKE_GENERATOR'));
        });

        it('should contain project info', () => {
            assert.ok(BUILTIN_VALUE_VARIABLES.has('PROJECT_NAME'));
            assert.ok(BUILTIN_VALUE_VARIABLES.has('PROJECT_DESCRIPTION'));
        });
    });

    describe('isBuiltInVariable', () => {
        it('should recognize prefixed variables', () => {
            assert.ok(isBuiltInVariable('CMAKE_SOURCE_DIR'));
            assert.ok(isBuiltInVariable('PROJECT_VERSION'));
            assert.ok(isBuiltInVariable('CTEST_SOURCE_DIRECTORY'));
            assert.ok(isBuiltInVariable('CPACK_PACKAGE_NAME'));
        });

        it('should recognize platform variables', () => {
            assert.ok(isBuiltInVariable('WIN32'));
            assert.ok(isBuiltInVariable('UNIX'));
            assert.ok(isBuiltInVariable('APPLE'));
            assert.ok(isBuiltInVariable('MSVC'));
        });

        it('should recognize ARGC/ARGV', () => {
            assert.ok(isBuiltInVariable('ARGC'));
            assert.ok(isBuiltInVariable('ARGV'));
            assert.ok(isBuiltInVariable('ARGV0'));
            assert.ok(isBuiltInVariable('ARGN'));
        });

        it('should recognize directory variables', () => {
            assert.ok(isBuiltInVariable('CMAKE_SOURCE_DIR'));
            assert.ok(isBuiltInVariable('CMAKE_BINARY_DIR'));
        });

        it('should recognize file variables', () => {
            assert.ok(isBuiltInVariable('CMAKE_COMMAND'));
            assert.ok(isBuiltInVariable('CMAKE_C_COMPILER'));
        });

        it('should recognize value variables', () => {
            assert.ok(isBuiltInVariable('CMAKE_BUILD_TYPE'));
            assert.ok(isBuiltInVariable('CMAKE_CXX_STANDARD'));
        });

        it('should not recognize arbitrary user variables', () => {
            assert.strictEqual(isBuiltInVariable('MY_VARIABLE'), false);
            assert.strictEqual(isBuiltInVariable('FOO_BAR'), false);
            assert.strictEqual(isBuiltInVariable('TARGET_NAME'), false);
        });

        it('should recognize BUILD_SHARED_LIBS', () => {
            assert.ok(isBuiltInVariable('BUILD_SHARED_LIBS'));
        });
    });

    describe('isDirectoryVariable', () => {
        it('should recognize built-in directory variables', () => {
            assert.ok(isDirectoryVariable('CMAKE_SOURCE_DIR'));
            assert.ok(isDirectoryVariable('CMAKE_BINARY_DIR'));
            assert.ok(isDirectoryVariable('CMAKE_INSTALL_PREFIX'));
        });

        it('should recognize _DIR suffix', () => {
            assert.ok(isDirectoryVariable('CUSTOM_DIR'));
            assert.ok(isDirectoryVariable('MY_OUTPUT_DIR'));
        });

        it('should recognize _PATH suffix', () => {
            assert.ok(isDirectoryVariable('CUSTOM_PATH'));
            assert.ok(isDirectoryVariable('MODULE_PATH'));
        });

        it('should recognize _DIRECTORY suffix', () => {
            assert.ok(isDirectoryVariable('OUTPUT_DIRECTORY'));
        });

        it('should recognize _ROOT suffix', () => {
            assert.ok(isDirectoryVariable('BOOST_ROOT'));
        });

        it('should not recognize non-directory variables', () => {
            assert.strictEqual(isDirectoryVariable('CMAKE_VERSION'), false);
            assert.strictEqual(isDirectoryVariable('TARGET_NAME'), false);
            assert.strictEqual(isDirectoryVariable('FOO'), false);
        });
    });

    describe('isNonPathVariable', () => {
        it('should recognize built-in value variables', () => {
            assert.ok(isNonPathVariable('CMAKE_VERSION'));
            assert.ok(isNonPathVariable('CMAKE_CXX_STANDARD'));
            assert.ok(isNonPathVariable('CMAKE_BUILD_TYPE'));
        });

        it('should recognize _VERSION suffix', () => {
            assert.ok(isNonPathVariable('BOOST_VERSION'));
            assert.ok(isNonPathVariable('QT_VERSION'));
        });

        it('should recognize _FLAGS suffix', () => {
            assert.ok(isNonPathVariable('CUSTOM_FLAGS'));
        });

        it('should recognize _STANDARD suffix', () => {
            assert.ok(isNonPathVariable('CXX_STANDARD'));
        });

        it('should recognize _FOUND suffix', () => {
            assert.ok(isNonPathVariable('Boost_FOUND'));
        });

        it('should recognize _EXTENSIONS suffix', () => {
            assert.ok(isNonPathVariable('CXX_EXTENSIONS'));
        });

        it('should recognize _REQUIRED suffix', () => {
            assert.ok(isNonPathVariable('CXX_STANDARD_REQUIRED'));
        });

        it('should recognize _LOADED suffix', () => {
            assert.ok(isNonPathVariable('MODULE_LOADED'));
        });

        it('should not recognize path variables', () => {
            assert.strictEqual(isNonPathVariable('CMAKE_SOURCE_DIR'), false);
            assert.strictEqual(isNonPathVariable('MY_VARIABLE'), false);
        });
    });

    describe('getBuiltInVariableType', () => {
        it('should return directory for directory variables', () => {
            assert.strictEqual(getBuiltInVariableType('CMAKE_SOURCE_DIR'), 'directory');
            assert.strictEqual(getBuiltInVariableType('CMAKE_BINARY_DIR'), 'directory');
            assert.strictEqual(getBuiltInVariableType('CMAKE_INSTALL_PREFIX'), 'directory');
        });

        it('should return file for file variables', () => {
            assert.strictEqual(getBuiltInVariableType('CMAKE_COMMAND'), 'file');
            assert.strictEqual(getBuiltInVariableType('CMAKE_C_COMPILER'), 'file');
            assert.strictEqual(getBuiltInVariableType('CMAKE_TOOLCHAIN_FILE'), 'file');
        });

        it('should return value for value variables', () => {
            assert.strictEqual(getBuiltInVariableType('CMAKE_VERSION'), 'value');
            assert.strictEqual(getBuiltInVariableType('CMAKE_BUILD_TYPE'), 'value');
            assert.strictEqual(getBuiltInVariableType('WIN32'), 'value');
            assert.strictEqual(getBuiltInVariableType('APPLE'), 'value');
        });

        it('should infer directory from _DIR suffix', () => {
            assert.strictEqual(getBuiltInVariableType('CUSTOM_DIR'), 'directory');
        });

        it('should infer directory from _PATH suffix', () => {
            assert.strictEqual(getBuiltInVariableType('CUSTOM_PATH'), 'directory');
        });

        it('should infer directory from _DIRECTORY suffix', () => {
            assert.strictEqual(getBuiltInVariableType('OUTPUT_DIRECTORY'), 'directory');
        });

        it('should infer directory from _ROOT suffix', () => {
            assert.strictEqual(getBuiltInVariableType('BOOST_ROOT'), 'directory');
        });

        it('should infer file from _FILE suffix', () => {
            assert.strictEqual(getBuiltInVariableType('CONFIG_FILE'), 'file');
        });

        it('should infer file from _COMPILER suffix', () => {
            assert.strictEqual(getBuiltInVariableType('CUSTOM_COMPILER'), 'file');
        });

        it('should infer file from _COMMAND suffix', () => {
            assert.strictEqual(getBuiltInVariableType('CUSTOM_COMMAND'), 'file');
        });

        it('should infer file from _PROGRAM suffix', () => {
            assert.strictEqual(getBuiltInVariableType('CUSTOM_PROGRAM'), 'file');
        });

        it('should infer value from _VERSION suffix', () => {
            assert.strictEqual(getBuiltInVariableType('BOOST_VERSION'), 'value');
        });

        it('should infer value from _FLAGS suffix', () => {
            assert.strictEqual(getBuiltInVariableType('CUSTOM_FLAGS'), 'value');
        });

        it('should infer value from _FOUND suffix', () => {
            assert.strictEqual(getBuiltInVariableType('Boost_FOUND'), 'value');
        });

        it('should infer value from _LIBRARIES suffix', () => {
            assert.strictEqual(getBuiltInVariableType('Boost_LIBRARIES'), 'value');
        });

        it('should infer value from _DEFINITIONS suffix', () => {
            assert.strictEqual(getBuiltInVariableType('COMPILE_DEFINITIONS'), 'value');
        });

        it('should return unknown for unrecognized variables', () => {
            assert.strictEqual(getBuiltInVariableType('FOO_BAR'), 'unknown');
            assert.strictEqual(getBuiltInVariableType('TARGET_NAME'), 'unknown');
        });
    });
});

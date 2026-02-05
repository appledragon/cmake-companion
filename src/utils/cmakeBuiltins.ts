/**
 * CMake Built-in Variables and Commands
 * Shared utility for identifying built-in CMake variables
 */

/**
 * Prefixes for built-in CMake variables
 */
export const BUILTIN_VARIABLE_PREFIXES = [
    'CMAKE_', 'PROJECT_', 'CTEST_', 'CPACK_', '_', 
    'ARGC', 'ARGV', 'ARGN'
];

/**
 * Set of built-in CMake variables that don't have common prefixes
 */
export const BUILTIN_VARIABLES = new Set([
    'WIN32', 'UNIX', 'APPLE', 'MSVC', 'MINGW', 'CYGWIN',
    'BORLAND', 'WATCOM', 'MSYS', 'ANDROID', 'IOS',
    'TRUE', 'FALSE', 'ON', 'OFF', 'YES', 'NO',
    'BUILD_SHARED_LIBS', 'EXECUTABLE_OUTPUT_PATH', 'LIBRARY_OUTPUT_PATH'
]);

/**
 * Built-in CMake variables that represent directories (not files)
 * These should not show "file not found" warnings
 */
export const BUILTIN_DIRECTORY_VARIABLES = new Set([
    'CMAKE_SOURCE_DIR',
    'CMAKE_BINARY_DIR',
    'CMAKE_CURRENT_SOURCE_DIR',
    'CMAKE_CURRENT_BINARY_DIR',
    'CMAKE_CURRENT_LIST_DIR',
    'PROJECT_SOURCE_DIR',
    'PROJECT_BINARY_DIR',
    'CMAKE_INSTALL_PREFIX',
    'CMAKE_MODULE_PATH',
    'CMAKE_PREFIX_PATH',
    'CMAKE_INCLUDE_PATH',
    'CMAKE_LIBRARY_PATH',
    'CMAKE_PROGRAM_PATH',
    'CMAKE_SYSTEM_PREFIX_PATH',
    'CMAKE_SYSTEM_INCLUDE_PATH',
    'CMAKE_SYSTEM_LIBRARY_PATH',
    'CMAKE_SYSTEM_PROGRAM_PATH',
    'CMAKE_FIND_ROOT_PATH',
    'CMAKE_SYSROOT',
    'CMAKE_STAGING_PREFIX',
    'CMAKE_ARCHIVE_OUTPUT_DIRECTORY',
    'CMAKE_LIBRARY_OUTPUT_DIRECTORY',
    'CMAKE_RUNTIME_OUTPUT_DIRECTORY',
    'CMAKE_PDB_OUTPUT_DIRECTORY',
    'CMAKE_COMPILE_PDB_OUTPUT_DIRECTORY',
    'CMAKE_HOME_DIRECTORY',
    'CMAKE_ROOT',
    'CTEST_SOURCE_DIRECTORY',
    'CTEST_BINARY_DIRECTORY',
    'CPACK_PACKAGE_DIRECTORY',
]);

/**
 * Built-in CMake variables that represent file paths
 */
export const BUILTIN_FILE_VARIABLES = new Set([
    'CMAKE_CURRENT_LIST_FILE',
    'CMAKE_PARENT_LIST_FILE',
    'CMAKE_TOOLCHAIN_FILE',
    'CMAKE_CACHEFILE_DIR',
    'CMAKE_COMMAND',
    'CMAKE_CPACK_COMMAND',
    'CMAKE_CTEST_COMMAND',
    'CMAKE_MAKE_PROGRAM',
    'CMAKE_C_COMPILER',
    'CMAKE_CXX_COMPILER',
    'CMAKE_Fortran_COMPILER',
    'CMAKE_LINKER',
    'CMAKE_AR',
    'CMAKE_RANLIB',
    'CMAKE_NM',
    'CMAKE_OBJCOPY',
    'CMAKE_OBJDUMP',
    'CMAKE_STRIP',
]);

/**
 * Built-in CMake variables that represent non-path values (versions, flags, etc.)
 * These should not trigger file existence checks
 */
export const BUILTIN_VALUE_VARIABLES = new Set([
    // Version variables
    'CMAKE_VERSION',
    'CMAKE_MAJOR_VERSION',
    'CMAKE_MINOR_VERSION',
    'CMAKE_PATCH_VERSION',
    'CMAKE_TWEAK_VERSION',
    'PROJECT_VERSION',
    'PROJECT_VERSION_MAJOR',
    'PROJECT_VERSION_MINOR',
    'PROJECT_VERSION_PATCH',
    'PROJECT_VERSION_TWEAK',
    // Build type
    'CMAKE_BUILD_TYPE',
    'CMAKE_CONFIGURATION_TYPES',
    // Standards
    'CMAKE_C_STANDARD',
    'CMAKE_CXX_STANDARD',
    'CMAKE_C_STANDARD_REQUIRED',
    'CMAKE_CXX_STANDARD_REQUIRED',
    'CMAKE_C_EXTENSIONS',
    'CMAKE_CXX_EXTENSIONS',
    // Flags
    'CMAKE_C_FLAGS',
    'CMAKE_CXX_FLAGS',
    'CMAKE_EXE_LINKER_FLAGS',
    'CMAKE_SHARED_LINKER_FLAGS',
    'CMAKE_MODULE_LINKER_FLAGS',
    'CMAKE_STATIC_LINKER_FLAGS',
    // System info
    'CMAKE_SYSTEM',
    'CMAKE_SYSTEM_NAME',
    'CMAKE_SYSTEM_VERSION',
    'CMAKE_SYSTEM_PROCESSOR',
    'CMAKE_HOST_SYSTEM',
    'CMAKE_HOST_SYSTEM_NAME',
    'CMAKE_HOST_SYSTEM_VERSION',
    'CMAKE_HOST_SYSTEM_PROCESSOR',
    // Generator
    'CMAKE_GENERATOR',
    'CMAKE_GENERATOR_PLATFORM',
    'CMAKE_GENERATOR_TOOLSET',
    'CMAKE_GENERATOR_INSTANCE',
    // Project info
    'PROJECT_NAME',
    'PROJECT_DESCRIPTION',
    'PROJECT_HOMEPAGE_URL',
    'CMAKE_PROJECT_NAME',
    'CMAKE_PROJECT_VERSION',
    'CMAKE_PROJECT_DESCRIPTION',
    'CMAKE_PROJECT_HOMEPAGE_URL',
    // Boolean/platform flags
    'WIN32', 'UNIX', 'APPLE', 'MSVC', 'MINGW', 'CYGWIN',
    'BORLAND', 'WATCOM', 'MSYS', 'ANDROID', 'IOS',
    'TRUE', 'FALSE', 'ON', 'OFF', 'YES', 'NO',
    // Misc
    'BUILD_SHARED_LIBS',
    'CMAKE_VERBOSE_MAKEFILE',
    'CMAKE_COLOR_MAKEFILE',
    'CMAKE_SKIP_INSTALL_RULES',
    'CMAKE_SKIP_RPATH',
    'CMAKE_INCLUDE_CURRENT_DIR',
    'CMAKE_INCLUDE_CURRENT_DIR_IN_INTERFACE',
    'CMAKE_POSITION_INDEPENDENT_CODE',
    'CMAKE_VISIBILITY_INLINES_HIDDEN',
]);

/**
 * Check if a variable name is a built-in CMake variable
 * @param name Variable name
 * @returns True if the variable is a built-in CMake variable
 */
export function isBuiltInVariable(name: string): boolean {
    if (BUILTIN_VARIABLES.has(name)) {
        return true;
    }
    if (BUILTIN_DIRECTORY_VARIABLES.has(name)) {
        return true;
    }
    if (BUILTIN_FILE_VARIABLES.has(name)) {
        return true;
    }
    if (BUILTIN_VALUE_VARIABLES.has(name)) {
        return true;
    }
    return BUILTIN_VARIABLE_PREFIXES.some(prefix => name.startsWith(prefix));
}

/**
 * Check if a variable represents a directory path
 * @param name Variable name
 * @returns True if the variable represents a directory
 */
export function isDirectoryVariable(name: string): boolean {
    if (BUILTIN_DIRECTORY_VARIABLES.has(name)) {
        return true;
    }
    // Common patterns for directory variables
    if (name.endsWith('_DIR') || name.endsWith('_PATH') || 
        name.endsWith('_DIRECTORY') || name.endsWith('_ROOT')) {
        return true;
    }
    return false;
}

/**
 * Check if a variable represents a non-path value
 * @param name Variable name
 * @returns True if the variable should not be treated as a path
 */
export function isNonPathVariable(name: string): boolean {
    if (BUILTIN_VALUE_VARIABLES.has(name)) {
        return true;
    }
    // Common patterns for non-path variables
    if (name.endsWith('_VERSION') || name.endsWith('_FLAGS') ||
        name.endsWith('_STANDARD') || name.endsWith('_EXTENSIONS') ||
        name.endsWith('_REQUIRED') || name.endsWith('_FOUND') ||
        name.endsWith('_LOADED')) {
        return true;
    }
    return false;
}

/**
 * Get the type of a built-in variable
 * @param name Variable name
 * @returns 'directory' | 'file' | 'value' | 'unknown'
 */
export function getBuiltInVariableType(name: string): 'directory' | 'file' | 'value' | 'unknown' {
    if (BUILTIN_DIRECTORY_VARIABLES.has(name)) {
        return 'directory';
    }
    if (BUILTIN_FILE_VARIABLES.has(name)) {
        return 'file';
    }
    if (BUILTIN_VALUE_VARIABLES.has(name) || BUILTIN_VARIABLES.has(name)) {
        return 'value';
    }
    // Infer from name patterns
    if (name.endsWith('_DIR') || name.endsWith('_PATH') || 
        name.endsWith('_DIRECTORY') || name.endsWith('_ROOT')) {
        return 'directory';
    }
    if (name.endsWith('_FILE') || name.endsWith('_COMPILER') ||
        name.endsWith('_COMMAND') || name.endsWith('_PROGRAM')) {
        return 'file';
    }
    if (name.endsWith('_VERSION') || name.endsWith('_FLAGS') ||
        name.endsWith('_STANDARD') || name.endsWith('_FOUND') ||
        name.endsWith('_LIBRARIES') || name.endsWith('_DEFINITIONS')) {
        return 'value';
    }
    return 'unknown';
}

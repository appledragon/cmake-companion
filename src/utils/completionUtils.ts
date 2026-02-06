/**
 * Pure completion utility functions for CMake files
 * These functions contain no vscode dependencies and can be tested directly.
 */

/**
 * Built-in CMake variable info
 */
export interface BuiltinVariableInfo {
    name: string;
    description: string;
}

/**
 * CMake command info
 */
export interface CMakeCommandInfo {
    name: string;
    description: string;
    snippet?: string;
}

/**
 * CMake keyword info
 */
export interface CMakeKeywordInfo {
    name: string;
    description: string;
}

/**
 * Built-in CMake variables that should always be suggested
 */
export const COMPLETION_VARIABLES: BuiltinVariableInfo[] = [
    // Project variables
    { name: 'PROJECT_NAME', description: 'The name of the project' },
    { name: 'PROJECT_SOURCE_DIR', description: 'Top level source directory for the project' },
    { name: 'PROJECT_BINARY_DIR', description: 'Top level binary directory for the project' },
    { name: 'PROJECT_VERSION', description: 'Full version string of the project' },
    { name: 'PROJECT_VERSION_MAJOR', description: 'Major version of the project' },
    { name: 'PROJECT_VERSION_MINOR', description: 'Minor version of the project' },
    { name: 'PROJECT_VERSION_PATCH', description: 'Patch version of the project' },
    
    // CMAKE variables
    { name: 'CMAKE_SOURCE_DIR', description: 'Path to top level source directory' },
    { name: 'CMAKE_BINARY_DIR', description: 'Path to top level binary directory' },
    { name: 'CMAKE_CURRENT_SOURCE_DIR', description: 'Path to current source directory being processed' },
    { name: 'CMAKE_CURRENT_BINARY_DIR', description: 'Path to current binary directory being processed' },
    { name: 'CMAKE_CURRENT_LIST_DIR', description: 'Directory of the listfile currently being processed' },
    { name: 'CMAKE_CURRENT_LIST_FILE', description: 'Full path to the listfile currently being processed' },
    { name: 'CMAKE_MODULE_PATH', description: 'List of directories to search for CMake modules' },
    { name: 'CMAKE_PREFIX_PATH', description: 'Path used for searching packages' },
    
    // Build configuration
    { name: 'CMAKE_BUILD_TYPE', description: 'Build type (Debug, Release, etc.)' },
    { name: 'CMAKE_CXX_STANDARD', description: 'C++ standard to use' },
    { name: 'CMAKE_CXX_FLAGS', description: 'Flags for C++ compiler' },
    { name: 'CMAKE_C_STANDARD', description: 'C standard to use' },
    { name: 'CMAKE_C_FLAGS', description: 'Flags for C compiler' },
    { name: 'CMAKE_CXX_COMPILER', description: 'C++ compiler executable' },
    { name: 'CMAKE_C_COMPILER', description: 'C compiler executable' },
    
    // Platform detection
    { name: 'CMAKE_SYSTEM_NAME', description: 'Name of the OS CMake is building for' },
    { name: 'CMAKE_SYSTEM_PROCESSOR', description: 'Processor CMake is building for' },
    { name: 'WIN32', description: 'True when compiling for Windows' },
    { name: 'UNIX', description: 'True when compiling for Unix-like systems' },
    { name: 'APPLE', description: 'True when compiling for macOS/iOS' },
    { name: 'MSVC', description: 'True when using Microsoft Visual C++' },
    
    // Install variables
    { name: 'CMAKE_INSTALL_PREFIX', description: 'Install directory prefix' },
    { name: 'CMAKE_INSTALL_BINDIR', description: 'Install directory for executables' },
    { name: 'CMAKE_INSTALL_LIBDIR', description: 'Install directory for libraries' },
    { name: 'CMAKE_INSTALL_INCLUDEDIR', description: 'Install directory for headers' },
];

/**
 * CMake commands grouped by category
 */
export const CMAKE_COMMANDS: CMakeCommandInfo[] = [
    { name: 'cmake_minimum_required', description: 'Set minimum CMake version', snippet: 'cmake_minimum_required(VERSION ${1:3.16})' },
    { name: 'project', description: 'Set project name and version', snippet: 'project(${1:ProjectName} VERSION ${2:1.0.0} LANGUAGES ${3:CXX})' },
    { name: 'add_executable', description: 'Add an executable target', snippet: 'add_executable(${1:target_name}\n    ${2:source.cpp}\n)' },
    { name: 'add_library', description: 'Add a library target', snippet: 'add_library(${1:target_name} ${2|STATIC,SHARED,INTERFACE|}\n    ${3:source.cpp}\n)' },
    { name: 'add_subdirectory', description: 'Add a subdirectory to the build', snippet: 'add_subdirectory(${1:subdir})' },
    { name: 'add_custom_target', description: 'Add a custom target', snippet: 'add_custom_target(${1:target_name}\n    COMMAND ${2:command}\n)' },
    { name: 'add_custom_command', description: 'Add a custom build command', snippet: 'add_custom_command(\n    TARGET ${1:target}\n    POST_BUILD\n    COMMAND ${2:command}\n)' },
    { name: 'add_dependencies', description: 'Add a dependency between targets', snippet: 'add_dependencies(${1:target} ${2:dependency})' },
    { name: 'add_test', description: 'Add a test', snippet: 'add_test(NAME ${1:test_name} COMMAND ${2:command})' },
    { name: 'target_sources', description: 'Add sources to a target' },
    { name: 'target_include_directories', description: 'Add include directories to a target' },
    { name: 'target_link_libraries', description: 'Link libraries to a target' },
    { name: 'target_compile_definitions', description: 'Add compile definitions to a target' },
    { name: 'target_compile_options', description: 'Add compile options to a target' },
    { name: 'target_compile_features', description: 'Add compile features to a target' },
    { name: 'target_link_options', description: 'Add link options to a target' },
    { name: 'target_precompile_headers', description: 'Add precompiled headers to a target' },
    { name: 'set_target_properties', description: 'Set properties on targets' },
    { name: 'get_target_property', description: 'Get a property from a target' },
    { name: 'set', description: 'Set a variable' },
    { name: 'unset', description: 'Unset a variable' },
    { name: 'option', description: 'Define a boolean option' },
    { name: 'list', description: 'List operations' },
    { name: 'string', description: 'String operations' },
    { name: 'math', description: 'Math operations' },
    { name: 'if', description: 'Conditional block' },
    { name: 'elseif', description: 'Else-if condition' },
    { name: 'else', description: 'Else block' },
    { name: 'endif', description: 'End if block' },
    { name: 'foreach', description: 'Loop over items' },
    { name: 'endforeach', description: 'End foreach loop' },
    { name: 'while', description: 'While loop' },
    { name: 'endwhile', description: 'End while loop' },
    { name: 'break', description: 'Break from loop' },
    { name: 'continue', description: 'Continue to next iteration' },
    { name: 'return', description: 'Return from function' },
    { name: 'function', description: 'Define a function' },
    { name: 'endfunction', description: 'End function definition' },
    { name: 'macro', description: 'Define a macro' },
    { name: 'endmacro', description: 'End macro definition' },
    { name: 'find_package', description: 'Find and load external package' },
    { name: 'find_library', description: 'Find a library' },
    { name: 'find_path', description: 'Find a path containing a file' },
    { name: 'find_file', description: 'Find a file' },
    { name: 'find_program', description: 'Find a program' },
    { name: 'include', description: 'Include a CMake file' },
    { name: 'include_guard', description: 'Include guard for CMake modules' },
    { name: 'message', description: 'Display a message' },
    { name: 'configure_file', description: 'Copy and configure a file' },
    { name: 'file', description: 'File operations' },
    { name: 'execute_process', description: 'Execute external process' },
    { name: 'install', description: 'Install targets/files' },
    { name: 'enable_testing', description: 'Enable testing' },
    { name: 'cmake_parse_arguments', description: 'Parse function arguments' },
];

/**
 * Common CMake keywords used as arguments
 */
export const CMAKE_KEYWORDS: CMakeKeywordInfo[] = [
    { name: 'PUBLIC', description: 'Public visibility (propagates to dependents)' },
    { name: 'PRIVATE', description: 'Private visibility (only for this target)' },
    { name: 'INTERFACE', description: 'Interface visibility (only for dependents)' },
    { name: 'REQUIRED', description: 'Package is required' },
    { name: 'QUIET', description: 'Suppress messages' },
    { name: 'COMPONENTS', description: 'Specify components to find' },
    { name: 'CONFIG', description: 'Use config mode' },
    { name: 'MODULE', description: 'Use module mode' },
    { name: 'STATIC', description: 'Static library' },
    { name: 'SHARED', description: 'Shared library' },
    { name: 'OBJECT', description: 'Object library' },
    { name: 'IMPORTED', description: 'Imported target' },
    { name: 'ALIAS', description: 'Alias target' },
    { name: 'ON', description: 'Boolean true' },
    { name: 'OFF', description: 'Boolean false' },
    { name: 'TRUE', description: 'Boolean true' },
    { name: 'FALSE', description: 'Boolean false' },
    { name: 'AND', description: 'Logical AND' },
    { name: 'OR', description: 'Logical OR' },
    { name: 'NOT', description: 'Logical NOT' },
    { name: 'DEFINED', description: 'Check if variable is defined' },
    { name: 'EXISTS', description: 'Check if file/directory exists' },
    { name: 'IS_DIRECTORY', description: 'Check if path is a directory' },
    { name: 'MATCHES', description: 'Regex match' },
    { name: 'STREQUAL', description: 'String equality' },
    { name: 'VERSION_LESS', description: 'Version comparison' },
    { name: 'VERSION_GREATER', description: 'Version comparison' },
    { name: 'VERSION_EQUAL', description: 'Version comparison' },
    { name: 'PROPERTIES', description: 'Set properties' },
    { name: 'OUTPUT_NAME', description: 'Target output name' },
    { name: 'VERSION', description: 'Target version' },
    { name: 'SOVERSION', description: 'Shared library version' },
    { name: 'CXX_STANDARD', description: 'C++ standard' },
    { name: 'CXX_STANDARD_REQUIRED', description: 'C++ standard is required' },
];

/**
 * Check if cursor is in a variable context (after ${ )
 */
export function isInVariableContext(linePrefix: string): boolean {
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
export function isAtCommandPosition(linePrefix: string): boolean {
    return /^\s*[a-zA-Z_]*$/.test(linePrefix);
}

/**
 * Check if cursor is inside a command (within parentheses)
 */
export function isInsideCommand(lineText: string, position: number): boolean {
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
 * Detect command context from a line of text
 */
export function detectCommandContext(lineText: string): string | null {
    const commandMatch = lineText.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
    return commandMatch?.[1]?.toLowerCase() ?? null;
}

/**
 * Get relevant keywords for a command context
 */
export function getRelevantKeywords(commandName: string | null): CMakeKeywordInfo[] {
    if (!commandName) {
        return CMAKE_KEYWORDS;
    }

    if (['target_include_directories', 'target_link_libraries', 'target_sources',
         'target_compile_definitions', 'target_compile_options', 'target_compile_features',
         'target_link_options', 'target_precompile_headers'].includes(commandName)) {
        return CMAKE_KEYWORDS.filter(k =>
            ['PUBLIC', 'PRIVATE', 'INTERFACE'].includes(k.name)
        );
    } else if (commandName === 'find_package') {
        return CMAKE_KEYWORDS.filter(k =>
            ['REQUIRED', 'QUIET', 'COMPONENTS', 'CONFIG', 'MODULE'].includes(k.name)
        );
    } else if (commandName === 'add_library') {
        return CMAKE_KEYWORDS.filter(k =>
            ['STATIC', 'SHARED', 'OBJECT', 'INTERFACE', 'IMPORTED', 'ALIAS'].includes(k.name)
        );
    } else if (commandName === 'option' || commandName === 'set') {
        return CMAKE_KEYWORDS.filter(k =>
            ['ON', 'OFF', 'TRUE', 'FALSE', 'CACHE', 'PARENT_SCOPE'].includes(k.name)
        );
    } else if (commandName === 'if' || commandName === 'elseif' || commandName === 'while') {
        return CMAKE_KEYWORDS.filter(k =>
            ['AND', 'OR', 'NOT', 'DEFINED', 'EXISTS', 'IS_DIRECTORY', 'MATCHES',
             'STREQUAL', 'VERSION_LESS', 'VERSION_GREATER', 'VERSION_EQUAL'].includes(k.name)
        );
    }

    return CMAKE_KEYWORDS;
}

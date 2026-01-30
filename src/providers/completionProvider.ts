/**
 * Completion Provider
 * Provides IntelliSense auto-completion for CMake files
 * - Variables: triggered by ${ 
 * - Commands: triggered at line start
 * - Keywords: context-aware (e.g., PUBLIC, PRIVATE, REQUIRED)
 */

import * as vscode from 'vscode';
import { getVariableResolver } from '../services/variableResolver';

/**
 * Built-in CMake variables that should always be suggested
 */
const BUILTIN_VARIABLES = [
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
const CMAKE_COMMANDS: Array<{ name: string; description: string; snippet?: string }> = [
    // Project commands
    { name: 'cmake_minimum_required', description: 'Set minimum CMake version', snippet: 'cmake_minimum_required(VERSION ${1:3.16})' },
    { name: 'project', description: 'Set project name and version', snippet: 'project(${1:ProjectName} VERSION ${2:1.0.0} LANGUAGES ${3:CXX})' },
    
    // Target commands
    { name: 'add_executable', description: 'Add an executable target', snippet: 'add_executable(${1:target_name}\n    ${2:source.cpp}\n)' },
    { name: 'add_library', description: 'Add a library target', snippet: 'add_library(${1:target_name} ${2|STATIC,SHARED,INTERFACE|}\n    ${3:source.cpp}\n)' },
    { name: 'add_subdirectory', description: 'Add a subdirectory to the build', snippet: 'add_subdirectory(${1:subdir})' },
    { name: 'add_custom_target', description: 'Add a custom target', snippet: 'add_custom_target(${1:target_name}\n    COMMAND ${2:command}\n)' },
    { name: 'add_custom_command', description: 'Add a custom build command', snippet: 'add_custom_command(\n    TARGET ${1:target}\n    POST_BUILD\n    COMMAND ${2:command}\n)' },
    { name: 'add_dependencies', description: 'Add a dependency between targets', snippet: 'add_dependencies(${1:target} ${2:dependency})' },
    { name: 'add_test', description: 'Add a test', snippet: 'add_test(NAME ${1:test_name} COMMAND ${2:command})' },
    
    // Target properties
    { name: 'target_sources', description: 'Add sources to a target', snippet: 'target_sources(${1:target} ${2|PRIVATE,PUBLIC,INTERFACE|}\n    ${3:source.cpp}\n)' },
    { name: 'target_include_directories', description: 'Add include directories to a target', snippet: 'target_include_directories(${1:target} ${2|PRIVATE,PUBLIC,INTERFACE|}\n    ${3:\\${CMAKE_CURRENT_SOURCE_DIR}/include}\n)' },
    { name: 'target_link_libraries', description: 'Link libraries to a target', snippet: 'target_link_libraries(${1:target} ${2|PRIVATE,PUBLIC,INTERFACE|}\n    ${3:library}\n)' },
    { name: 'target_compile_definitions', description: 'Add compile definitions to a target', snippet: 'target_compile_definitions(${1:target} ${2|PRIVATE,PUBLIC,INTERFACE|}\n    ${3:DEFINITION}\n)' },
    { name: 'target_compile_options', description: 'Add compile options to a target', snippet: 'target_compile_options(${1:target} ${2|PRIVATE,PUBLIC,INTERFACE|}\n    ${3:-Wall}\n)' },
    { name: 'target_compile_features', description: 'Add compile features to a target', snippet: 'target_compile_features(${1:target} ${2|PRIVATE,PUBLIC,INTERFACE|}\n    ${3:cxx_std_17}\n)' },
    { name: 'target_link_options', description: 'Add link options to a target', snippet: 'target_link_options(${1:target} ${2|PRIVATE,PUBLIC,INTERFACE|}\n    ${3:option}\n)' },
    { name: 'target_precompile_headers', description: 'Add precompiled headers to a target', snippet: 'target_precompile_headers(${1:target} ${2|PRIVATE,PUBLIC,INTERFACE|}\n    ${3:<header.h>}\n)' },
    { name: 'set_target_properties', description: 'Set properties on targets', snippet: 'set_target_properties(${1:target} PROPERTIES\n    ${2:PROPERTY} ${3:value}\n)' },
    { name: 'get_target_property', description: 'Get a property from a target', snippet: 'get_target_property(${1:var} ${2:target} ${3:property})' },
    
    // Variables
    { name: 'set', description: 'Set a variable', snippet: 'set(${1:VAR} ${2:value})' },
    { name: 'unset', description: 'Unset a variable', snippet: 'unset(${1:VAR})' },
    { name: 'option', description: 'Define a boolean option', snippet: 'option(${1:OPTION_NAME} "${2:Description}" ${3|ON,OFF|})' },
    { name: 'list', description: 'List operations', snippet: 'list(${1|APPEND,PREPEND,REMOVE_ITEM,LENGTH,GET,FIND|} ${2:list} ${3:value})' },
    { name: 'string', description: 'String operations', snippet: 'string(${1|REPLACE,REGEX,TOUPPER,TOLOWER,LENGTH,SUBSTRING|} ${2:args})' },
    { name: 'math', description: 'Math operations', snippet: 'math(EXPR ${1:result} "${2:expression}")' },
    
    // Control flow
    { name: 'if', description: 'Conditional block', snippet: 'if(${1:condition})\n    ${2}\nendif()' },
    { name: 'elseif', description: 'Else-if condition', snippet: 'elseif(${1:condition})' },
    { name: 'else', description: 'Else block', snippet: 'else()' },
    { name: 'endif', description: 'End if block', snippet: 'endif()' },
    { name: 'foreach', description: 'Loop over items', snippet: 'foreach(${1:item} IN ${2|ITEMS,LISTS|} ${3:items})\n    ${4}\nendforeach()' },
    { name: 'endforeach', description: 'End foreach loop', snippet: 'endforeach()' },
    { name: 'while', description: 'While loop', snippet: 'while(${1:condition})\n    ${2}\nendwhile()' },
    { name: 'endwhile', description: 'End while loop', snippet: 'endwhile()' },
    { name: 'break', description: 'Break from loop', snippet: 'break()' },
    { name: 'continue', description: 'Continue to next iteration', snippet: 'continue()' },
    { name: 'return', description: 'Return from function', snippet: 'return()' },
    
    // Functions and macros
    { name: 'function', description: 'Define a function', snippet: 'function(${1:function_name} ${2:args})\n    ${3}\nendfunction()' },
    { name: 'endfunction', description: 'End function definition', snippet: 'endfunction()' },
    { name: 'macro', description: 'Define a macro', snippet: 'macro(${1:macro_name} ${2:args})\n    ${3}\nendmacro()' },
    { name: 'endmacro', description: 'End macro definition', snippet: 'endmacro()' },
    
    // Find packages
    { name: 'find_package', description: 'Find and load external package', snippet: 'find_package(${1:PackageName} ${2:REQUIRED})' },
    { name: 'find_library', description: 'Find a library', snippet: 'find_library(${1:VAR} NAMES ${2:name} PATHS ${3:paths})' },
    { name: 'find_path', description: 'Find a path containing a file', snippet: 'find_path(${1:VAR} NAMES ${2:file} PATHS ${3:paths})' },
    { name: 'find_file', description: 'Find a file', snippet: 'find_file(${1:VAR} NAMES ${2:name} PATHS ${3:paths})' },
    { name: 'find_program', description: 'Find a program', snippet: 'find_program(${1:VAR} NAMES ${2:name} PATHS ${3:paths})' },
    
    // Include and modules
    { name: 'include', description: 'Include a CMake file', snippet: 'include(${1:module})' },
    { name: 'include_guard', description: 'Include guard for CMake modules', snippet: 'include_guard(${1|GLOBAL,DIRECTORY|})' },
    
    // Other
    { name: 'message', description: 'Display a message', snippet: 'message(${1|STATUS,WARNING,FATAL_ERROR,AUTHOR_WARNING|} "${2:message}")' },
    { name: 'configure_file', description: 'Copy and configure a file', snippet: 'configure_file(${1:input} ${2:output})' },
    { name: 'file', description: 'File operations', snippet: 'file(${1|GLOB,GLOB_RECURSE,READ,WRITE,COPY,REMOVE|} ${2:args})' },
    { name: 'execute_process', description: 'Execute external process', snippet: 'execute_process(\n    COMMAND ${1:command}\n    WORKING_DIRECTORY ${2:dir}\n    RESULT_VARIABLE ${3:result}\n)' },
    { name: 'install', description: 'Install targets/files', snippet: 'install(${1|TARGETS,FILES,DIRECTORY|} ${2:items}\n    DESTINATION ${3:dest}\n)' },
    { name: 'enable_testing', description: 'Enable testing', snippet: 'enable_testing()' },
    { name: 'cmake_parse_arguments', description: 'Parse function arguments', snippet: 'cmake_parse_arguments(\n    ${1:PREFIX}\n    "${2:OPTIONS}"\n    "${3:ONE_VALUE_ARGS}"\n    "${4:MULTI_VALUE_ARGS}"\n    \\${ARGN}\n)' },
];

/**
 * Common CMake keywords used as arguments
 */
const CMAKE_KEYWORDS = [
    // Visibility
    { name: 'PUBLIC', description: 'Public visibility (propagates to dependents)' },
    { name: 'PRIVATE', description: 'Private visibility (only for this target)' },
    { name: 'INTERFACE', description: 'Interface visibility (only for dependents)' },
    
    // find_package keywords
    { name: 'REQUIRED', description: 'Package is required' },
    { name: 'QUIET', description: 'Suppress messages' },
    { name: 'COMPONENTS', description: 'Specify components to find' },
    { name: 'CONFIG', description: 'Use config mode' },
    { name: 'MODULE', description: 'Use module mode' },
    
    // Library types
    { name: 'STATIC', description: 'Static library' },
    { name: 'SHARED', description: 'Shared library' },
    { name: 'OBJECT', description: 'Object library' },
    { name: 'IMPORTED', description: 'Imported target' },
    { name: 'ALIAS', description: 'Alias target' },
    
    // Boolean values
    { name: 'ON', description: 'Boolean true' },
    { name: 'OFF', description: 'Boolean false' },
    { name: 'TRUE', description: 'Boolean true' },
    { name: 'FALSE', description: 'Boolean false' },
    
    // Conditions
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
    
    // Target properties
    { name: 'PROPERTIES', description: 'Set properties' },
    { name: 'OUTPUT_NAME', description: 'Target output name' },
    { name: 'VERSION', description: 'Target version' },
    { name: 'SOVERSION', description: 'Shared library version' },
    { name: 'CXX_STANDARD', description: 'C++ standard' },
    { name: 'CXX_STANDARD_REQUIRED', description: 'C++ standard is required' },
];

export class CMakeCompletionProvider implements vscode.CompletionItemProvider {
    
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const lineText = document.lineAt(position.line).text;
        const linePrefix = lineText.substring(0, position.character);
        
        // Check if we're inside a variable reference: ${
        if (this.isInVariableContext(linePrefix)) {
            return this.provideVariableCompletions(document, position);
        }
        
        // Check if we're at the start of a command (line start or after whitespace)
        if (this.isAtCommandPosition(linePrefix)) {
            return this.provideCommandCompletions(document, position);
        }
        
        // Check if we're inside a command (between parentheses)
        if (this.isInsideCommand(lineText, position.character)) {
            return this.provideKeywordCompletions(document, position, lineText);
        }
        
        return undefined;
    }
    
    /**
     * Check if cursor is in a variable context (after ${ )
     */
    private isInVariableContext(linePrefix: string): boolean {
        // Find the last ${ that isn't closed
        const lastOpen = linePrefix.lastIndexOf('${');
        if (lastOpen === -1) {
            return false;
        }
        const afterOpen = linePrefix.substring(lastOpen);
        // Check if there's no closing } after the ${
        return !afterOpen.includes('}');
    }
    
    /**
     * Check if cursor is at a position where a command can be entered
     */
    private isAtCommandPosition(linePrefix: string): boolean {
        // At the start of line or after only whitespace
        return /^\s*[a-zA-Z_]*$/.test(linePrefix);
    }
    
    /**
     * Check if cursor is inside a command (within parentheses)
     */
    private isInsideCommand(lineText: string, position: number): boolean {
        // Simple heuristic: count parens before position
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
     * Provide variable name completions
     */
    private provideVariableCompletions(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];
        const resolver = getVariableResolver();
        const existingVars = new Set<string>();
        
        // Add workspace-defined variables
        for (const varName of resolver.getVariableNames()) {
            existingVars.add(varName);
            const value = resolver.getVariable(varName);
            const definition = resolver.getDefinition(varName);
            
            const item = new vscode.CompletionItem(varName, vscode.CompletionItemKind.Variable);
            item.detail = value || '(undefined)';
            if (definition) {
                item.documentation = new vscode.MarkdownString(
                    `Defined in: \`${definition.file}:${definition.line}\``
                );
            }
            // Insert only the variable name (user already typed ${)
            item.insertText = varName;
            items.push(item);
        }
        
        // Add built-in variables that aren't already defined
        for (const builtin of BUILTIN_VARIABLES) {
            if (!existingVars.has(builtin.name)) {
                const item = new vscode.CompletionItem(builtin.name, vscode.CompletionItemKind.Constant);
                item.detail = '(built-in)';
                item.documentation = new vscode.MarkdownString(builtin.description);
                item.insertText = builtin.name;
                items.push(item);
            }
        }
        
        return items;
    }
    
    /**
     * Provide command completions
     */
    private provideCommandCompletions(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];
        
        for (const cmd of CMAKE_COMMANDS) {
            const item = new vscode.CompletionItem(cmd.name, vscode.CompletionItemKind.Function);
            item.detail = 'CMake command';
            item.documentation = new vscode.MarkdownString(cmd.description);
            
            if (cmd.snippet) {
                item.insertText = new vscode.SnippetString(cmd.snippet);
            } else {
                item.insertText = cmd.name + '($0)';
            }
            
            items.push(item);
        }
        
        return items;
    }
    
    /**
     * Provide keyword completions inside commands
     */
    private provideKeywordCompletions(
        document: vscode.TextDocument,
        position: vscode.Position,
        lineText: string
    ): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];
        
        // Detect command context for smarter suggestions
        const commandMatch = lineText.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
        const commandName = commandMatch?.[1]?.toLowerCase();
        
        // Filter keywords based on command context
        let relevantKeywords = CMAKE_KEYWORDS;
        
        if (commandName) {
            if (['target_include_directories', 'target_link_libraries', 'target_sources', 
                 'target_compile_definitions', 'target_compile_options', 'target_compile_features',
                 'target_link_options', 'target_precompile_headers'].includes(commandName)) {
                // Visibility keywords for target commands
                relevantKeywords = CMAKE_KEYWORDS.filter(k => 
                    ['PUBLIC', 'PRIVATE', 'INTERFACE'].includes(k.name)
                );
            } else if (commandName === 'find_package') {
                relevantKeywords = CMAKE_KEYWORDS.filter(k => 
                    ['REQUIRED', 'QUIET', 'COMPONENTS', 'CONFIG', 'MODULE'].includes(k.name)
                );
            } else if (commandName === 'add_library') {
                relevantKeywords = CMAKE_KEYWORDS.filter(k => 
                    ['STATIC', 'SHARED', 'OBJECT', 'INTERFACE', 'IMPORTED', 'ALIAS'].includes(k.name)
                );
            } else if (commandName === 'option' || commandName === 'set') {
                relevantKeywords = CMAKE_KEYWORDS.filter(k => 
                    ['ON', 'OFF', 'TRUE', 'FALSE', 'CACHE', 'PARENT_SCOPE'].includes(k.name)
                );
            } else if (commandName === 'if' || commandName === 'elseif' || commandName === 'while') {
                relevantKeywords = CMAKE_KEYWORDS.filter(k => 
                    ['AND', 'OR', 'NOT', 'DEFINED', 'EXISTS', 'IS_DIRECTORY', 'MATCHES',
                     'STREQUAL', 'VERSION_LESS', 'VERSION_GREATER', 'VERSION_EQUAL'].includes(k.name)
                );
            }
        }
        
        for (const keyword of relevantKeywords) {
            const item = new vscode.CompletionItem(keyword.name, vscode.CompletionItemKind.Keyword);
            item.detail = 'CMake keyword';
            item.documentation = new vscode.MarkdownString(keyword.description);
            items.push(item);
        }
        
        // Also provide variable completions inside commands
        const linePrefix = lineText.substring(0, position.character);
        if (linePrefix.endsWith('$') || linePrefix.endsWith('${')) {
            // Will be handled by the variable completion
            return [];
        }
        
        return items;
    }
}

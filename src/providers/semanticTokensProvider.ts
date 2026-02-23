/**
 * Semantic Tokens Provider
 * Provides semantic highlighting for CMake files
 * Highlights variables, functions, and other semantic elements
 */

import * as vscode from 'vscode';
import { parseVariables } from '../parsers';
import { getVariableResolver } from '../services/variableResolver';

/**
 * Token types for semantic highlighting
 */
const tokenTypes = [
    'variable',
    'function',
    'keyword',
    'string',
    'number',
    'comment',
    'parameter',
    'property',
    'namespace',
    'type'
];

/**
 * Token modifiers for semantic highlighting
 */
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
 * The semantic tokens legend
 */
export const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);

/**
 * CMake command categories for semantic highlighting
 */
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

/**
 * Semantic Tokens Provider for CMake files
 */
export class CMakeSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
    
    /**
     * Provide semantic tokens for the document
     */
    provideDocumentSemanticTokens(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.SemanticTokens> {
        const builder = new vscode.SemanticTokensBuilder(legend);
        const text = document.getText();
        const lines = text.split('\n');
        const resolver = getVariableResolver();
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            if (token.isCancellationRequested) {
                break;
            }
            
            const line = lines[lineIndex];
            
            // Skip empty lines
            if (!line.trim()) {
                continue;
            }
            
            // Highlight comments
            const commentMatch = line.match(/^(\s*)#/);
            if (commentMatch) {
                continue; // Comments are handled by TextMate grammar
            }
            
            // Highlight CMake variables: ${VAR}
            this.highlightVariables(builder, line, lineIndex, resolver);
            
            // Highlight environment variables: $ENV{VAR}
            this.highlightEnvVariables(builder, line, lineIndex);
            
            // Highlight CMake commands
            this.highlightCommands(builder, line, lineIndex);
            
            // Highlight cache variables: $CACHE{VAR}
            this.highlightCacheVariables(builder, line, lineIndex);
        }
        
        return builder.build();
    }
    
    /**
     * Highlight CMake variables ${VAR}
     */
    private highlightVariables(
        builder: vscode.SemanticTokensBuilder,
        line: string,
        lineIndex: number,
        resolver: ReturnType<typeof getVariableResolver>
    ): void {
        const variableMatches = parseVariables(line);
        
        for (const match of variableMatches) {
            const tokenType = tokenTypes.indexOf('variable');
            const modifiers: string[] = [];
            
            // Check if the variable is defined
            if (resolver.hasVariable(match.variableName)) {
                const definition = resolver.getDefinition(match.variableName);
                if (definition?.isCache) {
                    // Cache variable
                    modifiers.push('readonly');
                }
            }
            // Note: We don't mark undefined variables specially as it could create
            // false positives for variables defined in included files not yet parsed
            
            // Check if it's a built-in CMake variable
            if (this.isBuiltInVariable(match.variableName)) {
                modifiers.push('defaultLibrary');
            }
            
            const modifierBits = this.encodeModifiers(modifiers);
            
            builder.push(
                lineIndex,
                match.startIndex,
                match.fullMatch.length,
                tokenType,
                modifierBits
            );
        }
    }
    
    /**
     * Check if a variable is a built-in CMake variable
     */
    private isBuiltInVariable(name: string): boolean {
        const builtInPrefixes = [
            'CMAKE_', 'PROJECT_', 'CTEST_', 'CPACK_'
        ];
        return builtInPrefixes.some(prefix => name.startsWith(prefix));
    }
    
    /**
     * Highlight environment variables $ENV{VAR}
     */
    private highlightEnvVariables(
        builder: vscode.SemanticTokensBuilder,
        line: string,
        lineIndex: number
    ): void {
        const envRegex = /\$ENV\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
        let match: RegExpExecArray | null;
        
        while ((match = envRegex.exec(line)) !== null) {
            const tokenType = tokenTypes.indexOf('variable');
            const modifiers = ['readonly'];
            const modifierBits = this.encodeModifiers(modifiers);
            
            builder.push(
                lineIndex,
                match.index,
                match[0].length,
                tokenType,
                modifierBits
            );
        }
    }
    
    /**
     * Highlight cache variables $CACHE{VAR}
     */
    private highlightCacheVariables(
        builder: vscode.SemanticTokensBuilder,
        line: string,
        lineIndex: number
    ): void {
        const cacheRegex = /\$CACHE\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
        let match: RegExpExecArray | null;
        
        while ((match = cacheRegex.exec(line)) !== null) {
            const tokenType = tokenTypes.indexOf('property');
            const modifiers = ['readonly'];
            const modifierBits = this.encodeModifiers(modifiers);
            
            builder.push(
                lineIndex,
                match.index,
                match[0].length,
                tokenType,
                modifierBits
            );
        }
    }
    
    /**
     * Highlight CMake commands
     */
    private highlightCommands(
        builder: vscode.SemanticTokensBuilder,
        line: string,
        lineIndex: number
    ): void {
        // Match command at start of line (possibly after whitespace)
        const commandRegex = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;
        const match = commandRegex.exec(line);
        
        if (match) {
            const commandName = match[1].toLowerCase();
            const startIndex = match.index + match[0].indexOf(match[1]);
            
            let tokenType: number;
            const modifiers: string[] = [];
            
            if (CONTROL_FLOW_COMMANDS.has(commandName)) {
                tokenType = tokenTypes.indexOf('keyword');
            } else if (VARIABLE_COMMANDS.has(commandName)) {
                tokenType = tokenTypes.indexOf('function');
                modifiers.push('modification');
            } else if (TARGET_COMMANDS.has(commandName)) {
                tokenType = tokenTypes.indexOf('function');
                modifiers.push('declaration');
            } else if (INCLUDE_COMMANDS.has(commandName)) {
                tokenType = tokenTypes.indexOf('namespace');
            } else if (CMAKE_COMMANDS.has(commandName)) {
                tokenType = tokenTypes.indexOf('function');
                modifiers.push('defaultLibrary');
            } else if (UTILITY_COMMANDS.has(commandName)) {
                tokenType = tokenTypes.indexOf('function');
            } else {
                // User-defined or other commands
                tokenType = tokenTypes.indexOf('function');
            }
            
            const modifierBits = this.encodeModifiers(modifiers);
            
            builder.push(
                lineIndex,
                startIndex,
                match[1].length,
                tokenType,
                modifierBits
            );
        }
    }
    
    /**
     * Encode token modifiers as a bit field
     */
    private encodeModifiers(modifiers: string[]): number {
        let result = 0;
        for (const modifier of modifiers) {
            const index = tokenModifiers.indexOf(modifier);
            if (index >= 0) {
                result |= (1 << index);
            }
        }
        return result;
    }
}

/**
 * CMakeLists.txt Parser
 * Parses set() commands to extract variable definitions
 */

export interface CMakeVariableDefinition {
    /** Variable name */
    name: string;
    /** Variable value */
    value: string;
    /** File where the variable is defined */
    file: string;
    /** Line number in the file */
    line: number;
    /** Whether this is a cache variable */
    isCache: boolean;
}

/**
 * Regular expression to match CMake set() commands
 * Handles: set(VAR "value"), set(VAR value), set(VAR "multi word value")
 * Also handles: set(VAR value CACHE STRING "description")
 * 
 * Pattern breakdown:
 * - set\s*\(        : "set" followed by optional whitespace and opening paren
 * - \s*             : optional whitespace
 * - ([A-Za-z_]...)  : capture group 1 - variable name (starts with letter/underscore)
 * - \s+             : required whitespace separator
 * - (?:"([^"]*)"|   : capture group 2 - quoted value, OR
 *   ([^\s")]+))     : capture group 3 - unquoted value
 * - (?:\s+CACHE...)?  : optional CACHE section (non-capturing)
 * - (?:\s+FORCE)?   : optional FORCE keyword (non-capturing)
 * - \s*\)           : optional whitespace and closing paren
 */
const SET_COMMAND_REGEX = /set\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s+(?:"([^"]*)"|([^\s")]+))(?:\s+CACHE\s+[A-Z]+\s+"[^"]*")?(?:\s+FORCE)?\s*\)/gi;

/**
 * Alternative regex for multi-line or complex set commands
 * Simpler pattern that captures everything between variable name and closing paren
 */
const SET_SIMPLE_REGEX = /set\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s+([^)]+)\)/gi;

/**
 * Parse CMakeLists.txt content to extract variable definitions
 * @param content The file content
 * @param filePath The file path for reference
 * @returns Array of variable definitions
 */
export function parseSetCommands(content: string, filePath: string): CMakeVariableDefinition[] {
    const definitions: CMakeVariableDefinition[] = [];
    const lines = content.split('\n');
    
    // Process line by line for accurate line numbers
    let lineNumber = 0;
    for (const line of lines) {
        lineNumber++;
        
        // Skip comments
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('#')) {
            continue;
        }
        
        // Try to match set() commands
        SET_COMMAND_REGEX.lastIndex = 0;
        let match = SET_COMMAND_REGEX.exec(line);
        
        if (match) {
            const name = match[1];
            // Value is either in quotes (match[2]) or unquoted (match[3])
            const value = match[2] !== undefined ? match[2] : match[3];
            const isCache = line.toLowerCase().includes('cache');
            
            definitions.push({
                name,
                value: value.trim(),
                file: filePath,
                line: lineNumber,
                isCache
            });
            continue;
        }
        
        // Try simpler regex for edge cases
        SET_SIMPLE_REGEX.lastIndex = 0;
        match = SET_SIMPLE_REGEX.exec(line);
        
        if (match) {
            const name = match[1];
            let value = match[2].trim();
            
            // Check if already processed
            if (definitions.some(d => d.name === name && d.line === lineNumber)) {
                continue;
            }
            
            // Clean up the value
            // Remove quotes if present
            if (value.startsWith('"') && value.includes('"')) {
                const endQuote = value.indexOf('"', 1);
                if (endQuote > 0) {
                    value = value.substring(1, endQuote);
                }
            }
            
            // Remove CACHE and subsequent parts
            const cacheIndex = value.toUpperCase().indexOf(' CACHE');
            if (cacheIndex > 0) {
                value = value.substring(0, cacheIndex).trim();
            }
            
            const isCache = line.toLowerCase().includes('cache');
            
            definitions.push({
                name,
                value,
                file: filePath,
                line: lineNumber,
                isCache
            });
        }
    }
    
    return definitions;
}

/**
 * Parse project() command to extract project name
 * @param content The file content
 * @returns Project name or null
 */
export function parseProjectName(content: string): string | null {
    const projectRegex = /project\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/i;
    const match = projectRegex.exec(content);
    return match ? match[1] : null;
}

/**
 * Parse include() commands to find included CMake files
 * @param content The file content
 * @returns Array of included file paths
 */
export function parseIncludes(content: string): string[] {
    const includes: string[] = [];
    const includeRegex = /include\s*\(\s*(?:"([^"]*)"|([^\s)]+))\s*\)/gi;
    
    let match: RegExpExecArray | null;
    while ((match = includeRegex.exec(content)) !== null) {
        const path = match[1] || match[2];
        if (path) {
            includes.push(path);
        }
    }
    
    return includes;
}

/**
 * Parse option() commands
 * @param content The file content
 * @param filePath The file path
 * @returns Array of option definitions as variables (ON/OFF)
 */
export function parseOptions(content: string, filePath: string): CMakeVariableDefinition[] {
    const options: CMakeVariableDefinition[] = [];
    const lines = content.split('\n');
    const optionRegex = /option\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s+"[^"]*"\s*(ON|OFF)?\s*\)/i;
    
    let lineNumber = 0;
    for (const line of lines) {
        lineNumber++;
        const match = optionRegex.exec(line);
        if (match) {
            options.push({
                name: match[1],
                value: match[2] || 'OFF', // Default to OFF if not specified
                file: filePath,
                line: lineNumber,
                isCache: true
            });
        }
    }
    
    return options;
}

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
 * Regular expression to match CMake set() commands (single-line)
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
 * Parse multi-line set() commands from content
 * This handles cases like:
 * set(SOURCES
 *     file1.cpp
 *     file2.cpp
 * )
 * @param content The file content
 * @param filePath The file path for reference
 * @returns Array of variable definitions
 */
function parseMultiLineSetCommands(content: string, filePath: string): CMakeVariableDefinition[] {
    const definitions: CMakeVariableDefinition[] = [];
    
    // Match set commands that may span multiple lines
    // This regex uses the 's' flag to make . match newlines
    const multiLineSetRegex = /set\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)([\s\S]*?)\)/gi;
    
    let match: RegExpExecArray | null;
    while ((match = multiLineSetRegex.exec(content)) !== null) {
        const name = match[1];
        let valueSection = match[2].trim();
        
        // Skip if this is a CACHE-only variable with no value before CACHE
        if (valueSection.toUpperCase().startsWith('CACHE')) {
            continue;
        }
        
        // Find the line number where this set() starts
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
        
        // Check if the set() is inside a comment
        // Find the start of the line containing the match
        const lastNewline = beforeMatch.lastIndexOf('\n');
        const lineStart = lastNewline >= 0 ? lastNewline + 1 : 0;
        const lineContent = content.substring(lineStart, match.index + match[0].length);
        const beforeSet = lineContent.substring(0, match.index - lineStart);
        
        // If there's a # before the set() on the same line (not in a string), skip it
        if (beforeSet.includes('#')) {
            continue;
        }
        
        // Check if it's a cache variable
        const isCache = valueSection.toUpperCase().includes('CACHE');
        
        // Remove CACHE and subsequent parts
        const cacheIndex = valueSection.toUpperCase().indexOf('CACHE');
        if (cacheIndex > 0) {
            valueSection = valueSection.substring(0, cacheIndex).trim();
        }
        
        // Remove PARENT_SCOPE if present
        const parentScopeIndex = valueSection.toUpperCase().indexOf('PARENT_SCOPE');
        if (parentScopeIndex > 0) {
            valueSection = valueSection.substring(0, parentScopeIndex).trim();
        }
        
        // Parse the value - could be quoted string, single value, or list of values
        let value: string;
        
        if (valueSection.startsWith('"')) {
            // Quoted string value
            const endQuote = valueSection.indexOf('"', 1);
            if (endQuote > 0) {
                value = valueSection.substring(1, endQuote);
            } else {
                value = valueSection.substring(1);
            }
        } else {
            // Unquoted value(s) - could be a list separated by whitespace/newlines
            // First, split by lines and filter out comment lines
            const lines = valueSection.split('\n');
            const filteredLines: string[] = [];
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                // Skip empty lines and comment lines
                if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
                    continue;
                }
                // Remove inline comments (everything after # on the line)
                const commentIndex = trimmedLine.indexOf('#');
                if (commentIndex > 0) {
                    filteredLines.push(trimmedLine.substring(0, commentIndex).trim());
                } else {
                    filteredLines.push(trimmedLine);
                }
            }
            
            // Now parse the items from the filtered content
            const items = filteredLines
                .join(' ')
                .split(/\s+/)
                .map(s => s.trim())
                .filter(s => s.length > 0);
            
            if (items.length === 1) {
                value = items[0];
            } else {
                // Multiple items become a CMake list (semicolon-separated)
                value = items.join(';');
            }
        }
        
        if (value) {
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
 * Parse CMakeLists.txt content to extract variable definitions
 * @param content The file content
 * @param filePath The file path for reference
 * @returns Array of variable definitions
 */
export function parseSetCommands(content: string, filePath: string): CMakeVariableDefinition[] {
    // Use the multi-line parser which handles both single and multi-line set() commands
    return parseMultiLineSetCommands(content, filePath);
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
 * Supports multi-line include() commands
 * @param content The file content
 * @returns Array of included file paths
 */
export function parseIncludes(content: string): string[] {
    const includes: string[] = [];
    // Match include commands that may span multiple lines
    const includeRegex = /include\s*\(([\s\S]*?)\)/gi;
    
    let match: RegExpExecArray | null;
    while ((match = includeRegex.exec(content)) !== null) {
        // Check if this include() is inside a comment
        const beforeMatch = content.substring(0, match.index);
        const lastNewline = beforeMatch.lastIndexOf('\n');
        const lineStart = lastNewline >= 0 ? lastNewline + 1 : 0;
        const beforeInclude = content.substring(lineStart, match.index);
        
        // Skip if there's a # before the include() on the same line
        if (beforeInclude.includes('#')) {
            continue;
        }
        
        let valueSection = match[1].trim();
        
        // Remove comments from the value section
        const lines = valueSection.split('\n');
        const filteredLines: string[] = [];
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
                continue;
            }
            const commentIndex = trimmedLine.indexOf('#');
            if (commentIndex > 0) {
                filteredLines.push(trimmedLine.substring(0, commentIndex).trim());
            } else {
                filteredLines.push(trimmedLine);
            }
        }
        
        valueSection = filteredLines.join(' ').trim();
        
        // Remove quotes if present
        if (valueSection.startsWith('"') && valueSection.endsWith('"')) {
            valueSection = valueSection.substring(1, valueSection.length - 1);
        }
        
        if (valueSection) {
            includes.push(valueSection);
        }
    }
    
    return includes;
}

/**
 * Parse option() commands
 * Supports multi-line option() commands
 * @param content The file content
 * @param filePath The file path
 * @returns Array of option definitions as variables (ON/OFF)
 */
export function parseOptions(content: string, filePath: string): CMakeVariableDefinition[] {
    const options: CMakeVariableDefinition[] = [];
    // Match option commands that may span multiple lines
    const optionRegex = /option\s*\(([\s\S]*?)\)/gi;
    
    let match: RegExpExecArray | null;
    while ((match = optionRegex.exec(content)) !== null) {
        // Check if this option() is inside a comment
        const beforeMatch = content.substring(0, match.index);
        const lastNewline = beforeMatch.lastIndexOf('\n');
        const lineStart = lastNewline >= 0 ? lastNewline + 1 : 0;
        const beforeOption = content.substring(lineStart, match.index);
        
        // Skip if there's a # before the option() on the same line
        if (beforeOption.includes('#')) {
            continue;
        }
        
        // Find the line number where this option() starts
        const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
        
        let valueSection = match[1].trim();
        
        // Remove comments from the value section
        const lines = valueSection.split('\n');
        const filteredLines: string[] = [];
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
                continue;
            }
            const commentIndex = trimmedLine.indexOf('#');
            if (commentIndex > 0) {
                filteredLines.push(trimmedLine.substring(0, commentIndex).trim());
            } else {
                filteredLines.push(trimmedLine);
            }
        }
        
        valueSection = filteredLines.join(' ').trim();
        
        // Parse: NAME "description" [ON|OFF]
        // First, extract the variable name
        const nameMatch = valueSection.match(/^([A-Za-z_][A-Za-z0-9_]*)/);
        if (!nameMatch) {
            continue;
        }
        
        const name = nameMatch[1];
        const rest = valueSection.substring(name.length).trim();
        
        // Check for ON/OFF at the end
        let optionValue = 'OFF'; // Default
        if (rest.toUpperCase().endsWith('ON')) {
            optionValue = 'ON';
        } else if (rest.toUpperCase().endsWith('OFF')) {
            optionValue = 'OFF';
        }
        
        options.push({
            name,
            value: optionValue,
            file: filePath,
            line: lineNumber,
            isCache: true
        });
    }
    
    return options;
}

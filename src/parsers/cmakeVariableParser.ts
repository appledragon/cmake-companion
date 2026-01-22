/**
 * CMake Variable Parser
 * Parses ${VAR} syntax from text content
 */

export interface CMakeVariableMatch {
    /** The full match including ${} */
    fullMatch: string;
    /** The variable name without ${} */
    variableName: string;
    /** Start index in the original text */
    startIndex: number;
    /** End index in the original text */
    endIndex: number;
}

export interface CMakePathMatch {
    /** The full path expression (e.g., ${VAR}/path/file.h) */
    fullPath: string;
    /** All variables found in the path */
    variables: CMakeVariableMatch[];
    /** Start index in the original text */
    startIndex: number;
    /** End index in the original text */
    endIndex: number;
}

/**
 * Regular expression to match CMake variables: ${VARIABLE_NAME}
 * Supports nested variables like ${${OUTER}_INNER}
 */
const CMAKE_VARIABLE_REGEX = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

/**
 * Regular expression to match CMake path expressions
 * Matches paths that start with ${VAR} and may continue with path segments
 */
const CMAKE_PATH_REGEX = /\$\{[A-Za-z_][A-Za-z0-9_]*\}(?:\/[^\s"'<>|*?\n]+)?/g;

/**
 * Parse all CMake variables from text
 * @param text The text to parse
 * @returns Array of variable matches
 */
export function parseVariables(text: string): CMakeVariableMatch[] {
    const matches: CMakeVariableMatch[] = [];
    let match: RegExpExecArray | null;
    
    // Reset regex lastIndex
    CMAKE_VARIABLE_REGEX.lastIndex = 0;
    
    while ((match = CMAKE_VARIABLE_REGEX.exec(text)) !== null) {
        matches.push({
            fullMatch: match[0],
            variableName: match[1],
            startIndex: match.index,
            endIndex: match.index + match[0].length
        });
    }
    
    return matches;
}

/**
 * Parse all CMake path expressions from text
 * @param text The text to parse
 * @returns Array of path matches
 */
export function parsePaths(text: string): CMakePathMatch[] {
    const matches: CMakePathMatch[] = [];
    let match: RegExpExecArray | null;
    
    // Reset regex lastIndex
    CMAKE_PATH_REGEX.lastIndex = 0;
    
    while ((match = CMAKE_PATH_REGEX.exec(text)) !== null) {
        const fullPath = match[0];
        const variables = parseVariables(fullPath);
        
        matches.push({
            fullPath,
            variables,
            startIndex: match.index,
            endIndex: match.index + fullPath.length
        });
    }
    
    return matches;
}

/**
 * Check if a string contains CMake variables
 * @param text The text to check
 * @returns True if the text contains CMake variables
 */
export function containsVariables(text: string): boolean {
    CMAKE_VARIABLE_REGEX.lastIndex = 0;
    return CMAKE_VARIABLE_REGEX.test(text);
}

/**
 * Extract variable name from a variable reference (e.g., ${VAR} -> VAR)
 * @param variableRef The variable reference string
 * @returns The variable name or null if invalid
 */
export function extractVariableName(variableRef: string): string | null {
    const match = /^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/.exec(variableRef);
    return match ? match[1] : null;
}

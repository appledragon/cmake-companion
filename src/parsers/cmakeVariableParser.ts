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
 * Path segments are alphanumeric, underscores, hyphens, dots, and forward slashes
 */
const CMAKE_PATH_REGEX = /\$\{[A-Za-z_][A-Za-z0-9_]*\}(?:(?:\/|\\)[A-Za-z0-9_.@\-/\\]*)?/g;

/**
 * Regular expression to match plain file paths (without variables)
 * Matches:
 * - Simple filenames: file.cpp, header.h
 * - Relative paths: src/file.cpp, ./src/file.cpp, ../src/file.cpp
 * - Absolute paths: /absolute/path/file.cpp, C:/Windows/path/file.cpp
 * Requirements:
 * - Must contain a file extension (.cpp, .h, .txt, etc.)
 * - Filename must start with alphanumeric or underscore
 */
const PLAIN_FILE_PATH_REGEX = /(?:^|[\s"'(])((?:\.\.?\/|[A-Za-z]:[\\/]|\/)[A-Za-z0-9_.-/\\]*\.[A-Za-z0-9]+|[A-Za-z0-9_-][A-Za-z0-9_.-]*(?:\/[A-Za-z0-9_.-/\\]*)?\.(?:cpp|h|hpp|c|cc|cxx|hxx|txt|cmake|md|py|js|ts|json|xml|yml|yaml|sh|bat|cmd))(?=[\s"')]|$)/g;

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
    const matchedRanges: Array<{ start: number; end: number }> = [];
    let match: RegExpExecArray | null;
    
    // First, parse paths with variables (${VAR}/path/file.h)
    CMAKE_PATH_REGEX.lastIndex = 0;
    
    while ((match = CMAKE_PATH_REGEX.exec(text)) !== null) {
        const fullPath = match[0];
        const variables = parseVariables(fullPath);
        const startIndex = match.index;
        const endIndex = match.index + fullPath.length;
        
        matches.push({
            fullPath,
            variables,
            startIndex,
            endIndex
        });
        
        matchedRanges.push({ start: startIndex, end: endIndex });
    }
    
    // Second, parse plain file paths (src/file.cpp, ./relative/path.h, /absolute/path.txt)
    PLAIN_FILE_PATH_REGEX.lastIndex = 0;
    
    while ((match = PLAIN_FILE_PATH_REGEX.exec(text)) !== null) {
        // match[1] contains the captured path (without surrounding delimiters)
        const fullPath = match[1];
        if (!fullPath) {
            continue;
        }
        
        // Calculate the actual start position of the path in the text
        const matchStart = match.index + (match[0].length - fullPath.length - 1);
        const startIndex = matchStart;
        const endIndex = matchStart + fullPath.length;
        
        // Check if this range overlaps with any already matched variable paths
        const overlaps = matchedRanges.some(
            range => (startIndex >= range.start && startIndex < range.end) ||
                     (endIndex > range.start && endIndex <= range.end) ||
                     (startIndex <= range.start && endIndex >= range.end)
        );
        
        if (!overlaps) {
            matches.push({
                fullPath,
                variables: [], // Plain paths have no variables
                startIndex,
                endIndex
            });
            
            matchedRanges.push({ start: startIndex, end: endIndex });
        }
    }
    
    // Sort matches by start index
    matches.sort((a, b) => a.startIndex - b.startIndex);
    
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

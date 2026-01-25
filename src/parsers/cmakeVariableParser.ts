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
 * 
 * Pattern breakdown:
 * 1. Prefix: (?:^|[\s"'(]) - Match start of string or delimiter (space, quote, paren)
 * 2. Path capture group with two alternatives:
 *    a) Paths with directory prefix:
 *       - \.\.?\/ matches ./ or ../
 *       - [A-Za-z]:[\\/] matches Windows drive (C:\ or C:/)
 *       - \/ matches absolute Unix paths
 *       - [A-Za-z0-9_.-/\\]* matches path segments
 *       - \.[A-Za-z0-9]+ matches file extension
 *    b) Simple filenames or relative paths:
 *       - [A-Za-z0-9_-] matches first character
 *       - [A-Za-z0-9_.-]* matches rest of filename/path
 *       - (?:\/[A-Za-z0-9_.-/\\]*)? optional directory components
 *       - \.(?:cpp|h|hpp|...) matches known file extensions
 * 3. Suffix: (?=[\s"')]|$) - Lookahead for delimiter or end of string
 * 
 * Supported formats:
 * - Simple filenames: file.cpp, header.h
 * - Relative paths: src/file.cpp, include/utils.h
 * - Paths with dots: ./src/file.cpp, ../include/header.h
 * - Absolute paths: /absolute/path/file.cpp, C:/Windows/path/file.cpp
 * - Only matches files with known extensions to avoid false positives
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
 * Check if two ranges overlap
 * @param range1 First range with start and end
 * @param range2 Second range with start and end
 * @returns True if ranges overlap
 */
function checkRangeOverlap(
    range1: { start: number; end: number },
    range2: { start: number; end: number }
): boolean {
    return (range1.start >= range2.start && range1.start < range2.end) ||
           (range1.end > range2.start && range1.end <= range2.end) ||
           (range1.start <= range2.start && range1.end >= range2.end);
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
        // match[0] includes the prefix (space, quote, etc.)
        // We need to find where fullPath actually starts in the original text
        // Since fullPath is captured, we know match[0] ends with the captured text
        // or has it followed by lookahead (which doesn't consume characters)
        const fullMatch = match[0];
        const matchEnd = match.index + fullMatch.length;
        const startIndex = matchEnd - fullPath.length;
        const endIndex = matchEnd;
        
        // Check if this range overlaps with any already matched variable paths
        const currentRange = { start: startIndex, end: endIndex };
        const overlaps = matchedRanges.some(range => checkRangeOverlap(currentRange, range));
        
        if (!overlaps) {
            matches.push({
                fullPath,
                variables: [], // Plain paths have no variables
                startIndex,
                endIndex
            });
            
            matchedRanges.push(currentRange);
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

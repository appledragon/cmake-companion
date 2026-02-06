/**
 * Pure definition utility functions for CMake files
 * These functions contain no vscode dependencies and can be tested directly.
 */

/**
 * Variable reference with position information
 */
export interface VariableReference {
    name: string;
    start: number;
    end: number;
}

/**
 * Find variable definition in text (set or option command)
 * Returns line number (0-based) or -1 if not found
 */
export function findVariableDefinitionLine(text: string, variableName: string): number {
    const lines = text.split('\n');
    
    // Patterns for set() and option() commands
    const patterns = [
        new RegExp(`^\\s*set\\s*\\(\\s*(${variableName})\\b`, 'i'),
        new RegExp(`^\\s*option\\s*\\(\\s*(${variableName})\\b`, 'i'),
    ];
    
    for (let i = 0; i < lines.length; i++) {
        for (const pattern of patterns) {
            if (pattern.test(lines[i])) {
                return i;
            }
        }
    }
    
    return -1;
}

/**
 * Check if position (offset) is within a variable reference ${VAR}
 * Returns the variable name if inside, null otherwise
 */
export function getVariableAtOffset(text: string, offset: number): string | null {
    const variableRegex = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
    let match;
    
    while ((match = variableRegex.exec(text)) !== null) {
        const start = match.index;
        const end = match.index + match[0].length;
        
        if (offset >= start && offset <= end) {
            return match[1];
        }
    }
    
    return null;
}

/**
 * Extract all variable references from text with their positions
 */
export function extractVariableReferences(text: string): VariableReference[] {
    const results: VariableReference[] = [];
    const variableRegex = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
    let match;
    
    while ((match = variableRegex.exec(text)) !== null) {
        results.push({
            name: match[1],
            start: match.index,
            end: match.index + match[0].length
        });
    }
    
    return results;
}

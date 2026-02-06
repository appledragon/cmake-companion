/**
 * Pure folding utility functions for CMake files
 * These functions contain no vscode dependencies and can be tested directly.
 */

/**
 * Represents a folding range with start/end lines and kind
 */
export interface FoldingRangeInfo {
    start: number;
    end: number;
    kind: 'region' | 'comment';
}

/**
 * Find multi-line command calls
 * A command starting with name( and ending with ) on different lines
 */
export function findMultiLineCommands(lines: string[]): FoldingRangeInfo[] {
    const ranges: FoldingRangeInfo[] = [];
    let commandStartLine = -1;
    let parenDepth = 0;
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            const prevChar = j > 0 ? line[j - 1] : '';
            
            if ((char === '"' || char === "'") && prevChar !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                }
                continue;
            }
            
            if (inString) {
                continue;
            }
            
            if (char === '#') {
                break;
            }
            
            if (char === '(') {
                if (parenDepth === 0) {
                    const beforeParen = line.substring(0, j).trim();
                    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(beforeParen) || 
                        /^\s*[a-zA-Z_][a-zA-Z0-9_]*$/.test(line.substring(0, j))) {
                        commandStartLine = i;
                    }
                }
                parenDepth++;
            } else if (char === ')') {
                parenDepth--;
                if (parenDepth === 0 && commandStartLine !== -1) {
                    if (i > commandStartLine) {
                        ranges.push({
                            start: commandStartLine,
                            end: i,
                            kind: 'region'
                        });
                    }
                    commandStartLine = -1;
                }
            }
        }
    }
    
    return ranges;
}

/**
 * Find consecutive comment blocks (3+ lines of comments)
 */
export function findCommentBlocks(lines: string[]): FoldingRangeInfo[] {
    const ranges: FoldingRangeInfo[] = [];
    let blockStart = -1;
    
    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        const isComment = trimmed.startsWith('#');
        
        if (isComment) {
            if (blockStart === -1) {
                blockStart = i;
            }
        } else {
            if (blockStart !== -1 && i - blockStart >= 3) {
                ranges.push({
                    start: blockStart,
                    end: i - 1,
                    kind: 'comment'
                });
            }
            blockStart = -1;
        }
    }
    
    if (blockStart !== -1 && lines.length - blockStart >= 3) {
        ranges.push({
            start: blockStart,
            end: lines.length - 1,
            kind: 'comment'
        });
    }
    
    return ranges;
}

/**
 * Find CMake block pairs (if/endif, function/endfunction, etc.)
 */
export function findBlockPairs(lines: string[], existingRanges?: FoldingRangeInfo[]): FoldingRangeInfo[] {
    const ranges: FoldingRangeInfo[] = [];
    const allRanges = existingRanges || [];
    
    const blockPairs = [
        { start: /^\s*if\s*\(/i, end: /^\s*endif\s*\(/i },
        { start: /^\s*foreach\s*\(/i, end: /^\s*endforeach\s*\(/i },
        { start: /^\s*while\s*\(/i, end: /^\s*endwhile\s*\(/i },
        { start: /^\s*function\s*\(/i, end: /^\s*endfunction\s*\(/i },
        { start: /^\s*macro\s*\(/i, end: /^\s*endmacro\s*\(/i },
        { start: /^\s*block\s*\(/i, end: /^\s*endblock\s*\(/i },
    ];
    
    for (const pair of blockPairs) {
        const stack: number[] = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (pair.start.test(line)) {
                stack.push(i);
            } else if (pair.end.test(line)) {
                const startLine = stack.pop();
                if (startLine !== undefined && i > startLine) {
                    const exists = allRanges.some(r => 
                        r.start === startLine && r.end === i
                    );
                    if (!exists) {
                        ranges.push({
                            start: startLine,
                            end: i,
                            kind: 'region'
                        });
                    }
                }
            }
        }
    }
    
    return ranges;
}

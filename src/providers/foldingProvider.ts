/**
 * Folding Range Provider
 * Provides enhanced code folding for CMake files
 * - Block pairs (if/endif, function/endfunction, etc.) - handled by language-configuration.json
 * - Multi-line command calls (e.g., target_sources spanning multiple lines)
 * - Consecutive comment blocks
 * - Multi-line strings
 */

import * as vscode from 'vscode';

export class CMakeFoldingRangeProvider implements vscode.FoldingRangeProvider {
    
    provideFoldingRanges(
        document: vscode.TextDocument,
        context: vscode.FoldingContext,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.FoldingRange[]> {
        const ranges: vscode.FoldingRange[] = [];
        const text = document.getText();
        const lines = text.split('\n');
        
        // Track multi-line commands
        this.findMultiLineCommands(lines, ranges);
        
        // Track comment blocks
        this.findCommentBlocks(lines, ranges);
        
        // Track bracket blocks (if/endif etc.) - enhanced beyond language-configuration
        this.findBlockPairs(lines, ranges);
        
        return ranges;
    }
    
    /**
     * Find multi-line command calls
     * A command starting with name( and ending with ) on different lines
     */
    private findMultiLineCommands(lines: string[], ranges: vscode.FoldingRange[]): void {
        let commandStartLine = -1;
        let parenDepth = 0;
        let inString = false;
        let stringChar = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                const prevChar = j > 0 ? line[j - 1] : '';
                
                // Handle string tracking
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
                
                // Handle comments
                if (char === '#') {
                    break; // Rest of line is comment
                }
                
                // Track parentheses
                if (char === '(') {
                    if (parenDepth === 0) {
                        // Check if this is a command start
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
                        // Multi-line command ends here
                        if (i > commandStartLine) {
                            ranges.push(new vscode.FoldingRange(
                                commandStartLine,
                                i,
                                vscode.FoldingRangeKind.Region
                            ));
                        }
                        commandStartLine = -1;
                    }
                }
            }
        }
    }
    
    /**
     * Find consecutive comment blocks (3+ lines of comments)
     */
    private findCommentBlocks(lines: string[], ranges: vscode.FoldingRange[]): void {
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
                    // At least 3 consecutive comment lines
                    ranges.push(new vscode.FoldingRange(
                        blockStart,
                        i - 1,
                        vscode.FoldingRangeKind.Comment
                    ));
                }
                blockStart = -1;
            }
        }
        
        // Handle comment block at end of file
        if (blockStart !== -1 && lines.length - blockStart >= 3) {
            ranges.push(new vscode.FoldingRange(
                blockStart,
                lines.length - 1,
                vscode.FoldingRangeKind.Comment
            ));
        }
    }
    
    /**
     * Find CMake block pairs (if/endif, function/endfunction, etc.)
     * This supplements the language-configuration.json markers
     */
    private findBlockPairs(lines: string[], ranges: vscode.FoldingRange[]): void {
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
                        // Check if we already have this range (from multi-line commands)
                        const exists = ranges.some(r => 
                            r.start === startLine && r.end === i
                        );
                        if (!exists) {
                            ranges.push(new vscode.FoldingRange(
                                startLine,
                                i,
                                vscode.FoldingRangeKind.Region
                            ));
                        }
                    }
                }
            }
        }
    }
}

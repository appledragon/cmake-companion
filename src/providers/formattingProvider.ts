/**
 * Document Formatting Provider
 * Provides formatting for CMake files
 */

import * as vscode from 'vscode';

/**
 * Formatting options for CMake files
 */
export interface CMakeFormattingOptions {
    /** Number of spaces for indentation (default: 2) */
    tabSize: number;
    /** Use spaces instead of tabs (default: true) */
    insertSpaces: boolean;
    /** Maximum line length (0 = no limit) */
    maxLineLength: number;
    /** Add space after opening parenthesis */
    spaceAfterOpenParen: boolean;
    /** Add space before closing parenthesis */
    spaceBeforeCloseParen: boolean;
    /** Uppercase command names */
    uppercaseCommands: boolean;
}

/**
 * Default formatting options
 */
const DEFAULT_OPTIONS: CMakeFormattingOptions = {
    tabSize: 2,
    insertSpaces: true,
    maxLineLength: 0,
    spaceAfterOpenParen: false,
    spaceBeforeCloseParen: false,
    uppercaseCommands: false
};

/**
 * Commands that increase indentation after them
 */
const INDENT_INCREASE_COMMANDS = new Set([
    'if', 'elseif', 'else',
    'foreach',
    'while',
    'function',
    'macro',
    'block'
]);

/**
 * Commands that decrease indentation before them
 */
const INDENT_DECREASE_COMMANDS = new Set([
    'endif', 'elseif', 'else',
    'endforeach',
    'endwhile',
    'endfunction',
    'endmacro',
    'endblock'
]);

/**
 * Document Formatting Provider for CMake files
 */
export class CMakeDocumentFormattingProvider implements vscode.DocumentFormattingEditProvider {
    
    /**
     * Provide formatting edits for the entire document
     */
    provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        const edits: vscode.TextEdit[] = [];
        const text = document.getText();
        const lines = text.split('\n');
        
        // Get formatting options from VS Code settings
        const formattingOptions = this.getFormattingOptions(options);
        
        // Track indentation level
        let indentLevel = 0;
        const formattedLines: string[] = [];
        
        for (let i = 0; i < lines.length; i++) {
            if (token.isCancellationRequested) {
                return edits;
            }
            
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // Handle empty lines
            if (!trimmedLine) {
                formattedLines.push('');
                continue;
            }
            
            // Check for indent decrease commands first
            const commandMatch = trimmedLine.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/i);
            const commandName = commandMatch ? commandMatch[1].toLowerCase() : null;
            
            // Decrease indent before certain commands
            if (commandName && INDENT_DECREASE_COMMANDS.has(commandName)) {
                indentLevel = Math.max(0, indentLevel - 1);
            }
            
            // Format the line
            const formattedLine = this.formatLine(trimmedLine, indentLevel, formattingOptions);
            formattedLines.push(formattedLine);
            
            // Increase indent after certain commands
            if (commandName && INDENT_INCREASE_COMMANDS.has(commandName)) {
                indentLevel++;
            }
        }
        
        // Create a single edit that replaces the entire document
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
        );
        
        const formattedText = formattedLines.join('\n');
        
        // Only create edit if there are actual changes
        if (formattedText !== text) {
            edits.push(vscode.TextEdit.replace(fullRange, formattedText));
        }
        
        return edits;
    }
    
    /**
     * Get formatting options from VS Code settings
     */
    private getFormattingOptions(options: vscode.FormattingOptions): CMakeFormattingOptions {
        const config = vscode.workspace.getConfiguration('cmake-path-resolver');
        
        return {
            tabSize: options.tabSize || DEFAULT_OPTIONS.tabSize,
            insertSpaces: options.insertSpaces !== undefined ? options.insertSpaces : DEFAULT_OPTIONS.insertSpaces,
            maxLineLength: config.get<number>('formatting.maxLineLength', DEFAULT_OPTIONS.maxLineLength),
            spaceAfterOpenParen: config.get<boolean>('formatting.spaceAfterOpenParen', DEFAULT_OPTIONS.spaceAfterOpenParen),
            spaceBeforeCloseParen: config.get<boolean>('formatting.spaceBeforeCloseParen', DEFAULT_OPTIONS.spaceBeforeCloseParen),
            uppercaseCommands: config.get<boolean>('formatting.uppercaseCommands', DEFAULT_OPTIONS.uppercaseCommands)
        };
    }
    
    /**
     * Format a single line
     */
    private formatLine(
        line: string,
        indentLevel: number,
        options: CMakeFormattingOptions
    ): string {
        // Check if line is a comment
        if (line.startsWith('#')) {
            return this.createIndent(indentLevel, options) + line;
        }
        
        // Format command name if present
        let formattedLine = this.formatCommand(line, options);
        
        // Format parentheses spacing
        formattedLine = this.formatParentheses(formattedLine, options);
        
        // Normalize whitespace
        formattedLine = this.normalizeWhitespace(formattedLine);
        
        // Add indentation
        return this.createIndent(indentLevel, options) + formattedLine;
    }
    
    /**
     * Create indentation string
     */
    private createIndent(level: number, options: CMakeFormattingOptions): string {
        const indentChar = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
        return indentChar.repeat(level);
    }
    
    /**
     * Format command name (uppercase or lowercase)
     */
    private formatCommand(line: string, options: CMakeFormattingOptions): string {
        const commandMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
        if (commandMatch) {
            const commandName = commandMatch[1];
            const formattedCommand = options.uppercaseCommands 
                ? commandName.toUpperCase() 
                : commandName.toLowerCase();
            return line.replace(commandMatch[1], formattedCommand);
        }
        return line;
    }
    
    /**
     * Format parentheses spacing
     */
    private formatParentheses(line: string, options: CMakeFormattingOptions): string {
        let result = line;
        
        // Handle opening parenthesis
        if (options.spaceAfterOpenParen) {
            // Add space after ( if not present
            result = result.replace(/\(\s*/g, '( ');
        } else {
            // Remove space after ( if present
            result = result.replace(/\(\s+/g, '(');
        }
        
        // Handle closing parenthesis
        if (options.spaceBeforeCloseParen) {
            // Add space before ) if not present
            result = result.replace(/\s*\)/g, ' )');
        } else {
            // Remove space before ) if present
            result = result.replace(/\s+\)/g, ')');
        }
        
        return result;
    }
    
    /**
     * Normalize whitespace in the line
     */
    private normalizeWhitespace(line: string): string {
        // Collapse multiple spaces to single space (except in strings)
        // This is a simple implementation that doesn't handle all edge cases
        let result = '';
        let inString = false;
        let lastChar = '';
        
        for (const char of line) {
            if (char === '"' && lastChar !== '\\') {
                inString = !inString;
            }
            
            if (!inString && char === ' ' && lastChar === ' ') {
                continue; // Skip multiple spaces
            }
            
            result += char;
            lastChar = char;
        }
        
        return result;
    }
}

/**
 * Document Range Formatting Provider for CMake files
 */
export class CMakeDocumentRangeFormattingProvider implements vscode.DocumentRangeFormattingEditProvider {
    private documentFormatter = new CMakeDocumentFormattingProvider();
    
    /**
     * Provide formatting edits for a range in the document
     */
    provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        // For simplicity, format the entire document
        // A more sophisticated implementation would only format the selected range
        // while maintaining correct indentation relative to the context
        const fullEdits = this.documentFormatter.provideDocumentFormattingEdits(document, options, token);
        
        // Return the result directly - it handles null/empty cases
        return fullEdits;
    }
}

/**
 * On-Type Formatting Provider for CMake files
 * Provides formatting as you type (e.g., auto-indent on newline)
 */
export class CMakeOnTypeFormattingProvider implements vscode.OnTypeFormattingEditProvider {
    
    /**
     * Characters that trigger on-type formatting
     */
    static readonly triggerCharacters = ['\n', ')'];
    
    /**
     * Provide formatting edits when the user types a trigger character
     */
    provideOnTypeFormattingEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        ch: string,
        options: vscode.FormattingOptions,
        _token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        const edits: vscode.TextEdit[] = [];
        
        if (ch === '\n') {
            // Auto-indent on newline
            const edit = this.handleNewline(document, position, options);
            if (edit) {
                edits.push(edit);
            }
        }
        
        return edits;
    }
    
    /**
     * Handle newline - adjust indentation based on previous line
     */
    private handleNewline(
        document: vscode.TextDocument,
        position: vscode.Position,
        options: vscode.FormattingOptions
    ): vscode.TextEdit | null {
        // Get the previous line
        if (position.line === 0) {
            return null;
        }
        
        const prevLine = document.lineAt(position.line - 1);
        const prevLineText = prevLine.text.trim();
        
        // Determine base indentation from previous line
        const prevIndent = this.getIndentation(prevLine.text);
        let newIndent = prevIndent;
        
        // Check if previous line ends with command that increases indent
        const commandMatch = prevLineText.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/i);
        if (commandMatch) {
            const commandName = commandMatch[1].toLowerCase();
            if (INDENT_INCREASE_COMMANDS.has(commandName)) {
                const indentChar = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
                newIndent = prevIndent + indentChar;
            }
        }
        
        // Check current line for indent decrease commands
        const currentLine = document.lineAt(position.line);
        const currentLineText = currentLine.text.trim();
        const currentCommandMatch = currentLineText.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/i);
        if (currentCommandMatch) {
            const commandName = currentCommandMatch[1].toLowerCase();
            if (INDENT_DECREASE_COMMANDS.has(commandName)) {
                // Decrease indent
                const indentChar = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
                if (newIndent.length >= indentChar.length) {
                    newIndent = newIndent.substring(indentChar.length);
                }
            }
        }
        
        // Only create edit if indentation needs to change
        const currentIndent = this.getIndentation(currentLine.text);
        if (currentIndent !== newIndent) {
            const range = new vscode.Range(
                position.line, 0,
                position.line, currentIndent.length
            );
            return vscode.TextEdit.replace(range, newIndent);
        }
        
        return null;
    }
    
    /**
     * Get indentation from the start of a line
     */
    private getIndentation(line: string): string {
        const match = line.match(/^(\s*)/);
        return match ? match[1] : '';
    }
}

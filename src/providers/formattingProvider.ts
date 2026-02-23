/**
 * Document Formatting Provider
 * Provides formatting for CMake files
 */

import * as vscode from 'vscode';
import {
    CMakeFormattingStyle,
    CMakeFormattingOptions,
    DEFAULT_OPTIONS,
    STYLE_PRESETS,
    INDENT_INCREASE_COMMANDS,
    INDENT_DECREASE_COMMANDS,
    formatLine,
    wrapLineIfNeeded,
    createIndent,
    formatCommand,
    formatParentheses,
    normalizeWhitespace,
    splitArguments,
    containsCommentOutsideString,
    getIndentation
} from '../utils/formattingUtils';

// Re-export types for consumers
export type { CMakeFormattingOptions } from '../utils/formattingUtils';
export type { CMakeFormattingStyle } from '../utils/formattingUtils';

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
            const formattedLine = formatLine(trimmedLine, indentLevel, formattingOptions);
            const wrappedLines = wrapLineIfNeeded(formattedLine, indentLevel, formattingOptions);
            formattedLines.push(...wrappedLines);
            
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
     * Supports style presets (default, google) with individual option overrides
     */
    private getFormattingOptions(options: vscode.FormattingOptions): CMakeFormattingOptions {
        const config = vscode.workspace.getConfiguration('cmake-path-resolver');
        
        // Get the style preset (default or google)
        const style = config.get<CMakeFormattingStyle>('formatting.style', 'google');
        const baseOptions = STYLE_PRESETS[style] || DEFAULT_OPTIONS;
        
        // Allow individual overrides on top of the style preset
        return {
            tabSize: options.tabSize || baseOptions.tabSize,
            insertSpaces: options.insertSpaces !== undefined ? options.insertSpaces : baseOptions.insertSpaces,
            maxLineLength: config.get<number>('formatting.maxLineLength') ?? baseOptions.maxLineLength,
            spaceAfterOpenParen: config.get<boolean>('formatting.spaceAfterOpenParen') ?? baseOptions.spaceAfterOpenParen,
            spaceBeforeCloseParen: config.get<boolean>('formatting.spaceBeforeCloseParen') ?? baseOptions.spaceBeforeCloseParen,
            uppercaseCommands: config.get<boolean>('formatting.uppercaseCommands') ?? baseOptions.uppercaseCommands
        };
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
        _range: vscode.Range,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        // Note: Currently formats the entire document for consistency.
        // Range-only formatting is complex in CMake because indentation depends on
        // the global context (e.g., being inside an if/foreach block).
        // A more sophisticated implementation could parse the context and format
        // only the selected range while maintaining correct relative indentation.
        const fullEdits = this.documentFormatter.provideDocumentFormattingEdits(document, options, token);
        
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
        const prevIndent = getIndentation(prevLine.text);
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
        const currentIndent = getIndentation(currentLine.text);
        if (currentIndent !== newIndent) {
            const range = new vscode.Range(
                position.line, 0,
                position.line, currentIndent.length
            );
            return vscode.TextEdit.replace(range, newIndent);
        }
        
        return null;
    }
}

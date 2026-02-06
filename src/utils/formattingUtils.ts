/**
 * Pure formatting utility functions for CMake files
 * These functions contain no vscode dependencies and can be tested directly.
 */

/**
 * Supported formatting style presets
 */
export type CMakeFormattingStyle = 'default' | 'google';

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
export const DEFAULT_OPTIONS: CMakeFormattingOptions = {
    tabSize: 2,
    insertSpaces: true,
    maxLineLength: 0,
    spaceAfterOpenParen: false,
    spaceBeforeCloseParen: false,
    uppercaseCommands: false
};

/**
 * Google-style formatting options
 */
export const GOOGLE_STYLE_OPTIONS: CMakeFormattingOptions = {
    tabSize: 2,
    insertSpaces: true,
    maxLineLength: 80,
    spaceAfterOpenParen: false,
    spaceBeforeCloseParen: false,
    uppercaseCommands: false
};

/**
 * Style presets mapping
 */
export const STYLE_PRESETS: Record<CMakeFormattingStyle, CMakeFormattingOptions> = {
    'default': DEFAULT_OPTIONS,
    'google': GOOGLE_STYLE_OPTIONS
};

/**
 * Commands that increase indentation after them
 */
export const INDENT_INCREASE_COMMANDS = new Set([
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
export const INDENT_DECREASE_COMMANDS = new Set([
    'endif', 'elseif', 'else',
    'endforeach',
    'endwhile',
    'endfunction',
    'endmacro',
    'endblock'
]);

/**
 * Create indentation string
 */
export function createIndent(level: number, options: CMakeFormattingOptions): string {
    const indentChar = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
    return indentChar.repeat(level);
}

/**
 * Format command name (uppercase or lowercase)
 */
export function formatCommand(line: string, options: CMakeFormattingOptions): string {
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
export function formatParentheses(line: string, options: CMakeFormattingOptions): string {
    let result = line;
    
    if (options.spaceAfterOpenParen) {
        result = result.replace(/\(\s*/g, '( ');
    } else {
        result = result.replace(/\(\s+/g, '(');
    }
    
    if (options.spaceBeforeCloseParen) {
        result = result.replace(/\s*\)/g, ' )');
    } else {
        result = result.replace(/\s+\)/g, ')');
    }
    
    return result;
}

/**
 * Normalize whitespace in the line
 * Collapses multiple consecutive spaces to a single space outside of quoted strings.
 */
export function normalizeWhitespace(line: string): string {
    let result = '';
    let inString = false;
    let lastChar = '';
    
    for (const char of line) {
        if (char === '"' && lastChar !== '\\') {
            inString = !inString;
        }
        
        if (!inString && char === ' ' && lastChar === ' ') {
            continue;
        }
        
        result += char;
        lastChar = char;
    }
    
    return result;
}

/**
 * Split arguments by whitespace while respecting quoted strings
 */
export function splitArguments(args: string): string[] {
    return args.match(/"[^"\\]*(?:\\.[^"\\]*)*"|\S+/g) ?? [];
}

/**
 * Detect comments outside of quoted strings
 */
export function containsCommentOutsideString(line: string): boolean {
    let inString = false;
    let lastChar = '';

    for (const char of line) {
        if (char === '"' && lastChar !== '\\') {
            inString = !inString;
        }

        if (!inString && char === '#') {
            return true;
        }

        lastChar = char;
    }

    return false;
}

/**
 * Format a single line
 */
export function formatLine(
    line: string,
    indentLevel: number,
    options: CMakeFormattingOptions
): string {
    if (line.startsWith('#')) {
        return createIndent(indentLevel, options) + line;
    }
    
    let formattedLine = formatCommand(line, options);
    formattedLine = formatParentheses(formattedLine, options);
    formattedLine = normalizeWhitespace(formattedLine);
    
    return createIndent(indentLevel, options) + formattedLine;
}

/**
 * Wrap long lines based on maxLineLength
 */
export function wrapLineIfNeeded(
    formattedLine: string,
    indentLevel: number,
    options: CMakeFormattingOptions
): string[] {
    if (options.maxLineLength <= 0 || formattedLine.length <= options.maxLineLength) {
        return [formattedLine];
    }

    const trimmed = formattedLine.trim();
    if (!trimmed || trimmed.startsWith('#')) {
        return [formattedLine];
    }

    if (containsCommentOutsideString(trimmed)) {
        return [formattedLine];
    }

    const commandMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\((.*)\)$/);
    if (!commandMatch) {
        return [formattedLine];
    }

    const command = commandMatch[1];
    const argsString = commandMatch[2].trim();
    if (!argsString) {
        return [formattedLine];
    }

    const args = splitArguments(argsString);
    if (args.length <= 1) {
        return [formattedLine];
    }

    const baseIndent = createIndent(indentLevel, options);
    const continuationIndent = createIndent(indentLevel + 1, options);
    const wrapped: string[] = [];

    wrapped.push(`${baseIndent}${command}(`);
    for (const arg of args) {
        wrapped.push(`${continuationIndent}${arg}`);
    }
    wrapped.push(`${baseIndent})`);

    return wrapped;
}

/**
 * Get indentation from the start of a line
 */
export function getIndentation(line: string): string {
    const match = line.match(/^(\s*)/);
    return match ? match[1] : '';
}

/**
 * Format an entire CMake document
 */
export function formatCMakeDocument(text: string, options: CMakeFormattingOptions): string {
    const lines = text.split('\n');
    let indentLevel = 0;
    const formattedLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        if (!trimmedLine) {
            formattedLines.push('');
            continue;
        }
        
        const commandMatch = trimmedLine.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/i);
        const commandName = commandMatch ? commandMatch[1].toLowerCase() : null;
        
        if (commandName && INDENT_DECREASE_COMMANDS.has(commandName)) {
            indentLevel = Math.max(0, indentLevel - 1);
        }
        
        const formattedLine = formatLine(trimmedLine, indentLevel, options);
        const wrappedLines = wrapLineIfNeeded(formattedLine, indentLevel, options);
        formattedLines.push(...wrappedLines);
        
        if (commandName && INDENT_INCREASE_COMMANDS.has(commandName)) {
            indentLevel++;
        }
    }
    
    return formattedLines.join('\n');
}

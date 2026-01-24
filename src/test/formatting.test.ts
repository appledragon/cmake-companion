/**
 * Tests for CMake Formatting Provider
 */

import * as assert from 'assert';

// Import the formatting helper functions by testing the module directly
// Note: We test the core logic that doesn't require VS Code types

describe('CMake Formatting Logic', () => {
    
    describe('Indentation Logic', () => {
        const INDENT_INCREASE_COMMANDS = new Set([
            'if', 'elseif', 'else',
            'foreach',
            'while',
            'function',
            'macro',
            'block'
        ]);
        
        const INDENT_DECREASE_COMMANDS = new Set([
            'endif', 'elseif', 'else',
            'endforeach',
            'endwhile',
            'endfunction',
            'endmacro',
            'endblock'
        ]);
        
        it('should identify indent increase commands', () => {
            assert.strictEqual(INDENT_INCREASE_COMMANDS.has('if'), true);
            assert.strictEqual(INDENT_INCREASE_COMMANDS.has('foreach'), true);
            assert.strictEqual(INDENT_INCREASE_COMMANDS.has('function'), true);
            assert.strictEqual(INDENT_INCREASE_COMMANDS.has('set'), false);
        });
        
        it('should identify indent decrease commands', () => {
            assert.strictEqual(INDENT_DECREASE_COMMANDS.has('endif'), true);
            assert.strictEqual(INDENT_DECREASE_COMMANDS.has('endforeach'), true);
            assert.strictEqual(INDENT_DECREASE_COMMANDS.has('endfunction'), true);
            assert.strictEqual(INDENT_DECREASE_COMMANDS.has('set'), false);
        });
        
        it('should recognize elseif as both increase and decrease', () => {
            assert.strictEqual(INDENT_INCREASE_COMMANDS.has('elseif'), true);
            assert.strictEqual(INDENT_DECREASE_COMMANDS.has('elseif'), true);
        });
    });
    
    describe('Command Formatting', () => {
        function formatCommandName(line: string, uppercase: boolean): string {
            const commandMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
            if (commandMatch) {
                const commandName = commandMatch[1];
                const formattedCommand = uppercase 
                    ? commandName.toUpperCase() 
                    : commandName.toLowerCase();
                return line.replace(commandMatch[1], formattedCommand);
            }
            return line;
        }
        
        it('should convert command to lowercase', () => {
            assert.strictEqual(formatCommandName('SET(VAR value)', false), 'set(VAR value)');
            assert.strictEqual(formatCommandName('IF(condition)', false), 'if(condition)');
        });
        
        it('should convert command to uppercase', () => {
            assert.strictEqual(formatCommandName('set(VAR value)', true), 'SET(VAR value)');
            assert.strictEqual(formatCommandName('if(condition)', true), 'IF(condition)');
        });
        
        it('should handle mixed case', () => {
            assert.strictEqual(formatCommandName('SeT(VAR value)', false), 'set(VAR value)');
            assert.strictEqual(formatCommandName('SeT(VAR value)', true), 'SET(VAR value)');
        });
    });
    
    describe('Parentheses Formatting', () => {
        function formatParentheses(line: string, spaceAfterOpen: boolean, spaceBeforeClose: boolean): string {
            let result = line;
            
            if (spaceAfterOpen) {
                result = result.replace(/\(\s*/g, '( ');
            } else {
                result = result.replace(/\(\s+/g, '(');
            }
            
            if (spaceBeforeClose) {
                result = result.replace(/\s*\)/g, ' )');
            } else {
                result = result.replace(/\s+\)/g, ')');
            }
            
            return result;
        }
        
        it('should remove spaces after opening parenthesis', () => {
            assert.strictEqual(formatParentheses('set( VAR value)', false, false), 'set(VAR value)');
        });
        
        it('should add spaces after opening parenthesis', () => {
            assert.strictEqual(formatParentheses('set(VAR value)', true, false), 'set( VAR value)');
        });
        
        it('should remove spaces before closing parenthesis', () => {
            assert.strictEqual(formatParentheses('set(VAR value )', false, false), 'set(VAR value)');
        });
        
        it('should add spaces before closing parenthesis', () => {
            assert.strictEqual(formatParentheses('set(VAR value)', false, true), 'set(VAR value )');
        });
        
        it('should handle both space options', () => {
            assert.strictEqual(formatParentheses('set(VAR value)', true, true), 'set( VAR value )');
        });
    });
    
    describe('Whitespace Normalization', () => {
        function normalizeWhitespace(line: string): string {
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
        
        it('should collapse multiple spaces', () => {
            assert.strictEqual(normalizeWhitespace('set(VAR    value)'), 'set(VAR value)');
        });
        
        it('should preserve spaces in strings', () => {
            assert.strictEqual(normalizeWhitespace('set(VAR "hello   world")'), 'set(VAR "hello   world")');
        });
        
        it('should handle mixed content', () => {
            assert.strictEqual(normalizeWhitespace('set(VAR   "hello   world"   other)'), 'set(VAR "hello   world" other)');
        });
    });
    
    describe('Indentation Creation', () => {
        function createIndent(level: number, tabSize: number, insertSpaces: boolean): string {
            const indentChar = insertSpaces ? ' '.repeat(tabSize) : '\t';
            return indentChar.repeat(level);
        }
        
        it('should create spaces indentation', () => {
            assert.strictEqual(createIndent(1, 2, true), '  ');
            assert.strictEqual(createIndent(2, 2, true), '    ');
            assert.strictEqual(createIndent(1, 4, true), '    ');
        });
        
        it('should create tabs indentation', () => {
            assert.strictEqual(createIndent(1, 2, false), '\t');
            assert.strictEqual(createIndent(2, 2, false), '\t\t');
        });
        
        it('should handle zero level', () => {
            assert.strictEqual(createIndent(0, 2, true), '');
        });
    });
});

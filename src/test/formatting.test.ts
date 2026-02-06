/**
 * Tests for CMake Formatting Provider
 */

import * as assert from 'assert';
import {
    CMakeFormattingOptions,
    DEFAULT_OPTIONS,
    GOOGLE_STYLE_OPTIONS,
    INDENT_INCREASE_COMMANDS,
    INDENT_DECREASE_COMMANDS,
    createIndent,
    formatCommand,
    formatParentheses,
    normalizeWhitespace,
    splitArguments,
    containsCommentOutsideString,
    formatLine,
    wrapLineIfNeeded,
    getIndentation,
    formatCMakeDocument
} from '../utils/formattingUtils';

describe('CMake Formatting Logic', () => {
    
    describe('Style Presets', () => {
        it('should have correct default style options', () => {
            assert.strictEqual(DEFAULT_OPTIONS.tabSize, 2);
            assert.strictEqual(DEFAULT_OPTIONS.insertSpaces, true);
            assert.strictEqual(DEFAULT_OPTIONS.maxLineLength, 0);
            assert.strictEqual(DEFAULT_OPTIONS.spaceAfterOpenParen, false);
            assert.strictEqual(DEFAULT_OPTIONS.spaceBeforeCloseParen, false);
            assert.strictEqual(DEFAULT_OPTIONS.uppercaseCommands, false);
        });
        
        it('should have correct Google style options', () => {
            assert.strictEqual(GOOGLE_STYLE_OPTIONS.tabSize, 2);
            assert.strictEqual(GOOGLE_STYLE_OPTIONS.insertSpaces, true);
            assert.strictEqual(GOOGLE_STYLE_OPTIONS.maxLineLength, 80);
            assert.strictEqual(GOOGLE_STYLE_OPTIONS.spaceAfterOpenParen, false);
            assert.strictEqual(GOOGLE_STYLE_OPTIONS.spaceBeforeCloseParen, false);
            assert.strictEqual(GOOGLE_STYLE_OPTIONS.uppercaseCommands, false);
        });
        
        it('should differ only in maxLineLength between default and Google style', () => {
            assert.strictEqual(DEFAULT_OPTIONS.tabSize, GOOGLE_STYLE_OPTIONS.tabSize);
            assert.strictEqual(DEFAULT_OPTIONS.insertSpaces, GOOGLE_STYLE_OPTIONS.insertSpaces);
            assert.notStrictEqual(DEFAULT_OPTIONS.maxLineLength, GOOGLE_STYLE_OPTIONS.maxLineLength);
        });
    });
    
    describe('Indentation Logic', () => {
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
        it('should convert command to lowercase', () => {
            assert.strictEqual(formatCommand('SET(VAR value)', { ...DEFAULT_OPTIONS, uppercaseCommands: false }), 'set(VAR value)');
            assert.strictEqual(formatCommand('IF(condition)', { ...DEFAULT_OPTIONS, uppercaseCommands: false }), 'if(condition)');
        });
        
        it('should convert command to uppercase', () => {
            assert.strictEqual(formatCommand('set(VAR value)', { ...DEFAULT_OPTIONS, uppercaseCommands: true }), 'SET(VAR value)');
            assert.strictEqual(formatCommand('if(condition)', { ...DEFAULT_OPTIONS, uppercaseCommands: true }), 'IF(condition)');
        });
        
        it('should handle mixed case', () => {
            assert.strictEqual(formatCommand('SeT(VAR value)', { ...DEFAULT_OPTIONS, uppercaseCommands: false }), 'set(VAR value)');
            assert.strictEqual(formatCommand('SeT(VAR value)', { ...DEFAULT_OPTIONS, uppercaseCommands: true }), 'SET(VAR value)');
        });
        
        it('should format commands according to Google style (lowercase)', () => {
            assert.strictEqual(formatCommand('SET(VAR value)', GOOGLE_STYLE_OPTIONS), 'set(VAR value)');
            assert.strictEqual(formatCommand('ADD_EXECUTABLE(app main.cpp)', GOOGLE_STYLE_OPTIONS), 'add_executable(app main.cpp)');
        });

        it('should not modify non-command lines', () => {
            assert.strictEqual(formatCommand('# comment', DEFAULT_OPTIONS), '# comment');
            assert.strictEqual(formatCommand('plain text', DEFAULT_OPTIONS), 'plain text');
        });
    });
    
    describe('Parentheses Formatting', () => {
        it('should remove spaces after opening parenthesis', () => {
            assert.strictEqual(formatParentheses('set( VAR value)', { ...DEFAULT_OPTIONS, spaceAfterOpenParen: false }), 'set(VAR value)');
        });
        
        it('should add spaces after opening parenthesis', () => {
            assert.strictEqual(formatParentheses('set(VAR value)', { ...DEFAULT_OPTIONS, spaceAfterOpenParen: true }), 'set( VAR value)');
        });
        
        it('should remove spaces before closing parenthesis', () => {
            assert.strictEqual(formatParentheses('set(VAR value )', { ...DEFAULT_OPTIONS, spaceBeforeCloseParen: false }), 'set(VAR value)');
        });
        
        it('should add spaces before closing parenthesis', () => {
            assert.strictEqual(formatParentheses('set(VAR value)', { ...DEFAULT_OPTIONS, spaceBeforeCloseParen: true }), 'set(VAR value )');
        });
        
        it('should handle both space options', () => {
            assert.strictEqual(formatParentheses('set(VAR value)', { ...DEFAULT_OPTIONS, spaceAfterOpenParen: true, spaceBeforeCloseParen: true }), 'set( VAR value )');
        });
        
        it('should format parentheses according to Google style (no extra spaces)', () => {
            const result = formatParentheses('set( VAR value )', GOOGLE_STYLE_OPTIONS);
            assert.strictEqual(result, 'set(VAR value)');
        });
    });
    
    describe('Whitespace Normalization', () => {
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
        it('should create spaces indentation', () => {
            assert.strictEqual(createIndent(1, { ...DEFAULT_OPTIONS, tabSize: 2, insertSpaces: true }), '  ');
            assert.strictEqual(createIndent(2, { ...DEFAULT_OPTIONS, tabSize: 2, insertSpaces: true }), '    ');
            assert.strictEqual(createIndent(1, { ...DEFAULT_OPTIONS, tabSize: 4, insertSpaces: true }), '    ');
        });
        
        it('should create tabs indentation', () => {
            assert.strictEqual(createIndent(1, { ...DEFAULT_OPTIONS, insertSpaces: false }), '\t');
            assert.strictEqual(createIndent(2, { ...DEFAULT_OPTIONS, insertSpaces: false }), '\t\t');
        });
        
        it('should handle zero level', () => {
            assert.strictEqual(createIndent(0, DEFAULT_OPTIONS), '');
        });
        
        it('should create Google-style indentation (2 spaces)', () => {
            assert.strictEqual(createIndent(1, GOOGLE_STYLE_OPTIONS), '  ');
            assert.strictEqual(createIndent(2, GOOGLE_STYLE_OPTIONS), '    ');
        });
    });

    describe('splitArguments', () => {
        it('should split simple arguments', () => {
            const result = splitArguments('arg1 arg2 arg3');
            assert.deepStrictEqual(result, ['arg1', 'arg2', 'arg3']);
        });

        it('should handle quoted strings', () => {
            const result = splitArguments('arg1 "hello world" arg2');
            assert.deepStrictEqual(result, ['arg1', '"hello world"', 'arg2']);
        });

        it('should handle single argument', () => {
            const result = splitArguments('arg1');
            assert.deepStrictEqual(result, ['arg1']);
        });

        it('should handle empty string', () => {
            const result = splitArguments('');
            assert.deepStrictEqual(result, []);
        });

        it('should handle escaped quotes in strings', () => {
            const result = splitArguments('"hello \\"world\\"" arg2');
            assert.deepStrictEqual(result, ['"hello \\"world\\""', 'arg2']);
        });
    });

    describe('containsCommentOutsideString', () => {
        it('should detect comment at start', () => {
            assert.strictEqual(containsCommentOutsideString('# comment'), true);
        });

        it('should detect comment after code', () => {
            assert.strictEqual(containsCommentOutsideString('set(VAR value) # comment'), true);
        });

        it('should not detect hash inside string', () => {
            assert.strictEqual(containsCommentOutsideString('set(VAR "#not a comment")'), false);
        });

        it('should detect comment after string', () => {
            assert.strictEqual(containsCommentOutsideString('set(VAR "value") # comment'), true);
        });

        it('should return false for no comment', () => {
            assert.strictEqual(containsCommentOutsideString('set(VAR value)'), false);
        });
    });

    describe('formatLine', () => {
        it('should format a comment line', () => {
            const result = formatLine('# comment', 1, DEFAULT_OPTIONS);
            assert.strictEqual(result, '  # comment');
        });

        it('should format a command line', () => {
            const result = formatLine('SET(VAR value)', 0, DEFAULT_OPTIONS);
            assert.strictEqual(result, 'set(VAR value)');
        });

        it('should apply indentation', () => {
            const result = formatLine('set(VAR value)', 2, DEFAULT_OPTIONS);
            assert.strictEqual(result, '    set(VAR value)');
        });
    });

    describe('wrapLineIfNeeded', () => {
        const opts: CMakeFormattingOptions = { ...DEFAULT_OPTIONS, maxLineLength: 30 };

        it('should not wrap short lines', () => {
            const result = wrapLineIfNeeded('set(VAR value)', 0, opts);
            assert.deepStrictEqual(result, ['set(VAR value)']);
        });

        it('should wrap long command lines', () => {
            const result = wrapLineIfNeeded('target_link_libraries(myapp lib1 lib2 lib3)', 0, opts);
            assert.ok(result.length > 1);
            assert.ok(result[0].includes('target_link_libraries('));
            assert.ok(result[result.length - 1].trim() === ')');
        });

        it('should not wrap when maxLineLength is 0', () => {
            const result = wrapLineIfNeeded('very_long_command(arg1 arg2 arg3 arg4 arg5)', 0, DEFAULT_OPTIONS);
            assert.strictEqual(result.length, 1);
        });

        it('should not wrap comments', () => {
            const result = wrapLineIfNeeded('# this is a very long comment that exceeds the limit', 0, opts);
            assert.strictEqual(result.length, 1);
        });

        it('should not wrap single-argument commands', () => {
            const result = wrapLineIfNeeded('set(VARIABLE_WITH_VERY_LONG_NAME)', 0, opts);
            assert.strictEqual(result.length, 1);
        });
    });

    describe('getIndentation', () => {
        it('should return spaces', () => {
            assert.strictEqual(getIndentation('  set(VAR)'), '  ');
        });

        it('should return tabs', () => {
            assert.strictEqual(getIndentation('\t\tset(VAR)'), '\t\t');
        });

        it('should return empty for no indent', () => {
            assert.strictEqual(getIndentation('set(VAR)'), '');
        });

        it('should return empty for empty line', () => {
            assert.strictEqual(getIndentation(''), '');
        });
    });

    describe('formatCMakeDocument', () => {
        it('should format a simple document', () => {
            const input = `cmake_minimum_required(VERSION 3.14)
project(MyApp)
IF(WIN32)
SET(VAR value)
ENDIF()`;
            const result = formatCMakeDocument(input, DEFAULT_OPTIONS);
            const lines = result.split('\n');
            assert.strictEqual(lines[0], 'cmake_minimum_required(VERSION 3.14)');
            assert.strictEqual(lines[1], 'project(MyApp)');
            assert.strictEqual(lines[2], 'if(WIN32)');
            assert.strictEqual(lines[3], '  set(VAR value)');
            assert.strictEqual(lines[4], 'endif()');
        });

        it('should handle nested blocks', () => {
            const input = `if(A)
if(B)
set(X 1)
endif()
endif()`;
            const result = formatCMakeDocument(input, DEFAULT_OPTIONS);
            const lines = result.split('\n');
            assert.strictEqual(lines[0], 'if(A)');
            assert.strictEqual(lines[1], '  if(B)');
            assert.strictEqual(lines[2], '    set(X 1)');
            assert.strictEqual(lines[3], '  endif()');
            assert.strictEqual(lines[4], 'endif()');
        });

        it('should handle empty lines', () => {
            const input = `set(A 1)\n\nset(B 2)`;
            const result = formatCMakeDocument(input, DEFAULT_OPTIONS);
            const lines = result.split('\n');
            assert.strictEqual(lines[1], '');
        });
    });
});

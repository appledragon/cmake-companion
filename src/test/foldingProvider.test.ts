/**
 * Tests for Folding Provider Logic
 * Tests the code folding detection logic without VS Code dependencies
 */

import * as assert from 'assert';
import {
    FoldingRangeInfo,
    findMultiLineCommands,
    findCommentBlocks,
    findBlockPairs
} from '../utils/foldingUtils';

describe('Folding Provider Logic', () => {
    
    describe('findMultiLineCommands', () => {
        it('should find multi-line target_sources', () => {
            const lines = [
                'target_sources(mylib',
                '    PRIVATE',
                '        src/file1.cpp',
                '        src/file2.cpp',
                ')'
            ];
            const ranges = findMultiLineCommands(lines);
            assert.strictEqual(ranges.length, 1);
            assert.strictEqual(ranges[0].start, 0);
            assert.strictEqual(ranges[0].end, 4);
        });
        
        it('should find multi-line add_library', () => {
            const lines = [
                'add_library(mylib STATIC',
                '    src/lib.cpp',
                ')'
            ];
            const ranges = findMultiLineCommands(lines);
            assert.strictEqual(ranges.length, 1);
            assert.strictEqual(ranges[0].start, 0);
            assert.strictEqual(ranges[0].end, 2);
        });
        
        it('should not fold single-line commands', () => {
            const lines = [
                'set(VAR value)',
                'message(STATUS "hello")'
            ];
            const ranges = findMultiLineCommands(lines);
            assert.strictEqual(ranges.length, 0);
        });
        
        it('should handle nested parentheses', () => {
            const lines = [
                'if(NOT (DEFINED VAR',
                '    AND OTHER))',
                '    message("test")',
                'endif()'
            ];
            const ranges = findMultiLineCommands(lines);
            assert.strictEqual(ranges.length, 1);
            assert.strictEqual(ranges[0].start, 0);
            assert.strictEqual(ranges[0].end, 1);
        });
        
        it('should ignore strings with parentheses', () => {
            const lines = [
                'message("this has ( paren',
                'and continues here',
                'end")'
            ];
            const ranges = findMultiLineCommands(lines);
            assert.strictEqual(ranges.length, 1);
        });
        
        it('should handle multiple multi-line commands', () => {
            const lines = [
                'target_sources(lib1',
                '    src/a.cpp',
                ')',
                '',
                'target_sources(lib2',
                '    src/b.cpp',
                ')'
            ];
            const ranges = findMultiLineCommands(lines);
            assert.strictEqual(ranges.length, 2);
        });
        
        it('should ignore comments after command start', () => {
            const lines = [
                'set(VAR # comment',
                '    value',
                ')'
            ];
            const ranges = findMultiLineCommands(lines);
            assert.strictEqual(ranges.length, 1);
        });
    });
    
    describe('findCommentBlocks', () => {
        it('should find 3+ line comment blocks', () => {
            const lines = [
                '# Comment line 1',
                '# Comment line 2',
                '# Comment line 3',
                'set(VAR value)'
            ];
            const ranges = findCommentBlocks(lines);
            assert.strictEqual(ranges.length, 1);
            assert.strictEqual(ranges[0].start, 0);
            assert.strictEqual(ranges[0].end, 2);
            assert.strictEqual(ranges[0].kind, 'comment');
        });
        
        it('should not fold 2 comment lines', () => {
            const lines = [
                '# Comment 1',
                '# Comment 2',
                'set(VAR value)'
            ];
            const ranges = findCommentBlocks(lines);
            assert.strictEqual(ranges.length, 0);
        });
        
        it('should find multiple comment blocks', () => {
            const lines = [
                '# Block 1 line 1',
                '# Block 1 line 2',
                '# Block 1 line 3',
                'set(VAR1 value)',
                '# Block 2 line 1',
                '# Block 2 line 2',
                '# Block 2 line 3',
                '# Block 2 line 4',
                'set(VAR2 value)'
            ];
            const ranges = findCommentBlocks(lines);
            assert.strictEqual(ranges.length, 2);
        });
        
        it('should handle comment block at end of file', () => {
            const lines = [
                'set(VAR value)',
                '# End comment 1',
                '# End comment 2',
                '# End comment 3'
            ];
            const ranges = findCommentBlocks(lines);
            assert.strictEqual(ranges.length, 1);
            assert.strictEqual(ranges[0].start, 1);
            assert.strictEqual(ranges[0].end, 3);
        });
        
        it('should handle indented comments', () => {
            const lines = [
                '    # Indented 1',
                '    # Indented 2',
                '    # Indented 3',
                'set(VAR value)'
            ];
            const ranges = findCommentBlocks(lines);
            assert.strictEqual(ranges.length, 1);
        });
        
        it('should not include non-comment lines', () => {
            const lines = [
                '# Comment 1',
                '# Comment 2',
                'set(BREAK)',
                '# Comment 3',
                '# Comment 4'
            ];
            const ranges = findCommentBlocks(lines);
            assert.strictEqual(ranges.length, 0); // Neither block has 3 lines
        });
    });
    
    describe('findBlockPairs', () => {
        it('should find if/endif blocks', () => {
            const lines = [
                'if(CONDITION)',
                '    message("inside")',
                'endif()'
            ];
            const ranges = findBlockPairs(lines);
            assert.strictEqual(ranges.length, 1);
            assert.strictEqual(ranges[0].start, 0);
            assert.strictEqual(ranges[0].end, 2);
        });
        
        it('should find function/endfunction blocks', () => {
            const lines = [
                'function(my_func arg1)',
                '    set(LOCAL value)',
                '    message("func")',
                'endfunction()'
            ];
            const ranges = findBlockPairs(lines);
            assert.strictEqual(ranges.length, 1);
            assert.strictEqual(ranges[0].start, 0);
            assert.strictEqual(ranges[0].end, 3);
        });
        
        it('should find foreach/endforeach blocks', () => {
            const lines = [
                'foreach(item IN ITEMS a b c)',
                '    message("${item}")',
                'endforeach()'
            ];
            const ranges = findBlockPairs(lines);
            assert.strictEqual(ranges.length, 1);
        });
        
        it('should find while/endwhile blocks', () => {
            const lines = [
                'while(RUNNING)',
                '    do_something()',
                'endwhile()'
            ];
            const ranges = findBlockPairs(lines);
            assert.strictEqual(ranges.length, 1);
        });
        
        it('should find macro/endmacro blocks', () => {
            const lines = [
                'macro(my_macro)',
                '    message("macro")',
                'endmacro()'
            ];
            const ranges = findBlockPairs(lines);
            assert.strictEqual(ranges.length, 1);
        });
        
        it('should handle nested blocks', () => {
            const lines = [
                'if(OUTER)',
                '    if(INNER)',
                '        message("nested")',
                '    endif()',
                'endif()'
            ];
            const ranges = findBlockPairs(lines);
            assert.strictEqual(ranges.length, 2);
            // Should have both outer (0-4) and inner (1-3)
            const sorted = ranges.sort((a, b) => a.start - b.start);
            assert.strictEqual(sorted[0].start, 0);
            assert.strictEqual(sorted[0].end, 4);
            assert.strictEqual(sorted[1].start, 1);
            assert.strictEqual(sorted[1].end, 3);
        });
        
        it('should handle case insensitivity', () => {
            const lines = [
                'IF(CONDITION)',
                '    MESSAGE("test")',
                'ENDIF()'
            ];
            const ranges = findBlockPairs(lines);
            assert.strictEqual(ranges.length, 1);
        });
        
        it('should handle multiple separate blocks', () => {
            const lines = [
                'if(COND1)',
                '    action1()',
                'endif()',
                '',
                'if(COND2)',
                '    action2()',
                'endif()'
            ];
            const ranges = findBlockPairs(lines);
            assert.strictEqual(ranges.length, 2);
        });
        
        it('should handle mixed block types', () => {
            const lines = [
                'function(my_func)',
                '    if(CONDITION)',
                '        foreach(item IN ITEMS a b)',
                '            message("${item}")',
                '        endforeach()',
                '    endif()',
                'endfunction()'
            ];
            const ranges = findBlockPairs(lines);
            assert.strictEqual(ranges.length, 3);
        });
        
        it('should handle indented blocks', () => {
            const lines = [
                '    if(CONDITION)',
                '        message("test")',
                '    endif()'
            ];
            const ranges = findBlockPairs(lines);
            assert.strictEqual(ranges.length, 1);
        });
    });
    
    describe('combined folding', () => {
        it('should find all types of foldable regions', () => {
            const lines = [
                '# Header comment',
                '# describing the file',
                '# in detail',
                '',
                'cmake_minimum_required(VERSION 3.16)',
                '',
                'if(WIN32)',
                '    target_sources(mylib',
                '        PRIVATE',
                '            src/win.cpp',
                '    )',
                'endif()'
            ];
            
            const comments = findCommentBlocks(lines);
            const commands = findMultiLineCommands(lines);
            const blocks = findBlockPairs(lines);
            
            assert.strictEqual(comments.length, 1); // Comment block
            assert.strictEqual(commands.length, 1); // target_sources
            assert.strictEqual(blocks.length, 1);   // if/endif
        });
    });
});

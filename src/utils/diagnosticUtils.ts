/**
 * Pure diagnostic utility functions for CMake files
 * These functions contain no vscode dependencies and can be tested directly.
 */

import { parseVariables } from '../parsers';
import { isBuiltInVariable } from './cmakeBuiltins';

/**
 * CMake block pairs for matching
 */
export const BLOCK_PAIRS: Array<{ start: string; end: string; name: string }> = [
    { start: 'if', end: 'endif', name: 'if/endif' },
    { start: 'foreach', end: 'endforeach', name: 'foreach/endforeach' },
    { start: 'while', end: 'endwhile', name: 'while/endwhile' },
    { start: 'function', end: 'endfunction', name: 'function/endfunction' },
    { start: 'macro', end: 'endmacro', name: 'macro/endmacro' },
    { start: 'block', end: 'endblock', name: 'block/endblock' },
];

/**
 * Deprecated CMake commands with suggested alternatives
 */
export const DEPRECATED_COMMANDS: Map<string, string> = new Map([
    ['include_directories', 'target_include_directories'],
    ['link_directories', 'target_link_directories'],
    ['link_libraries', 'target_link_libraries'],
    ['add_definitions', 'target_compile_definitions'],
    ['add_compile_options', 'target_compile_options (for target-specific)'],
]);

export interface UndefinedVariableInfo {
    name: string;
    startIndex: number;
    endIndex: number;
}

export interface BlockError {
    line: number;
    type: 'missing-end' | 'missing-start';
    blockName: string;
    expectedPair: string;
}

export interface DeprecatedCommandInfo {
    line: number;
    command: string;
    replacement: string;
}

/**
 * Find undefined variables in text
 */
export function findUndefinedVariables(
    text: string,
    definedVariables: Set<string>
): UndefinedVariableInfo[] {
    const variables = parseVariables(text);
    const undefinedVars: UndefinedVariableInfo[] = [];

    // Collect locally defined variables
    const localVars = new Set<string>();
    const setRegex = /^\s*set\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/gim;
    let match;
    while ((match = setRegex.exec(text)) !== null) {
        localVars.add(match[1]);
    }

    // Collect foreach loop variables
    const foreachRegex = /^\s*foreach\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/gim;
    while ((match = foreachRegex.exec(text)) !== null) {
        localVars.add(match[1]);
    }

    for (const variable of variables) {
        const varName = variable.variableName;

        if (isBuiltInVariable(varName)) {
            continue;
        }

        if (definedVariables.has(varName) || localVars.has(varName)) {
            continue;
        }

        if (varName.startsWith('<') || varName.endsWith('>')) {
            continue;
        }

        undefinedVars.push({
            name: varName,
            startIndex: variable.startIndex,
            endIndex: variable.endIndex
        });
    }

    return undefinedVars;
}

/**
 * Find unmatched block pairs
 */
export function findUnmatchedBlocks(text: string): BlockError[] {
    const lines = text.split('\n');
    const errors: BlockError[] = [];

    interface BlockInfo {
        type: 'start' | 'end';
        name: string;
        line: number;
    }

    const blocks: BlockInfo[] = [];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex].toLowerCase().trim();
        if (!line || line.startsWith('#')) {
            continue;
        }

        for (const pair of BLOCK_PAIRS) {
            const startRegex = new RegExp(`^${pair.start}\\s*\\(`);
            if (startRegex.test(line)) {
                blocks.push({ type: 'start', name: pair.start, line: lineIndex });
            }

            const endRegex = new RegExp(`^${pair.end}\\s*\\(`);
            if (endRegex.test(line)) {
                blocks.push({ type: 'end', name: pair.end, line: lineIndex });
            }
        }
    }

    // Match blocks using a stack
    const stack: BlockInfo[] = [];
    const unmatchedEnds: BlockInfo[] = [];

    for (const block of blocks) {
        if (block.type === 'start') {
            stack.push(block);
        } else {
            const pair = BLOCK_PAIRS.find(p => p.end === block.name);
            if (pair) {
                let found = false;
                for (let i = stack.length - 1; i >= 0; i--) {
                    if (stack[i].name === pair.start) {
                        stack.splice(i, 1);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    unmatchedEnds.push(block);
                }
            }
        }
    }

    // Report unmatched starts
    for (const block of stack) {
        const pair = BLOCK_PAIRS.find(p => p.start === block.name);
        errors.push({
            line: block.line,
            type: 'missing-end',
            blockName: block.name,
            expectedPair: pair?.end || ''
        });
    }

    // Report unmatched ends
    for (const block of unmatchedEnds) {
        const pair = BLOCK_PAIRS.find(p => p.end === block.name);
        errors.push({
            line: block.line,
            type: 'missing-start',
            blockName: block.name,
            expectedPair: pair?.start || ''
        });
    }

    return errors;
}

/**
 * Find deprecated commands
 */
export function findDeprecatedCommands(text: string): DeprecatedCommandInfo[] {
    const lines = text.split('\n');
    const deprecated: DeprecatedCommandInfo[] = [];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const trimmed = line.trim().toLowerCase();

        if (trimmed.startsWith('#')) {
            continue;
        }

        for (const [cmd, replacement] of DEPRECATED_COMMANDS) {
            const regex = new RegExp(`^\\s*${cmd}\\s*\\(`, 'i');
            if (regex.test(line)) {
                deprecated.push({
                    line: lineIndex,
                    command: cmd,
                    replacement
                });
            }
        }
    }

    return deprecated;
}

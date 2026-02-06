/**
 * Diagnostic Provider
 * Provides linting and diagnostics for CMake files
 * - Undefined variables
 * - Unmatched block pairs (if/endif, function/endfunction, etc.)
 * - Non-existent file paths
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parseVariables, parsePaths } from '../parsers';
import { getVariableResolver } from '../services/variableResolver';
import { isBuiltInVariable, BUILTIN_VARIABLE_PREFIXES, BUILTIN_VARIABLES } from '../utils/cmakeBuiltins';
import { BLOCK_PAIRS, DEPRECATED_COMMANDS } from '../utils/diagnosticUtils';

interface BlockInfo {
    type: 'start' | 'end';
    name: string;
    line: number;
    pairName: string;
}

export class CMakeDiagnosticProvider implements vscode.Disposable {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private disposables: vscode.Disposable[] = [];
    private debounceTimer: NodeJS.Timeout | undefined;
    private enabled = true;
    
    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('cmake');
        this.disposables.push(this.diagnosticCollection);
        
        // Load configuration
        this.loadConfiguration();
        
        // Listen for document changes
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument((event) => {
                if (this.enabled && this.isCMakeDocument(event.document)) {
                    this.scheduleUpdate(event.document);
                }
            })
        );
        
        // Listen for document open
        this.disposables.push(
            vscode.workspace.onDidOpenTextDocument((document) => {
                if (this.enabled && this.isCMakeDocument(document)) {
                    this.updateDiagnostics(document);
                }
            })
        );
        
        // Listen for document close
        this.disposables.push(
            vscode.workspace.onDidCloseTextDocument((document) => {
                this.diagnosticCollection.delete(document.uri);
            })
        );
        
        // Listen for configuration changes
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration((event) => {
                if (event.affectsConfiguration('cmake-path-resolver')) {
                    this.loadConfiguration();
                    // Re-analyze all open documents
                    if (this.enabled) {
                        this.analyzeOpenDocuments();
                    } else {
                        this.diagnosticCollection.clear();
                    }
                }
            })
        );
        
        // Analyze already open documents
        this.analyzeOpenDocuments();
    }
    
    private loadConfiguration(): void {
        const config = vscode.workspace.getConfiguration('cmake-path-resolver');
        this.enabled = config.get<boolean>('diagnostics.enabled', true);
    }
    
    private isCMakeDocument(document: vscode.TextDocument): boolean {
        if (document.languageId === 'cmake') {
            return true;
        }
        const fileName = path.basename(document.fileName);
        return fileName === 'CMakeLists.txt' || fileName.endsWith('.cmake');
    }
    
    private analyzeOpenDocuments(): void {
        for (const document of vscode.workspace.textDocuments) {
            if (this.isCMakeDocument(document)) {
                this.updateDiagnostics(document);
            }
        }
    }
    
    private scheduleUpdate(document: vscode.TextDocument): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.updateDiagnostics(document);
        }, 500); // 500ms debounce
    }
    
    /**
     * Update diagnostics for a document
     */
    updateDiagnostics(document: vscode.TextDocument): void {
        if (!this.enabled) {
            this.diagnosticCollection.delete(document.uri);
            return;
        }
        
        const diagnostics: vscode.Diagnostic[] = [];
        const text = document.getText();
        const config = vscode.workspace.getConfiguration('cmake-path-resolver');
        
        // Check for undefined variables
        if (config.get<boolean>('diagnostics.undefinedVariables', true)) {
            this.checkUndefinedVariables(document, text, diagnostics);
        }
        
        // Check for unmatched blocks
        if (config.get<boolean>('diagnostics.unmatchedBlocks', true)) {
            this.checkUnmatchedBlocks(document, text, diagnostics);
        }
        
        // Check for deprecated commands
        if (config.get<boolean>('diagnostics.deprecatedCommands', true)) {
            this.checkDeprecatedCommands(document, text, diagnostics);
        }
        
        // Check for non-existent paths (optional - can be slow)
        if (config.get<boolean>('diagnostics.nonExistentPaths', false)) {
            this.checkNonExistentPaths(document, text, diagnostics);
        }
        
        this.diagnosticCollection.set(document.uri, diagnostics);
    }
    
    /**
     * Check for undefined variables
     */
    private checkUndefinedVariables(
        document: vscode.TextDocument,
        text: string,
        diagnostics: vscode.Diagnostic[]
    ): void {
        const resolver = getVariableResolver();
        const variables = parseVariables(text);
        const seenVariables = new Set<string>();
        
        // First pass: collect locally defined variables (set commands in this file)
        const setRegex = /^\s*set\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/gim;
        let setMatch;
        while ((setMatch = setRegex.exec(text)) !== null) {
            seenVariables.add(setMatch[1]);
        }
        
        // Also collect function/macro arguments
        const funcRegex = /^\s*(?:function|macro)\s*\(\s*\w+\s+([^)]+)\)/gim;
        while ((funcRegex.exec(text)) !== null) {
            // Arguments are seen as defined within the function
        }
        
        // Also collect foreach loop variables
        const foreachRegex = /^\s*foreach\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/gim;
        while ((setMatch = foreachRegex.exec(text)) !== null) {
            seenVariables.add(setMatch[1]);
        }
        
        for (const variable of variables) {
            const varName = variable.variableName;
            
            // Skip if it's a built-in variable
            if (isBuiltInVariable(varName)) {
                continue;
            }
            
            // Skip if defined in resolver or locally
            if (resolver.hasVariable(varName) || seenVariables.has(varName)) {
                continue;
            }
            
            // Skip generator expressions
            if (varName.startsWith('<') || varName.endsWith('>')) {
                continue;
            }
            
            const startPos = document.positionAt(variable.startIndex);
            const endPos = document.positionAt(variable.endIndex);
            const range = new vscode.Range(startPos, endPos);
            
            const diagnostic = new vscode.Diagnostic(
                range,
                `Undefined variable: ${varName}`,
                vscode.DiagnosticSeverity.Warning
            );
            diagnostic.source = 'cmake';
            diagnostic.code = 'undefined-variable';
            diagnostics.push(diagnostic);
        }
    }
    
    /**
     * Check for unmatched block pairs
     */
    private checkUnmatchedBlocks(
        document: vscode.TextDocument,
        text: string,
        diagnostics: vscode.Diagnostic[]
    ): void {
        const lines = text.split('\n');
        const blocks: BlockInfo[] = [];
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex].toLowerCase().trim();
            if (!line || line.startsWith('#')) {
                continue;
            }
            
            for (const pair of BLOCK_PAIRS) {
                // Check for start of block
                const startRegex = new RegExp(`^${pair.start}\\s*\\(`);
                if (startRegex.test(line)) {
                    blocks.push({
                        type: 'start',
                        name: pair.start,
                        line: lineIndex,
                        pairName: pair.name
                    });
                }
                
                // Check for end of block
                const endRegex = new RegExp(`^${pair.end}\\s*\\(`);
                if (endRegex.test(line)) {
                    blocks.push({
                        type: 'end',
                        name: pair.end,
                        line: lineIndex,
                        pairName: pair.name
                    });
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
                // Find matching start
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
            const line = document.lineAt(block.line);
            const diagnostic = new vscode.Diagnostic(
                line.range,
                `Unmatched '${block.name}' - missing '${BLOCK_PAIRS.find(p => p.start === block.name)?.end}'`,
                vscode.DiagnosticSeverity.Error
            );
            diagnostic.source = 'cmake';
            diagnostic.code = 'unmatched-block';
            diagnostics.push(diagnostic);
        }
        
        // Report unmatched ends
        for (const block of unmatchedEnds) {
            const line = document.lineAt(block.line);
            const diagnostic = new vscode.Diagnostic(
                line.range,
                `Unmatched '${block.name}' - missing '${BLOCK_PAIRS.find(p => p.end === block.name)?.start}'`,
                vscode.DiagnosticSeverity.Error
            );
            diagnostic.source = 'cmake';
            diagnostic.code = 'unmatched-block';
            diagnostics.push(diagnostic);
        }
    }
    
    /**
     * Check for deprecated commands
     */
    private checkDeprecatedCommands(
        document: vscode.TextDocument,
        text: string,
        diagnostics: vscode.Diagnostic[]
    ): void {
        const lines = text.split('\n');
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const trimmed = line.trim().toLowerCase();
            
            if (trimmed.startsWith('#')) {
                continue;
            }
            
            for (const [deprecated, replacement] of DEPRECATED_COMMANDS) {
                const regex = new RegExp(`^\\s*(${deprecated})\\s*\\(`, 'i');
                const match = regex.exec(line);
                
                if (match) {
                    const startChar = match.index + (match[0].length - match[1].length - 2);
                    const endChar = startChar + match[1].length;
                    const range = new vscode.Range(
                        new vscode.Position(lineIndex, startChar),
                        new vscode.Position(lineIndex, endChar)
                    );
                    
                    const diagnostic = new vscode.Diagnostic(
                        range,
                        `'${match[1]}' is deprecated. Consider using '${replacement}' instead.`,
                        vscode.DiagnosticSeverity.Hint
                    );
                    diagnostic.source = 'cmake';
                    diagnostic.code = 'deprecated-command';
                    diagnostic.tags = [vscode.DiagnosticTag.Deprecated];
                    diagnostics.push(diagnostic);
                }
            }
        }
    }
    
    /**
     * Check for non-existent file paths
     */
    private checkNonExistentPaths(
        document: vscode.TextDocument,
        text: string,
        diagnostics: vscode.Diagnostic[]
    ): void {
        const resolver = getVariableResolver();
        const documentDir = path.dirname(document.uri.fsPath);
        const paths = parsePaths(text);
        
        for (const pathMatch of paths) {
            // Skip paths with unresolved variables
            const resolved = resolver.resolvePath(pathMatch.fullPath);
            
            if (resolved.unresolvedVariables.length > 0) {
                continue;
            }
            
            // Resolve relative paths
            let absolutePath = resolved.resolved;
            if (!path.isAbsolute(absolutePath)) {
                absolutePath = path.resolve(documentDir, absolutePath);
            }
            
            // Check if path exists
            if (!fs.existsSync(absolutePath)) {
                const startPos = document.positionAt(pathMatch.startIndex);
                const endPos = document.positionAt(pathMatch.endIndex);
                const range = new vscode.Range(startPos, endPos);
                
                const diagnostic = new vscode.Diagnostic(
                    range,
                    `Path does not exist: ${pathMatch.fullPath}`,
                    vscode.DiagnosticSeverity.Warning
                );
                diagnostic.source = 'cmake';
                diagnostic.code = 'path-not-found';
                diagnostics.push(diagnostic);
            }
        }
    }
    
    /**
     * Clear all diagnostics
     */
    clear(): void {
        this.diagnosticCollection.clear();
    }
    
    dispose(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
    }
}

// Singleton instance
let diagnosticProvider: CMakeDiagnosticProvider | null = null;

/**
 * Get the singleton diagnostic provider instance
 */
export function getDiagnosticProvider(): CMakeDiagnosticProvider {
    if (!diagnosticProvider) {
        diagnosticProvider = new CMakeDiagnosticProvider();
    }
    return diagnosticProvider;
}

/**
 * Dispose the singleton instance
 */
export function disposeDiagnosticProvider(): void {
    if (diagnosticProvider) {
        diagnosticProvider.dispose();
        diagnosticProvider = null;
    }
}

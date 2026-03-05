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
import { isBuiltInVariable } from '../utils/cmakeBuiltins';
import { findUnmatchedBlocks, findDeprecatedCommands } from '../utils/diagnosticUtils';

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
                if (event.affectsConfiguration('cmake-companion')) {
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
        const config = vscode.workspace.getConfiguration('cmake-companion');
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
        const config = vscode.workspace.getConfiguration('cmake-companion');
        
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
        let funcMatch;
        while ((funcMatch = funcRegex.exec(text)) !== null) {
            for (const arg of funcMatch[1].trim().split(/\s+/)) {
                if (arg) {
                    seenVariables.add(arg);
                }
            }
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
        const errors = findUnmatchedBlocks(text);
        
        for (const error of errors) {
            const line = document.lineAt(error.line);
            const message = error.type === 'missing-end'
                ? `Unmatched '${error.blockName}' - missing '${error.expectedPair}'`
                : `Unmatched '${error.blockName}' - missing '${error.expectedPair}'`;
            
            const diagnostic = new vscode.Diagnostic(
                line.range,
                message,
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
        const deprecatedResults = findDeprecatedCommands(text);
        
        for (const result of deprecatedResults) {
            const line = document.lineAt(result.line);
            // Find the command position in the line
            const lineText = line.text;
            const cmdRegex = new RegExp(`^\\s*(${result.command})\\s*\\(`, 'i');
            const match = cmdRegex.exec(lineText);
            
            let range: vscode.Range;
            if (match) {
                const startChar = match.index + (match[0].length - match[1].length - 2);
                const endChar = startChar + match[1].length;
                range = new vscode.Range(
                    new vscode.Position(result.line, startChar),
                    new vscode.Position(result.line, endChar)
                );
            } else {
                range = line.range;
            }
            
            const diagnostic = new vscode.Diagnostic(
                range,
                `'${result.command}' is deprecated. Consider using '${result.replacement}' instead.`,
                vscode.DiagnosticSeverity.Hint
            );
            diagnostic.source = 'cmake';
            diagnostic.code = 'deprecated-command';
            diagnostic.tags = [vscode.DiagnosticTag.Deprecated];
            diagnostics.push(diagnostic);
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

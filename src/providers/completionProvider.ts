/**
 * Completion Provider
 * Provides IntelliSense auto-completion for CMake files
 * - Variables: triggered by ${ 
 * - Commands: triggered at line start
 * - Keywords: context-aware (e.g., PUBLIC, PRIVATE, REQUIRED)
 */

import * as vscode from 'vscode';
import { getVariableResolver } from '../services/variableResolver';
import {
    COMPLETION_VARIABLES,
    CMAKE_COMMANDS,
    CMAKE_KEYWORDS,
    isInVariableContext,
    isAtCommandPosition,
    isInsideCommand,
    detectCommandContext,
    getRelevantKeywords
} from '../utils/completionUtils';

export class CMakeCompletionProvider implements vscode.CompletionItemProvider {
    
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const lineText = document.lineAt(position.line).text;
        const linePrefix = lineText.substring(0, position.character);
        
        // Check if we're inside a variable reference: ${
        if (isInVariableContext(linePrefix)) {
            return this.provideVariableCompletions(document, position);
        }
        
        // Check if we're at the start of a command (line start or after whitespace)
        if (isAtCommandPosition(linePrefix)) {
            return this.provideCommandCompletions(document, position);
        }
        
        // Check if we're inside a command (between parentheses)
        if (isInsideCommand(lineText, position.character)) {
            return this.provideKeywordCompletions(document, position, lineText);
        }
        
        return undefined;
    }
    
    /**
     * Provide variable name completions
     */
    private provideVariableCompletions(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];
        const resolver = getVariableResolver();
        const existingVars = new Set<string>();
        
        // Add workspace-defined variables
        for (const varName of resolver.getVariableNames()) {
            existingVars.add(varName);
            const value = resolver.getVariable(varName);
            const definition = resolver.getDefinition(varName);
            
            const item = new vscode.CompletionItem(varName, vscode.CompletionItemKind.Variable);
            item.detail = value || '(undefined)';
            if (definition) {
                item.documentation = new vscode.MarkdownString(
                    `Defined in: \`${definition.file}:${definition.line}\``
                );
            }
            // Insert only the variable name (user already typed ${)
            item.insertText = varName;
            items.push(item);
        }
        
        // Add built-in variables that aren't already defined
        for (const builtin of COMPLETION_VARIABLES) {
            if (!existingVars.has(builtin.name)) {
                const item = new vscode.CompletionItem(builtin.name, vscode.CompletionItemKind.Constant);
                item.detail = '(built-in)';
                item.documentation = new vscode.MarkdownString(builtin.description);
                item.insertText = builtin.name;
                items.push(item);
            }
        }
        
        return items;
    }
    
    /**
     * Provide command completions
     */
    private provideCommandCompletions(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];
        
        for (const cmd of CMAKE_COMMANDS) {
            const item = new vscode.CompletionItem(cmd.name, vscode.CompletionItemKind.Function);
            item.detail = 'CMake command';
            item.documentation = new vscode.MarkdownString(cmd.description);
            
            if (cmd.snippet) {
                item.insertText = new vscode.SnippetString(cmd.snippet);
            } else {
                item.insertText = cmd.name + '($0)';
            }
            
            items.push(item);
        }
        
        return items;
    }
    
    /**
     * Provide keyword completions inside commands
     */
    private provideKeywordCompletions(
        document: vscode.TextDocument,
        position: vscode.Position,
        lineText: string
    ): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];
        
        // Detect command context and get relevant keywords
        const commandName = detectCommandContext(lineText);
        const relevantKeywords = getRelevantKeywords(commandName);
        
        for (const keyword of relevantKeywords) {
            const item = new vscode.CompletionItem(keyword.name, vscode.CompletionItemKind.Keyword);
            item.detail = 'CMake keyword';
            item.documentation = new vscode.MarkdownString(keyword.description);
            items.push(item);
        }
        
        // Also provide variable completions inside commands
        const linePrefix = lineText.substring(0, position.character);
        if (linePrefix.endsWith('$') || linePrefix.endsWith('${')) {
            // Will be handled by the variable completion
            return [];
        }
        
        return items;
    }
}

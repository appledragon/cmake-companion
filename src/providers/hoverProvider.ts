/**
 * Hover Provider
 * Shows resolved path and file existence status on hover
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parsePaths, parseVariables } from '../parsers';
import { getVariableResolver } from '../services/variableResolver';

export class CMakeHoverProvider implements vscode.HoverProvider {
    
    /**
     * Provide hover information for CMake paths
     * @param document The document
     * @param position The hover position
     * @param token Cancellation token
     * @returns Hover information
     */
    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        const text = document.getText();
        const offset = document.offsetAt(position);
        
        // Check if we're hovering over a CMake path
        const pathMatches = parsePaths(text);
        
        for (const match of pathMatches) {
            if (token.isCancellationRequested) {
                return null;
            }
            
            if (offset >= match.startIndex && offset <= match.endIndex) {
                return this.createPathHover(document, match);
            }
        }
        
        // Check if we're hovering over just a variable
        const variableMatches = parseVariables(text);
        
        for (const variable of variableMatches) {
            if (token.isCancellationRequested) {
                return null;
            }
            
            if (offset >= variable.startIndex && offset <= variable.endIndex) {
                return this.createVariableHover(document, variable);
            }
        }
        
        return null;
    }
    
    /**
     * Create hover content for a CMake path
     */
    private createPathHover(
        document: vscode.TextDocument,
        match: { fullPath: string; startIndex: number; endIndex: number; variables: import('../parsers/cmakeVariableParser').CMakeVariableMatch[] }
    ): vscode.Hover {
        const resolver = getVariableResolver();
        const documentDir = path.dirname(document.uri.fsPath);
        
        let resolved;
        
        // If the path has variables, use the resolver
        if (match.variables && match.variables.length > 0) {
            resolved = resolver.resolvePath(match.fullPath);
        } else {
            // For plain file paths, resolve relative to the document directory
            let absolutePath = match.fullPath;
            if (!path.isAbsolute(match.fullPath)) {
                absolutePath = path.resolve(documentDir, match.fullPath);
            }
            // Normalize the path
            absolutePath = absolutePath.replace(/\\/g, '/');
            
            // Check if the file exists
            let exists = false;
            try {
                exists = fs.existsSync(absolutePath);
            } catch {
                // Ignore errors
            }
            
            resolved = {
                original: match.fullPath,
                resolved: absolutePath,
                exists,
                unresolvedVariables: []
            };
        }
        
        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;
        
        markdown.appendMarkdown('**CMake Path**\n\n');
        markdown.appendMarkdown(`**Original:** \`${match.fullPath}\`\n\n`);
        markdown.appendMarkdown(`**Resolved:** \`${resolved.resolved}\`\n\n`);
        
        if (resolved.unresolvedVariables.length > 0) {
            markdown.appendMarkdown(`⚠️ **Unresolved variables:** ${resolved.unresolvedVariables.map(v => `\`${v}\``).join(', ')}\n\n`);
        }
        
        if (resolved.exists) {
            markdown.appendMarkdown('✅ **File exists**\n\n');
            markdown.appendMarkdown(`[Open file](${vscode.Uri.file(resolved.resolved).toString()})`);
        } else {
            markdown.appendMarkdown('❌ **File not found**');
        }
        
        const startPos = document.positionAt(match.startIndex);
        const endPos = document.positionAt(match.endIndex);
        const range = new vscode.Range(startPos, endPos);
        
        return new vscode.Hover(markdown, range);
    }
    
    /**
     * Create hover content for a CMake variable
     */
    private createVariableHover(
        document: vscode.TextDocument,
        variable: { fullMatch: string; variableName: string; startIndex: number; endIndex: number }
    ): vscode.Hover {
        const resolver = getVariableResolver();
        const value = resolver.getVariable(variable.variableName);
        const definition = resolver.getDefinition(variable.variableName);
        
        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;
        
        markdown.appendMarkdown('**CMake Variable**\n\n');
        markdown.appendMarkdown(`**Name:** \`${variable.variableName}\`\n\n`);
        
        if (value !== undefined) {
            markdown.appendMarkdown(`**Value:** \`${value}\`\n\n`);
            
            if (definition) {
                const fileUri = vscode.Uri.file(definition.file);
                markdown.appendMarkdown(`**Defined in:** [${definition.file}:${definition.line}](${fileUri.toString()}#L${definition.line})\n\n`);
                
                if (definition.isCache) {
                    markdown.appendMarkdown('📦 *Cache variable*');
                }
            } else {
                markdown.appendMarkdown('📌 *Built-in or custom variable*');
            }
        } else {
            markdown.appendMarkdown('⚠️ **Variable not defined**');
        }
        
        const startPos = document.positionAt(variable.startIndex);
        const endPos = document.positionAt(variable.endIndex);
        const range = new vscode.Range(startPos, endPos);
        
        return new vscode.Hover(markdown, range);
    }
}

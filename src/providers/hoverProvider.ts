/**
 * Hover Provider
 * Shows resolved path and file existence status on hover
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parsePaths, parseVariables, CMakePathMatch } from '../parsers';
import { getVariableResolver } from '../services/variableResolver';
import { isBuiltInVariable, getBuiltInVariableType, isNonPathVariable } from '../utils/cmakeBuiltins';

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
        match: CMakePathMatch
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
            // Normalize the path for cross-platform compatibility
            absolutePath = path.normalize(absolutePath);
            
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
        
        // Check if resolved value is a CMake list (semicolon-separated)
        const isList = resolved.resolved.includes(';');
        
        if (isList) {
            // Multi-value path (CMake list) — check each file individually
            const items = resolved.resolved.split(';');
            markdown.appendMarkdown('**Resolved:**\n\n');
            for (const item of items) {
                const trimmed = item.trim();
                if (!trimmed) { continue; }
                let itemExists = false;
                let isDir = false;
                try {
                    itemExists = fs.existsSync(trimmed);
                    if (itemExists) {
                        isDir = fs.statSync(trimmed).isDirectory();
                    }
                } catch {
                    // ignore
                }
                const icon = itemExists ? (isDir ? '📁' : '✅') : '❌';
                markdown.appendMarkdown(`- ${icon} \`${trimmed}\`\n`);
            }
            markdown.appendMarkdown('\n');
        } else {
            // Single value
            markdown.appendMarkdown(`**Resolved:** \`${resolved.resolved}\`\n\n`);
        }
        
        if (resolved.unresolvedVariables.length > 0) {
            markdown.appendMarkdown(`⚠️ **Unresolved variables:** ${resolved.unresolvedVariables.map(v => `\`${v}\``).join(', ')}\n\n`);
        }
        
        // Determine how to show file existence status based on path content
        const pathInfo = this.analyzePathVariables(match);
        
        if (pathInfo.isNonPathVariable) {
            // Path contains non-path variables (like CMAKE_CXX_STANDARD), don't show file status
            markdown.appendMarkdown(`📌 *Contains CMake configuration variable*`);
        } else if (isList) {
            // Already showed per-file status above, no need for an overall status
        } else if (resolved.exists) {
            // Check if it's a directory or file
            try {
                const stat = fs.statSync(resolved.resolved);
                if (stat.isDirectory()) {
                    markdown.appendMarkdown('✅ **Directory exists**');
                } else {
                    markdown.appendMarkdown('✅ **File exists**');
                }
            } catch {
                markdown.appendMarkdown('✅ **File exists**');
            }
        } else if (pathInfo.isDirectoryPath) {
            // Path likely represents a directory (from built-in directory variables)
            markdown.appendMarkdown('📁 *Directory path (may not exist yet)*');
        } else if (pathInfo.isFilePath && resolved.unresolvedVariables.length > 0) {
            // Built-in file/tool variable that hasn't been resolved (e.g. CMAKE_COMMAND)
            markdown.appendMarkdown('🔧 *Tool/executable path (resolved at configure time)*');
        } else if (pathInfo.hasOnlyBuiltInVariables && resolved.unresolvedVariables.length === 0) {
            // All variables are resolved built-ins, but path doesn't exist
            markdown.appendMarkdown('❌ **Path not found**');
        } else if (resolved.unresolvedVariables.length > 0) {
            // Has unresolved variables — can't determine if the path exists
            markdown.appendMarkdown('⚠️ *Path cannot be verified (unresolved variables)*');
        } else {
            markdown.appendMarkdown('❌ **File not found**');
        }
        
        const startPos = document.positionAt(match.startIndex);
        const endPos = document.positionAt(match.endIndex);
        const range = new vscode.Range(startPos, endPos);
        
        return new vscode.Hover(markdown, range);
    }
    
    /**
     * Analyze the variables in a path to determine the path type
     */
    private analyzePathVariables(match: CMakePathMatch): {
        isDirectoryPath: boolean;
        isFilePath: boolean;
        isNonPathVariable: boolean;
        hasOnlyBuiltInVariables: boolean;
    } {
        if (!match.variables || match.variables.length === 0) {
            return {
                isDirectoryPath: false,
                isFilePath: false,
                isNonPathVariable: false,
                hasOnlyBuiltInVariables: true
            };
        }
        
        let isDirectoryPath = false;
        let isFilePath = false;
        let isNonPathVariable = false;
        let hasOnlyBuiltInVariables = true;
        
        for (const variable of match.variables) {
            const varName = variable.variableName;
            const varType = getBuiltInVariableType(varName);
            
            if (varType === 'directory') {
                isDirectoryPath = true;
            } else if (varType === 'file') {
                isFilePath = true;
            } else if (varType === 'value') {
                isNonPathVariable = true;
            }
            
            // Check if it's a known built-in
            if (!isBuiltInVariable(varName)) {
                hasOnlyBuiltInVariables = false;
            }
        }
        
        // If path is just a single variable (e.g., ${CMAKE_SOURCE_DIR}), check its type
        if (match.variables.length === 1 && match.fullPath === `\${${match.variables[0].variableName}}`) {
            const varType = getBuiltInVariableType(match.variables[0].variableName);
            if (varType === 'directory') {
                isDirectoryPath = true;
            } else if (varType === 'file') {
                isFilePath = true;
            } else if (varType === 'value') {
                isNonPathVariable = true;
            }
        }
        
        return {
            isDirectoryPath,
            isFilePath,
            isNonPathVariable,
            hasOnlyBuiltInVariables
        };
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
        const builtInType = getBuiltInVariableType(variable.variableName);
        const isBuiltIn = isBuiltInVariable(variable.variableName);
        
        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;
        
        markdown.appendMarkdown('**CMake Variable**\n\n');
        markdown.appendMarkdown(`**Name:** \`${variable.variableName}\`\n\n`);
        
        if (value !== undefined) {
            // Format value - if it contains semicolons (CMake list), display as list
            const valueDisplay = this.formatValueForDisplay(value);
            markdown.appendMarkdown(`**Value:** ${valueDisplay}\n\n`);
            
            if (definition) {
                const fileUri = vscode.Uri.file(definition.file);
                markdown.appendMarkdown(`**Defined in:** [${definition.file}:${definition.line}](${fileUri.toString()}#L${definition.line})\n\n`);
                
                if (definition.isCache) {
                    markdown.appendMarkdown('📦 *Cache variable*');
                }
            } else if (isBuiltIn) {
                // Show built-in variable type
                const typeLabels: Record<string, string> = {
                    'directory': '📁 *Built-in directory variable*',
                    'file': '📄 *Built-in file path variable*',
                    'value': '📌 *Built-in configuration variable*',
                    'unknown': '📌 *Built-in variable*'
                };
                markdown.appendMarkdown(typeLabels[builtInType] || '📌 *Built-in variable*');
            } else {
                markdown.appendMarkdown('📌 *Custom variable*');
            }
        } else {
            if (isBuiltIn) {
                markdown.appendMarkdown(`📌 *Built-in CMake variable (not yet set)*`);
            } else {
                markdown.appendMarkdown('⚠️ **Variable not defined**');
            }
        }
        
        const startPos = document.positionAt(variable.startIndex);
        const endPos = document.positionAt(variable.endIndex);
        const range = new vscode.Range(startPos, endPos);
        
        return new vscode.Hover(markdown, range);
    }

    /**
     * Format a value for display in hover
     * If the value contains semicolons (CMake list), display as a formatted list
     */
    private formatValueForDisplay(value: string): string {
        // Check if this is a CMake list (contains semicolons)
        if (value.includes(';')) {
            const items = value.split(';');
            // Display as a formatted list with line breaks
            return '\n' + items.map(item => `- \`${item}\``).join('\n');
        }
        return `\`${value}\``;
    }
}

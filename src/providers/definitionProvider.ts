/**
 * Definition Provider
 * Enables Ctrl+Click navigation to:
 * - Resolved paths (files and directories)
 * - Variable definitions (${VAR} -> set(VAR ...))
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parsePaths, parseVariables, CMakePathMatch } from '../parsers';
import { getVariableResolver } from '../services/variableResolver';

export class CMakeDefinitionProvider implements vscode.DefinitionProvider {
    
    /**
     * Provide definition locations for CMake paths and variables
     * @param document The document
     * @param position The position
     * @param token Cancellation token
     * @returns Definition location(s)
     */
    provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
        const text = document.getText();
        const offset = document.offsetAt(position);
        
        // First, check if we're on a variable reference ${VAR}
        const variableDefinition = this.getVariableDefinition(document, text, offset, token);
        if (variableDefinition) {
            return variableDefinition;
        }
        
        // Then check if we're on a CMake path
        const pathMatches = parsePaths(text);
        
        for (const match of pathMatches) {
            if (token.isCancellationRequested) {
                return null;
            }
            
            if (offset >= match.startIndex && offset <= match.endIndex) {
                return this.getPathDefinition(document, match);
            }
        }
        
        return null;
    }
    
    /**
     * Get definition location for a CMake variable
     * Navigates from ${VAR} to the set(VAR ...) command
     */
    private getVariableDefinition(
        document: vscode.TextDocument,
        text: string,
        offset: number,
        token: vscode.CancellationToken
    ): vscode.Definition | null {
        const resolver = getVariableResolver();
        const variables = parseVariables(text);
        
        for (const variable of variables) {
            if (token.isCancellationRequested) {
                return null;
            }
            
            if (offset >= variable.startIndex && offset <= variable.endIndex) {
                const definition = resolver.getDefinition(variable.variableName);
                
                if (definition && definition.file && definition.line) {
                    // Return location to the variable definition
                    return new vscode.Location(
                        vscode.Uri.file(definition.file),
                        new vscode.Position(definition.line - 1, 0) // line is 1-based
                    );
                }
                
                // If no external definition found, try to find local definition in current file
                const localDefinition = this.findLocalVariableDefinition(
                    document, 
                    variable.variableName
                );
                if (localDefinition) {
                    return localDefinition;
                }
                
                // Variable not found anywhere
                return null;
            }
        }
        
        return null;
    }
    
    /**
     * Find a variable definition within the current document
     */
    private findLocalVariableDefinition(
        document: vscode.TextDocument,
        variableName: string
    ): vscode.Location | null {
        const text = document.getText();
        
        // Match: set(VAR_NAME or option(VAR_NAME
        const patterns = [
            new RegExp(`^\\s*set\\s*\\(\\s*(${variableName})\\b`, 'gim'),
            new RegExp(`^\\s*option\\s*\\(\\s*(${variableName})\\b`, 'gim'),
        ];
        
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const position = document.positionAt(match.index);
                return new vscode.Location(document.uri, position);
            }
        }
        
        return null;
    }
    
    /**
     * Get definition location for a CMake path
     */
    private getPathDefinition(
        document: vscode.TextDocument,
        match: CMakePathMatch
    ): vscode.Definition | null {
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
        
        // Only navigate if the path can be fully resolved and exists
        if (resolved.unresolvedVariables.length === 0 && resolved.exists) {
            try {
                const stat = fs.statSync(resolved.resolved);
                
                if (stat.isFile()) {
                    // Return location at the beginning of the file
                    return new vscode.Location(
                        vscode.Uri.file(resolved.resolved),
                        new vscode.Position(0, 0)
                    );
                } else if (stat.isDirectory()) {
                    // For directories, check if it's in current workspace
                    const workspaceFolders = vscode.workspace.workspaceFolders;
                    if (workspaceFolders) {
                        const targetAbspath = path.resolve(resolved.resolved);
                        for (const folder of workspaceFolders) {
                            const folderPath = path.resolve(folder.uri.fsPath);
                            // If directory is in workspace, return a location that will trigger folder reveal
                            if (targetAbspath === folderPath || targetAbspath.startsWith(folderPath + path.sep)) {
                                // Create a location that references the directory
                                return new vscode.Location(
                                    vscode.Uri.file(resolved.resolved),
                                    new vscode.Position(0, 0)
                                );
                            }
                        }
                    }
                    
                    // Directory outside workspace - use command to open it
                    // Return null here since definition provider can't directly execute commands
                    // The openPath command will be handled via document link instead
                    return null;
                }
            } catch (error) {
                // File doesn't exist or can't be accessed
                return null;
            }
        }
        
        return null;
    }
}

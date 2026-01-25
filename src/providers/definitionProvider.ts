/**
 * Definition Provider
 * Enables Ctrl+Click navigation to resolved paths (files and directories)
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parsePaths } from '../parsers';
import { getVariableResolver } from '../services/variableResolver';

export class CMakeDefinitionProvider implements vscode.DefinitionProvider {
    
    /**
     * Provide definition locations for CMake paths
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
        
        // Find if we're on a CMake path
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
     * Get definition location for a CMake path
     */
    private getPathDefinition(
        document: vscode.TextDocument,
        match: { fullPath: string; startIndex: number; endIndex: number; variables: import('../parsers/cmakeVariableParser').CMakeVariableMatch[] }
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

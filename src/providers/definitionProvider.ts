/**
 * Definition Provider
 * Enables Ctrl+Click navigation to resolved paths
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
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
        match: { fullPath: string; startIndex: number; endIndex: number }
    ): vscode.Definition | null {
        const resolver = getVariableResolver();
        const resolved = resolver.resolvePath(match.fullPath);
        
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
                    // For directories, try to open the folder in explorer
                    // VS Code will handle this appropriately
                    return new vscode.Location(
                        vscode.Uri.file(resolved.resolved),
                        new vscode.Position(0, 0)
                    );
                }
            } catch (error) {
                // File doesn't exist or can't be accessed
                return null;
            }
        }
        
        return null;
    }
}

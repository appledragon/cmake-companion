/**
 * Document Link Provider
 * Provides clickable links for CMake variable paths with underline decoration
 * Supports both files and directories with smart navigation
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parsePaths } from '../parsers';
import { getVariableResolver } from '../services/variableResolver';

export class CMakeDocumentLinkProvider implements vscode.DocumentLinkProvider {
    
    /**
     * Provide document links for CMake paths
     * @param document The document
     * @param token Cancellation token
     * @returns Array of document links
     */
    provideDocumentLinks(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.DocumentLink[]> {
        const links: vscode.DocumentLink[] = [];
        const text = document.getText();
        const pathMatches = parsePaths(text);
        const resolver = getVariableResolver();
        const documentDir = path.dirname(document.uri.fsPath);
        
        for (const match of pathMatches) {
            if (token.isCancellationRequested) {
                return links;
            }
            
            let resolved;
            
            // If the path has variables, use the resolver
            if (match.variables.length > 0) {
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
            
            // Only create links for paths that can be fully resolved
            if (resolved.unresolvedVariables.length === 0) {
                const startPos = document.positionAt(match.startIndex);
                const endPos = document.positionAt(match.endIndex);
                const range = new vscode.Range(startPos, endPos);
                
                // Create a command URI for the resolved path to enable custom handling
                const params = encodeURIComponent(JSON.stringify([resolved.resolved]));
                const commandUri = vscode.Uri.parse(`command:cmake-path-resolver.openPath?${params}`);
                
                const link = new vscode.DocumentLink(range, commandUri);
                
                // Add tooltip based on path type
                if (resolved.exists) {
                    try {
                        const stat = fs.statSync(resolved.resolved);
                        if (stat.isDirectory()) {
                            link.tooltip = `Open directory: ${resolved.resolved}`;
                        } else {
                            link.tooltip = `Open file: ${resolved.resolved}`;
                        }
                    } catch {
                        link.tooltip = `Open: ${resolved.resolved}`;
                    }
                } else {
                    link.tooltip = `Path: ${resolved.resolved} (not found)`;
                }
                
                links.push(link);
            }
        }
        
        return links;
    }
    
    /**
     * Resolve a document link (optional, adds more info)
     * @param link The link to resolve
     * @param _token Cancellation token
     * @returns Resolved link
     */
    resolveDocumentLink(
        link: vscode.DocumentLink,
        _token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.DocumentLink> {
        return link;
    }
}

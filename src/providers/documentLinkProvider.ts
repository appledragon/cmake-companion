/**
 * Document Link Provider
 * Provides clickable links for CMake variable paths with underline decoration
 */

import * as vscode from 'vscode';
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
        
        for (const match of pathMatches) {
            if (token.isCancellationRequested) {
                return links;
            }
            
            const resolved = resolver.resolvePath(match.fullPath);
            
            // Only create links for paths that can be fully resolved
            if (resolved.unresolvedVariables.length === 0) {
                const startPos = document.positionAt(match.startIndex);
                const endPos = document.positionAt(match.endIndex);
                const range = new vscode.Range(startPos, endPos);
                
                // Create a file URI for the resolved path
                const targetUri = vscode.Uri.file(resolved.resolved);
                
                const link = new vscode.DocumentLink(range, targetUri);
                link.tooltip = resolved.exists 
                    ? `Open: ${resolved.resolved}`
                    : `Path: ${resolved.resolved} (file not found)`;
                
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

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
import { getBuiltInVariableType, isNonPathVariable } from '../utils/cmakeBuiltins';

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
            
            // Skip links for non-path variables (e.g. CMAKE_CXX_STANDARD -> 17)
            const hasNonPathVar = match.variables.some(v => {
                const varType = getBuiltInVariableType(v.variableName);
                return varType === 'value' || isNonPathVariable(v.variableName);
            });
            if (hasNonPathVar) {
                continue;
            }

            // Only create links for paths that can be fully resolved
            if (resolved.unresolvedVariables.length === 0) {
                const startPos = document.positionAt(match.startIndex);
                const endPos = document.positionAt(match.endIndex);
                const range = new vscode.Range(startPos, endPos);
                
                // For CMake lists (semicolon-separated), use command URI to show quick pick
                const isList = resolved.resolved.includes(';');
                
                let linkTarget: vscode.Uri;
                let tooltip: string;
                
                if (isList) {
                    const params = encodeURIComponent(JSON.stringify([resolved.resolved]));
                    linkTarget = vscode.Uri.parse(`command:cmake-companion.openPath?${params}`);
                    const items = resolved.resolved.split(';');
                    const existCount = items.filter(i => { try { return fs.existsSync(i.trim()); } catch { return false; } }).length;
                    tooltip = `${existCount}/${items.length} files found (ctrl + click to select)`;
                } else if (resolved.exists) {
                    let isDir = false;
                    try { isDir = fs.statSync(resolved.resolved).isDirectory(); } catch { /* ignore */ }
                    if (isDir) {
                        // Directories need the command handler for reveal-in-explorer logic
                        const params = encodeURIComponent(JSON.stringify([resolved.resolved]));
                        linkTarget = vscode.Uri.parse(`command:cmake-companion.openPath?${params}`);
                        tooltip = `Open directory: ${resolved.resolved}`;
                    } else {
                        // Files can use file URI directly — most reliable
                        linkTarget = vscode.Uri.file(resolved.resolved);
                        tooltip = `Open file: ${resolved.resolved}`;
                    }
                } else {
                    // Path doesn't exist — use file URI anyway (VS Code will show its own error)
                    linkTarget = vscode.Uri.file(resolved.resolved);
                    tooltip = `Path: ${resolved.resolved} (not found)`;
                }
                
                const link = new vscode.DocumentLink(range, linkTarget);
                link.tooltip = tooltip;
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

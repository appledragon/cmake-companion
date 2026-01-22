/**
 * Variable Resolver Service
 * Extends CoreVariableResolver with VS Code specific functionality
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { CoreVariableResolver } from './coreVariableResolver';

// Re-export ResolvedPath for convenience
export { ResolvedPath } from './coreVariableResolver';

/**
 * Variable Resolver Service
 * Handles CMake variable storage, resolution, and built-in variable support
 * with VS Code integration
 */
export class VariableResolver extends CoreVariableResolver {
    
    /**
     * Initialize the resolver with VS Code workspace folders
     * @param workspaceFolders VS Code workspace folders
     */
    initializeFromVSCode(workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined): void {
        const folders = workspaceFolders?.map(f => f.uri.fsPath) || [];
        super.initialize(folders);
        this.loadVSCodeCustomVariables();
    }
    
    /**
     * Load custom variables from VS Code settings
     */
    private loadVSCodeCustomVariables(): void {
        const config = vscode.workspace.getConfiguration('cmake-path-resolver');
        const customVariables = config.get<Record<string, string>>('customVariables', {});
        super.loadCustomVariables(customVariables);
    }
    
    /**
     * Clear all variables and reload built-ins and custom variables
     */
    override clear(): void {
        super.clear();
        this.loadVSCodeCustomVariables();
    }
    
    /**
     * Scan workspace for all CMakeLists.txt files and parse them
     */
    async scanWorkspace(): Promise<void> {
        const files = await vscode.workspace.findFiles('**/CMakeLists.txt', '**/build/**');
        
        // Sort files by depth (parse parent directories first)
        const sortedFiles = files.sort((a, b) => {
            const depthA = a.fsPath.split(path.sep).length;
            const depthB = b.fsPath.split(path.sep).length;
            return depthA - depthB;
        });
        
        for (const file of sortedFiles) {
            await this.parseFile(file.fsPath);
        }
        
        // Also scan .cmake files
        const cmakeFiles = await vscode.workspace.findFiles('**/*.cmake', '**/build/**');
        for (const file of cmakeFiles) {
            await this.parseFile(file.fsPath);
        }
    }
}

// Singleton instance
let instance: VariableResolver | null = null;

/**
 * Get the singleton instance of VariableResolver
 * @returns VariableResolver instance
 */
export function getVariableResolver(): VariableResolver {
    if (!instance) {
        instance = new VariableResolver();
    }
    return instance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetVariableResolver(): void {
    instance = null;
}

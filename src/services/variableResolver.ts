/**
 * Variable Resolver Service
 * Extends CoreVariableResolver with VS Code specific functionality
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { CoreVariableResolver } from './coreVariableResolver';

// Re-export ResolvedPath for convenience
export { ResolvedPath } from './coreVariableResolver';

const outputChannel = vscode.window.createOutputChannel('CMake Path Resolver');

function logDebug(enabled: boolean, message: string): void {
    if (!enabled) {
        return;
    }
    const timestamp = new Date().toISOString();
    outputChannel.appendLine(`[${timestamp}] ${message}`);
}

/**
 * Variable Resolver Service
 * Handles CMake variable storage, resolution, and built-in variable support
 * with VS Code integration
 */
export class VariableResolver extends CoreVariableResolver {
    private debugEnabled = false;
    
    /**
     * Initialize the resolver with VS Code workspace folders
     * @param workspaceFolders VS Code workspace folders
     */
    initializeFromVSCode(workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined): void {
        const folders = workspaceFolders?.map(f => f.uri.fsPath) || [];
        super.initialize(folders);
        this.loadVSCodeCustomVariables();
        this.loadVSCodeEnvironmentVariables();
        logDebug(this.debugEnabled, `Initialized with folders: ${folders.join(', ')}`);
    }
    
    /**
     * Load custom variables from VS Code settings
     */
    private loadVSCodeCustomVariables(): void {
        const config = vscode.workspace.getConfiguration('cmake-path-resolver');
        const customVariables = config.get<Record<string, string>>('customVariables', {});
        this.debugEnabled = config.get<boolean>('debugLogging', false);
        super.loadCustomVariables(customVariables);
        logDebug(this.debugEnabled, `Loaded ${Object.keys(customVariables).length} custom variables`);
    }
    
    /**
     * Load environment variables from VS Code settings (overrides process.env)
     */
    private loadVSCodeEnvironmentVariables(): void {
        const config = vscode.workspace.getConfiguration('cmake-path-resolver');
        const envOverrides = config.get<Record<string, string>>('environmentVariables', {});
        super.loadEnvVariables(envOverrides);
        logDebug(this.debugEnabled, `Loaded environment overrides: ${Object.keys(envOverrides).length}`);
    }
    
    /**
     * Clear all variables and reload built-ins and custom variables
     */
    override clear(): void {
        super.clear();
        this.loadVSCodeCustomVariables();
        this.loadVSCodeEnvironmentVariables();
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

        logDebug(this.debugEnabled, `Workspace scan completed. Variables loaded: ${this.getVariableNames().length}`);
    }

    /**
     * Re-parse a single file incrementally
     */
    async reparseFile(filePath: string): Promise<void> {
        this.removeDefinitionsForFile(filePath);
        await this.parseFile(filePath);
        logDebug(this.debugEnabled, `Reparsed file: ${filePath}`);
    }

    /**
     * Remove definitions originating from a file (e.g., on delete)
     */
    removeFile(filePath: string): void {
        this.removeDefinitionsForFile(filePath);
        logDebug(this.debugEnabled, `Removed definitions for file: ${filePath}`);
    }

    /**
     * Remove variables/definitions tied to a specific file
     */
    private removeDefinitionsForFile(filePath: string): void {
        for (const [name, def] of Array.from(this.definitions.entries())) {
            if (def.file === filePath) {
                this.definitions.delete(name);
                this.variables.delete(name);
            }
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

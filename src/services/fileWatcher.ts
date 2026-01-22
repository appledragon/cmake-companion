/**
 * File Watcher Service
 * Monitors CMakeLists.txt and *.cmake files for changes
 */

import * as vscode from 'vscode';
import { getVariableResolver } from './variableResolver';

export class FileWatcher implements vscode.Disposable {
    private watchers: vscode.FileSystemWatcher[] = [];
    private refreshDebounceTimer: NodeJS.Timeout | null = null;
    private readonly debounceDelay = 500; // ms
    
    /**
     * Start watching for CMake file changes
     */
    start(): void {
        // Watch CMakeLists.txt files
        const cmakeListsWatcher = vscode.workspace.createFileSystemWatcher('**/CMakeLists.txt');
        cmakeListsWatcher.onDidChange(this.onFileChange.bind(this));
        cmakeListsWatcher.onDidCreate(this.onFileChange.bind(this));
        cmakeListsWatcher.onDidDelete(this.onFileDelete.bind(this));
        this.watchers.push(cmakeListsWatcher);
        
        // Watch .cmake files
        const cmakeFilesWatcher = vscode.workspace.createFileSystemWatcher('**/*.cmake');
        cmakeFilesWatcher.onDidChange(this.onFileChange.bind(this));
        cmakeFilesWatcher.onDidCreate(this.onFileChange.bind(this));
        cmakeFilesWatcher.onDidDelete(this.onFileDelete.bind(this));
        this.watchers.push(cmakeFilesWatcher);
    }
    
    /**
     * Handle file change events
     * @param _uri The changed file URI
     */
    private onFileChange(uri: vscode.Uri): void {
        this.scheduleRefresh(uri, false);
    }
    
    /**
     * Handle file deletion events
     * @param _uri The deleted file URI
     */
    private onFileDelete(uri: vscode.Uri): void {
        this.scheduleRefresh(uri, true);
    }
    
    /**
     * Schedule a debounced refresh of variables
     */
    private scheduleRefresh(uri?: vscode.Uri, isDelete = false): void {
        if (this.refreshDebounceTimer) {
            clearTimeout(this.refreshDebounceTimer);
        }
        
        this.refreshDebounceTimer = setTimeout(async () => {
            await this.refreshVariables(uri, isDelete);
        }, this.debounceDelay);
    }
    
    /**
     * Refresh all variables by rescanning the workspace
     */
    async refreshVariables(uri?: vscode.Uri, isDelete = false): Promise<void> {
        const resolver = getVariableResolver();
        if (uri) {
            const filePath = uri.fsPath;
            if (isDelete) {
                resolver.removeFile(filePath);
            } else {
                await resolver.reparseFile(filePath);
            }
        } else {
            resolver.clear();
            await resolver.scanWorkspace();
        }
        
        // Trigger refresh of decorations in open editors
        vscode.commands.executeCommand('cmake-path-resolver.internal.refreshDecorations');
        vscode.commands.executeCommand('cmake-path-resolver.internal.refreshStatus', {
            count: resolver.getVariableNames().length,
            lastRefreshed: new Date().toISOString(),
            mode: uri ? 'incremental' : 'full'
        });
    }
    
    /**
     * Dispose of all watchers
     */
    dispose(): void {
        if (this.refreshDebounceTimer) {
            clearTimeout(this.refreshDebounceTimer);
        }
        
        for (const watcher of this.watchers) {
            watcher.dispose();
        }
        this.watchers = [];
    }
}

// Singleton instance
let instance: FileWatcher | null = null;

/**
 * Get the singleton instance of FileWatcher
 * @returns FileWatcher instance
 */
export function getFileWatcher(): FileWatcher {
    if (!instance) {
        instance = new FileWatcher();
    }
    return instance;
}

/**
 * Dispose the file watcher singleton
 */
export function disposeFileWatcher(): void {
    if (instance) {
        instance.dispose();
        instance = null;
    }
}

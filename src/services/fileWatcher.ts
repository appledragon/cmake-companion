/**
 * File Watcher Service
 * Monitors CMakeLists.txt and *.cmake files for changes
 * Only watches files that have been opened by the user
 */

import * as vscode from 'vscode';
import { getVariableResolver } from './variableResolver';

export class FileWatcher implements vscode.Disposable {
    private watchers: Map<string, vscode.FileSystemWatcher> = new Map();
    private refreshDebounceTimer: NodeJS.Timeout | null = null;
    private readonly debounceDelay = 500; // ms
    
    /**
     * Start watching for CMake file changes
     * Note: Individual files are added to watch list via addFile()
     */
    start(): void {
        // No longer create global watchers - files are watched individually when opened
    }
    
    /**
     * Add a specific file to the watch list
     * @param filePath The file path to watch
     */
    addFile(filePath: string): void {
        // Don't add if already watching
        if (this.watchers.has(filePath)) {
            return;
        }
        
        // Create a watcher for this specific file
        const watcher = vscode.workspace.createFileSystemWatcher(filePath);
        watcher.onDidChange(this.onFileChange.bind(this));
        watcher.onDidDelete(this.onFileDelete.bind(this));
        this.watchers.set(filePath, watcher);
    }
    
    /**
     * Remove a file from the watch list
     * @param filePath The file path to stop watching
     */
    removeFile(filePath: string): void {
        const watcher = this.watchers.get(filePath);
        if (watcher) {
            watcher.dispose();
            this.watchers.delete(filePath);
        }
    }
    
    /**
     * Handle file change events
     * @param uri The changed file URI
     */
    private onFileChange(uri: vscode.Uri): void {
        this.scheduleRefresh(uri, false);
    }
    
    /**
     * Handle file deletion events
     * @param uri The deleted file URI
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
     * Refresh variables for a specific file
     */
    async refreshVariables(uri?: vscode.Uri, isDelete = false): Promise<void> {
        const resolver = getVariableResolver();
        if (uri) {
            const filePath = uri.fsPath;
            if (isDelete) {
                resolver.removeFile(filePath);
                this.removeFile(filePath);
            } else {
                await resolver.reparseFile(filePath);
            }
        }
        
        // Trigger refresh of decorations in open editors
        vscode.commands.executeCommand('cmake-path-resolver.internal.refreshDecorations');
        vscode.commands.executeCommand('cmake-path-resolver.internal.refreshStatus', {
            count: resolver.getVariableNames().length,
            lastRefreshed: new Date().toISOString(),
            mode: 'incremental'
        });
    }
    
    /**
     * Dispose of all watchers
     */
    dispose(): void {
        if (this.refreshDebounceTimer) {
            clearTimeout(this.refreshDebounceTimer);
        }
        
        for (const watcher of this.watchers.values()) {
            watcher.dispose();
        }
        this.watchers.clear();
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

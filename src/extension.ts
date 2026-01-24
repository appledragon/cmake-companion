/**
 * CMake Path Resolver Extension
 * Main entry point for the VS Code extension
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { 
    CMakeDocumentLinkProvider, 
    CMakeHoverProvider, 
    CMakeDefinitionProvider,
    CMakeSemanticTokensProvider,
    CMakeDocumentFormattingProvider,
    CMakeDocumentRangeFormattingProvider,
    CMakeOnTypeFormattingProvider,
    legend
} from './providers';
import { getVariableResolver, getFileWatcher, disposeFileWatcher } from './services';

// Supported language IDs and file patterns
// Only support CMake files - C/C++ path resolution is handled by other extensions
const SUPPORTED_LANGUAGES = [
    { language: 'cmake' },
    { pattern: '**/*.cmake' },
    { pattern: '**/CMakeLists.txt' }
];

/**
 * Extension activation
 * @param context Extension context
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('CMake Path Resolver is now active!');
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBar.tooltip = 'CMake Path Resolver';
    statusBar.show();
    context.subscriptions.push(statusBar);
    let lastRefreshed = new Date();
    
    // Initialize variable resolver (but don't scan workspace yet)
    const resolver = getVariableResolver();
    resolver.initializeFromVSCode(vscode.workspace.workspaceFolders);
    
    // Initialize file watcher (files will be added to watch list when opened)
    const fileWatcher = getFileWatcher();
    fileWatcher.start();
    context.subscriptions.push({ dispose: () => disposeFileWatcher() });
    
    // Don't scan entire workspace - parse files on-demand when opened
    updateStatusBar();
    
    // Register document link provider for all supported languages/patterns
    for (const selector of SUPPORTED_LANGUAGES) {
        const linkProvider = vscode.languages.registerDocumentLinkProvider(
            selector,
            new CMakeDocumentLinkProvider()
        );
        context.subscriptions.push(linkProvider);
    }
    
    // Register hover provider for all supported languages/patterns
    for (const selector of SUPPORTED_LANGUAGES) {
        const hoverProvider = vscode.languages.registerHoverProvider(
            selector,
            new CMakeHoverProvider()
        );
        context.subscriptions.push(hoverProvider);
    }
    
    // Register definition provider for all supported languages/patterns
    for (const selector of SUPPORTED_LANGUAGES) {
        const definitionProvider = vscode.languages.registerDefinitionProvider(
            selector,
            new CMakeDefinitionProvider()
        );
        context.subscriptions.push(definitionProvider);
    }
    
    // Register semantic tokens provider for all supported languages/patterns
    for (const selector of SUPPORTED_LANGUAGES) {
        const semanticTokensProvider = vscode.languages.registerDocumentSemanticTokensProvider(
            selector,
            new CMakeSemanticTokensProvider(),
            legend
        );
        context.subscriptions.push(semanticTokensProvider);
    }
    
    // Register document formatting provider for all supported languages/patterns
    for (const selector of SUPPORTED_LANGUAGES) {
        const formattingProvider = vscode.languages.registerDocumentFormattingEditProvider(
            selector,
            new CMakeDocumentFormattingProvider()
        );
        context.subscriptions.push(formattingProvider);
    }
    
    // Register document range formatting provider for all supported languages/patterns
    for (const selector of SUPPORTED_LANGUAGES) {
        const rangeFormattingProvider = vscode.languages.registerDocumentRangeFormattingEditProvider(
            selector,
            new CMakeDocumentRangeFormattingProvider()
        );
        context.subscriptions.push(rangeFormattingProvider);
    }
    
    // Register on-type formatting provider for all supported languages/patterns
    for (const selector of SUPPORTED_LANGUAGES) {
        const onTypeFormattingProvider = vscode.languages.registerOnTypeFormattingEditProvider(
            selector,
            new CMakeOnTypeFormattingProvider(),
            CMakeOnTypeFormattingProvider.triggerCharacters[0], // First trigger char
            ...CMakeOnTypeFormattingProvider.triggerCharacters.slice(1) // Rest of trigger chars
        );
        context.subscriptions.push(onTypeFormattingProvider);
    }
    
    // Register commands
    const resolvePathCommand = vscode.commands.registerCommand(
        'cmake-path-resolver.resolvePath',
        resolvePathCommandHandler
    );
    context.subscriptions.push(resolvePathCommand);
    
    const refreshCommand = vscode.commands.registerCommand(
        'cmake-path-resolver.refreshVariables',
        refreshVariablesCommandHandler
    );
    context.subscriptions.push(refreshCommand);
    
    // Command to open paths (files or directories)
    const openPathCommand = vscode.commands.registerCommand(
        'cmake-path-resolver.openPath',
        openPathCommandHandler
    );
    context.subscriptions.push(openPathCommand);
    
    // Internal command to refresh decorations (used by file watcher)
    const internalRefreshCommand = vscode.commands.registerCommand(
        'cmake-path-resolver.internal.refreshDecorations',
        () => {
            // Trigger re-validation of open documents
            // This will cause the providers to re-evaluate
        }
    );
    context.subscriptions.push(internalRefreshCommand);

    const internalStatusCommand = vscode.commands.registerCommand(
        'cmake-path-resolver.internal.refreshStatus',
        (info?: { count?: number; lastRefreshed?: string }) => {
            if (info?.lastRefreshed) {
                lastRefreshed = new Date(info.lastRefreshed);
            }
            updateStatusBar(info?.count);
        }
    );
    context.subscriptions.push(internalStatusCommand);
    
    // Parse CMake files on-demand when they are opened
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(async (document) => {
            // Only parse CMake files
            if (isCMakeFile(document)) {
                const filePath = document.uri.fsPath;
                await resolver.parseFile(filePath);
                // Add to file watcher list
                fileWatcher.addFile(filePath);
                lastRefreshed = new Date();
                updateStatusBar();
            }
        })
    );
    
    // Also parse any already-open CMake files at activation
    for (const document of vscode.workspace.textDocuments) {
        if (isCMakeFile(document)) {
            await resolver.parseFile(document.uri.fsPath);
            // Add to file watcher list
            fileWatcher.addFile(document.uri.fsPath);
        }
    }
    lastRefreshed = new Date();
    updateStatusBar();
    
    // Listen for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('cmake-path-resolver')) {
                resolver.clear();
                // Reparse only currently open CMake files
                for (const document of vscode.workspace.textDocuments) {
                    if (isCMakeFile(document)) {
                        await resolver.parseFile(document.uri.fsPath);
                    }
                }
                lastRefreshed = new Date();
                updateStatusBar();
            }
        })
    );
    
    // Show activation message
    function updateStatusBar(countOverride?: number): void {
        const count = countOverride ?? resolver.getVariableNames().length;
        const ts = lastRefreshed.toLocaleTimeString();
        statusBar.text = `CMake Vars: ${count} | Refreshed ${ts}`;
    }
}

/**
 * Check if a document is a CMake file
 * @param document The document to check
 * @returns True if the document is a CMake file
 */
function isCMakeFile(document: vscode.TextDocument): boolean {
    // Check language ID
    if (document.languageId === 'cmake') {
        return true;
    }
    
    // Check file name/extension
    const fileName = path.basename(document.fileName);
    if (fileName === 'CMakeLists.txt' || fileName.endsWith('.cmake')) {
        return true;
    }
    
    return false;
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
    disposeFileWatcher();
    console.log('CMake Path Resolver is now deactivated.');
}

/**
 * Command handler: Resolve CMake Path
 * Shows an input box to resolve a CMake path expression
 */
async function resolvePathCommandHandler(): Promise<void> {
    const resolver = getVariableResolver();
    
    // Get text from selection or prompt for input
    const editor = vscode.window.activeTextEditor;
    let pathExpression = '';
    
    if (editor && !editor.selection.isEmpty) {
        pathExpression = editor.document.getText(editor.selection);
    } else {
        const input = await vscode.window.showInputBox({
            prompt: 'Enter CMake path expression to resolve',
            placeHolder: '${PROJECT_SOURCE_DIR}/include/header.h',
            value: pathExpression
        });
        
        if (!input) {
            return;
        }
        pathExpression = input;
    }
    
    const resolved = resolver.resolvePath(pathExpression);
    
    // Show result in information message
    let message = `Resolved: ${resolved.resolved}`;
    
    if (resolved.unresolvedVariables.length > 0) {
        message += `\nUnresolved: ${resolved.unresolvedVariables.join(', ')}`;
    }
    
    if (resolved.exists) {
        const action = await vscode.window.showInformationMessage(
            message,
            'Open File'
        );
        
        if (action === 'Open File') {
            const doc = await vscode.workspace.openTextDocument(resolved.resolved);
            await vscode.window.showTextDocument(doc);
        }
    } else {
        vscode.window.showWarningMessage(`${message}\n(File not found)`);
    }
}

/**
 * Command handler: Refresh CMake Variables
 * Manually trigger a refresh of CMake variables from currently open files
 */
async function refreshVariablesCommandHandler(): Promise<void> {
    const resolver = getVariableResolver();
    
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Refreshing CMake variables...',
            cancellable: false
        },
        async () => {
            resolver.clear();
            // Only reparse currently open CMake files
            for (const document of vscode.workspace.textDocuments) {
                if (isCMakeFile(document)) {
                    await resolver.parseFile(document.uri.fsPath);
                }
            }
        }
    );
    
    const variableCount = resolver.getVariableNames().length;
    vscode.window.showInformationMessage(
        `CMake Path Resolver: ${variableCount} variables loaded from open files`
    );
}

/**
 * Command handler: Open Path
 * Intelligently opens files or directories
 * For files: opens in editor
 * For directories: reveals in explorer if in workspace, opens new window if outside
 */
async function openPathCommandHandler(targetPath: string): Promise<void> {
    if (!fs.existsSync(targetPath)) {
        vscode.window.showErrorMessage(`Path does not exist: ${targetPath}`);
        return;
    }
    
    const stat = fs.statSync(targetPath);
    
    if (stat.isFile()) {
        // Open file in current window
        try {
            const doc = await vscode.workspace.openTextDocument(targetPath);
            await vscode.window.showTextDocument(doc);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${targetPath}`);
        }
    } else if (stat.isDirectory()) {
        // Check if directory is within current workspace
        const workspaceFolders = vscode.workspace.workspaceFolders;
        let isInCurrentWorkspace = false;
        
        if (workspaceFolders) {
            const targetAbspath = path.resolve(targetPath);
            for (const folder of workspaceFolders) {
                const folderPath = path.resolve(folder.uri.fsPath);
                // Check if target is inside this workspace folder
                if (targetAbspath === folderPath || targetAbspath.startsWith(folderPath + path.sep)) {
                    isInCurrentWorkspace = true;
                    break;
                }
            }
        }
        
        if (isInCurrentWorkspace) {
            // Reveal directory in explorer panel (in current workspace)
            try {
                await vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(targetPath));
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to reveal directory: ${targetPath}`);
            }
        } else {
            // Open directory in new VS Code window
            try {
                await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(targetPath), true);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to open directory in new window: ${targetPath}`);
            }
        }
    }
}

/**
 * CMake Path Resolver Extension
 * Main entry point for the VS Code extension
 */

import * as vscode from 'vscode';
import { CMakeDocumentLinkProvider, CMakeHoverProvider, CMakeDefinitionProvider } from './providers';
import { getVariableResolver, getFileWatcher, disposeFileWatcher } from './services';

// Supported language IDs and file patterns
const SUPPORTED_LANGUAGES = [
    { language: 'cmake' },
    { language: 'cpp' },
    { language: 'c' },
    { pattern: '**/*.h' },
    { pattern: '**/*.hpp' },
    { pattern: '**/*.cmake' },
    { pattern: '**/CMakeLists.txt' }
];

/**
 * Extension activation
 * @param context Extension context
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('CMake Path Resolver is now active!');
    
    // Initialize variable resolver
    const resolver = getVariableResolver();
    resolver.initializeFromVSCode(vscode.workspace.workspaceFolders);
    
    // Scan workspace for CMake files
    await resolver.scanWorkspace();
    
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
    
    // Internal command to refresh decorations (used by file watcher)
    const internalRefreshCommand = vscode.commands.registerCommand(
        'cmake-path-resolver.internal.refreshDecorations',
        () => {
            // Trigger re-validation of open documents
            // This will cause the providers to re-evaluate
        }
    );
    context.subscriptions.push(internalRefreshCommand);
    
    // Start file watcher
    const fileWatcher = getFileWatcher();
    fileWatcher.start();
    context.subscriptions.push({ dispose: () => disposeFileWatcher() });
    
    // Listen for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('cmake-path-resolver')) {
                resolver.clear();
                await resolver.scanWorkspace();
            }
        })
    );
    
    // Show activation message
    const variableCount = resolver.getVariableNames().length;
    vscode.window.setStatusBarMessage(
        `CMake Path Resolver: ${variableCount} variables loaded`,
        5000
    );
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
 * Manually trigger a refresh of all CMake variables
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
            await resolver.scanWorkspace();
        }
    );
    
    const variableCount = resolver.getVariableNames().length;
    vscode.window.showInformationMessage(
        `CMake Path Resolver: ${variableCount} variables loaded`
    );
}

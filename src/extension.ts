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
import { parseVcxproj, generateCMakeLists, parseXcodeproj, generateCMakeListsFromXcode } from './parsers';

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
    
    // Command to convert vcxproj to CMake
    const convertVcxprojCommand = vscode.commands.registerCommand(
        'cmake-path-resolver.convertVcxprojToCMake',
        convertVcxprojToCMakeHandler
    );
    context.subscriptions.push(convertVcxprojCommand);
    
    // Command to convert Xcode project to CMake
    const convertXcodeprojCommand = vscode.commands.registerCommand(
        'cmake-path-resolver.convertXcodeprojToCMake',
        convertXcodeprojToCMakeHandler
    );
    context.subscriptions.push(convertXcodeprojCommand);
    
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
 * Command handler: Convert vcxproj to CMake
 * Converts a Visual Studio project file to CMakeLists.txt
 * @param uri Optional URI passed when invoked from explorer context menu
 */
async function convertVcxprojToCMakeHandler(uri?: vscode.Uri): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    
    // Check if there's an active editor with a vcxproj file
    let vcxprojPath: string | undefined;
    
    // First check if URI was passed from context menu
    if (uri && uri.fsPath.endsWith('.vcxproj')) {
        vcxprojPath = uri.fsPath;
    } else if (editor && editor.document.fileName.endsWith('.vcxproj')) {
        vcxprojPath = editor.document.fileName;
    } else {
        // Show file picker for vcxproj files
        const fileUri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Select vcxproj file',
            filters: {
                'Visual Studio Project': ['vcxproj']
            }
        });
        
        if (!fileUri || fileUri.length === 0) {
            return;
        }
        
        vcxprojPath = fileUri[0].fsPath;
    }
    
    // Read the vcxproj file
    let vcxprojContent: string;
    try {
        vcxprojContent = fs.readFileSync(vcxprojPath, 'utf8');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to read vcxproj file: ${message}`);
        return;
    }
    
    // Parse the vcxproj file
    let project;
    try {
        project = parseVcxproj(vcxprojContent, vcxprojPath);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to parse vcxproj file: ${message}`);
        return;
    }
    
    // Generate CMakeLists.txt content
    const cmakeContent = generateCMakeLists(project);
    
    // Determine output path (same directory as vcxproj)
    const vcxprojDir = path.dirname(vcxprojPath);
    const cmakeListsPath = path.join(vcxprojDir, 'CMakeLists.txt');
    
    // Check if CMakeLists.txt already exists
    if (fs.existsSync(cmakeListsPath)) {
        const overwrite = await vscode.window.showWarningMessage(
            `CMakeLists.txt already exists in ${vcxprojDir}. Overwrite?`,
            'Yes',
            'No'
        );
        
        if (overwrite !== 'Yes') {
            return;
        }
    }
    
    // Write the CMakeLists.txt file
    try {
        fs.writeFileSync(cmakeListsPath, cmakeContent, 'utf8');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to write CMakeLists.txt: ${message}`);
        return;
    }
    
    // Show success message and open the file
    const action = await vscode.window.showInformationMessage(
        `Successfully converted ${path.basename(vcxprojPath)} to CMakeLists.txt`,
        'Open CMakeLists.txt'
    );
    
    if (action === 'Open CMakeLists.txt') {
        const doc = await vscode.workspace.openTextDocument(cmakeListsPath);
        await vscode.window.showTextDocument(doc);
    }
}

/**
 * Command handler: Convert Xcode project to CMake
 * Converts an Xcode project file to CMakeLists.txt
 * @param uri Optional URI passed when invoked from explorer context menu
 */
async function convertXcodeprojToCMakeHandler(uri?: vscode.Uri): Promise<void> {
    // Find the xcodeproj directory
    let xcodeprojPath: string | undefined;
    
    // First check if URI was passed from context menu
    if (uri && uri.fsPath.endsWith('.xcodeproj')) {
        xcodeprojPath = uri.fsPath;
    } else {
        // Show directory picker for xcodeproj directories
        const fileUri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            canSelectFolders: true,
            openLabel: 'Select Xcode project',
            filters: {}
        });
        
        if (!fileUri || fileUri.length === 0) {
            return;
        }
        
        xcodeprojPath = fileUri[0].fsPath;
        if (!xcodeprojPath.endsWith('.xcodeproj')) {
            vscode.window.showErrorMessage('Please select an .xcodeproj directory');
            return;
        }
    }
    
    // The project.pbxproj file is inside the .xcodeproj directory
    const pbxprojPath = path.join(xcodeprojPath, 'project.pbxproj');
    
    if (!fs.existsSync(pbxprojPath)) {
        vscode.window.showErrorMessage(`project.pbxproj not found in ${xcodeprojPath}`);
        return;
    }
    
    // Read the project.pbxproj file
    let pbxprojContent: string;
    try {
        pbxprojContent = fs.readFileSync(pbxprojPath, 'utf8');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to read project.pbxproj file: ${message}`);
        return;
    }
    
    // Parse the Xcode project file
    let project;
    try {
        project = parseXcodeproj(pbxprojContent, xcodeprojPath);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to parse Xcode project file: ${message}`);
        return;
    }
    
    // Generate CMakeLists.txt content
    const cmakeContent = generateCMakeListsFromXcode(project);
    
    // Determine output path (parent directory of .xcodeproj)
    const projectDir = path.dirname(xcodeprojPath);
    const cmakeListsPath = path.join(projectDir, 'CMakeLists.txt');
    
    // Check if CMakeLists.txt already exists
    if (fs.existsSync(cmakeListsPath)) {
        const overwrite = await vscode.window.showWarningMessage(
            `CMakeLists.txt already exists in ${projectDir}. Overwrite?`,
            'Yes',
            'No'
        );
        
        if (overwrite !== 'Yes') {
            return;
        }
    }
    
    // Write the CMakeLists.txt file
    try {
        fs.writeFileSync(cmakeListsPath, cmakeContent, 'utf8');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to write CMakeLists.txt: ${message}`);
        return;
    }
    
    // Show success message and open the file
    const action = await vscode.window.showInformationMessage(
        `Successfully converted ${path.basename(xcodeprojPath)} to CMakeLists.txt`,
        'Open CMakeLists.txt'
    );
    
    if (action === 'Open CMakeLists.txt') {
        const doc = await vscode.workspace.openTextDocument(cmakeListsPath);
        await vscode.window.showTextDocument(doc);
    }
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

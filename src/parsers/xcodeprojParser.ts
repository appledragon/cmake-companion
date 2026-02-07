/**
 * Xcode Project (xcodeproj) Parser
 * Parses .xcodeproj/project.pbxproj files to extract project configuration for CMake conversion
 * 
 * Xcode project files use a property list (plist) format with unique object IDs
 * The main sections we care about:
 * - PBXProject: Root project configuration
 * - PBXNativeTarget: Build targets (app, library, etc.)
 * - XCBuildConfiguration: Build settings for configurations (Debug/Release)
 * - PBXSourcesBuildPhase: Source files to compile
 * - PBXFrameworksBuildPhase: Libraries to link
 * - PBXShellScriptBuildPhase: Custom shell scripts
 * - PBXFileReference: References to files in the project
 */

/**
 * Shell script build phase (Run Script phase in Xcode)
 */
export interface ShellScriptPhase {
    /** Name of the script phase */
    name?: string;
    /** Shell script content */
    shellScript: string;
    /** Shell path (e.g., /bin/sh) */
    shellPath?: string;
    /** Input file paths */
    inputPaths?: string[];
    /** Output file paths */
    outputPaths?: string[];
    /** Run only for deployment postprocessing */
    runOnlyForDeploymentPostprocessing?: boolean;
}

export interface XcodeprojProject {
    name: string;
    type: 'Application' | 'StaticLibrary' | 'DynamicLibrary' | 'Framework' | 'Bundle';
    sourceFiles: string[];
    headerFiles: string[];
    /** Resource files (images, xibs, storyboards, etc.) */
    resourceFiles: string[];
    includeDirectories: string[];
    preprocessorDefinitions: string[];
    libraries: string[];
    frameworks: string[];
    /** Additional compiler flags */
    additionalCompileOptions?: string[];
    /** Additional linker flags */
    additionalLinkOptions?: string[];
    /** Additional library search paths */
    additionalLibraryDirectories?: string[];
    /** Framework search paths */
    frameworkSearchPaths?: string[];
    /** C++ language standard (e.g., 11, 14, 17, 20, 23) */
    cxxStandard?: number;
    /** C language standard */
    cStandard?: number;
    /** Deployment target (e.g., "10.15" for macOS) */
    deploymentTarget?: string;
    /** iOS deployment target */
    iosDeploymentTarget?: string;
    /** Architecture (e.g., "arm64", "x86_64", "$(ARCHS_STANDARD)") */
    architecture?: string;
    /** Product name (bundle/app display name) */
    productName?: string;
    /** Bundle identifier */
    bundleIdentifier?: string;
    /** Info.plist file path */
    infoPlistFile?: string;
    /** Enable modules (clang modules, @import) */
    enableModules?: boolean;
    /** Enable ARC (Automatic Reference Counting) for Objective-C */
    enableARC?: boolean;
    /** Shell script build phases (Run Script phases) */
    shellScriptPhases?: ShellScriptPhase[];
    /** Copy files build phases */
    copyFilesPhases?: CopyFilesPhase[];
    /** Configuration-specific settings (e.g., Debug/Release) */
    configurations?: Record<string, XcodeprojConfigSettings>;
}

/**
 * Copy files build phase
 */
export interface CopyFilesPhase {
    /** Name of the copy files phase */
    name?: string;
    /** Destination subfolder spec */
    dstSubfolderSpec?: number;
    /** Destination path */
    dstPath?: string;
    /** Files to copy */
    files: string[];
}

export interface XcodeprojConfigSettings {
    includeDirectories?: string[];
    preprocessorDefinitions?: string[];
    libraries?: string[];
    frameworks?: string[];
    additionalCompileOptions?: string[];
    additionalLinkOptions?: string[];
    additionalLibraryDirectories?: string[];
    frameworkSearchPaths?: string[];
    optimization?: string;
    debugInformationFormat?: string;
}

/**
 * Parse an Xcode project file content
 * @param content The content of the project.pbxproj file
 * @param projectPath The path to the .xcodeproj directory (for relative path resolution)
 * @returns Parsed project information
 */
export function parseXcodeproj(content: string, projectPath: string): XcodeprojProject {
    const project: XcodeprojProject = {
        name: extractProjectName(projectPath),
        type: 'Application',
        sourceFiles: [],
        headerFiles: [],
        resourceFiles: [],
        includeDirectories: [],
        preprocessorDefinitions: [],
        libraries: [],
        frameworks: []
    };

    // Parse the plist structure
    const objects = extractObjectsSection(content);
    
    // Find the native target
    const targetId = findFirstNativeTarget(objects);
    if (!targetId) {
        throw new Error('No native target found in Xcode project');
    }

    const target = objects[targetId];
    if (!target) {
        throw new Error('Target object not found');
    }

    // Extract target name
    const targetNameMatch = target.match(/name\s*=\s*([^;]+);/);
    if (targetNameMatch) {
        const name = unquoteString(targetNameMatch[1].trim());
        if (name) {
            project.name = name;
        }
    }

    // Determine product type
    const productTypeMatch = target.match(/productType\s*=\s*"([^"]+)"/);
    if (productTypeMatch) {
        project.type = mapProductType(productTypeMatch[1]);
    }

    // Extract build phases
    const buildPhasesMatch = target.match(/buildPhases\s*=\s*\(([\s\S]*?)\);/);
    if (buildPhasesMatch) {
        const phaseIds = extractListItems(buildPhasesMatch[1]);
        
        for (const phaseId of phaseIds) {
            const phase = objects[phaseId];
            if (!phase) {
                continue;
            }

            // Check if this is a sources build phase
            if (phase.includes('PBXSourcesBuildPhase')) {
                const files = extractBuildPhaseFiles(phase, objects);
                for (const file of files) {
                    if (isSourceFile(file)) {
                        project.sourceFiles.push(file);
                    } else if (isHeaderFile(file)) {
                        project.headerFiles.push(file);
                    }
                }
            }

            // Check if this is a headers build phase
            if (phase.includes('PBXHeadersBuildPhase')) {
                const files = extractBuildPhaseFiles(phase, objects);
                for (const file of files) {
                    if (isHeaderFile(file) && !project.headerFiles.includes(file)) {
                        project.headerFiles.push(file);
                    }
                }
            }

            // Check if this is a frameworks build phase
            if (phase.includes('PBXFrameworksBuildPhase')) {
                const frameworks = extractBuildPhaseFiles(phase, objects);
                for (const frameworkPath of frameworks) {
                    // Extract just the filename (basename) from the path
                    const basename = getBasename(frameworkPath);
                    if (basename.endsWith('.framework')) {
                        const frameworkName = basename.replace(/\.framework$/, '');
                        if (!project.frameworks.includes(frameworkName)) {
                            project.frameworks.push(frameworkName);
                        }
                    } else if (basename.endsWith('.tbd')) {
                        const libName = basename.replace(/^lib/, '').replace(/\.tbd$/, '');
                        if (!project.libraries.includes(libName)) {
                            project.libraries.push(libName);
                        }
                    } else if (basename.endsWith('.dylib')) {
                        const libName = basename.replace(/^lib/, '').replace(/\.dylib$/, '');
                        if (!project.libraries.includes(libName)) {
                            project.libraries.push(libName);
                        }
                    } else if (basename.endsWith('.a')) {
                        const libName = basename.replace(/^lib/, '').replace(/\.a$/, '');
                        if (!project.libraries.includes(libName)) {
                            project.libraries.push(libName);
                        }
                    } else {
                        if (!project.libraries.includes(basename)) {
                            project.libraries.push(basename);
                        }
                    }
                }
            }

            // Check if this is a resources build phase
            if (phase.includes('PBXResourcesBuildPhase')) {
                const resources = extractBuildPhaseFiles(phase, objects);
                for (const resource of resources) {
                    if (!project.resourceFiles.includes(resource)) {
                        project.resourceFiles.push(resource);
                    }
                }
            }

            // Check if this is a copy files build phase
            if (phase.includes('PBXCopyFilesBuildPhase')) {
                if (!project.copyFilesPhases) {
                    project.copyFilesPhases = [];
                }
                const copyPhase = parseCopyFilesPhase(phase, objects);
                if (copyPhase) {
                    project.copyFilesPhases.push(copyPhase);
                }
            }

            // Check if this is a shell script build phase
            if (phase.includes('PBXShellScriptBuildPhase')) {
                if (!project.shellScriptPhases) {
                    project.shellScriptPhases = [];
                }
                const scriptPhase = parseShellScriptPhase(phase);
                if (scriptPhase) {
                    project.shellScriptPhases.push(scriptPhase);
                }
            }
        }
    }

    // Extract build configurations
    const buildConfigListMatch = target.match(/buildConfigurationList\s*=\s*([A-F0-9]+)/);
    if (buildConfigListMatch) {
        const configListId = buildConfigListMatch[1];
        const configList = objects[configListId];
        
        if (configList) {
            const buildConfigsMatch = configList.match(/buildConfigurations\s*=\s*\(([\s\S]*?)\);/);
            if (buildConfigsMatch) {
                const configIds = extractListItems(buildConfigsMatch[1]);
                project.configurations = {};
                
                for (const configId of configIds) {
                    const config = objects[configId];
                    if (!config) {
                        continue;
                    }

                    const configNameMatch = config.match(/name\s*=\s*([^;]+);/);
                    if (!configNameMatch) {
                        continue;
                    }

                    const configName = unquoteString(configNameMatch[1].trim());
                    const settings = extractBuildSettings(config);
                    
                    // Extract common settings from first config (or merge)
                    if (!project.cxxStandard && settings.cxxStandard) {
                        project.cxxStandard = settings.cxxStandard;
                    }
                    if (!project.cStandard && settings.cStandard) {
                        project.cStandard = settings.cStandard;
                    }
                    if (!project.deploymentTarget && settings.deploymentTarget) {
                        project.deploymentTarget = settings.deploymentTarget;
                    }
                    if (!project.iosDeploymentTarget && settings.iosDeploymentTarget) {
                        project.iosDeploymentTarget = settings.iosDeploymentTarget;
                    }
                    if (!project.architecture && settings.architecture) {
                        project.architecture = settings.architecture;
                    }
                    if (!project.productName && settings.productName) {
                        project.productName = settings.productName;
                    }
                    if (!project.bundleIdentifier && settings.bundleIdentifier) {
                        project.bundleIdentifier = settings.bundleIdentifier;
                    }
                    if (!project.infoPlistFile && settings.infoPlistFile) {
                        project.infoPlistFile = settings.infoPlistFile;
                    }
                    if (project.enableModules === undefined && settings.enableModules !== undefined) {
                        project.enableModules = settings.enableModules;
                    }
                    if (project.enableARC === undefined && settings.enableARC !== undefined) {
                        project.enableARC = settings.enableARC;
                    }

                    // Store config-specific settings
                    project.configurations[configName] = {
                        includeDirectories: settings.includeDirectories,
                        preprocessorDefinitions: settings.preprocessorDefinitions,
                        additionalCompileOptions: settings.additionalCompileOptions,
                        additionalLinkOptions: settings.additionalLinkOptions,
                        additionalLibraryDirectories: settings.additionalLibraryDirectories,
                        frameworkSearchPaths: settings.frameworkSearchPaths,
                        optimization: settings.optimization,
                        debugInformationFormat: settings.debugInformationFormat
                    };

                    // Merge common settings
                    if (settings.includeDirectories) {
                        project.includeDirectories = mergeUnique(project.includeDirectories, settings.includeDirectories);
                    }
                    if (settings.preprocessorDefinitions) {
                        project.preprocessorDefinitions = mergeUnique(project.preprocessorDefinitions, settings.preprocessorDefinitions);
                    }
                    if (settings.frameworkSearchPaths) {
                        project.frameworkSearchPaths = mergeUnique(project.frameworkSearchPaths ?? [], settings.frameworkSearchPaths);
                    }
                    if (settings.additionalCompileOptions) {
                        project.additionalCompileOptions = mergeUnique(project.additionalCompileOptions ?? [], settings.additionalCompileOptions);
                    }
                    if (settings.additionalLinkOptions) {
                        project.additionalLinkOptions = mergeUnique(project.additionalLinkOptions ?? [], settings.additionalLinkOptions);
                    }
                    if (settings.additionalLibraryDirectories) {
                        project.additionalLibraryDirectories = mergeUnique(project.additionalLibraryDirectories ?? [], settings.additionalLibraryDirectories);
                    }
                }
            }
        }
    }

    // Also scan PBXFileReference entries for header files not part of any build phase
    for (const [, definition] of Object.entries(objects)) {
        if (definition.includes('isa = PBXFileReference')) {
            const pathMatch = definition.match(/path\s*=\s*([^;]+);/);
            if (pathMatch) {
                const filePath = unquoteString(pathMatch[1].trim());
                if (isHeaderFile(filePath) && !project.headerFiles.includes(filePath)) {
                    project.headerFiles.push(filePath);
                }
            }
        }
    }

    return project;
}

/**
 * Extract project name from xcodeproj path
 * @param projectPath Path to the .xcodeproj directory
 * @returns Project name
 */
function extractProjectName(projectPath: string): string {
    const match = projectPath.match(/([^/\\]+)\.xcodeproj/);
    return match ? match[1] : 'MyProject';
}

/**
 * Extract the objects section from the pbxproj file
 * The objects section is a dictionary mapping object IDs to their definitions
 * @param content The pbxproj file content
 * @returns Map of object ID to object definition
 */
function extractObjectsSection(content: string): Record<string, string> {
    // Find "objects = {" and use brace-counting to find the matching closing "}"
    const objectsStart = content.match(/objects\s*=\s*\{/);
    if (!objectsStart || objectsStart.index === undefined) {
        return {};
    }

    const openBracePos = objectsStart.index + objectsStart[0].length;
    let braceCount = 1;
    let pos = openBracePos;
    while (pos < content.length && braceCount > 0) {
        if (content[pos] === '{') {
            braceCount++;
        } else if (content[pos] === '}') {
            braceCount--;
        }
        pos++;
    }

    if (braceCount !== 0) {
        return {};
    }

    const objectsContent = content.substring(openBracePos, pos - 1);
    const objects: Record<string, string> = {};
    
    // Split by section comments or by object boundaries
    // More robust: Look for patterns like "ID /* comment */ = { content };"
    // We need to handle both single-line and multi-line object definitions
    
    // Strategy: Find all object IDs first, then extract their content
    const idMatches = objectsContent.matchAll(/([A-F0-9]+)\s*\/\*.*?\*\/\s*=\s*\{/g);
    const objectStarts: Array<{id: string; pos: number}> = [];
    
    for (const match of idMatches) {
        if (match.index !== undefined) {
            objectStarts.push({
                id: match[1],
                pos: match.index
            });
        }
    }
    
    // For each object, extract its content until the matching closing brace
    for (let i = 0; i < objectStarts.length; i++) {
        const start = objectStarts[i];
        const nextStart = i + 1 < objectStarts.length ? objectStarts[i + 1].pos : objectsContent.length;
        
        // Find the position after the opening brace
        const openBracePos = objectsContent.indexOf('{', start.pos) + 1;
        
        // Find the matching closing brace within this object's range
        let braceCount = 1;
        let pos = openBracePos;
        while (pos < nextStart && braceCount > 0) {
            if (objectsContent[pos] === '{') {
                braceCount++;
            } else if (objectsContent[pos] === '}') {
                braceCount--;
            }
            pos++;
        }
        
        if (braceCount === 0) {
            const definition = objectsContent.substring(openBracePos, pos - 1);
            objects[start.id] = definition;
        }
    }

    return objects;
}

/**
 * Find the first native target in the objects
 * @param objects The objects dictionary
 * @returns The ID of the first native target, or undefined
 */
function findFirstNativeTarget(objects: Record<string, string>): string | undefined {
    for (const [id, definition] of Object.entries(objects)) {
        if (definition.includes('isa = PBXNativeTarget')) {
            return id;
        }
    }
    return undefined;
}

/**
 * Map Xcode product type to our project type
 * @param productType The Xcode product type string
 * @returns Our normalized project type
 */
function mapProductType(productType: string): 'Application' | 'StaticLibrary' | 'DynamicLibrary' | 'Framework' | 'Bundle' {
    // Xcode product types use reverse-domain notation
    // e.g., com.apple.product-type.application, com.apple.product-type.library.static
    if (productType.includes('application') || productType.includes('tool')) {
        return 'Application';
    } else if (productType.includes('library.static') || productType.includes('archive.ar')) {
        return 'StaticLibrary';
    } else if (productType.includes('library.dynamic') || productType.includes('dylib')) {
        return 'DynamicLibrary';
    } else if (productType.includes('framework')) {
        return 'Framework';
    } else if (productType.includes('bundle')) {
        return 'Bundle';
    }
    return 'Application';
}

/**
 * Extract list items from a parenthesized list
 * @param listContent The content between parentheses
 * @returns Array of item IDs or strings
 */
function extractListItems(listContent: string): string[] {
    const items: string[] = [];
    const itemRegex = /([A-F0-9]+|"[^"]*")/g;
    let match;
    
    while ((match = itemRegex.exec(listContent)) !== null) {
        items.push(match[1].replace(/"/g, ''));
    }
    
    return items;
}

/**
 * Extract files from a build phase
 * @param phase The build phase object definition
 * @param objects All objects for reference lookup
 * @returns Array of file paths
 */
function extractBuildPhaseFiles(phase: string, objects: Record<string, string>): string[] {
    const files: string[] = [];
    const filesMatch = phase.match(/files\s*=\s*\(([\s\S]*?)\);/);
    
    if (!filesMatch) {
        return files;
    }

    const fileIds = extractListItems(filesMatch[1]);
    
    for (const fileId of fileIds) {
        const buildFile = objects[fileId];
        if (!buildFile) {
            continue;
        }

        // Extract file reference from build file
        const fileRefMatch = buildFile.match(/fileRef\s*=\s*([A-F0-9]+)/);
        if (!fileRefMatch) {
            continue;
        }

        const fileRef = objects[fileRefMatch[1]];
        if (!fileRef) {
            continue;
        }

        // Extract path from file reference
        const pathMatch = fileRef.match(/path\s*=\s*([^;]+);/);
        if (pathMatch) {
            const path = unquoteString(pathMatch[1].trim());
            if (path) {
                files.push(path);
            }
        }
    }

    return files;
}

/**
 * Remove quotes from a string value
 * @param str The string that may be quoted
 * @returns The unquoted string
 */
function unquoteString(str: string): string {
    return str.replace(/^"(.*)"$/, '$1');
}

/**
 * Get the basename (last path component) from a file path
 * @param filePath The file path
 * @returns The basename
 */
function getBasename(filePath: string): string {
    const parts = filePath.split('/');
    return parts[parts.length - 1];
}

/**
 * Check if a file is a source file
 * @param filename The filename
 * @returns True if it's a source file
 */
function isSourceFile(filename: string): boolean {
    return /\.(c|cc|cpp|cxx|c\+\+|m|mm)$/i.test(filename);
}

/**
 * Check if a file is a header file
 * @param filename The filename
 * @returns True if it's a header file
 */
function isHeaderFile(filename: string): boolean {
    return /\.(h|hpp|hxx|h\+\+)$/i.test(filename);
}

/**
 * Extract build settings from a configuration object
 * @param config The configuration object definition
 * @returns Build settings
 */
function extractBuildSettings(config: string): {
    cxxStandard?: number;
    cStandard?: number;
    deploymentTarget?: string;
    iosDeploymentTarget?: string;
    architecture?: string;
    includeDirectories?: string[];
    preprocessorDefinitions?: string[];
    additionalCompileOptions?: string[];
    additionalLinkOptions?: string[];
    additionalLibraryDirectories?: string[];
    frameworkSearchPaths?: string[];
    productName?: string;
    bundleIdentifier?: string;
    infoPlistFile?: string;
    enableModules?: boolean;
    enableARC?: boolean;
    optimization?: string;
    debugInformationFormat?: string;
} {
    const settings: ReturnType<typeof extractBuildSettings> = {};

    // Extract build settings section with flexible whitespace matching
    const buildSettingsMatch = config.match(/buildSettings\s*=\s*\{([\s\S]*?)\n\s*\};/);
    if (!buildSettingsMatch) {
        return settings;
    }

    const buildSettingsContent = buildSettingsMatch[1];

    // Extract C++ standard (CLANG_CXX_LANGUAGE_STANDARD)
    const cxxStandardMatch = buildSettingsContent.match(/CLANG_CXX_LANGUAGE_STANDARD\s*=\s*"?([^";]+)"?;/);
    if (cxxStandardMatch) {
        settings.cxxStandard = parseCxxStandard(cxxStandardMatch[1].trim());
    }

    // Extract C standard (GCC_C_LANGUAGE_STANDARD)
    const cStandardMatch = buildSettingsContent.match(/GCC_C_LANGUAGE_STANDARD\s*=\s*"?([^";]+)"?;/);
    if (cStandardMatch) {
        settings.cStandard = parseCStandard(cStandardMatch[1].trim());
    }

    // Extract deployment target (macOS)
    const deploymentTargetMatch = buildSettingsContent.match(/MACOSX_DEPLOYMENT_TARGET\s*=\s*([^;]+);/);
    if (deploymentTargetMatch) {
        settings.deploymentTarget = unquoteString(deploymentTargetMatch[1].trim());
    }

    // Extract deployment target (iOS)
    const iosDeploymentTargetMatch = buildSettingsContent.match(/IPHONEOS_DEPLOYMENT_TARGET\s*=\s*([^;]+);/);
    if (iosDeploymentTargetMatch) {
        settings.iosDeploymentTarget = unquoteString(iosDeploymentTargetMatch[1].trim());
    }

    // Extract architecture
    const archMatch = buildSettingsContent.match(/ARCHS\s*=\s*([^;]+);/);
    if (archMatch) {
        settings.architecture = unquoteString(archMatch[1].trim());
    }

    // Extract product name
    const productNameMatch = buildSettingsContent.match(/PRODUCT_NAME\s*=\s*"?([^";]+)"?;/);
    if (productNameMatch) {
        settings.productName = unquoteString(productNameMatch[1].trim());
    }

    // Extract bundle identifier
    const bundleIdMatch = buildSettingsContent.match(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*"?([^";]+)"?;/);
    if (bundleIdMatch) {
        settings.bundleIdentifier = unquoteString(bundleIdMatch[1].trim());
    }

    // Extract Info.plist file
    const infoPlistMatch = buildSettingsContent.match(/INFOPLIST_FILE\s*=\s*"?([^";]+)"?;/);
    if (infoPlistMatch) {
        settings.infoPlistFile = unquoteString(infoPlistMatch[1].trim());
    }

    // Extract enable modules
    const enableModulesMatch = buildSettingsContent.match(/CLANG_ENABLE_MODULES\s*=\s*([^;]+);/);
    if (enableModulesMatch) {
        settings.enableModules = enableModulesMatch[1].trim() === 'YES';
    }

    // Extract ARC
    const enableARCMatch = buildSettingsContent.match(/CLANG_ENABLE_OBJC_ARC\s*=\s*([^;]+);/);
    if (enableARCMatch) {
        settings.enableARC = enableARCMatch[1].trim() === 'YES';
    }

    // Extract optimization level (GCC_OPTIMIZATION_LEVEL)
    const optimizationMatch = buildSettingsContent.match(/GCC_OPTIMIZATION_LEVEL\s*=\s*"?([^";]+)"?;/);
    if (optimizationMatch) {
        settings.optimization = optimizationMatch[1].trim();
    }

    // Extract debug information format
    const debugInfoMatch = buildSettingsContent.match(/DEBUG_INFORMATION_FORMAT\s*=\s*"?([^";]+)"?;/);
    if (debugInfoMatch) {
        settings.debugInformationFormat = debugInfoMatch[1].trim();
    }

    // Extract header search paths (HEADER_SEARCH_PATHS) - handle both list and single value
    settings.includeDirectories = extractBuildSettingListOrSingle(buildSettingsContent, 'HEADER_SEARCH_PATHS');

    // Extract preprocessor definitions (GCC_PREPROCESSOR_DEFINITIONS) - handle both list and single value
    settings.preprocessorDefinitions = extractBuildSettingListOrSingle(buildSettingsContent, 'GCC_PREPROCESSOR_DEFINITIONS');

    // Extract other compiler flags (OTHER_CFLAGS, OTHER_CPLUSPLUSFLAGS)
    settings.additionalCompileOptions = extractBuildSettingListOrSingle(buildSettingsContent, 'OTHER_CPLUSPLUSFLAGS')
        ?? extractBuildSettingListOrSingle(buildSettingsContent, 'OTHER_CFLAGS');

    // Extract linker flags (OTHER_LDFLAGS)
    settings.additionalLinkOptions = extractBuildSettingListOrSingle(buildSettingsContent, 'OTHER_LDFLAGS');

    // Extract library search paths (LIBRARY_SEARCH_PATHS)
    settings.additionalLibraryDirectories = extractBuildSettingListOrSingle(buildSettingsContent, 'LIBRARY_SEARCH_PATHS');

    // Extract framework search paths (FRAMEWORK_SEARCH_PATHS)
    settings.frameworkSearchPaths = extractBuildSettingListOrSingle(buildSettingsContent, 'FRAMEWORK_SEARCH_PATHS');

    return settings;
}

/**
 * Parse C++ standard from Xcode format
 * @param standard The standard string (e.g., "gnu++14", "c++17", "gnu++20")
 * @returns Numeric standard version or undefined
 */
function parseCxxStandard(standard: string): number | undefined {
    const match = standard.match(/(\d+)/);
    if (match) {
        return parseInt(match[1], 10);
    }
    return undefined;
}

/**
 * Parse C standard from Xcode format
 * @param standard The standard string (e.g., "gnu11", "c11", "c17")
 * @returns Numeric standard version or undefined
 */
function parseCStandard(standard: string): number | undefined {
    const match = standard.match(/(\d+)/);
    if (match) {
        return parseInt(match[1], 10);
    }
    return undefined;
}

/**
 * Extract a build setting that can be either a list (parenthesized) or a single value
 * @param buildSettingsContent The build settings section content
 * @param key The setting key name
 * @returns Array of values, or undefined if not found
 */
function extractBuildSettingListOrSingle(buildSettingsContent: string, key: string): string[] | undefined {
    // Try list format first: KEY = (\n"value1",\n"value2",\n);
    const listMatch = buildSettingsContent.match(new RegExp(key + '\\s*=\\s*\\(([\\s\\S]*?)\\);'));
    if (listMatch) {
        const items = extractListItems(listMatch[1]);
        return items.length > 0 ? items : undefined;
    }
    
    // Try single value format: KEY = "value"; or KEY = value;
    const singleMatch = buildSettingsContent.match(new RegExp(key + '\\s*=\\s*"?([^";]+)"?;'));
    if (singleMatch) {
        const value = singleMatch[1].trim();
        // Skip inherited values like $(inherited)
        if (value && value !== '$(inherited)') {
            return [value];
        }
    }
    
    return undefined;
}

/**
 * Parse a copy files build phase
 * @param phase The copy files build phase object definition
 * @param objects All objects for reference lookup
 * @returns Parsed copy files phase or undefined
 */
function parseCopyFilesPhase(phase: string, objects: Record<string, string>): CopyFilesPhase | undefined {
    const files = extractBuildPhaseFiles(phase, objects);
    if (files.length === 0) {
        return undefined;
    }

    const copyPhase: CopyFilesPhase = {
        files
    };

    const nameMatch = phase.match(/name\s*=\s*([^;]+);/);
    if (nameMatch) {
        copyPhase.name = unquoteString(nameMatch[1].trim());
    }

    const dstSubfolderSpecMatch = phase.match(/dstSubfolderSpec\s*=\s*(\d+);/);
    if (dstSubfolderSpecMatch) {
        copyPhase.dstSubfolderSpec = parseInt(dstSubfolderSpecMatch[1], 10);
    }

    const dstPathMatch = phase.match(/dstPath\s*=\s*"?([^";]*)"?;/);
    if (dstPathMatch) {
        copyPhase.dstPath = dstPathMatch[1].trim();
    }

    return copyPhase;
}

/**
 * Merge two arrays, keeping unique values
 * @param arr1 First array
 * @param arr2 Second array
 * @returns Merged array with unique values
 */
function mergeUnique(arr1: string[], arr2: string[]): string[] {
    const result = [...arr1];
    for (const item of arr2) {
        if (!result.includes(item)) {
            result.push(item);
        }
    }
    return result;
}

/**
 * Parse a shell script build phase
 * @param phase The shell script build phase object definition
 * @returns Parsed shell script phase or undefined
 */
function parseShellScriptPhase(phase: string): ShellScriptPhase | undefined {
    // Extract shell script
    const shellScriptMatch = phase.match(/shellScript\s*=\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
    if (!shellScriptMatch) {
        return undefined;
    }

    const shellScript = shellScriptMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .trim();

    if (!shellScript) {
        return undefined;
    }

    const scriptPhase: ShellScriptPhase = {
        shellScript
    };

    // Extract name (optional)
    const nameMatch = phase.match(/name\s*=\s*([^;]+);/);
    if (nameMatch) {
        scriptPhase.name = unquoteString(nameMatch[1].trim());
    }

    // Extract shell path
    const shellPathMatch = phase.match(/shellPath\s*=\s*([^;]+);/);
    if (shellPathMatch) {
        scriptPhase.shellPath = unquoteString(shellPathMatch[1].trim());
    }

    // Extract input paths
    const inputPathsMatch = phase.match(/inputPaths\s*=\s*\(([\s\S]*?)\);/);
    if (inputPathsMatch) {
        const paths = extractListItems(inputPathsMatch[1]);
        if (paths.length > 0) {
            scriptPhase.inputPaths = paths;
        }
    }

    // Extract output paths
    const outputPathsMatch = phase.match(/outputPaths\s*=\s*\(([\s\S]*?)\);/);
    if (outputPathsMatch) {
        const paths = extractListItems(outputPathsMatch[1]);
        if (paths.length > 0) {
            scriptPhase.outputPaths = paths;
        }
    }

    // Extract runOnlyForDeploymentPostprocessing
    const runOnlyMatch = phase.match(/runOnlyForDeploymentPostprocessing\s*=\s*(\d+);/);
    if (runOnlyMatch) {
        scriptPhase.runOnlyForDeploymentPostprocessing = runOnlyMatch[1] !== '0';
    }

    return scriptPhase;
}

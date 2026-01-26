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
 * - PBXFileReference: References to files in the project
 */

export interface XcodeprojProject {
    name: string;
    type: 'Application' | 'StaticLibrary' | 'DynamicLibrary';
    sourceFiles: string[];
    headerFiles: string[];
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
    /** C++ language standard (e.g., 11, 14, 17, 20, 23) */
    cxxStandard?: number;
    /** Deployment target (e.g., "10.15" for macOS) */
    deploymentTarget?: string;
    /** Architecture (e.g., "arm64", "x86_64", "$(ARCHS_STANDARD)") */
    architecture?: string;
    /** Configuration-specific settings (e.g., Debug/Release) */
    configurations?: Record<string, XcodeprojConfigSettings>;
}

export interface XcodeprojConfigSettings {
    includeDirectories?: string[];
    preprocessorDefinitions?: string[];
    libraries?: string[];
    frameworks?: string[];
    additionalCompileOptions?: string[];
    additionalLinkOptions?: string[];
    additionalLibraryDirectories?: string[];
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

            // Check if this is a frameworks build phase
            if (phase.includes('PBXFrameworksBuildPhase')) {
                const frameworks = extractBuildPhaseFiles(phase, objects);
                for (const framework of frameworks) {
                    if (framework.endsWith('.framework')) {
                        const frameworkName = framework.replace(/\.framework$/, '');
                        project.frameworks.push(frameworkName);
                    } else {
                        project.libraries.push(framework);
                    }
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
                    if (!project.deploymentTarget && settings.deploymentTarget) {
                        project.deploymentTarget = settings.deploymentTarget;
                    }
                    if (!project.architecture && settings.architecture) {
                        project.architecture = settings.architecture;
                    }

                    // Store config-specific settings
                    project.configurations[configName] = {
                        includeDirectories: settings.includeDirectories,
                        preprocessorDefinitions: settings.preprocessorDefinitions,
                        additionalCompileOptions: settings.additionalCompileOptions,
                        additionalLinkOptions: settings.additionalLinkOptions,
                        additionalLibraryDirectories: settings.additionalLibraryDirectories
                    };

                    // Merge common settings
                    if (settings.includeDirectories) {
                        project.includeDirectories = mergeUnique(project.includeDirectories, settings.includeDirectories);
                    }
                    if (settings.preprocessorDefinitions) {
                        project.preprocessorDefinitions = mergeUnique(project.preprocessorDefinitions, settings.preprocessorDefinitions);
                    }
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
    const objectsMatch = content.match(/objects\s*=\s*\{([\s\S]*?)\n\s*\};/);
    if (!objectsMatch) {
        return {};
    }

    const objectsContent = objectsMatch[1];
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
function mapProductType(productType: string): 'Application' | 'StaticLibrary' | 'DynamicLibrary' {
    // Xcode product types use reverse-domain notation
    // e.g., com.apple.product-type.application, com.apple.product-type.library.static
    if (productType.includes('application') || productType.includes('tool')) {
        return 'Application';
    } else if (productType.includes('library.static') || productType.includes('archive.ar')) {
        return 'StaticLibrary';
    } else if (productType.includes('library.dynamic') || productType.includes('dylib')) {
        return 'DynamicLibrary';
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
    deploymentTarget?: string;
    architecture?: string;
    includeDirectories?: string[];
    preprocessorDefinitions?: string[];
    additionalCompileOptions?: string[];
    additionalLinkOptions?: string[];
    additionalLibraryDirectories?: string[];
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

    // Extract deployment target
    const deploymentTargetMatch = buildSettingsContent.match(/MACOSX_DEPLOYMENT_TARGET\s*=\s*([^;]+);/);
    if (deploymentTargetMatch) {
        settings.deploymentTarget = unquoteString(deploymentTargetMatch[1].trim());
    }

    // Extract architecture
    const archMatch = buildSettingsContent.match(/ARCHS\s*=\s*([^;]+);/);
    if (archMatch) {
        settings.architecture = unquoteString(archMatch[1].trim());
    }

    // Extract header search paths (HEADER_SEARCH_PATHS)
    const headerSearchMatch = buildSettingsContent.match(/HEADER_SEARCH_PATHS\s*=\s*\(([\s\S]*?)\);/);
    if (headerSearchMatch) {
        settings.includeDirectories = extractListItems(headerSearchMatch[1]);
    }

    // Extract preprocessor definitions (GCC_PREPROCESSOR_DEFINITIONS)
    const preprocessorMatch = buildSettingsContent.match(/GCC_PREPROCESSOR_DEFINITIONS\s*=\s*\(([\s\S]*?)\);/);
    if (preprocessorMatch) {
        settings.preprocessorDefinitions = extractListItems(preprocessorMatch[1]);
    }

    // Extract other compiler flags (OTHER_CFLAGS, OTHER_CPLUSPLUSFLAGS)
    const otherCflagsMatch = buildSettingsContent.match(/OTHER_CPLUSPLUSFLAGS\s*=\s*\(([\s\S]*?)\);/);
    if (otherCflagsMatch) {
        settings.additionalCompileOptions = extractListItems(otherCflagsMatch[1]);
    }

    // Extract linker flags (OTHER_LDFLAGS)
    const otherLdflagsMatch = buildSettingsContent.match(/OTHER_LDFLAGS\s*=\s*\(([\s\S]*?)\);/);
    if (otherLdflagsMatch) {
        settings.additionalLinkOptions = extractListItems(otherLdflagsMatch[1]);
    }

    // Extract library search paths (LIBRARY_SEARCH_PATHS)
    const librarySearchMatch = buildSettingsContent.match(/LIBRARY_SEARCH_PATHS\s*=\s*\(([\s\S]*?)\);/);
    if (librarySearchMatch) {
        settings.additionalLibraryDirectories = extractListItems(librarySearchMatch[1]);
    }

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

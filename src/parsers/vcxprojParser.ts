/**
 * Visual Studio Project (vcxproj) Parser
 * Parses .vcxproj files to extract project configuration for CMake conversion
 */

/**
 * Precompiled header configuration
 */
export interface PchConfig {
    /** Whether PCH is enabled (has at least one file using PCH) */
    enabled: boolean;
    /** The PCH header file (e.g., "pch.h", "stdafx.h") */
    headerFile?: string;
    /** The source file that creates the PCH (e.g., "pch.cpp", "stdafx.cpp") */
    sourceFile?: string;
    /** Files that are excluded from using PCH (PrecompiledHeader = NotUsing) */
    excludedFiles: string[];
}

/**
 * Build event configuration (PreBuildEvent, PostBuildEvent, CustomBuildStep)
 */
export interface BuildEvent {
    /** Type of build event */
    type: 'PreBuild' | 'PostBuild' | 'PreLink' | 'CustomBuild';
    /** Command to execute */
    command: string;
    /** Description message */
    message?: string;
    /** Output files (for CustomBuildStep) */
    outputs?: string[];
}

export interface VcxprojProject {
    name: string;
    type: 'Application' | 'StaticLibrary' | 'DynamicLibrary';
    sourceFiles: string[];
    headerFiles: string[];
    includeDirectories: string[];
    preprocessorDefinitions: string[];
    libraries: string[];
    outputDirectory?: string;
    /** Additional compiler options (from AdditionalOptions) */
    additionalCompileOptions?: string[];
    /** Additional linker options (from Link/AdditionalOptions) */
    additionalLinkOptions?: string[];
    /** Additional library directories (from Link/AdditionalLibraryDirectories) */
    additionalLibraryDirectories?: string[];
    /** C++ language standard (e.g., 11, 14, 17, 20, 23) */
    cxxStandard?: number;
    /** Windows SDK version (e.g., "10.0.19041.0") */
    windowsSdkVersion?: string;
    /** Platform toolset (e.g., "v142", "v143") */
    platformToolset?: string;
    /** Character set (e.g., "Unicode", "MultiByte") */
    characterSet?: string;
    /** Subsystem (e.g., "Console", "Windows") */
    subsystem?: string;
    /** Warning level (0-4) */
    warningLevel?: number;
    /** Optimization level (Disabled, MinSpace, MaxSpeed, Full) */
    optimization?: string;
    /** Debug information format (ProgramDatabase, EditAndContinue, OldStyle) */
    debugInformationFormat?: string;
    /** Runtime library (e.g., MultiThreadedDLL, MultiThreadedDebugDLL) */
    runtimeLibrary?: string;
    /** Exception handling model (Sync, Async, SyncCThrow) */
    exceptionHandling?: string;
    /** Runtime type information (RTTI) */
    runtimeTypeInfo?: boolean;
    /** Treat warnings as errors */
    treatWarningAsError?: boolean;
    /** Multi-processor compilation */
    multiProcessorCompilation?: boolean;
    /** Precompiled header configuration */
    pchConfig?: PchConfig;
    /** Build events (pre-build, post-build, custom build steps) */
    buildEvents?: BuildEvent[];
    /** Configuration-specific settings (e.g., Debug/Release) */
    configurations?: Record<string, VcxprojConfigSettings>;
}

export interface VcxprojConfigSettings {
    includeDirectories?: string[];
    preprocessorDefinitions?: string[];
    libraries?: string[];
    additionalCompileOptions?: string[];
    additionalLinkOptions?: string[];
    additionalLibraryDirectories?: string[];
    warningLevel?: number;
    optimization?: string;
    debugInformationFormat?: string;
    runtimeLibrary?: string;
    exceptionHandling?: string;
    runtimeTypeInfo?: boolean;
    treatWarningAsError?: boolean;
    multiProcessorCompilation?: boolean;
}

/**
 * Parse a vcxproj file content
 * @param content The XML content of the vcxproj file
 * @param projectPath The path to the vcxproj file (for relative path resolution)
 * @returns Parsed project information
 */
export function parseVcxproj(content: string, projectPath: string): VcxprojProject {
    const contentWithoutConditionalItemDefinitionGroups = stripConditionalItemDefinitionGroups(content);
    const project: VcxprojProject = {
        name: extractProjectName(projectPath),
        type: 'Application',
        sourceFiles: [],
        headerFiles: [],
        includeDirectories: [],
        preprocessorDefinitions: [],
        libraries: []
    };

    // Extract configuration type (Application, StaticLibrary, DynamicLibrary)
    const configTypeMatch = content.match(/<ConfigurationType>(.*?)<\/ConfigurationType>/);
    if (configTypeMatch) {
        const configType = configTypeMatch[1];
        if (configType === 'Application' || configType === 'StaticLibrary' || configType === 'DynamicLibrary') {
            project.type = configType;
        }
    }

    // Extract source files (ClCompile items)
    const compileMatches = content.matchAll(/<ClCompile\s+Include="([^"]+)"\s*\/>/g);
    for (const match of compileMatches) {
        project.sourceFiles.push(normalizePathSeparators(match[1]));
    }

    // Also handle ClCompile with closing tags
    const compileBlockMatches = content.matchAll(/<ClCompile\s+Include="([^"]+)"\s*>/g);
    for (const match of compileBlockMatches) {
        const file = normalizePathSeparators(match[1]);
        if (!project.sourceFiles.includes(file)) {
            project.sourceFiles.push(file);
        }
    }

    // Extract header files (ClInclude items)
    const includeMatches = content.matchAll(/<ClInclude\s+Include="([^"]+)"\s*\/>/g);
    for (const match of includeMatches) {
        project.headerFiles.push(normalizePathSeparators(match[1]));
    }

    // Also handle ClInclude with closing tags
    const includeBlockMatches = content.matchAll(/<ClInclude\s+Include="([^"]+)"\s*>/g);
    for (const match of includeBlockMatches) {
        const file = normalizePathSeparators(match[1]);
        if (!project.headerFiles.includes(file)) {
            project.headerFiles.push(file);
        }
    }

    // Extract include directories from AdditionalIncludeDirectories
    const includeDirs = extractIncludeDirectories(contentWithoutConditionalItemDefinitionGroups);
    if (includeDirs.length > 0) {
        project.includeDirectories = includeDirs;
    }

    // Extract preprocessor definitions
    const definitions = extractPreprocessorDefinitions(contentWithoutConditionalItemDefinitionGroups);
    if (definitions.length > 0) {
        project.preprocessorDefinitions = definitions;
    }

    // Extract libraries from AdditionalDependencies
    const libraries = extractLibraries(contentWithoutConditionalItemDefinitionGroups);
    if (libraries.length > 0) {
        project.libraries = libraries;
    }

    // Extract output directory
    const outDirMatch = content.match(/<OutDir>(.*?)<\/OutDir>/);
    if (outDirMatch) {
        project.outputDirectory = normalizePathSeparators(outDirMatch[1]);
    }

    // Extract additional compiler options
    const additionalCompileOptions = extractAdditionalOptions(contentWithoutConditionalItemDefinitionGroups, /<ClCompile>[\s\S]*?<AdditionalOptions>(.*?)<\/AdditionalOptions>[\s\S]*?<\/ClCompile>/g, '%(AdditionalOptions)');
    if (additionalCompileOptions.length > 0) {
        project.additionalCompileOptions = additionalCompileOptions;
    }

    // Extract additional linker options
    const additionalLinkOptions = extractAdditionalOptions(contentWithoutConditionalItemDefinitionGroups, /<Link>[\s\S]*?<AdditionalOptions>(.*?)<\/AdditionalOptions>[\s\S]*?<\/Link>/g, '%(AdditionalOptions)');
    if (additionalLinkOptions.length > 0) {
        project.additionalLinkOptions = additionalLinkOptions;
    }

    // Extract additional library directories
    const additionalLibraryDirectories = extractAdditionalLibraryDirectories(contentWithoutConditionalItemDefinitionGroups);
    if (additionalLibraryDirectories.length > 0) {
        project.additionalLibraryDirectories = additionalLibraryDirectories;
    }

    // Extract C++ language standard
    const languageStandardMatch = contentWithoutConditionalItemDefinitionGroups.match(/<LanguageStandard>(.*?)<\/LanguageStandard>/);
    if (languageStandardMatch) {
        project.cxxStandard = parseLanguageStandard(languageStandardMatch[1]);
    }

    // Extract warning level
    const warningLevelMatch = contentWithoutConditionalItemDefinitionGroups.match(/<WarningLevel>Level(\d)<\/WarningLevel>/);
    if (warningLevelMatch) {
        project.warningLevel = parseInt(warningLevelMatch[1], 10);
    }

    // Extract optimization level
    const optimizationMatch = contentWithoutConditionalItemDefinitionGroups.match(/<Optimization>(.*?)<\/Optimization>/);
    if (optimizationMatch) {
        project.optimization = optimizationMatch[1].trim();
    }

    // Extract debug information format
    const debugInfoMatch = contentWithoutConditionalItemDefinitionGroups.match(/<DebugInformationFormat>(.*?)<\/DebugInformationFormat>/);
    if (debugInfoMatch) {
        project.debugInformationFormat = debugInfoMatch[1].trim();
    }

    // Extract runtime library
    const runtimeLibraryMatch = contentWithoutConditionalItemDefinitionGroups.match(/<RuntimeLibrary>(.*?)<\/RuntimeLibrary>/);
    if (runtimeLibraryMatch) {
        project.runtimeLibrary = parseRuntimeLibrary(runtimeLibraryMatch[1]);
    }

    // Extract exception handling
    const exceptionHandlingMatch = contentWithoutConditionalItemDefinitionGroups.match(/<ExceptionHandling>(.*?)<\/ExceptionHandling>/);
    if (exceptionHandlingMatch) {
        project.exceptionHandling = exceptionHandlingMatch[1].trim();
    }

    // Extract RTTI setting
    const rttiMatch = contentWithoutConditionalItemDefinitionGroups.match(/<RuntimeTypeInfo>(.*?)<\/RuntimeTypeInfo>/);
    const rttiValue = rttiMatch ? parseBooleanValue(rttiMatch[1]) : undefined;
    if (rttiValue !== undefined) {
        project.runtimeTypeInfo = rttiValue;
    }

    // Extract treat warnings as errors
    const treatWarningMatch = contentWithoutConditionalItemDefinitionGroups.match(/<TreatWarningAsError>(.*?)<\/TreatWarningAsError>/);
    const treatWarningValue = treatWarningMatch ? parseBooleanValue(treatWarningMatch[1]) : undefined;
    if (treatWarningValue !== undefined) {
        project.treatWarningAsError = treatWarningValue;
    }

    // Extract multi-processor compilation
    const mpMatch = contentWithoutConditionalItemDefinitionGroups.match(/<MultiProcessorCompilation>(.*?)<\/MultiProcessorCompilation>/);
    const mpValue = mpMatch ? parseBooleanValue(mpMatch[1]) : undefined;
    if (mpValue !== undefined) {
        project.multiProcessorCompilation = mpValue;
    }

    // Extract Windows SDK version
    const sdkVersionMatch = content.match(/<WindowsTargetPlatformVersion>(.*?)<\/WindowsTargetPlatformVersion>/);
    if (sdkVersionMatch) {
        project.windowsSdkVersion = sdkVersionMatch[1];
    }

    // Extract platform toolset
    const platformToolsetMatch = content.match(/<PlatformToolset>(.*?)<\/PlatformToolset>/);
    if (platformToolsetMatch) {
        project.platformToolset = platformToolsetMatch[1];
    }

    // Extract character set
    const characterSetMatch = content.match(/<CharacterSet>(.*?)<\/CharacterSet>/);
    if (characterSetMatch) {
        project.characterSet = characterSetMatch[1];
    }

    // Extract subsystem from Link settings
    const subsystemMatch = content.match(/<SubSystem>(.*?)<\/SubSystem>/);
    if (subsystemMatch) {
        project.subsystem = subsystemMatch[1];
    }

    // Parse precompiled header configuration
    project.pchConfig = parsePchConfig(content);

    // Parse build events (pre-build, post-build, custom build)
    project.buildEvents = parseBuildEvents(content);

    // Parse configuration-specific settings
    const configSettings = parseConfigurationSettings(content);
    if (Object.keys(configSettings).length > 0) {
        project.configurations = configSettings;
    }

    return project;
}

/**
 * Extract project name from vcxproj file path
 * @param projectPath Path to the vcxproj file
 * @returns Project name
 */
function extractProjectName(projectPath: string): string {
    const match = projectPath.match(/([^/\\]+)\.vcxproj$/);
    return match ? match[1] : 'MyProject';
}

/**
 * Normalize path separators to forward slashes
 * @param path Path to normalize
 * @returns Normalized path
 */
function normalizePathSeparators(path: string): string {
    return path.replace(/\\/g, '/');
}

function stripConditionalItemDefinitionGroups(content: string): string {
    return content.replace(/<ItemDefinitionGroup\s+Condition="[^"]*"[\s\S]*?<\/ItemDefinitionGroup>/g, '');
}

/**
 * Parse boolean values from vcxproj
 * @param value The string value to parse
 * @returns boolean or undefined if not a valid boolean
 */
function parseBooleanValue(value: string): boolean | undefined {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
        return true;
    }
    if (normalized === 'false') {
        return false;
    }
    return undefined;
}

/**
 * Parse runtime library setting
 * @param value The RuntimeLibrary value
 * @returns Normalized runtime library value or undefined
 */
function parseRuntimeLibrary(value: string): string | undefined {
    const normalized = value.trim();
    const allowed = new Set([
        'MultiThreaded',
        'MultiThreadedDLL',
        'MultiThreadedDebug',
        'MultiThreadedDebugDLL'
    ]);
    return allowed.has(normalized) ? normalized : undefined;
}

function extractIncludeDirectories(content: string): string[] {
    const includeDirsMatches = content.matchAll(/<AdditionalIncludeDirectories>(.*?)<\/AdditionalIncludeDirectories>/g);
    const includeDirs: string[] = [];
    for (const match of includeDirsMatches) {
        const dirs = match[1].split(';')
            .map(d => d.trim())
            .filter(d => d && d !== '%(AdditionalIncludeDirectories)')
            .map(normalizePathSeparators);
        for (const dir of dirs) {
            if (!includeDirs.includes(dir)) {
                includeDirs.push(dir);
            }
        }
    }
    return includeDirs;
}

function extractPreprocessorDefinitions(content: string): string[] {
    const definesMatches = content.matchAll(/<PreprocessorDefinitions>(.*?)<\/PreprocessorDefinitions>/g);
    const definitions: string[] = [];
    for (const match of definesMatches) {
        const defs = match[1].split(';')
            .map(d => d.trim())
            .filter(d => d && d !== '%(PreprocessorDefinitions)');
        for (const def of defs) {
            if (!definitions.includes(def)) {
                definitions.push(def);
            }
        }
    }
    return definitions;
}

function extractLibraries(content: string): string[] {
    const libMatches = content.matchAll(/<AdditionalDependencies>(.*?)<\/AdditionalDependencies>/g);
    const libraries: string[] = [];
    for (const match of libMatches) {
        const libs = match[1].split(';')
            .map(l => l.trim())
            .filter(l => l && l !== '%(AdditionalDependencies)');
        for (const lib of libs) {
            const libName = lib.replace(/\.lib$/i, '');
            if (!libraries.includes(libName)) {
                libraries.push(libName);
            }
        }
    }
    return libraries;
}

function extractAdditionalLibraryDirectories(content: string): string[] {
    const additionalLibraryDirectoriesMatches = content.matchAll(/<AdditionalLibraryDirectories>(.*?)<\/AdditionalLibraryDirectories>/g);
    const directories: string[] = [];
    for (const match of additionalLibraryDirectoriesMatches) {
        const dirs = match[1].split(';')
            .map(d => d.trim())
            .filter(d => d && d !== '%(AdditionalLibraryDirectories)')
            .map(normalizePathSeparators);
        for (const dir of dirs) {
            if (!directories.includes(dir)) {
                directories.push(dir);
            }
        }
    }
    return directories;
}

/**
 * Extract additional options from XML content
 * @param content The XML content
 * @param regex The regex to match option blocks
 * @param macroToSkip Macro placeholder to skip
 * @returns List of options
 */
function extractAdditionalOptions(content: string, regex: RegExp, macroToSkip: string): string[] {
    const options: string[] = [];
    const matches = content.matchAll(regex);
    for (const match of matches) {
        const value = match[1];
        const parsed = parseAdditionalOptionsValue(value, macroToSkip);
        for (const opt of parsed) {
            if (!options.includes(opt)) {
                options.push(opt);
            }
        }
    }
    return options;
}

/**
 * Parse the AdditionalOptions value into tokens
 * @param value The raw AdditionalOptions value
 * @param macroToSkip Macro placeholder to skip
 * @returns Parsed tokens
 */
function parseAdditionalOptionsValue(value: string, macroToSkip: string): string[] {
    const tokens = value.match(/"[^"]+"|\S+/g) ?? [];
    return tokens
        .map(token => token.replace(/^"|"$/g, '').trim())
        .filter(token => token && token !== macroToSkip);
}

/**
 * Merge unique strings into an array
 * @param existing Existing list
 * @param incoming Incoming list
 * @returns Merged list
 */
function mergeUniqueStrings(existing: string[] | undefined, incoming: string[]): string[] {
    const merged = existing ? [...existing] : [];
    for (const item of incoming) {
        if (!merged.includes(item)) {
            merged.push(item);
        }
    }
    return merged;
}

function parseConfigurationSettings(content: string): Record<string, VcxprojConfigSettings> {
    const configMap: Record<string, VcxprojConfigSettings> = {};
    const conditionalGroups = content.matchAll(/<ItemDefinitionGroup\s+Condition="([^"]+)"[^>]*>([\s\S]*?)<\/ItemDefinitionGroup>/g);

    for (const match of conditionalGroups) {
        const condition = match[1];
        const blockContent = match[2];
        const configName = extractConfigName(condition);
        if (!configName) {
            continue;
        }

        const settings: VcxprojConfigSettings = {};
        const includeDirs = extractIncludeDirectories(blockContent);
        if (includeDirs.length > 0) {
            settings.includeDirectories = includeDirs;
        }

        const definitions = extractPreprocessorDefinitions(blockContent);
        if (definitions.length > 0) {
            settings.preprocessorDefinitions = definitions;
        }

        const libraries = extractLibraries(blockContent);
        if (libraries.length > 0) {
            settings.libraries = libraries;
        }

        const additionalCompileOptions = extractAdditionalOptions(blockContent, /<ClCompile>[\s\S]*?<AdditionalOptions>(.*?)<\/AdditionalOptions>[\s\S]*?<\/ClCompile>/g, '%(AdditionalOptions)');
        if (additionalCompileOptions.length > 0) {
            settings.additionalCompileOptions = additionalCompileOptions;
        }

        const additionalLinkOptions = extractAdditionalOptions(blockContent, /<Link>[\s\S]*?<AdditionalOptions>(.*?)<\/AdditionalOptions>[\s\S]*?<\/Link>/g, '%(AdditionalOptions)');
        if (additionalLinkOptions.length > 0) {
            settings.additionalLinkOptions = additionalLinkOptions;
        }

        const additionalLibraryDirectories = extractAdditionalLibraryDirectories(blockContent);
        if (additionalLibraryDirectories.length > 0) {
            settings.additionalLibraryDirectories = additionalLibraryDirectories;
        }

        const warningLevelMatch = blockContent.match(/<WarningLevel>Level(\d)<\/WarningLevel>/);
        if (warningLevelMatch) {
            settings.warningLevel = parseInt(warningLevelMatch[1], 10);
        }

        const optimizationMatch = blockContent.match(/<Optimization>(.*?)<\/Optimization>/);
        if (optimizationMatch) {
            settings.optimization = optimizationMatch[1].trim();
        }

        const debugInfoMatch = blockContent.match(/<DebugInformationFormat>(.*?)<\/DebugInformationFormat>/);
        if (debugInfoMatch) {
            settings.debugInformationFormat = debugInfoMatch[1].trim();
        }

        const runtimeLibraryMatch = blockContent.match(/<RuntimeLibrary>(.*?)<\/RuntimeLibrary>/);
        if (runtimeLibraryMatch) {
            settings.runtimeLibrary = parseRuntimeLibrary(runtimeLibraryMatch[1]);
        }

        const exceptionHandlingMatch = blockContent.match(/<ExceptionHandling>(.*?)<\/ExceptionHandling>/);
        if (exceptionHandlingMatch) {
            settings.exceptionHandling = exceptionHandlingMatch[1].trim();
        }

        const rttiMatch = blockContent.match(/<RuntimeTypeInfo>(.*?)<\/RuntimeTypeInfo>/);
        const rttiValue = rttiMatch ? parseBooleanValue(rttiMatch[1]) : undefined;
        if (rttiValue !== undefined) {
            settings.runtimeTypeInfo = rttiValue;
        }

        const treatWarningMatch = blockContent.match(/<TreatWarningAsError>(.*?)<\/TreatWarningAsError>/);
        const treatWarningValue = treatWarningMatch ? parseBooleanValue(treatWarningMatch[1]) : undefined;
        if (treatWarningValue !== undefined) {
            settings.treatWarningAsError = treatWarningValue;
        }

        const mpMatch = blockContent.match(/<MultiProcessorCompilation>(.*?)<\/MultiProcessorCompilation>/);
        const mpValue = mpMatch ? parseBooleanValue(mpMatch[1]) : undefined;
        if (mpValue !== undefined) {
            settings.multiProcessorCompilation = mpValue;
        }

        if (Object.keys(settings).length > 0) {
            const existing = configMap[configName];
            configMap[configName] = existing ? mergeConfigSettings(existing, settings) : settings;
        }
    }

    return configMap;
}

function extractConfigName(condition: string): string | undefined {
    const configPlatformMatch = condition.match(/'\$\(Configuration\)\|\$\(Platform\)'\s*==\s*'([^|']+)\|[^']+'/);
    if (configPlatformMatch) {
        return configPlatformMatch[1];
    }

    const configOnlyMatch = condition.match(/'\$\(Configuration\)'\s*==\s*'([^']+)'/);
    if (configOnlyMatch) {
        return configOnlyMatch[1];
    }

    return undefined;
}

function mergeConfigSettings(base: VcxprojConfigSettings, incoming: VcxprojConfigSettings): VcxprojConfigSettings {
    return {
        includeDirectories: mergeUniqueStrings(base.includeDirectories, incoming.includeDirectories ?? []),
        preprocessorDefinitions: mergeUniqueStrings(base.preprocessorDefinitions, incoming.preprocessorDefinitions ?? []),
        libraries: mergeUniqueStrings(base.libraries, incoming.libraries ?? []),
        additionalCompileOptions: mergeUniqueStrings(base.additionalCompileOptions, incoming.additionalCompileOptions ?? []),
        additionalLinkOptions: mergeUniqueStrings(base.additionalLinkOptions, incoming.additionalLinkOptions ?? []),
        additionalLibraryDirectories: mergeUniqueStrings(base.additionalLibraryDirectories, incoming.additionalLibraryDirectories ?? []),
        warningLevel: incoming.warningLevel ?? base.warningLevel,
        optimization: incoming.optimization ?? base.optimization,
        debugInformationFormat: incoming.debugInformationFormat ?? base.debugInformationFormat,
        runtimeLibrary: incoming.runtimeLibrary ?? base.runtimeLibrary,
        exceptionHandling: incoming.exceptionHandling ?? base.exceptionHandling,
        runtimeTypeInfo: incoming.runtimeTypeInfo ?? base.runtimeTypeInfo,
        treatWarningAsError: incoming.treatWarningAsError ?? base.treatWarningAsError,
        multiProcessorCompilation: incoming.multiProcessorCompilation ?? base.multiProcessorCompilation
    };
}

/**
 * Parse Visual Studio language standard to numeric C++ standard version
 * @param languageStandard The LanguageStandard value from vcxproj (e.g., "stdcpp14", "stdcpp17", "stdcpp20", "stdcpplatest")
 * @returns Numeric C++ standard version (e.g., 14, 17, 20, 23) or undefined if not recognized
 */
function parseLanguageStandard(languageStandard: string): number | undefined {
    const standardMap: Record<string, number> = {
        'stdcpp11': 11,
        'stdcpp14': 14,
        'stdcpp17': 17,
        'stdcpp20': 20,
        'stdcpp23': 23,
        'stdcpplatest': 23  // Map 'latest' to C++23 as a reasonable default
    };
    
    const normalized = languageStandard.toLowerCase();
    return standardMap[normalized];
}

/**
 * Parse precompiled header configuration from vcxproj content
 * @param content The XML content of the vcxproj file
 * @returns PCH configuration or undefined if PCH is not used
 */
function parsePchConfig(content: string): PchConfig | undefined {
    const pchConfig: PchConfig = {
        enabled: false,
        excludedFiles: []
    };

    // Extract global PrecompiledHeader setting from ItemDefinitionGroup
    // This is the default PCH setting applied to all files
    const globalPchMatch = content.match(/<ItemDefinitionGroup[^>]*>[\s\S]*?<ClCompile>[\s\S]*?<PrecompiledHeader>([^<]+)<\/PrecompiledHeader>/);
    const hasGlobalPch = globalPchMatch && globalPchMatch[1].trim().toLowerCase() === 'use';

    // Extract global PrecompiledHeaderFile setting
    const globalPchFileMatch = content.match(/<ItemDefinitionGroup[^>]*>[\s\S]*?<ClCompile>[\s\S]*?<PrecompiledHeaderFile>([^<]+)<\/PrecompiledHeaderFile>/);
    if (globalPchFileMatch) {
        pchConfig.headerFile = normalizePathSeparators(globalPchFileMatch[1].trim());
    }

    // Parse per-file PCH settings from ClCompile elements
    // Pattern to match ClCompile blocks with Include attribute and content
    const clCompileBlockRegex = /<ClCompile\s+Include="([^"]+)"\s*>([\s\S]*?)<\/ClCompile>/g;
    let match;

    while ((match = clCompileBlockRegex.exec(content)) !== null) {
        const fileName = normalizePathSeparators(match[1]);
        const blockContent = match[2];

        // Check for PrecompiledHeader setting within this ClCompile block
        const pchSettingMatch = blockContent.match(/<PrecompiledHeader>([^<]*)<\/PrecompiledHeader>/);
        if (pchSettingMatch) {
            const pchSetting = pchSettingMatch[1].trim().toLowerCase();

            if (pchSetting === 'create') {
                // This file creates the PCH
                pchConfig.sourceFile = fileName;
                pchConfig.enabled = true;
            } else if (pchSetting === 'notusing') {
                // This file is excluded from PCH
                if (!pchConfig.excludedFiles.includes(fileName)) {
                    pchConfig.excludedFiles.push(fileName);
                }
            } else if (pchSetting === 'use') {
                // File explicitly uses PCH
                pchConfig.enabled = true;
            }
        }

        // Also check for per-file PrecompiledHeaderFile setting
        const pchFileMatch = blockContent.match(/<PrecompiledHeaderFile>([^<]+)<\/PrecompiledHeaderFile>/);
        if (pchFileMatch && !pchConfig.headerFile) {
            pchConfig.headerFile = normalizePathSeparators(pchFileMatch[1].trim());
        }
    }

    // If global PCH is enabled but no source file found yet, mark as enabled
    if (hasGlobalPch) {
        pchConfig.enabled = true;
    }

    // Only return PCH config if it's actually used
    if (pchConfig.enabled || pchConfig.sourceFile || pchConfig.headerFile) {
        return pchConfig;
    }

    return undefined;
}

/**
 * Parse build events from vcxproj content
 * @param content The XML content of the vcxproj file
 * @returns Array of build events or undefined if none found
 */
function parseBuildEvents(content: string): BuildEvent[] | undefined {
    const buildEvents: BuildEvent[] = [];

    // Extract PreBuildEvent
    const preBuildMatch = content.match(/<PreBuildEvent>([\s\S]*?)<\/PreBuildEvent>/);
    if (preBuildMatch) {
        const preBuildContent = preBuildMatch[1];
        const commandMatch = preBuildContent.match(/<Command>(.*?)<\/Command>/);
        const messageMatch = preBuildContent.match(/<Message>(.*?)<\/Message>/);
        
        if (commandMatch && commandMatch[1].trim()) {
            buildEvents.push({
                type: 'PreBuild',
                command: commandMatch[1].trim(),
                message: messageMatch ? messageMatch[1].trim() : undefined
            });
        }
    }

    // Extract PreLinkEvent
    const preLinkMatch = content.match(/<PreLinkEvent>([\s\S]*?)<\/PreLinkEvent>/);
    if (preLinkMatch) {
        const preLinkContent = preLinkMatch[1];
        const commandMatch = preLinkContent.match(/<Command>(.*?)<\/Command>/);
        const messageMatch = preLinkContent.match(/<Message>(.*?)<\/Message>/);
        
        if (commandMatch && commandMatch[1].trim()) {
            buildEvents.push({
                type: 'PreLink',
                command: commandMatch[1].trim(),
                message: messageMatch ? messageMatch[1].trim() : undefined
            });
        }
    }

    // Extract PostBuildEvent
    const postBuildMatch = content.match(/<PostBuildEvent>([\s\S]*?)<\/PostBuildEvent>/);
    if (postBuildMatch) {
        const postBuildContent = postBuildMatch[1];
        const commandMatch = postBuildContent.match(/<Command>(.*?)<\/Command>/);
        const messageMatch = postBuildContent.match(/<Message>(.*?)<\/Message>/);
        
        if (commandMatch && commandMatch[1].trim()) {
            buildEvents.push({
                type: 'PostBuild',
                command: commandMatch[1].trim(),
                message: messageMatch ? messageMatch[1].trim() : undefined
            });
        }
    }

    // Extract CustomBuildStep
    const customBuildMatch = content.match(/<CustomBuildStep>([\s\S]*?)<\/CustomBuildStep>/);
    if (customBuildMatch) {
        const customBuildContent = customBuildMatch[1];
        const commandMatch = customBuildContent.match(/<Command>(.*?)<\/Command>/);
        const messageMatch = customBuildContent.match(/<Message>(.*?)<\/Message>/);
        const outputsMatch = customBuildContent.match(/<Outputs>(.*?)<\/Outputs>/);
        
        if (commandMatch && commandMatch[1].trim()) {
            const outputs = outputsMatch 
                ? outputsMatch[1].split(';').map(o => o.trim()).filter(o => o)
                : undefined;
                
            buildEvents.push({
                type: 'CustomBuild',
                command: commandMatch[1].trim(),
                message: messageMatch ? messageMatch[1].trim() : undefined,
                outputs: outputs
            });
        }
    }

    return buildEvents.length > 0 ? buildEvents : undefined;
}

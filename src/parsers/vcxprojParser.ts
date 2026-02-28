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
    /** Configuration|Platform condition (e.g., "Release|Win32") */
    condition?: string;
    /** Whether this event is enabled (PreBuildEventUseInBuild) */
    enabled?: boolean;
}

export interface VcxprojProject {
    name: string;
    type: 'Application' | 'StaticLibrary' | 'DynamicLibrary';
    sourceFiles: string[];
    headerFiles: string[];
    /** Resource files (.rc) */
    resourceFiles: string[];
    /** None items (files that are part of the project but not compiled) */
    noneFiles: string[];
    includeDirectories: string[];
    preprocessorDefinitions: string[];
    libraries: string[];
    /** References to other projects in the solution */
    projectReferences: ProjectReference[];
    outputDirectory?: string;
    /** Intermediate directory for build artifacts */
    intermediateDirectory?: string;
    /** Target name override (default is project name) */
    targetName?: string;
    /** Additional compiler options (from AdditionalOptions) */
    additionalCompileOptions?: string[];
    /** Additional linker options (from Link/AdditionalOptions) */
    additionalLinkOptions?: string[];
    /** Additional library directories (from Link/AdditionalLibraryDirectories) */
    additionalLibraryDirectories?: string[];
    /** C++ language standard (e.g., 11, 14, 17, 20, 23) */
    cxxStandard?: number;
    /** C language standard (e.g., 11, 17) */
    cStandard?: number;
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
    /** Function-level linking */
    functionLevelLinking?: boolean;
    /** Intrinsic functions */
    intrinsicFunctions?: boolean;
    /** Whole program optimization (LTO) */
    wholeProgramOptimization?: boolean;
    /** Generate debug information (linker) */
    generateDebugInformation?: boolean | string;
    /** Minimal rebuild */
    minimalRebuild?: boolean;
    /** String pooling */
    stringPooling?: boolean;
    /** Conformance mode (/permissive-) */
    conformanceMode?: boolean;
    /** Basic runtime checks (e.g., /RTC1) */
    basicRuntimeChecks?: string;
    /** Disabled specific warnings (e.g., ['4251', '4275']) */
    disableSpecificWarnings?: string[];
    /** Favor size or speed (Size=/Os, Speed=/Ot) */
    favorSizeOrSpeed?: string;
    /** Control flow guard (/guard:cf) */
    controlFlowGuard?: boolean;
    /** Enable COMDAT folding (/OPT:ICF) */
    enableCOMDATFolding?: boolean;
    /** Optimize references (/OPT:REF) */
    optimizeReferences?: boolean;
    /** Generate map file (/MAP) */
    generateMapFile?: boolean;
    /** Precompiled header configuration */
    pchConfig?: PchConfig;
    /** Build events (pre-build, post-build, custom build steps) */
    buildEvents?: BuildEvent[];
    /** Configuration-specific settings (e.g., Debug/Release) */
    configurations?: Record<string, VcxprojConfigSettings>;
}

/**
 * Reference to another project in the solution
 */
export interface ProjectReference {
    /** Path to the referenced vcxproj file */
    path: string;
    /** Project GUID */
    projectGuid?: string;
    /** Project name (optional, inferred from path if not present) */
    name?: string;
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
    functionLevelLinking?: boolean;
    intrinsicFunctions?: boolean;
    wholeProgramOptimization?: boolean;
    generateDebugInformation?: boolean | string;
    conformanceMode?: boolean;
    basicRuntimeChecks?: string;
    disableSpecificWarnings?: string[];
    favorSizeOrSpeed?: string;
    controlFlowGuard?: boolean;
    enableCOMDATFolding?: boolean;
    optimizeReferences?: boolean;
    generateMapFile?: boolean;
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
        name: extractProjectName(content, projectPath),
        type: 'Application',
        sourceFiles: [],
        headerFiles: [],
        resourceFiles: [],
        noneFiles: [],
        includeDirectories: [],
        preprocessorDefinitions: [],
        libraries: [],
        projectReferences: []
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

    // Extract resource files (ResourceCompile items) - .rc files
    const resourceMatches = content.matchAll(/<ResourceCompile\s+Include="([^"]+)"\s*\/>/g);
    for (const match of resourceMatches) {
        project.resourceFiles.push(normalizePathSeparators(match[1]));
    }
    const resourceBlockMatches = content.matchAll(/<ResourceCompile\s+Include="([^"]+)"\s*>/g);
    for (const match of resourceBlockMatches) {
        const file = normalizePathSeparators(match[1]);
        if (!project.resourceFiles.includes(file)) {
            project.resourceFiles.push(file);
        }
    }

    // Extract None items (files in the project but not compiled)
    const noneMatches = content.matchAll(/<None\s+Include="([^"]+)"\s*\/>/g);
    for (const match of noneMatches) {
        project.noneFiles.push(normalizePathSeparators(match[1]));
    }
    const noneBlockMatches = content.matchAll(/<None\s+Include="([^"]+)"\s*>/g);
    for (const match of noneBlockMatches) {
        const file = normalizePathSeparators(match[1]);
        if (!project.noneFiles.includes(file)) {
            project.noneFiles.push(file);
        }
    }

    // Extract project references
    project.projectReferences = extractProjectReferences(content);

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

    // Extract function-level linking
    const fllMatch = contentWithoutConditionalItemDefinitionGroups.match(/<FunctionLevelLinking>(.*?)<\/FunctionLevelLinking>/);
    const fllValue = fllMatch ? parseBooleanValue(fllMatch[1]) : undefined;
    if (fllValue !== undefined) {
        project.functionLevelLinking = fllValue;
    }

    // Extract intrinsic functions
    const ifMatch = contentWithoutConditionalItemDefinitionGroups.match(/<IntrinsicFunctions>(.*?)<\/IntrinsicFunctions>/);
    const ifValue = ifMatch ? parseBooleanValue(ifMatch[1]) : undefined;
    if (ifValue !== undefined) {
        project.intrinsicFunctions = ifValue;
    }

    // Extract whole program optimization
    const wpoMatch = content.match(/<WholeProgramOptimization>(.*?)<\/WholeProgramOptimization>/);
    const wpoValue = wpoMatch ? parseBooleanValue(wpoMatch[1]) : undefined;
    if (wpoValue !== undefined) {
        project.wholeProgramOptimization = wpoValue;
    }

    // Extract generate debug information
    const genDebugMatch = contentWithoutConditionalItemDefinitionGroups.match(/<GenerateDebugInformation>(.*?)<\/GenerateDebugInformation>/);
    if (genDebugMatch) {
        const val = genDebugMatch[1].trim();
        const boolVal = parseBooleanValue(val);
        project.generateDebugInformation = boolVal !== undefined ? boolVal : val;
    }

    // Extract minimal rebuild
    const minRebuildMatch = contentWithoutConditionalItemDefinitionGroups.match(/<MinimalRebuild>(.*?)<\/MinimalRebuild>/);
    const minRebuildValue = minRebuildMatch ? parseBooleanValue(minRebuildMatch[1]) : undefined;
    if (minRebuildValue !== undefined) {
        project.minimalRebuild = minRebuildValue;
    }

    // Extract string pooling
    const stringPoolMatch = contentWithoutConditionalItemDefinitionGroups.match(/<StringPooling>(.*?)<\/StringPooling>/);
    const stringPoolValue = stringPoolMatch ? parseBooleanValue(stringPoolMatch[1]) : undefined;
    if (stringPoolValue !== undefined) {
        project.stringPooling = stringPoolValue;
    }

    // Extract conformance mode
    const conformanceMatch = contentWithoutConditionalItemDefinitionGroups.match(/<ConformanceMode>(.*?)<\/ConformanceMode>/);
    const conformanceValue = conformanceMatch ? parseBooleanValue(conformanceMatch[1]) : undefined;
    if (conformanceValue !== undefined) {
        project.conformanceMode = conformanceValue;
    }

    // Extract basic runtime checks
    const rtcMatch = contentWithoutConditionalItemDefinitionGroups.match(/<BasicRuntimeChecks>(.*?)<\/BasicRuntimeChecks>/);
    if (rtcMatch) {
        project.basicRuntimeChecks = rtcMatch[1].trim();
    }

    // Extract disabled specific warnings
    const dswMatch = contentWithoutConditionalItemDefinitionGroups.match(/<DisableSpecificWarnings>(.*?)<\/DisableSpecificWarnings>/);
    if (dswMatch) {
        const warnings = dswMatch[1].split(';').map(w => w.trim()).filter(w => w && w !== '%(DisableSpecificWarnings)');
        if (warnings.length > 0) {
            project.disableSpecificWarnings = warnings;
        }
    }

    // Extract favor size or speed
    const fssMatch = contentWithoutConditionalItemDefinitionGroups.match(/<FavorSizeOrSpeed>(.*?)<\/FavorSizeOrSpeed>/);
    if (fssMatch) {
        project.favorSizeOrSpeed = fssMatch[1].trim();
    }

    // Extract control flow guard
    const cfgMatch = contentWithoutConditionalItemDefinitionGroups.match(/<ControlFlowGuard>(.*?)<\/ControlFlowGuard>/);
    if (cfgMatch) {
        project.controlFlowGuard = cfgMatch[1].trim() === 'Guard';
    }

    // Extract enable COMDAT folding (linker)
    const comdatMatch = contentWithoutConditionalItemDefinitionGroups.match(/<EnableCOMDATFolding>(.*?)<\/EnableCOMDATFolding>/);
    const comdatValue = comdatMatch ? parseBooleanValue(comdatMatch[1]) : undefined;
    if (comdatValue !== undefined) {
        project.enableCOMDATFolding = comdatValue;
    }

    // Extract optimize references (linker)
    const optRefMatch = contentWithoutConditionalItemDefinitionGroups.match(/<OptimizeReferences>(.*?)<\/OptimizeReferences>/);
    const optRefValue = optRefMatch ? parseBooleanValue(optRefMatch[1]) : undefined;
    if (optRefValue !== undefined) {
        project.optimizeReferences = optRefValue;
    }

    // Extract generate map file (linker)
    const mapFileMatch = contentWithoutConditionalItemDefinitionGroups.match(/<GenerateMapFile>(.*?)<\/GenerateMapFile>/);
    const mapFileValue = mapFileMatch ? parseBooleanValue(mapFileMatch[1]) : undefined;
    if (mapFileValue !== undefined) {
        project.generateMapFile = mapFileValue;
    }

    // Extract C language standard
    const cStandardMatch = contentWithoutConditionalItemDefinitionGroups.match(/<LanguageStandard_C>(.*?)<\/LanguageStandard_C>/);
    if (cStandardMatch) {
        project.cStandard = parseCLanguageStandard(cStandardMatch[1]);
    }

    // Extract intermediate directory
    const intDirMatch = content.match(/<IntDir>(.*?)<\/IntDir>/);
    if (intDirMatch) {
        project.intermediateDirectory = normalizePathSeparators(intDirMatch[1]);
    }

    // Extract target name
    const targetNameMatch = content.match(/<TargetName>(.*?)<\/TargetName>/);
    if (targetNameMatch) {
        project.targetName = targetNameMatch[1];
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
 * Extract project name from vcxproj content or file path.
 * Tries RootNamespace first, then ProjectName, then falls back to filename.
 * @param content The XML content of the vcxproj file
 * @param projectPath Path to the vcxproj file
 * @returns Project name
 */
function extractProjectName(content: string, projectPath: string): string {
    // Try RootNamespace first (common in VS projects)
    const rootNamespaceMatch = content.match(/<RootNamespace>(.*?)<\/RootNamespace>/);
    if (rootNamespaceMatch && rootNamespaceMatch[1].trim()) {
        return rootNamespaceMatch[1].trim();
    }

    // Try ProjectName
    const projectNameMatch = content.match(/<ProjectName>(.*?)<\/ProjectName>/);
    if (projectNameMatch && projectNameMatch[1].trim()) {
        return projectNameMatch[1].trim();
    }

    // Fall back to filename
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

/**
 * Extract project references from vcxproj content
 * @param content The XML content
 * @returns List of project references
 */
function extractProjectReferences(content: string): ProjectReference[] {
    const references: ProjectReference[] = [];
    const refMatches = content.matchAll(/<ProjectReference\s+Include="([^"]+)"[^>]*>([\s\S]*?)<\/ProjectReference>/g);
    for (const match of refMatches) {
        const ref: ProjectReference = {
            path: normalizePathSeparators(match[1]),
        };
        const guidMatch = match[2].match(/<Project>\{?([^}<]+)\}?<\/Project>/);
        if (guidMatch) {
            ref.projectGuid = guidMatch[1];
        }
        const nameMatch = match[2].match(/<Name>(.*?)<\/Name>/);
        if (nameMatch) {
            ref.name = nameMatch[1];
        } else {
            // Infer name from path
            const pathNameMatch = ref.path.match(/([^/\\]+)\.vcxproj$/);
            if (pathNameMatch) {
                ref.name = pathNameMatch[1];
            }
        }
        references.push(ref);
    }
    // Also handle self-closing ProjectReference tags
    const selfClosingRefs = content.matchAll(/<ProjectReference\s+Include="([^"]+)"\s*\/>/g);
    for (const match of selfClosingRefs) {
        const path = normalizePathSeparators(match[1]);
        if (!references.some(r => r.path === path)) {
            const ref: ProjectReference = { path };
            const pathNameMatch = path.match(/([^/\\]+)\.vcxproj$/);
            if (pathNameMatch) {
                ref.name = pathNameMatch[1];
            }
            references.push(ref);
        }
    }
    return references;
}

/**
 * Parse Visual Studio C language standard to numeric version
 * @param languageStandard The LanguageStandard_C value from vcxproj (e.g., "stdc11", "stdc17")
 * @returns Numeric C standard version or undefined
 */
function parseCLanguageStandard(languageStandard: string): number | undefined {
    const standardMap: Record<string, number> = {
        'stdc11': 11,
        'stdc17': 17,
        'stdclatest': 17  // Map 'latest' to C17 as a reasonable default
    };
    return standardMap[languageStandard.toLowerCase()];
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

        const fllMatch = blockContent.match(/<FunctionLevelLinking>(.*?)<\/FunctionLevelLinking>/);
        const fllValue = fllMatch ? parseBooleanValue(fllMatch[1]) : undefined;
        if (fllValue !== undefined) {
            settings.functionLevelLinking = fllValue;
        }

        const ifMatch = blockContent.match(/<IntrinsicFunctions>(.*?)<\/IntrinsicFunctions>/);
        const ifValue = ifMatch ? parseBooleanValue(ifMatch[1]) : undefined;
        if (ifValue !== undefined) {
            settings.intrinsicFunctions = ifValue;
        }

        const wpoMatch = blockContent.match(/<WholeProgramOptimization>(.*?)<\/WholeProgramOptimization>/);
        const wpoValue = wpoMatch ? parseBooleanValue(wpoMatch[1]) : undefined;
        if (wpoValue !== undefined) {
            settings.wholeProgramOptimization = wpoValue;
        }

        const genDebugMatch = blockContent.match(/<GenerateDebugInformation>(.*?)<\/GenerateDebugInformation>/);
        if (genDebugMatch) {
            const val = genDebugMatch[1].trim();
            const boolVal = parseBooleanValue(val);
            settings.generateDebugInformation = boolVal !== undefined ? boolVal : val;
        }

        const conformanceMatch = blockContent.match(/<ConformanceMode>(.*?)<\/ConformanceMode>/);
        const conformanceValue = conformanceMatch ? parseBooleanValue(conformanceMatch[1]) : undefined;
        if (conformanceValue !== undefined) {
            settings.conformanceMode = conformanceValue;
        }

        const rtcMatch = blockContent.match(/<BasicRuntimeChecks>(.*?)<\/BasicRuntimeChecks>/);
        if (rtcMatch) {
            settings.basicRuntimeChecks = rtcMatch[1].trim();
        }

        const dswMatch = blockContent.match(/<DisableSpecificWarnings>(.*?)<\/DisableSpecificWarnings>/);
        if (dswMatch) {
            const warnings = dswMatch[1].split(';').map(w => w.trim()).filter(w => w && w !== '%(DisableSpecificWarnings)');
            if (warnings.length > 0) {
                settings.disableSpecificWarnings = warnings;
            }
        }

        const fssMatch = blockContent.match(/<FavorSizeOrSpeed>(.*?)<\/FavorSizeOrSpeed>/);
        if (fssMatch) {
            settings.favorSizeOrSpeed = fssMatch[1].trim();
        }

        const cfgMatch = blockContent.match(/<ControlFlowGuard>(.*?)<\/ControlFlowGuard>/);
        if (cfgMatch) {
            settings.controlFlowGuard = cfgMatch[1].trim() === 'Guard';
        }

        const comdatMatch = blockContent.match(/<EnableCOMDATFolding>(.*?)<\/EnableCOMDATFolding>/);
        const comdatValue = comdatMatch ? parseBooleanValue(comdatMatch[1]) : undefined;
        if (comdatValue !== undefined) {
            settings.enableCOMDATFolding = comdatValue;
        }

        const optRefMatch = blockContent.match(/<OptimizeReferences>(.*?)<\/OptimizeReferences>/);
        const optRefValue = optRefMatch ? parseBooleanValue(optRefMatch[1]) : undefined;
        if (optRefValue !== undefined) {
            settings.optimizeReferences = optRefValue;
        }

        const mapFileMatch = blockContent.match(/<GenerateMapFile>(.*?)<\/GenerateMapFile>/);
        const mapFileValue = mapFileMatch ? parseBooleanValue(mapFileMatch[1]) : undefined;
        if (mapFileValue !== undefined) {
            settings.generateMapFile = mapFileValue;
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
        multiProcessorCompilation: incoming.multiProcessorCompilation ?? base.multiProcessorCompilation,
        functionLevelLinking: incoming.functionLevelLinking ?? base.functionLevelLinking,
        intrinsicFunctions: incoming.intrinsicFunctions ?? base.intrinsicFunctions,
        wholeProgramOptimization: incoming.wholeProgramOptimization ?? base.wholeProgramOptimization,
        generateDebugInformation: incoming.generateDebugInformation ?? base.generateDebugInformation,
        conformanceMode: incoming.conformanceMode ?? base.conformanceMode,
        basicRuntimeChecks: incoming.basicRuntimeChecks ?? base.basicRuntimeChecks,
        disableSpecificWarnings: mergeUniqueStrings(base.disableSpecificWarnings, incoming.disableSpecificWarnings ?? []),
        favorSizeOrSpeed: incoming.favorSizeOrSpeed ?? base.favorSizeOrSpeed,
        controlFlowGuard: incoming.controlFlowGuard ?? base.controlFlowGuard,
        enableCOMDATFolding: incoming.enableCOMDATFolding ?? base.enableCOMDATFolding,
        optimizeReferences: incoming.optimizeReferences ?? base.optimizeReferences,
        generateMapFile: incoming.generateMapFile ?? base.generateMapFile
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

    // Helper to extract command text (handles both single-line and multi-line CDATA or plain text)
    const extractCommand = (eventContent: string): string | undefined => {
        // Try single-line first
        const singleLineMatch = eventContent.match(/<Command>(.*?)<\/Command>/);
        if (singleLineMatch && singleLineMatch[1].trim()) {
            return decodeXmlEntities(singleLineMatch[1].trim());
        }
        // Try multi-line
        const multiLineMatch = eventContent.match(/<Command>([\s\S]*?)<\/Command>/);
        if (multiLineMatch && multiLineMatch[1].trim()) {
            return decodeXmlEntities(multiLineMatch[1].trim());
        }
        return undefined;
    };

    const extractMessage = (eventContent: string): string | undefined => {
        const match = eventContent.match(/<Message>([\s\S]*?)<\/Message>/);
        return match ? decodeXmlEntities(match[1].trim()) : undefined;
    };

    // Helper to check if an event type has UseInBuild=false within an ItemDefinitionGroup
    const checkUseInBuild = (blockContent: string, eventType: string): boolean | undefined => {
        const useInBuildMatch = blockContent.match(new RegExp(`<${eventType}EventUseInBuild>(.*?)<\\/${eventType}EventUseInBuild>`));
        if (useInBuildMatch) {
            return parseBooleanValue(useInBuildMatch[1]) ?? true;
        }
        return undefined;
    };

    // Parse build events from conditional ItemDefinitionGroups (configuration-specific)
    const conditionalGroups = content.matchAll(/<ItemDefinitionGroup\s+Condition="([^"]+)"[^>]*>([\s\S]*?)<\/ItemDefinitionGroup>/g);
    for (const groupMatch of conditionalGroups) {
        const condition = groupMatch[1];
        const blockContent = groupMatch[2];
        const configPlatform = extractConfigPlatformFromCondition(condition);

        for (const eventType of ['PreBuild', 'PreLink', 'PostBuild'] as const) {
            const eventTag = `${eventType}Event`;
            const eventRegex = new RegExp(`<${eventTag}>([\\s\\S]*?)<\\/${eventTag}>`, 'g');
            const eventMatches = blockContent.matchAll(eventRegex);
            for (const eventMatch of eventMatches) {
                const command = extractCommand(eventMatch[1]);
                const message = extractMessage(eventMatch[1]);
                const useInBuild = checkUseInBuild(blockContent, eventType);
                if (command) {
                    const enabled = useInBuild !== undefined ? useInBuild : true;
                    buildEvents.push({
                        type: eventType,
                        command,
                        message,
                        condition: configPlatform,
                        enabled
                    });
                }
            }
        }

        // CustomBuildStep
        const customMatches = blockContent.matchAll(/<CustomBuildStep>([\s\S]*?)<\/CustomBuildStep>/g);
        for (const customMatch of customMatches) {
            const command = extractCommand(customMatch[1]);
            const message = extractMessage(customMatch[1]);
            const outputsMatch = customMatch[1].match(/<Outputs>(.*?)<\/Outputs>/);
            if (command) {
                const outputs = outputsMatch
                    ? outputsMatch[1].split(';').map(o => o.trim()).filter(o => o)
                    : undefined;
                buildEvents.push({
                    type: 'CustomBuild',
                    command,
                    message,
                    outputs,
                    condition: configPlatform,
                    enabled: true
                });
            }
        }
    }

    // Parse build events from unconditional ItemDefinitionGroups
    const unconditionalGroups = content.matchAll(/<ItemDefinitionGroup\s*>([\s\S]*?)<\/ItemDefinitionGroup>/g);
    for (const groupMatch of unconditionalGroups) {
        const blockContent = groupMatch[1];

        for (const eventType of ['PreBuild', 'PreLink', 'PostBuild'] as const) {
            const eventTag = `${eventType}Event`;
            const eventRegex = new RegExp(`<${eventTag}>([\\s\\S]*?)<\\/${eventTag}>`, 'g');
            const eventMatches = blockContent.matchAll(eventRegex);
            for (const eventMatch of eventMatches) {
                const command = extractCommand(eventMatch[1]);
                const message = extractMessage(eventMatch[1]);
                const useInBuild = checkUseInBuild(blockContent, eventType);
                if (command) {
                    const enabled = useInBuild !== undefined ? useInBuild : true;
                    if (!buildEvents.some(e => e.type === eventType && e.command === command && !e.condition)) {
                        buildEvents.push({ type: eventType, command, message, enabled });
                    }
                }
            }
        }

        const customMatches = blockContent.matchAll(/<CustomBuildStep>([\s\S]*?)<\/CustomBuildStep>/g);
        for (const customMatch of customMatches) {
            const command = extractCommand(customMatch[1]);
            const message = extractMessage(customMatch[1]);
            const outputsMatch = customMatch[1].match(/<Outputs>(.*?)<\/Outputs>/);
            if (command) {
                const outputs = outputsMatch
                    ? outputsMatch[1].split(';').map(o => o.trim()).filter(o => o)
                    : undefined;
                if (!buildEvents.some(e => e.type === 'CustomBuild' && e.command === command && !e.condition)) {
                    buildEvents.push({ type: 'CustomBuild', command, message, outputs, enabled: true });
                }
            }
        }
    }

    return buildEvents.length > 0 ? buildEvents : undefined;
}

/**
 * Extract config|platform string from a condition attribute
 */
function extractConfigPlatformFromCondition(condition: string): string | undefined {
    const match = condition.match(/'\$\(Configuration\)\|\$\(Platform\)'\s*==\s*'([^']+)'/);
    if (match) {
        return match[1];
    }
    const configOnly = condition.match(/'\$\(Configuration\)'\s*==\s*'([^']+)'/);
    if (configOnly) {
        return configOnly[1];
    }
    return undefined;
}

/**
 * Decode common XML entities
 */
function decodeXmlEntities(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#xD;&#xA;/g, '\n')
        .replace(/&#xD;/g, '\r')
        .replace(/&#xA;/g, '\n')
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

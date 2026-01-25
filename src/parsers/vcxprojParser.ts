/**
 * Visual Studio Project (vcxproj) Parser
 * Parses .vcxproj files to extract project configuration for CMake conversion
 */

export interface VcxprojProject {
    name: string;
    type: 'Application' | 'StaticLibrary' | 'DynamicLibrary';
    sourceFiles: string[];
    headerFiles: string[];
    includeDirectories: string[];
    preprocessorDefinitions: string[];
    libraries: string[];
    outputDirectory?: string;
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
}

/**
 * Parse a vcxproj file content
 * @param content The XML content of the vcxproj file
 * @param projectPath The path to the vcxproj file (for relative path resolution)
 * @returns Parsed project information
 */
export function parseVcxproj(content: string, projectPath: string): VcxprojProject {
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
    const includeDirsMatches = content.matchAll(/<AdditionalIncludeDirectories>(.*?)<\/AdditionalIncludeDirectories>/g);
    for (const match of includeDirsMatches) {
        const dirs = match[1].split(';')
            .map(d => d.trim())
            .filter(d => d && d !== '%(AdditionalIncludeDirectories)');
        for (const dir of dirs) {
            const normalized = normalizePathSeparators(dir);
            if (!project.includeDirectories.includes(normalized)) {
                project.includeDirectories.push(normalized);
            }
        }
    }

    // Extract preprocessor definitions
    const definesMatches = content.matchAll(/<PreprocessorDefinitions>(.*?)<\/PreprocessorDefinitions>/g);
    for (const match of definesMatches) {
        const defs = match[1].split(';')
            .map(d => d.trim())
            .filter(d => d && d !== '%(PreprocessorDefinitions)');
        for (const def of defs) {
            if (!project.preprocessorDefinitions.includes(def)) {
                project.preprocessorDefinitions.push(def);
            }
        }
    }

    // Extract libraries from AdditionalDependencies
    const libMatches = content.matchAll(/<AdditionalDependencies>(.*?)<\/AdditionalDependencies>/g);
    for (const match of libMatches) {
        const libs = match[1].split(';')
            .map(l => l.trim())
            .filter(l => l && l !== '%(AdditionalDependencies)');
        for (const lib of libs) {
            // Remove .lib extension for CMake
            const libName = lib.replace(/\.lib$/i, '');
            if (!project.libraries.includes(libName)) {
                project.libraries.push(libName);
            }
        }
    }

    // Extract output directory
    const outDirMatch = content.match(/<OutDir>(.*?)<\/OutDir>/);
    if (outDirMatch) {
        project.outputDirectory = normalizePathSeparators(outDirMatch[1]);
    }

    // Extract C++ language standard
    const languageStandardMatch = content.match(/<LanguageStandard>(.*?)<\/LanguageStandard>/);
    if (languageStandardMatch) {
        project.cxxStandard = parseLanguageStandard(languageStandardMatch[1]);
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

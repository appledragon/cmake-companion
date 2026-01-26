/**
 * CMake Generator
 * Generates CMakeLists.txt content from project configuration
 */

import { VcxprojProject } from './vcxprojParser';
import { XcodeprojProject } from './xcodeprojParser';

/**
 * Generate CMakeLists.txt content from vcxproj project data
 * @param project The parsed project data
 * @returns CMakeLists.txt content as a string
 */
export function generateCMakeLists(project: VcxprojProject): string {
    const lines: string[] = [];

    // CMake minimum version - use higher versions for features
    const usesPch = project.pchConfig && project.pchConfig.enabled && project.pchConfig.headerFile;
    const usesRuntimeLibrary = !!project.runtimeLibrary || hasConfigRuntimeLibrary(project);
    const usesLinkOptions = (project.additionalLinkOptions && project.additionalLinkOptions.length > 0) ||
        (project.additionalLibraryDirectories && project.additionalLibraryDirectories.length > 0) ||
        hasConfigLinkOptions(project);
    const cmakeMinVersion = getMaxCMakeVersion([
        '3.10',
        usesLinkOptions ? '3.13' : '3.10',
        usesRuntimeLibrary ? '3.15' : '3.10',
        usesPch ? '3.16' : '3.10'
    ]);
    lines.push(`cmake_minimum_required(VERSION ${cmakeMinVersion})`);
    lines.push('');

    // Project declaration
    lines.push(`project(${project.name})`);
    lines.push('');

    // C++ standard (use parsed value or default to 17)
    const cxxStandard = project.cxxStandard ?? 17;
    lines.push('# Set C++ standard');
    lines.push(`set(CMAKE_CXX_STANDARD ${cxxStandard})`);
    lines.push('set(CMAKE_CXX_STANDARD_REQUIRED ON)');
    lines.push('');

    // Windows SDK version (if specified)
    if (project.windowsSdkVersion) {
        lines.push('# Windows SDK version');
        lines.push(`set(CMAKE_SYSTEM_VERSION ${project.windowsSdkVersion})`);
        lines.push('');
    }

    // Platform toolset comment (informational, as CMake handles this differently)
    if (project.platformToolset) {
        lines.push(`# Original Visual Studio platform toolset: ${project.platformToolset}`);
        lines.push('');
    }

    // Character set
    if (project.characterSet === 'Unicode') {
        lines.push('# Unicode character set');
        lines.push('add_definitions(-DUNICODE -D_UNICODE)');
        lines.push('');
    } else if (project.characterSet === 'MultiByte') {
        lines.push('# Multi-byte character set');
        lines.push('add_definitions(-D_MBCS)');
        lines.push('');
    }

    // Collect all source files (both .cpp and .h)
    const allFiles = [...project.sourceFiles, ...project.headerFiles];
    
    if (allFiles.length > 0) {
        lines.push('# Source files');
        lines.push('set(SOURCES');
        for (const file of allFiles) {
            lines.push(`    ${file}`);
        }
        lines.push(')');
        lines.push('');
    }

    // Add executable or library
    switch (project.type) {
        case 'Application':
            if (allFiles.length > 0) {
                lines.push('# Create executable');
                lines.push(`add_executable(\${PROJECT_NAME} \${SOURCES})`);
            } else {
                lines.push('# Create executable');
                lines.push(`add_executable(\${PROJECT_NAME} main.cpp)`);
            }
            break;
        case 'StaticLibrary':
            if (allFiles.length > 0) {
                lines.push('# Create static library');
                lines.push(`add_library(\${PROJECT_NAME} STATIC \${SOURCES})`);
            } else {
                lines.push('# Create static library');
                lines.push(`add_library(\${PROJECT_NAME} STATIC lib.cpp)`);
            }
            break;
        case 'DynamicLibrary':
            if (allFiles.length > 0) {
                lines.push('# Create shared library');
                lines.push(`add_library(\${PROJECT_NAME} SHARED \${SOURCES})`);
            } else {
                lines.push('# Create shared library');
                lines.push(`add_library(\${PROJECT_NAME} SHARED lib.cpp)`);
            }
            break;
    }
    lines.push('');

    // Include directories
    if (project.includeDirectories.length > 0) {
        lines.push('# Include directories');
        lines.push('target_include_directories(${PROJECT_NAME} PRIVATE');
        for (const dir of project.includeDirectories) {
            lines.push(`    ${dir}`);
        }
        lines.push(')');
        lines.push('');
    }

    appendConfigSpecificIncludeDirectories(lines, project);

    // Preprocessor definitions
    if (project.preprocessorDefinitions.length > 0) {
        lines.push('# Preprocessor definitions');
        lines.push('target_compile_definitions(${PROJECT_NAME} PRIVATE');
        for (const def of project.preprocessorDefinitions) {
            lines.push(`    ${def}`);
        }
        lines.push(')');
        lines.push('');
    }

    appendConfigSpecificPreprocessorDefinitions(lines, project);

    // Libraries
    if (project.libraries.length > 0) {
        lines.push('# Link libraries');
        lines.push('target_link_libraries(${PROJECT_NAME} PRIVATE');
        for (const lib of project.libraries) {
            lines.push(`    ${lib}`);
        }
        lines.push(')');
        lines.push('');
    }

    appendConfigSpecificLibraries(lines, project);

    // Additional library directories
    if (project.additionalLibraryDirectories && project.additionalLibraryDirectories.length > 0) {
        lines.push('# Additional library directories');
        lines.push('target_link_directories(${PROJECT_NAME} PRIVATE');
        for (const dir of project.additionalLibraryDirectories) {
            lines.push(`    ${dir}`);
        }
        lines.push(')');
        lines.push('');
    }

    appendConfigSpecificLinkDirectories(lines, project);

    // Compiler options
    const compileOptions = collectCompileOptions(project);
    if (compileOptions.length > 0) {
        lines.push('# Compiler options');
        lines.push('target_compile_options(${PROJECT_NAME} PRIVATE');
        for (const opt of compileOptions) {
            lines.push(`    ${formatCompilerOption(opt)}`);
        }
        lines.push(')');
        lines.push('');
    }

    appendConfigSpecificCompileOptions(lines, project);

    // Linker options
    if (project.additionalLinkOptions && project.additionalLinkOptions.length > 0) {
        lines.push('# Linker options');
        lines.push('target_link_options(${PROJECT_NAME} PRIVATE');
        for (const opt of project.additionalLinkOptions) {
            lines.push(`    ${formatLinkerOption(opt)}`);
        }
        lines.push(')');
        lines.push('');
    }

    appendConfigSpecificLinkOptions(lines, project);

    // MSVC runtime library (requires CMake 3.15+)
    const runtimeLibraryExpression = buildRuntimeLibraryExpression(project);
    if (runtimeLibraryExpression) {
        lines.push('# MSVC runtime library');
        lines.push(`set_property(TARGET \${PROJECT_NAME} PROPERTY MSVC_RUNTIME_LIBRARY "${runtimeLibraryExpression}")`);
        lines.push('');
    }

    // Precompiled headers (requires CMake 3.16+)
    if (project.pchConfig && project.pchConfig.enabled && project.pchConfig.headerFile) {
        lines.push('# Precompiled headers (requires CMake 3.16+)');
        lines.push(`target_precompile_headers(\${PROJECT_NAME} PRIVATE ${project.pchConfig.headerFile})`);
        lines.push('');

        // Handle files excluded from PCH
        if (project.pchConfig.excludedFiles.length > 0) {
            lines.push('# Files excluded from precompiled headers');
            lines.push('set_source_files_properties(');
            for (const file of project.pchConfig.excludedFiles) {
                lines.push(`    ${file}`);
            }
            lines.push('    PROPERTIES SKIP_PRECOMPILE_HEADERS ON');
            lines.push(')');
            lines.push('');
        }

        // If there's a PCH source file that creates the PCH (like stdafx.cpp),
        // we can optionally add a comment about it
        if (project.pchConfig.sourceFile) {
            lines.push(`# Note: Original PCH source file was: ${project.pchConfig.sourceFile}`);
            lines.push('');
        }
    }

    // Build events (pre-build, post-build, custom commands)
    if (project.buildEvents && project.buildEvents.length > 0) {
        lines.push('# Build events');
        for (const event of project.buildEvents) {
            if (event.message) {
                lines.push(`# ${event.message}`);
            }
            
            if (event.type === 'PreBuild') {
                lines.push('add_custom_command(TARGET ${PROJECT_NAME} PRE_BUILD');
                lines.push(`    COMMAND ${event.command}`);
                if (event.message) {
                    lines.push(`    COMMENT "${event.message}"`);
                }
                lines.push(')');
            } else if (event.type === 'PreLink') {
                lines.push('add_custom_command(TARGET ${PROJECT_NAME} PRE_LINK');
                lines.push(`    COMMAND ${event.command}`);
                if (event.message) {
                    lines.push(`    COMMENT "${event.message}"`);
                }
                lines.push(')');
            } else if (event.type === 'PostBuild') {
                lines.push('add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD');
                lines.push(`    COMMAND ${event.command}`);
                if (event.message) {
                    lines.push(`    COMMENT "${event.message}"`);
                }
                lines.push(')');
            } else if (event.type === 'CustomBuild' && event.outputs) {
                lines.push(`add_custom_command(OUTPUT ${event.outputs.join(' ')}`);
                lines.push(`    COMMAND ${event.command}`);
                if (event.message) {
                    lines.push(`    COMMENT "${event.message}"`);
                }
                lines.push(')');
            }
            lines.push('');
        }
    }

    // Subsystem (Windows-specific linker flag)
    if (project.subsystem && project.type === 'Application') {
        lines.push('# Windows subsystem');
        if (project.subsystem === 'Windows') {
            lines.push('if(WIN32)');
            lines.push('    set_target_properties(${PROJECT_NAME} PROPERTIES WIN32_EXECUTABLE TRUE)');
            lines.push('endif()');
        } else if (project.subsystem === 'Console') {
            lines.push('# Console application (default on Windows)');
        }
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Collect compiler options derived from project settings
 * @param project Parsed project settings
 * @returns List of compiler options
 */
function collectCompileOptions(project: VcxprojProject): string[] {
    const options: string[] = [];

    if (project.warningLevel !== undefined) {
        options.push(`/W${project.warningLevel}`);
    }

    if (project.optimization) {
        const flag = mapOptimizationToFlag(project.optimization);
        if (flag) {
            options.push(flag);
        }
    }

    if (project.debugInformationFormat) {
        const flag = mapDebugInfoToFlag(project.debugInformationFormat);
        if (flag) {
            options.push(flag);
        }
    }

    if (project.exceptionHandling) {
        const flag = mapExceptionHandlingToFlag(project.exceptionHandling);
        if (flag) {
            options.push(flag);
        }
    }

    if (project.runtimeTypeInfo !== undefined) {
        options.push(project.runtimeTypeInfo ? '/GR' : '/GR-');
    }

    if (project.treatWarningAsError) {
        options.push('/WX');
    }

    if (project.multiProcessorCompilation) {
        options.push('/MP');
    }

    if (project.additionalCompileOptions && project.additionalCompileOptions.length > 0) {
        for (const opt of project.additionalCompileOptions) {
            options.push(opt);
        }
    }

    return uniqueOptions(options);
}

function collectCompileOptionsFromConfig(settings: NonNullable<VcxprojProject['configurations']>[string]): string[] {
    const options: string[] = [];

    if (settings.warningLevel !== undefined) {
        options.push(`/W${settings.warningLevel}`);
    }

    if (settings.optimization) {
        const flag = mapOptimizationToFlag(settings.optimization);
        if (flag) {
            options.push(flag);
        }
    }

    if (settings.debugInformationFormat) {
        const flag = mapDebugInfoToFlag(settings.debugInformationFormat);
        if (flag) {
            options.push(flag);
        }
    }

    if (settings.exceptionHandling) {
        const flag = mapExceptionHandlingToFlag(settings.exceptionHandling);
        if (flag) {
            options.push(flag);
        }
    }

    if (settings.runtimeTypeInfo !== undefined) {
        options.push(settings.runtimeTypeInfo ? '/GR' : '/GR-');
    }

    if (settings.treatWarningAsError) {
        options.push('/WX');
    }

    if (settings.multiProcessorCompilation) {
        options.push('/MP');
    }

    if (settings.additionalCompileOptions && settings.additionalCompileOptions.length > 0) {
        for (const opt of settings.additionalCompileOptions) {
            options.push(opt);
        }
    }

    return uniqueOptions(options);
}

function uniqueOptions(options: string[]): string[] {
    const unique: string[] = [];
    for (const opt of options) {
        if (!unique.includes(opt)) {
            unique.push(opt);
        }
    }
    return unique;
}

function mapOptimizationToFlag(value: string): string | undefined {
    switch (value) {
        case 'Disabled':
            return '/Od';
        case 'MinSpace':
            return '/O1';
        case 'MaxSpeed':
            return '/O2';
        case 'Full':
            return '/Ox';
        default:
            return undefined;
    }
}

function mapDebugInfoToFlag(value: string): string | undefined {
    switch (value) {
        case 'ProgramDatabase':
            return '/Zi';
        case 'EditAndContinue':
            return '/ZI';
        case 'OldStyle':
            return '/Z7';
        default:
            return undefined;
    }
}

function mapExceptionHandlingToFlag(value: string): string | undefined {
    switch (value) {
        case 'Sync':
            return '/EHsc';
        case 'Async':
            return '/EHa';
        case 'SyncCThrow':
            return '/EHs';
        default:
            return undefined;
    }
}

function formatCompilerOption(option: string): string {
    return option.startsWith('/')
        ? `$<$<CXX_COMPILER_ID:MSVC>:${option}>`
        : option;
}

function formatLinkerOption(option: string): string {
    return option.startsWith('/')
        ? `$<$<CXX_COMPILER_ID:MSVC>:${option}>`
        : option;
}

function wrapConfigExpression(config: string, value: string): string {
    return `$<$<CONFIG:${config}>:${value}>`;
}

function appendConfigSpecificIncludeDirectories(lines: string[], project: VcxprojProject): void {
    if (!project.configurations) {
        return;
    }

    for (const [config, settings] of Object.entries(project.configurations)) {
        if (!settings.includeDirectories || settings.includeDirectories.length === 0) {
            continue;
        }

        lines.push(`# Include directories (${config})`);
        lines.push('target_include_directories(${PROJECT_NAME} PRIVATE');
        for (const dir of settings.includeDirectories) {
            lines.push(`    ${wrapConfigExpression(config, dir)}`);
        }
        lines.push(')');
        lines.push('');
    }
}

function appendConfigSpecificPreprocessorDefinitions(lines: string[], project: VcxprojProject): void {
    if (!project.configurations) {
        return;
    }

    for (const [config, settings] of Object.entries(project.configurations)) {
        if (!settings.preprocessorDefinitions || settings.preprocessorDefinitions.length === 0) {
            continue;
        }

        lines.push(`# Preprocessor definitions (${config})`);
        lines.push('target_compile_definitions(${PROJECT_NAME} PRIVATE');
        for (const def of settings.preprocessorDefinitions) {
            lines.push(`    ${wrapConfigExpression(config, def)}`);
        }
        lines.push(')');
        lines.push('');
    }
}

function appendConfigSpecificLibraries(lines: string[], project: VcxprojProject): void {
    if (!project.configurations) {
        return;
    }

    for (const [config, settings] of Object.entries(project.configurations)) {
        if (!settings.libraries || settings.libraries.length === 0) {
            continue;
        }

        lines.push(`# Link libraries (${config})`);
        lines.push('target_link_libraries(${PROJECT_NAME} PRIVATE');
        for (const lib of settings.libraries) {
            lines.push(`    ${wrapConfigExpression(config, lib)}`);
        }
        lines.push(')');
        lines.push('');
    }
}

function appendConfigSpecificLinkDirectories(lines: string[], project: VcxprojProject): void {
    if (!project.configurations) {
        return;
    }

    for (const [config, settings] of Object.entries(project.configurations)) {
        if (!settings.additionalLibraryDirectories || settings.additionalLibraryDirectories.length === 0) {
            continue;
        }

        lines.push(`# Additional library directories (${config})`);
        lines.push('target_link_directories(${PROJECT_NAME} PRIVATE');
        for (const dir of settings.additionalLibraryDirectories) {
            lines.push(`    ${wrapConfigExpression(config, dir)}`);
        }
        lines.push(')');
        lines.push('');
    }
}

function appendConfigSpecificCompileOptions(lines: string[], project: VcxprojProject): void {
    if (!project.configurations) {
        return;
    }

    for (const [config, settings] of Object.entries(project.configurations)) {
        const options = collectCompileOptionsFromConfig(settings);
        if (options.length === 0) {
            continue;
        }

        lines.push(`# Compiler options (${config})`);
        lines.push('target_compile_options(${PROJECT_NAME} PRIVATE');
        for (const opt of options) {
            lines.push(`    ${wrapConfigExpression(config, formatCompilerOption(opt))}`);
        }
        lines.push(')');
        lines.push('');
    }
}

function appendConfigSpecificLinkOptions(lines: string[], project: VcxprojProject): void {
    if (!project.configurations) {
        return;
    }

    for (const [config, settings] of Object.entries(project.configurations)) {
        if (!settings.additionalLinkOptions || settings.additionalLinkOptions.length === 0) {
            continue;
        }

        lines.push(`# Linker options (${config})`);
        lines.push('target_link_options(${PROJECT_NAME} PRIVATE');
        for (const opt of settings.additionalLinkOptions) {
            lines.push(`    ${wrapConfigExpression(config, formatLinkerOption(opt))}`);
        }
        lines.push(')');
        lines.push('');
    }
}

function buildRuntimeLibraryExpression(project: VcxprojProject): string | undefined {
    const parts: string[] = [];
    if (project.runtimeLibrary) {
        parts.push(project.runtimeLibrary);
    }

    if (project.configurations) {
        for (const [config, settings] of Object.entries(project.configurations)) {
            if (settings.runtimeLibrary) {
                parts.push(wrapConfigExpression(config, settings.runtimeLibrary));
            }
        }
    }

    return parts.length > 0 ? parts.join('') : undefined;
}

function hasConfigRuntimeLibrary(project: VcxprojProject): boolean {
    if (!project.configurations) {
        return false;
    }

    return Object.values(project.configurations).some(settings => !!settings.runtimeLibrary);
}

function hasConfigLinkOptions(project: VcxprojProject): boolean {
    if (!project.configurations) {
        return false;
    }

    return Object.values(project.configurations).some(settings =>
        (settings.additionalLinkOptions && settings.additionalLinkOptions.length > 0) ||
        (settings.additionalLibraryDirectories && settings.additionalLibraryDirectories.length > 0)
    );
}

function getMaxCMakeVersion(versions: string[]): string {
    let maxMajor = 0;
    let maxMinor = 0;
    for (const version of versions) {
        const [majorStr, minorStr] = version.split('.');
        const major = parseInt(majorStr, 10);
        const minor = parseInt(minorStr ?? '0', 10);
        if (major > maxMajor || (major === maxMajor && minor > maxMinor)) {
            maxMajor = major;
            maxMinor = minor;
        }
    }
    return `${maxMajor}.${maxMinor}`;
}

/**
 * Generate CMakeLists.txt content from Xcode project data
 * @param project The parsed Xcode project data
 * @returns CMakeLists.txt content as a string
 */
export function generateCMakeListsFromXcode(project: XcodeprojProject): string {
    const lines: string[] = [];

    // CMake minimum version
    const usesLinkOptions = (project.additionalLinkOptions && project.additionalLinkOptions.length > 0) ||
        (project.additionalLibraryDirectories && project.additionalLibraryDirectories.length > 0);
    const cmakeMinVersion = usesLinkOptions ? '3.13' : '3.10';
    lines.push(`cmake_minimum_required(VERSION ${cmakeMinVersion})`);
    lines.push('');

    // Project declaration
    lines.push(`project(${project.name})`);
    lines.push('');

    // C++ standard (use parsed value or default to 17)
    const cxxStandard = project.cxxStandard ?? 17;
    lines.push('# Set C++ standard');
    lines.push(`set(CMAKE_CXX_STANDARD ${cxxStandard})`);
    lines.push('set(CMAKE_CXX_STANDARD_REQUIRED ON)');
    lines.push('');

    // macOS deployment target (if specified)
    if (project.deploymentTarget) {
        lines.push('# macOS deployment target');
        lines.push(`set(CMAKE_OSX_DEPLOYMENT_TARGET ${project.deploymentTarget})`);
        lines.push('');
    }

    // Architecture (if specified)
    if (project.architecture) {
        lines.push('# Architecture');
        lines.push(`set(CMAKE_OSX_ARCHITECTURES ${project.architecture})`);
        lines.push('');
    }

    // Collect all source files (both .cpp/.m and .h)
    const allFiles = [...project.sourceFiles, ...project.headerFiles];
    
    if (allFiles.length > 0) {
        lines.push('# Source files');
        lines.push('set(SOURCES');
        for (const file of allFiles) {
            lines.push(`    ${file}`);
        }
        lines.push(')');
        lines.push('');
    }

    // Add executable or library
    switch (project.type) {
        case 'Application':
            if (allFiles.length > 0) {
                lines.push('# Create executable');
                lines.push(`add_executable(\${PROJECT_NAME} \${SOURCES})`);
            } else {
                lines.push('# Create executable');
                lines.push(`add_executable(\${PROJECT_NAME} main.cpp)`);
            }
            break;
        case 'StaticLibrary':
            if (allFiles.length > 0) {
                lines.push('# Create static library');
                lines.push(`add_library(\${PROJECT_NAME} STATIC \${SOURCES})`);
            } else {
                lines.push('# Create static library');
                lines.push(`add_library(\${PROJECT_NAME} STATIC lib.cpp)`);
            }
            break;
        case 'DynamicLibrary':
            if (allFiles.length > 0) {
                lines.push('# Create shared library');
                lines.push(`add_library(\${PROJECT_NAME} SHARED \${SOURCES})`);
            } else {
                lines.push('# Create shared library');
                lines.push(`add_library(\${PROJECT_NAME} SHARED lib.cpp)`);
            }
            break;
    }
    lines.push('');

    // Include directories
    if (project.includeDirectories.length > 0) {
        lines.push('# Include directories');
        lines.push('target_include_directories(${PROJECT_NAME} PRIVATE');
        for (const dir of project.includeDirectories) {
            lines.push(`    ${dir}`);
        }
        lines.push(')');
        lines.push('');
    }

    // Configuration-specific include directories
    if (project.configurations) {
        for (const [config, settings] of Object.entries(project.configurations)) {
            if (settings.includeDirectories && settings.includeDirectories.length > 0) {
                lines.push(`# Include directories (${config})`);
                lines.push('target_include_directories(${PROJECT_NAME} PRIVATE');
                for (const dir of settings.includeDirectories) {
                    lines.push(`    $<$<CONFIG:${config}>:${dir}>`);
                }
                lines.push(')');
                lines.push('');
            }
        }
    }

    // Preprocessor definitions
    if (project.preprocessorDefinitions.length > 0) {
        lines.push('# Preprocessor definitions');
        lines.push('target_compile_definitions(${PROJECT_NAME} PRIVATE');
        for (const def of project.preprocessorDefinitions) {
            lines.push(`    ${def}`);
        }
        lines.push(')');
        lines.push('');
    }

    // Configuration-specific preprocessor definitions
    if (project.configurations) {
        for (const [config, settings] of Object.entries(project.configurations)) {
            if (settings.preprocessorDefinitions && settings.preprocessorDefinitions.length > 0) {
                lines.push(`# Preprocessor definitions (${config})`);
                lines.push('target_compile_definitions(${PROJECT_NAME} PRIVATE');
                for (const def of settings.preprocessorDefinitions) {
                    lines.push(`    $<$<CONFIG:${config}>:${def}>`);
                }
                lines.push(')');
                lines.push('');
            }
        }
    }

    // Link libraries and frameworks
    const allLibraries = [...project.libraries, ...project.frameworks.map(f => `-framework ${f}`)];
    if (allLibraries.length > 0) {
        lines.push('# Link libraries');
        lines.push('target_link_libraries(${PROJECT_NAME} PRIVATE');
        for (const lib of allLibraries) {
            lines.push(`    ${lib}`);
        }
        lines.push(')');
        lines.push('');
    }

    // Additional library directories
    if (project.additionalLibraryDirectories && project.additionalLibraryDirectories.length > 0) {
        lines.push('# Additional library directories');
        lines.push('target_link_directories(${PROJECT_NAME} PRIVATE');
        for (const dir of project.additionalLibraryDirectories) {
            lines.push(`    ${dir}`);
        }
        lines.push(')');
        lines.push('');
    }

    // Compiler options
    if (project.additionalCompileOptions && project.additionalCompileOptions.length > 0) {
        lines.push('# Compiler options');
        lines.push('target_compile_options(${PROJECT_NAME} PRIVATE');
        for (const opt of project.additionalCompileOptions) {
            lines.push(`    ${opt}`);
        }
        lines.push(')');
        lines.push('');
    }

    // Configuration-specific compiler options
    if (project.configurations) {
        for (const [config, settings] of Object.entries(project.configurations)) {
            if (settings.additionalCompileOptions && settings.additionalCompileOptions.length > 0) {
                lines.push(`# Compiler options (${config})`);
                lines.push('target_compile_options(${PROJECT_NAME} PRIVATE');
                for (const opt of settings.additionalCompileOptions) {
                    lines.push(`    $<$<CONFIG:${config}>:${opt}>`);
                }
                lines.push(')');
                lines.push('');
            }
        }
    }

    // Linker options
    if (project.additionalLinkOptions && project.additionalLinkOptions.length > 0) {
        lines.push('# Linker options');
        lines.push('target_link_options(${PROJECT_NAME} PRIVATE');
        for (const opt of project.additionalLinkOptions) {
            lines.push(`    ${opt}`);
        }
        lines.push(')');
        lines.push('');
    }

    // Configuration-specific linker options
    if (project.configurations) {
        for (const [config, settings] of Object.entries(project.configurations)) {
            if (settings.additionalLinkOptions && settings.additionalLinkOptions.length > 0) {
                lines.push(`# Linker options (${config})`);
                lines.push('target_link_options(${PROJECT_NAME} PRIVATE');
                for (const opt of settings.additionalLinkOptions) {
                    lines.push(`    $<$<CONFIG:${config}>:${opt}>`);
                }
                lines.push(')');
                lines.push('');
            }
        }
    }

    // Shell script build phases (custom commands)
    if (project.shellScriptPhases && project.shellScriptPhases.length > 0) {
        lines.push('# Shell script build phases');
        for (const script of project.shellScriptPhases) {
            if (script.name) {
                lines.push(`# ${script.name}`);
            }
            
            // Determine if this should be PRE_BUILD or POST_BUILD based on outputs
            // If it has outputs, create a custom command with outputs
            // Otherwise, create a custom target or POST_BUILD command
            if (script.outputPaths && script.outputPaths.length > 0) {
                lines.push(`add_custom_command(OUTPUT ${script.outputPaths.join(' ')}`);
                lines.push(`    COMMAND ${script.shellPath || '/bin/sh'} -c "${script.shellScript.replace(/"/g, '\\"')}"`);
                if (script.inputPaths && script.inputPaths.length > 0) {
                    lines.push(`    DEPENDS ${script.inputPaths.join(' ')}`);
                }
                if (script.name) {
                    lines.push(`    COMMENT "${script.name}"`);
                }
                lines.push(')');
            } else {
                // No outputs, use POST_BUILD (most common for Run Script phases)
                lines.push('add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD');
                lines.push(`    COMMAND ${script.shellPath || '/bin/sh'} -c "${script.shellScript.replace(/"/g, '\\"')}"`);
                if (script.name) {
                    lines.push(`    COMMENT "${script.name}"`);
                }
                lines.push(')');
            }
            lines.push('');
        }
    }

    return lines.join('\n');
}

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
        project.optimizeReferences || project.enableCOMDATFolding ||
        project.generateMapFile || project.wholeProgramOptimization ||
        project.controlFlowGuard ||
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

    // Resource files (.rc)
    if (project.resourceFiles.length > 0) {
        lines.push('# Resource files');
        lines.push('set(RESOURCE_FILES');
        for (const file of project.resourceFiles) {
            lines.push(`    ${file}`);
        }
        lines.push(')');
        lines.push('');
    }

    // Add executable or library
    const hasResources = project.resourceFiles.length > 0;
    const resourceSuffix = hasResources ? ' ${RESOURCE_FILES}' : '';
    switch (project.type) {
        case 'Application':
            if (allFiles.length > 0) {
                lines.push('# Create executable');
                lines.push(`add_executable(\${PROJECT_NAME} \${SOURCES}${resourceSuffix})`);
            } else {
                lines.push('# Create executable');
                lines.push(`add_executable(\${PROJECT_NAME} main.cpp${resourceSuffix})`);
            }
            break;
        case 'StaticLibrary':
            if (allFiles.length > 0) {
                lines.push('# Create static library');
                lines.push(`add_library(\${PROJECT_NAME} STATIC \${SOURCES}${resourceSuffix})`);
            } else {
                lines.push('# Create static library');
                lines.push(`add_library(\${PROJECT_NAME} STATIC lib.cpp${resourceSuffix})`);
            }
            break;
        case 'DynamicLibrary':
            if (allFiles.length > 0) {
                lines.push('# Create shared library');
                lines.push(`add_library(\${PROJECT_NAME} SHARED \${SOURCES}${resourceSuffix})`);
            } else {
                lines.push('# Create shared library');
                lines.push(`add_library(\${PROJECT_NAME} SHARED lib.cpp${resourceSuffix})`);
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

    // Additional library directories (warn about MSBuild variables)
    if (project.additionalLibraryDirectories && project.additionalLibraryDirectories.length > 0) {
        lines.push('# Additional library directories');
        const hasMsBuildVars = project.additionalLibraryDirectories.some(d => /\$\([A-Za-z]+\)/.test(d));
        if (hasMsBuildVars) {
            lines.push('# WARNING: The following paths contain MSBuild variables that CMake cannot resolve.');
            lines.push('# Please replace $(OutDir), $(IntDir), etc. with CMake equivalents like ${CMAKE_BINARY_DIR}.');
        }
        lines.push('target_link_directories(${PROJECT_NAME} PRIVATE');
        for (const dir of project.additionalLibraryDirectories) {
            const converted = convertMsBuildVarsToCMake(dir);
            lines.push(`    ${converted}`);
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

    // Linker options (from project-level settings + additionalLinkOptions)
    const linkOptions = collectLinkOptions(project);
    if (linkOptions.length > 0) {
        lines.push('# Linker options');
        lines.push('target_link_options(${PROJECT_NAME} PRIVATE');
        for (const opt of linkOptions) {
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

    // Whole program optimization (LTCG)
    if (project.wholeProgramOptimization) {
        lines.push('# Whole program optimization (LTCG)');
        lines.push('set_property(TARGET ${PROJECT_NAME} PROPERTY INTERPROCEDURAL_OPTIMIZATION TRUE)');
        lines.push('');
    }

    // Build events (pre-build, post-build, custom commands)
    if (project.buildEvents && project.buildEvents.length > 0) {
        const enabledEvents = project.buildEvents.filter(e => e.enabled !== false);
        if (enabledEvents.length > 0) {
            lines.push('# Build events');
            for (const event of enabledEvents) {
                // Add condition comment if config/platform specific
                if (event.condition) {
                    lines.push(`# Condition: ${event.condition}`);
                }
                if (event.message) {
                    lines.push(`# ${event.message}`);
                }

                const configName = event.condition ? extractConfigFromCondition(event.condition) : undefined;

                if (event.type === 'PreBuild') {
                    lines.push('add_custom_command(TARGET ${PROJECT_NAME} PRE_BUILD');
                    if (configName) {
                        lines.push(`    COMMAND $<$<CONFIG:${configName}>:${event.command}>`);
                    } else {
                        lines.push(`    COMMAND ${event.command}`);
                    }
                    if (event.message) {
                        lines.push(`    COMMENT "${event.message}"`);
                    }
                    lines.push(')');
                } else if (event.type === 'PreLink') {
                    lines.push('add_custom_command(TARGET ${PROJECT_NAME} PRE_LINK');
                    if (configName) {
                        lines.push(`    COMMAND $<$<CONFIG:${configName}>:${event.command}>`);
                    } else {
                        lines.push(`    COMMAND ${event.command}`);
                    }
                    if (event.message) {
                        lines.push(`    COMMENT "${event.message}"`);
                    }
                    lines.push(')');
                } else if (event.type === 'PostBuild') {
                    lines.push('add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD');
                    if (configName) {
                        lines.push(`    COMMAND $<$<CONFIG:${configName}>:${event.command}>`);
                    } else {
                        lines.push(`    COMMAND ${event.command}`);
                    }
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
    }

    // Project dependencies (references to other projects)
    if (project.projectReferences.length > 0) {
        lines.push('# Project dependencies');
        for (const ref of project.projectReferences) {
            const depName = ref.name || ref.path.replace(/.*[/\\]/, '').replace(/\.vcxproj$/, '');
            lines.push(`# Dependency: ${depName} (${ref.path})`);
            lines.push(`# add_dependencies(\${PROJECT_NAME} ${depName})`);
        }
        lines.push('');
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

    if (project.intrinsicFunctions) {
        options.push('/Oi');
    }

    if (project.functionLevelLinking) {
        options.push('/Gy');
    }

    if (project.favorSizeOrSpeed) {
        const flag = mapFavorSizeOrSpeedToFlag(project.favorSizeOrSpeed);
        if (flag) {
            options.push(flag);
        }
    }

    if (project.controlFlowGuard) {
        options.push('/guard:cf');
    }

    if (project.conformanceMode) {
        options.push('/permissive-');
    }

    if (project.basicRuntimeChecks) {
        const flag = mapBasicRuntimeChecksToFlag(project.basicRuntimeChecks);
        if (flag) {
            options.push(flag);
        }
    }

    if (project.disableSpecificWarnings && project.disableSpecificWarnings.length > 0) {
        for (const warning of project.disableSpecificWarnings) {
            options.push(`/wd${warning}`);
        }
    }

    if (project.wholeProgramOptimization) {
        options.push('/GL');
    }

    if (project.stringPooling) {
        options.push('/GF');
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

    if (settings.intrinsicFunctions) {
        options.push('/Oi');
    }

    if (settings.functionLevelLinking) {
        options.push('/Gy');
    }

    if (settings.favorSizeOrSpeed) {
        const flag = mapFavorSizeOrSpeedToFlag(settings.favorSizeOrSpeed);
        if (flag) {
            options.push(flag);
        }
    }

    if (settings.controlFlowGuard) {
        options.push('/guard:cf');
    }

    if (settings.conformanceMode) {
        options.push('/permissive-');
    }

    if (settings.basicRuntimeChecks) {
        const flag = mapBasicRuntimeChecksToFlag(settings.basicRuntimeChecks);
        if (flag) {
            options.push(flag);
        }
    }

    if (settings.disableSpecificWarnings && settings.disableSpecificWarnings.length > 0) {
        for (const warning of settings.disableSpecificWarnings) {
            options.push(`/wd${warning}`);
        }
    }

    if (settings.wholeProgramOptimization) {
        options.push('/GL');
    }

    if (settings.additionalCompileOptions && settings.additionalCompileOptions.length > 0) {
        for (const opt of settings.additionalCompileOptions) {
            options.push(opt);
        }
    }

    return uniqueOptions(options);
}

/**
 * Collect linker options from project-level settings
 */
function collectLinkOptions(project: VcxprojProject): string[] {
    const options: string[] = [];

    if (project.optimizeReferences) {
        options.push('/OPT:REF');
    }

    if (project.enableCOMDATFolding) {
        options.push('/OPT:ICF');
    }

    if (project.generateMapFile) {
        options.push('/MAP');
    }

    if (project.wholeProgramOptimization) {
        options.push('/LTCG');
    }

    if (project.controlFlowGuard) {
        options.push('/guard:cf');
    }

    if (project.additionalLinkOptions && project.additionalLinkOptions.length > 0) {
        for (const opt of project.additionalLinkOptions) {
            options.push(opt);
        }
    }

    return uniqueOptions(options);
}

/**
 * Collect linker options from config-specific settings
 */
function collectLinkOptionsFromConfig(settings: NonNullable<VcxprojProject['configurations']>[string]): string[] {
    const options: string[] = [];

    if (settings.optimizeReferences) {
        options.push('/OPT:REF');
    }

    if (settings.enableCOMDATFolding) {
        options.push('/OPT:ICF');
    }

    if (settings.generateMapFile) {
        options.push('/MAP');
    }

    if (settings.wholeProgramOptimization) {
        options.push('/LTCG');
    }

    if (settings.controlFlowGuard) {
        options.push('/guard:cf');
    }

    if (settings.additionalLinkOptions && settings.additionalLinkOptions.length > 0) {
        for (const opt of settings.additionalLinkOptions) {
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

function mapFavorSizeOrSpeedToFlag(value: string): string | undefined {
    switch (value) {
        case 'Size':
            return '/Os';
        case 'Speed':
            return '/Ot';
        default:
            return undefined;
    }
}

function mapBasicRuntimeChecksToFlag(value: string): string | undefined {
    switch (value) {
        case 'EnableFastChecks':
            return '/RTC1';
        case 'StackFrameRuntimeCheck':
            return '/RTCs';
        case 'UninitializedLocalUsageCheck':
            return '/RTCu';
        default:
            return undefined;
    }
}

/**
 * Convert common MSBuild variables to CMake equivalents
 */
function convertMsBuildVarsToCMake(path: string): string {
    return path
        .replace(/\$\(OutDir\)/g, '${CMAKE_BINARY_DIR}/${CMAKE_CFG_INTDIR}')
        .replace(/\$\(IntDir\)/g, '${CMAKE_BINARY_DIR}/${CMAKE_CFG_INTDIR}')
        .replace(/\$\(SolutionDir\)/g, '${CMAKE_SOURCE_DIR}')
        .replace(/\$\(ProjectDir\)/g, '${CMAKE_CURRENT_SOURCE_DIR}')
        .replace(/\$\(Configuration\)/g, '${CMAKE_CFG_INTDIR}')
        .replace(/\$\(Platform\)/g, '${CMAKE_VS_PLATFORM_NAME}')
        .replace(/\$\(TargetName\)/g, '${PROJECT_NAME}')
        .replace(/\$\(TargetDir\)/g, '$<TARGET_FILE_DIR:${PROJECT_NAME}>');
}

/**
 * Extract config name from a condition string like "Release|Win32" or "Debug"
 */
function extractConfigFromCondition(condition: string): string {
    const parts = condition.split('|');
    return parts[0];
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

        const hasMsBuildVars = settings.additionalLibraryDirectories.some(d => /\$\([A-Za-z]+\)/.test(d));
        lines.push(`# Additional library directories (${config})`);
        if (hasMsBuildVars) {
            lines.push('# WARNING: The following paths contain MSBuild variables that CMake cannot resolve.');
        }
        lines.push('target_link_directories(${PROJECT_NAME} PRIVATE');
        for (const dir of settings.additionalLibraryDirectories) {
            const converted = convertMsBuildVarsToCMake(dir);
            lines.push(`    ${wrapConfigExpression(config, converted)}`);
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
        const options = collectLinkOptionsFromConfig(settings);
        if (options.length === 0) {
            continue;
        }

        lines.push(`# Linker options (${config})`);
        lines.push('target_link_options(${PROJECT_NAME} PRIVATE');
        for (const opt of options) {
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
        (settings.additionalLibraryDirectories && settings.additionalLibraryDirectories.length > 0) ||
        settings.optimizeReferences || settings.enableCOMDATFolding ||
        settings.generateMapFile || settings.wholeProgramOptimization ||
        settings.controlFlowGuard
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
        (project.additionalLibraryDirectories && project.additionalLibraryDirectories.length > 0) ||
        project.deadCodeStripping ||
        hasXcodeConfigLinkOptions(project);
    const needsBundle = project.type === 'Framework' || project.type === 'Bundle' ||
        (project.type === 'Application' && project.infoPlistFile);
    const cmakeMinVersion = needsBundle ? '3.14' : usesLinkOptions ? '3.13' : '3.10';
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

    // C standard (if specified)
    if (project.cStandard) {
        lines.push('# Set C standard');
        lines.push(`set(CMAKE_C_STANDARD ${project.cStandard})`);
        lines.push('set(CMAKE_C_STANDARD_REQUIRED ON)');
        lines.push('');
    }

    // SDK root (if specified)
    if (project.sdkRoot) {
        lines.push('# SDK root');
        lines.push(`set(CMAKE_OSX_SYSROOT ${project.sdkRoot})`);
        lines.push('');
    }

    // macOS deployment target (if specified)
    if (project.deploymentTarget) {
        lines.push('# macOS deployment target');
        lines.push(`set(CMAKE_OSX_DEPLOYMENT_TARGET ${project.deploymentTarget})`);
        lines.push('');
    }

    // iOS deployment target (if specified)
    if (project.iosDeploymentTarget) {
        lines.push('# iOS deployment target');
        lines.push(`set(CMAKE_OSX_DEPLOYMENT_TARGET ${project.iosDeploymentTarget})`);
        lines.push('');
    }

    // Architecture (if specified)
    if (project.architecture) {
        lines.push('# Architecture');
        lines.push(`set(CMAKE_OSX_ARCHITECTURES ${project.architecture})`);
        lines.push('');
    }

    // C++ standard library (if specified)
    if (project.cxxLibrary) {
        lines.push('# C++ standard library');
        lines.push(`set(CMAKE_CXX_FLAGS "\${CMAKE_CXX_FLAGS} -stdlib=${project.cxxLibrary}")`);
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

    // Resource files
    if (project.resourceFiles.length > 0) {
        lines.push('# Resource files');
        lines.push('set(RESOURCE_FILES');
        for (const file of project.resourceFiles) {
            lines.push(`    ${file}`);
        }
        lines.push(')');
        lines.push('');
    }

    // Add executable or library
    const hasResources = project.resourceFiles.length > 0;
    const resourceSuffix = hasResources ? ' ${RESOURCE_FILES}' : '';
    switch (project.type) {
        case 'Application':
            if (project.infoPlistFile) {
                // macOS/iOS app bundle
                if (allFiles.length > 0) {
                    lines.push('# Create application bundle');
                    lines.push(`add_executable(\${PROJECT_NAME} MACOSX_BUNDLE \${SOURCES}${resourceSuffix})`);
                } else {
                    lines.push('# Create application bundle');
                    lines.push(`add_executable(\${PROJECT_NAME} MACOSX_BUNDLE main.cpp${resourceSuffix})`);
                }
            } else {
                if (allFiles.length > 0) {
                    lines.push('# Create executable');
                    lines.push(`add_executable(\${PROJECT_NAME} \${SOURCES}${resourceSuffix})`);
                } else {
                    lines.push('# Create executable');
                    lines.push(`add_executable(\${PROJECT_NAME} main.cpp${resourceSuffix})`);
                }
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
        case 'Framework':
            if (allFiles.length > 0) {
                lines.push('# Create framework');
                lines.push(`add_library(\${PROJECT_NAME} SHARED \${SOURCES}${resourceSuffix})`);
            } else {
                lines.push('# Create framework');
                lines.push(`add_library(\${PROJECT_NAME} SHARED lib.cpp)`);
            }
            lines.push('set_target_properties(${PROJECT_NAME} PROPERTIES');
            lines.push('    FRAMEWORK TRUE');
            lines.push('    MACOSX_FRAMEWORK_IDENTIFIER ${BUNDLE_ID}');
            lines.push(')');
            break;
        case 'Bundle':
            if (allFiles.length > 0) {
                lines.push('# Create bundle');
                lines.push(`add_library(\${PROJECT_NAME} MODULE \${SOURCES}${resourceSuffix})`);
            } else {
                lines.push('# Create bundle');
                lines.push(`add_library(\${PROJECT_NAME} MODULE lib.cpp)`);
            }
            lines.push('set_target_properties(${PROJECT_NAME} PROPERTIES BUNDLE TRUE)');
            break;
    }
    lines.push('');

    // Mark resource files for bundle
    if (hasResources && (project.type === 'Application' || project.type === 'Framework' || project.type === 'Bundle')) {
        lines.push('# Set resource files for bundle');
        lines.push('set_source_files_properties(${RESOURCE_FILES} PROPERTIES');
        lines.push('    MACOSX_PACKAGE_LOCATION Resources');
        lines.push(')');
        lines.push('');
    }

    // Target properties (product name, bundle identifier, Info.plist)
    const targetProps: string[] = [];
    if (project.productName && project.productName !== project.name) {
        targetProps.push(`    OUTPUT_NAME "${project.productName}"`);
    }
    if (project.bundleIdentifier) {
        targetProps.push(`    MACOSX_BUNDLE_GUI_IDENTIFIER ${project.bundleIdentifier}`);
    }
    if (project.infoPlistFile) {
        targetProps.push(`    MACOSX_BUNDLE_INFO_PLIST ${project.infoPlistFile}`);
    }
    if (targetProps.length > 0) {
        lines.push('# Target properties');
        lines.push('set_target_properties(${PROJECT_NAME} PROPERTIES');
        for (const prop of targetProps) {
            lines.push(prop);
        }
        lines.push(')');
        lines.push('');
    }

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

    // Framework search paths
    if (project.frameworkSearchPaths && project.frameworkSearchPaths.length > 0) {
        lines.push('# Framework search paths');
        lines.push('target_link_directories(${PROJECT_NAME} PRIVATE');
        for (const dir of project.frameworkSearchPaths) {
            lines.push(`    ${dir}`);
        }
        lines.push(')');
        lines.push('');
    }

    // Collect compiler options from parsed settings
    const compileOptions = collectXcodeCompileOptions(project);
    const allCompileOptions = [...compileOptions, ...(project.additionalCompileOptions ?? [])];
    if (allCompileOptions.length > 0) {
        lines.push('# Compiler options');
        lines.push('target_compile_options(${PROJECT_NAME} PRIVATE');
        for (const opt of allCompileOptions) {
            lines.push(`    ${opt}`);
        }
        lines.push(')');
        lines.push('');
    }

    // Configuration-specific compiler options
    if (project.configurations) {
        for (const [config, settings] of Object.entries(project.configurations)) {
            const configCompileOpts = collectXcodeConfigCompileOptions(settings);
            const allConfigOpts = [...configCompileOpts, ...(settings.additionalCompileOptions ?? [])];
            if (allConfigOpts.length > 0) {
                lines.push(`# Compiler options (${config})`);
                lines.push('target_compile_options(${PROJECT_NAME} PRIVATE');
                for (const opt of allConfigOpts) {
                    lines.push(`    $<$<CONFIG:${config}>:${opt}>`);
                }
                lines.push(')');
                lines.push('');
            }
        }
    }

    // Collect linker options from parsed settings
    const linkOptions = collectXcodeLinkOptions(project);
    const allLinkOptions = [...linkOptions, ...(project.additionalLinkOptions ?? [])];
    if (allLinkOptions.length > 0) {
        lines.push('# Linker options');
        lines.push('target_link_options(${PROJECT_NAME} PRIVATE');
        for (const opt of allLinkOptions) {
            lines.push(`    ${opt}`);
        }
        lines.push(')');
        lines.push('');
    }

    // Configuration-specific linker options
    if (project.configurations) {
        for (const [config, settings] of Object.entries(project.configurations)) {
            const configLinkOpts = collectXcodeConfigLinkOptions(settings);
            const allConfigLinkOpts = [...configLinkOpts, ...(settings.additionalLinkOptions ?? [])];
            if (allConfigLinkOpts.length > 0) {
                lines.push(`# Linker options (${config})`);
                lines.push('target_link_options(${PROJECT_NAME} PRIVATE');
                for (const opt of allConfigLinkOpts) {
                    lines.push(`    $<$<CONFIG:${config}>:${opt}>`);
                }
                lines.push(')');
                lines.push('');
            }
        }
    }

    // Configuration-specific framework search paths
    if (project.configurations) {
        for (const [config, settings] of Object.entries(project.configurations)) {
            if (settings.frameworkSearchPaths && settings.frameworkSearchPaths.length > 0) {
                lines.push(`# Framework search paths (${config})`);
                lines.push('target_link_directories(${PROJECT_NAME} PRIVATE');
                for (const dir of settings.frameworkSearchPaths) {
                    lines.push(`    $<$<CONFIG:${config}>:${dir}>`);
                }
                lines.push(')');
                lines.push('');
            }
        }
    }

    // Configuration-specific library directories
    if (project.configurations) {
        for (const [config, settings] of Object.entries(project.configurations)) {
            if (settings.additionalLibraryDirectories && settings.additionalLibraryDirectories.length > 0) {
                lines.push(`# Additional library directories (${config})`);
                lines.push('target_link_directories(${PROJECT_NAME} PRIVATE');
                for (const dir of settings.additionalLibraryDirectories) {
                    lines.push(`    $<$<CONFIG:${config}>:${dir}>`);
                }
                lines.push(')');
                lines.push('');
            }
        }
    }

    // Runpath search paths
    if (project.runpathSearchPaths && project.runpathSearchPaths.length > 0) {
        lines.push('# Runpath search paths');
        lines.push('set_target_properties(${PROJECT_NAME} PROPERTIES');
        lines.push(`    BUILD_RPATH "${project.runpathSearchPaths.join(';')}"`);
        lines.push(`    INSTALL_RPATH "${project.runpathSearchPaths.join(';')}"`);
        lines.push(')');
        lines.push('');
    }

    // Copy files build phases
    if (project.copyFilesPhases && project.copyFilesPhases.length > 0) {
        lines.push('# Copy files build phases');
        for (const copyPhase of project.copyFilesPhases) {
            if (copyPhase.name) {
                lines.push(`# ${copyPhase.name}`);
            }
            const dstPath = copyPhase.dstPath || '${CMAKE_BINARY_DIR}';
            for (const file of copyPhase.files) {
                lines.push('add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD');
                lines.push(`    COMMAND \${CMAKE_COMMAND} -E copy_if_different ${file} ${dstPath}`);
                if (copyPhase.name) {
                    lines.push(`    COMMENT "${copyPhase.name}"`);
                }
                lines.push(')');
            }
            lines.push('');
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

    // Target dependencies
    if (project.targetDependencies && project.targetDependencies.length > 0) {
        lines.push('# Target dependencies');
        lines.push('# NOTE: Dependent targets must be defined in the same CMake project or imported');
        for (const dep of project.targetDependencies) {
            lines.push(`add_dependencies(\${PROJECT_NAME} ${dep})`);
        }
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Collect compiler options derived from Xcode project settings
 */
function collectXcodeCompileOptions(project: XcodeprojProject): string[] {
    const options: string[] = [];
    if (project.enableARC === true) {
        options.push('-fobjc-arc');
    } else if (project.enableARC === false) {
        options.push('-fno-objc-arc');
    }
    if (project.enableModules) {
        options.push('-fmodules');
    }
    if (project.treatWarningsAsErrors) {
        options.push('-Werror');
    }
    return options;
}

/**
 * Collect compiler options derived from Xcode config-specific settings
 */
function collectXcodeConfigCompileOptions(settings: import('./xcodeprojParser').XcodeprojConfigSettings): string[] {
    const options: string[] = [];
    if (settings.optimization) {
        const flag = mapXcodeOptimizationToFlag(settings.optimization);
        if (flag) {
            options.push(flag);
        }
    }
    if (settings.debugInformationFormat) {
        const flag = mapXcodeDebugInfoToFlag(settings.debugInformationFormat);
        if (flag) {
            options.push(flag);
        }
    }
    if (settings.treatWarningsAsErrors) {
        options.push('-Werror');
    }
    return options;
}

/**
 * Collect linker options derived from Xcode project settings
 */
function collectXcodeLinkOptions(project: XcodeprojProject): string[] {
    const options: string[] = [];
    if (project.deadCodeStripping) {
        options.push('-dead_strip');
    }
    return options;
}

/**
 * Collect linker options derived from Xcode config-specific settings
 */
function collectXcodeConfigLinkOptions(settings: import('./xcodeprojParser').XcodeprojConfigSettings): string[] {
    const options: string[] = [];
    if (settings.deadCodeStripping) {
        options.push('-dead_strip');
    }
    return options;
}

function hasXcodeConfigLinkOptions(project: XcodeprojProject): boolean {
    if (!project.configurations) {
        return false;
    }
    for (const settings of Object.values(project.configurations)) {
        if (settings.additionalLinkOptions && settings.additionalLinkOptions.length > 0) {
            return true;
        }
        if (settings.additionalLibraryDirectories && settings.additionalLibraryDirectories.length > 0) {
            return true;
        }
        if (settings.deadCodeStripping) {
            return true;
        }
    }
    return false;
}

/**
 * Map Xcode GCC_OPTIMIZATION_LEVEL to compiler flag
 */
function mapXcodeOptimizationToFlag(level: string): string | undefined {
    switch (level) {
        case '0': return '-O0';
        case '1': return '-O1';
        case '2': return '-O2';
        case '3': return '-O3';
        case 's': return '-Os';
        case 'fast': return '-Ofast';
        default: return undefined;
    }
}

/**
 * Map Xcode DEBUG_INFORMATION_FORMAT to compiler flag
 */
function mapXcodeDebugInfoToFlag(format: string): string | undefined {
    switch (format) {
        case 'dwarf': return '-g';
        case 'dwarf-with-dsym': return '-g';
        default: return undefined;
    }
}

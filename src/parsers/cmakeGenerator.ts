/**
 * CMake Generator
 * Generates CMakeLists.txt content from project configuration
 */

import { VcxprojProject } from './vcxprojParser';

/**
 * Generate CMakeLists.txt content from vcxproj project data
 * @param project The parsed project data
 * @returns CMakeLists.txt content as a string
 */
export function generateCMakeLists(project: VcxprojProject): string {
    const lines: string[] = [];

    // CMake minimum version - use 3.16 if PCH is used, otherwise 3.10
    const usesPch = project.pchConfig && project.pchConfig.enabled && project.pchConfig.headerFile;
    const cmakeMinVersion = usesPch ? '3.16' : '3.10';
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

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

    // CMake minimum version
    lines.push('cmake_minimum_required(VERSION 3.10)');
    lines.push('');

    // Project declaration
    lines.push(`project(${project.name})`);
    lines.push('');

    // C++ standard (commonly used)
    lines.push('# Set C++ standard');
    lines.push('set(CMAKE_CXX_STANDARD 11)');
    lines.push('set(CMAKE_CXX_STANDARD_REQUIRED ON)');
    lines.push('');

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

    return lines.join('\n');
}

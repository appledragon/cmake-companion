/**
 * Unit tests for CMake generator
 */

import { generateCMakeLists } from '../parsers/cmakeGenerator';
import { VcxprojProject } from '../parsers/vcxprojParser';
import * as assert from 'assert';

describe('CMake Generator', () => {
    describe('generateCMakeLists', () => {
        it('should generate CMakeLists for a simple application', () => {
            const project: VcxprojProject = {
                name: 'MyApp',
                type: 'Application',
                sourceFiles: ['main.cpp', 'utils.cpp'],
                headerFiles: ['utils.h'],
                includeDirectories: [],
                preprocessorDefinitions: [],
                libraries: []
            };

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('cmake_minimum_required(VERSION 3.10)'));
            assert.ok(cmake.includes('project(MyApp)'));
            assert.ok(cmake.includes('add_executable(${PROJECT_NAME} ${SOURCES})'));
            assert.ok(cmake.includes('main.cpp'));
            assert.ok(cmake.includes('utils.cpp'));
            assert.ok(cmake.includes('utils.h'));
        });

        it('should generate CMakeLists for a static library', () => {
            const project: VcxprojProject = {
                name: 'MyLib',
                type: 'StaticLibrary',
                sourceFiles: ['lib.cpp'],
                headerFiles: ['lib.h'],
                includeDirectories: [],
                preprocessorDefinitions: [],
                libraries: []
            };

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('add_library(${PROJECT_NAME} STATIC ${SOURCES})'));
            assert.ok(cmake.includes('lib.cpp'));
            assert.ok(cmake.includes('lib.h'));
        });

        it('should generate CMakeLists for a dynamic library', () => {
            const project: VcxprojProject = {
                name: 'MyDll',
                type: 'DynamicLibrary',
                sourceFiles: ['dll.cpp'],
                headerFiles: ['dll.h'],
                includeDirectories: [],
                preprocessorDefinitions: [],
                libraries: []
            };

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('add_library(${PROJECT_NAME} SHARED ${SOURCES})'));
        });

        it('should include directories', () => {
            const project: VcxprojProject = {
                name: 'MyApp',
                type: 'Application',
                sourceFiles: ['main.cpp'],
                headerFiles: [],
                includeDirectories: ['include', '../external/include'],
                preprocessorDefinitions: [],
                libraries: []
            };

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('target_include_directories(${PROJECT_NAME} PRIVATE'));
            assert.ok(cmake.includes('include'));
            assert.ok(cmake.includes('../external/include'));
        });

        it('should include preprocessor definitions', () => {
            const project: VcxprojProject = {
                name: 'MyApp',
                type: 'Application',
                sourceFiles: ['main.cpp'],
                headerFiles: [],
                includeDirectories: [],
                preprocessorDefinitions: ['WIN32', '_DEBUG', '_CONSOLE'],
                libraries: []
            };

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('target_compile_definitions(${PROJECT_NAME} PRIVATE'));
            assert.ok(cmake.includes('WIN32'));
            assert.ok(cmake.includes('_DEBUG'));
            assert.ok(cmake.includes('_CONSOLE'));
        });

        it('should include libraries', () => {
            const project: VcxprojProject = {
                name: 'MyApp',
                type: 'Application',
                sourceFiles: ['main.cpp'],
                headerFiles: [],
                includeDirectories: [],
                preprocessorDefinitions: [],
                libraries: ['opengl32', 'glu32']
            };

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('target_link_libraries(${PROJECT_NAME} PRIVATE'));
            assert.ok(cmake.includes('opengl32'));
            assert.ok(cmake.includes('glu32'));
        });

        it('should set C++ standard', () => {
            const project: VcxprojProject = {
                name: 'MyApp',
                type: 'Application',
                sourceFiles: ['main.cpp'],
                headerFiles: [],
                includeDirectories: [],
                preprocessorDefinitions: [],
                libraries: []
            };

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('set(CMAKE_CXX_STANDARD 17)'));
            assert.ok(cmake.includes('set(CMAKE_CXX_STANDARD_REQUIRED ON)'));
        });

        it('should handle project with no files', () => {
            const project: VcxprojProject = {
                name: 'EmptyApp',
                type: 'Application',
                sourceFiles: [],
                headerFiles: [],
                includeDirectories: [],
                preprocessorDefinitions: [],
                libraries: []
            };

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('add_executable(${PROJECT_NAME} main.cpp)'));
        });

        it('should generate complete CMakeLists with all features', () => {
            const project: VcxprojProject = {
                name: 'CompleteApp',
                type: 'Application',
                sourceFiles: ['main.cpp', 'utils.cpp'],
                headerFiles: ['utils.h', 'config.h'],
                includeDirectories: ['include', '../external/include'],
                preprocessorDefinitions: ['WIN32', '_DEBUG'],
                libraries: ['opengl32', 'user32']
            };

            const cmake = generateCMakeLists(project);
            
            // Verify structure
            assert.ok(cmake.includes('cmake_minimum_required'));
            assert.ok(cmake.includes('project(CompleteApp)'));
            assert.ok(cmake.includes('set(CMAKE_CXX_STANDARD'));
            assert.ok(cmake.includes('set(SOURCES'));
            assert.ok(cmake.includes('add_executable'));
            assert.ok(cmake.includes('target_include_directories'));
            assert.ok(cmake.includes('target_compile_definitions'));
            assert.ok(cmake.includes('target_link_libraries'));
            
            // Verify all components are present
            assert.ok(cmake.includes('main.cpp'));
            assert.ok(cmake.includes('utils.cpp'));
            assert.ok(cmake.includes('utils.h'));
            assert.ok(cmake.includes('config.h'));
            assert.ok(cmake.includes('include'));
            assert.ok(cmake.includes('../external/include'));
            assert.ok(cmake.includes('WIN32'));
            assert.ok(cmake.includes('_DEBUG'));
            assert.ok(cmake.includes('opengl32'));
            assert.ok(cmake.includes('user32'));
        });

        it('should use parsed C++ standard (14)', () => {
            const project: VcxprojProject = {
                name: 'MyApp',
                type: 'Application',
                sourceFiles: ['main.cpp'],
                headerFiles: [],
                includeDirectories: [],
                preprocessorDefinitions: [],
                libraries: [],
                cxxStandard: 14
            };

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('set(CMAKE_CXX_STANDARD 14)'));
        });

        it('should use parsed C++ standard (20)', () => {
            const project: VcxprojProject = {
                name: 'MyApp',
                type: 'Application',
                sourceFiles: ['main.cpp'],
                headerFiles: [],
                includeDirectories: [],
                preprocessorDefinitions: [],
                libraries: [],
                cxxStandard: 20
            };

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('set(CMAKE_CXX_STANDARD 20)'));
        });

        it('should include Windows SDK version', () => {
            const project: VcxprojProject = {
                name: 'MyApp',
                type: 'Application',
                sourceFiles: ['main.cpp'],
                headerFiles: [],
                includeDirectories: [],
                preprocessorDefinitions: [],
                libraries: [],
                windowsSdkVersion: '10.0.19041.0'
            };

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('set(CMAKE_SYSTEM_VERSION 10.0.19041.0)'));
        });

        it('should include platform toolset as comment', () => {
            const project: VcxprojProject = {
                name: 'MyApp',
                type: 'Application',
                sourceFiles: ['main.cpp'],
                headerFiles: [],
                includeDirectories: [],
                preprocessorDefinitions: [],
                libraries: [],
                platformToolset: 'v142'
            };

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('# Original Visual Studio platform toolset: v142'));
        });

        it('should add Unicode definitions for Unicode character set', () => {
            const project: VcxprojProject = {
                name: 'MyApp',
                type: 'Application',
                sourceFiles: ['main.cpp'],
                headerFiles: [],
                includeDirectories: [],
                preprocessorDefinitions: [],
                libraries: [],
                characterSet: 'Unicode'
            };

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('add_definitions(-DUNICODE -D_UNICODE)'));
        });

        it('should add MBCS definition for MultiByte character set', () => {
            const project: VcxprojProject = {
                name: 'MyApp',
                type: 'Application',
                sourceFiles: ['main.cpp'],
                headerFiles: [],
                includeDirectories: [],
                preprocessorDefinitions: [],
                libraries: [],
                characterSet: 'MultiByte'
            };

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('add_definitions(-D_MBCS)'));
        });

        it('should set WIN32_EXECUTABLE for Windows subsystem', () => {
            const project: VcxprojProject = {
                name: 'MyApp',
                type: 'Application',
                sourceFiles: ['main.cpp'],
                headerFiles: [],
                includeDirectories: [],
                preprocessorDefinitions: [],
                libraries: [],
                subsystem: 'Windows'
            };

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('set_target_properties(${PROJECT_NAME} PROPERTIES WIN32_EXECUTABLE TRUE)'));
        });

        it('should handle Console subsystem with a comment', () => {
            const project: VcxprojProject = {
                name: 'MyApp',
                type: 'Application',
                sourceFiles: ['main.cpp'],
                headerFiles: [],
                includeDirectories: [],
                preprocessorDefinitions: [],
                libraries: [],
                subsystem: 'Console'
            };

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('# Console application (default on Windows)'));
        });

        it('should generate complete CMakeLists with all extended properties', () => {
            const project: VcxprojProject = {
                name: 'FullApp',
                type: 'Application',
                sourceFiles: ['main.cpp'],
                headerFiles: ['header.h'],
                includeDirectories: ['include'],
                preprocessorDefinitions: ['DEBUG'],
                libraries: ['user32'],
                cxxStandard: 20,
                windowsSdkVersion: '10.0.22000.0',
                platformToolset: 'v143',
                characterSet: 'Unicode',
                subsystem: 'Windows'
            };

            const cmake = generateCMakeLists(project);
            
            // Verify all new properties are present
            assert.ok(cmake.includes('set(CMAKE_CXX_STANDARD 20)'));
            assert.ok(cmake.includes('set(CMAKE_SYSTEM_VERSION 10.0.22000.0)'));
            assert.ok(cmake.includes('# Original Visual Studio platform toolset: v143'));
            assert.ok(cmake.includes('add_definitions(-DUNICODE -D_UNICODE)'));
            assert.ok(cmake.includes('set_target_properties(${PROJECT_NAME} PROPERTIES WIN32_EXECUTABLE TRUE)'));
        });

        it('should generate compiler and linker options', () => {
            const project: VcxprojProject = {
                name: 'OptionsApp',
                type: 'Application',
                sourceFiles: ['main.cpp'],
                headerFiles: [],
                includeDirectories: [],
                preprocessorDefinitions: [],
                libraries: [],
                warningLevel: 4,
                optimization: 'MaxSpeed',
                debugInformationFormat: 'ProgramDatabase',
                exceptionHandling: 'Sync',
                runtimeTypeInfo: true,
                treatWarningAsError: true,
                multiProcessorCompilation: true,
                additionalCompileOptions: ['/bigobj'],
                additionalLinkOptions: ['/INCREMENTAL:NO'],
                additionalLibraryDirectories: ['lib'],
                runtimeLibrary: 'MultiThreadedDebugDLL'
            };

            const cmake = generateCMakeLists(project);

            assert.ok(cmake.includes('cmake_minimum_required(VERSION 3.15)'));
            assert.ok(cmake.includes('target_compile_options(${PROJECT_NAME} PRIVATE'));
            assert.ok(cmake.includes('/W4'));
            assert.ok(cmake.includes('/O2'));
            assert.ok(cmake.includes('/Zi'));
            assert.ok(cmake.includes('/EHsc'));
            assert.ok(cmake.includes('/GR'));
            assert.ok(cmake.includes('/WX'));
            assert.ok(cmake.includes('/MP'));
            assert.ok(cmake.includes('/bigobj'));
            assert.ok(cmake.includes('target_link_options(${PROJECT_NAME} PRIVATE'));
            assert.ok(cmake.includes('/INCREMENTAL:NO'));
            assert.ok(cmake.includes('target_link_directories(${PROJECT_NAME} PRIVATE'));
            assert.ok(cmake.includes('lib'));
            assert.ok(cmake.includes('MSVC_RUNTIME_LIBRARY'));
            assert.ok(cmake.includes('MultiThreadedDebugDLL'));
        });

        it('should generate configuration-specific settings', () => {
            const project: VcxprojProject = {
                name: 'ConfigApp',
                type: 'Application',
                sourceFiles: ['main.cpp'],
                headerFiles: [],
                includeDirectories: [],
                preprocessorDefinitions: [],
                libraries: [],
                configurations: {
                    Debug: {
                        includeDirectories: ['debug/include'],
                        preprocessorDefinitions: ['DEBUG'],
                        libraries: ['debuglib'],
                        additionalCompileOptions: ['/bigobj'],
                        additionalLinkOptions: ['/DEBUG:FULL'],
                        additionalLibraryDirectories: ['debug/lib'],
                        warningLevel: 4,
                        optimization: 'Disabled',
                        debugInformationFormat: 'ProgramDatabase',
                        runtimeLibrary: 'MultiThreadedDebugDLL'
                    },
                    Release: {
                        includeDirectories: ['release/include'],
                        preprocessorDefinitions: ['NDEBUG'],
                        libraries: ['releaselib'],
                        warningLevel: 3,
                        optimization: 'MaxSpeed',
                        runtimeLibrary: 'MultiThreadedDLL'
                    }
                }
            };

            const cmake = generateCMakeLists(project);

            assert.ok(cmake.includes('# Include directories (Debug)'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:debug/include>'));
            assert.ok(cmake.includes('# Preprocessor definitions (Debug)'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:DEBUG>'));
            assert.ok(cmake.includes('# Link libraries (Debug)'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:debuglib>'));
            assert.ok(cmake.includes('# Compiler options (Debug)'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:$<$<CXX_COMPILER_ID:MSVC>:/W4>>'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:$<$<CXX_COMPILER_ID:MSVC>:/Od>>'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:$<$<CXX_COMPILER_ID:MSVC>:/Zi>>'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:$<$<CXX_COMPILER_ID:MSVC>:/bigobj>>'));
            assert.ok(cmake.includes('# Linker options (Debug)'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:$<$<CXX_COMPILER_ID:MSVC>:/DEBUG:FULL>>'));
            assert.ok(cmake.includes('# Additional library directories (Debug)'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:debug/lib>'));

            assert.ok(cmake.includes('# Include directories (Release)'));
            assert.ok(cmake.includes('$<$<CONFIG:Release>:release/include>'));
            assert.ok(cmake.includes('# Preprocessor definitions (Release)'));
            assert.ok(cmake.includes('$<$<CONFIG:Release>:NDEBUG>'));
            assert.ok(cmake.includes('# Link libraries (Release)'));
            assert.ok(cmake.includes('$<$<CONFIG:Release>:releaselib>'));
            assert.ok(cmake.includes('# Compiler options (Release)'));
            assert.ok(cmake.includes('$<$<CONFIG:Release>:$<$<CXX_COMPILER_ID:MSVC>:/W3>>'));
            assert.ok(cmake.includes('$<$<CONFIG:Release>:$<$<CXX_COMPILER_ID:MSVC>:/O2>>'));

            assert.ok(cmake.includes('MSVC_RUNTIME_LIBRARY'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:MultiThreadedDebugDLL>'));
            assert.ok(cmake.includes('$<$<CONFIG:Release>:MultiThreadedDLL>'));
        });

        it('should generate precompiled headers configuration', () => {
            const project: VcxprojProject = {
                name: 'MyApp',
                type: 'Application',
                sourceFiles: ['main.cpp', 'pch.cpp'],
                headerFiles: ['pch.h'],
                includeDirectories: [],
                preprocessorDefinitions: [],
                libraries: [],
                pchConfig: {
                    enabled: true,
                    headerFile: 'pch.h',
                    sourceFile: 'pch.cpp',
                    excludedFiles: []
                }
            };

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('cmake_minimum_required(VERSION 3.16)'), 'Should require CMake 3.16 for PCH');
            assert.ok(cmake.includes('target_precompile_headers(${PROJECT_NAME} PRIVATE pch.h)'));
            assert.ok(cmake.includes('# Note: Original PCH source file was: pch.cpp'));
        });

        it('should generate precompiled headers with excluded files', () => {
            const project: VcxprojProject = {
                name: 'MyApp',
                type: 'Application',
                sourceFiles: ['main.cpp', 'pch.cpp', 'external/lib.cpp'],
                headerFiles: ['pch.h'],
                includeDirectories: [],
                preprocessorDefinitions: [],
                libraries: [],
                pchConfig: {
                    enabled: true,
                    headerFile: 'pch.h',
                    sourceFile: 'pch.cpp',
                    excludedFiles: ['external/lib.cpp', 'generated/code.cpp']
                }
            };

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('target_precompile_headers(${PROJECT_NAME} PRIVATE pch.h)'));
            assert.ok(cmake.includes('# Files excluded from precompiled headers'));
            assert.ok(cmake.includes('set_source_files_properties('));
            assert.ok(cmake.includes('external/lib.cpp'));
            assert.ok(cmake.includes('generated/code.cpp'));
            assert.ok(cmake.includes('PROPERTIES SKIP_PRECOMPILE_HEADERS ON'));
        });

        it('should not generate PCH configuration when not enabled', () => {
            const project: VcxprojProject = {
                name: 'MyApp',
                type: 'Application',
                sourceFiles: ['main.cpp'],
                headerFiles: [],
                includeDirectories: [],
                preprocessorDefinitions: [],
                libraries: []
            };

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('cmake_minimum_required(VERSION 3.10)'), 'Should use CMake 3.10 without PCH');
            assert.ok(!cmake.includes('target_precompile_headers'));
            assert.ok(!cmake.includes('SKIP_PRECOMPILE_HEADERS'));
        });

        it('should not generate PCH without header file', () => {
            const project: VcxprojProject = {
                name: 'MyApp',
                type: 'Application',
                sourceFiles: ['main.cpp'],
                headerFiles: [],
                includeDirectories: [],
                preprocessorDefinitions: [],
                libraries: [],
                pchConfig: {
                    enabled: true,
                    excludedFiles: []
                }
            };

            const cmake = generateCMakeLists(project);
            
            assert.ok(!cmake.includes('target_precompile_headers'), 'Should not generate PCH without header file');
        });
    });
});

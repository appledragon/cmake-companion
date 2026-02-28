/**
 * Unit tests for CMake generator
 */

import { generateCMakeLists, generateCMakeListsFromXcode } from '../parsers/cmakeGenerator';
import { VcxprojProject } from '../parsers/vcxprojParser';
import { XcodeprojProject } from '../parsers/xcodeprojParser';
import * as assert from 'assert';

describe('CMake Generator', () => {
    describe('generateCMakeLists', () => {
        function makeVcxProject(overrides?: Partial<VcxprojProject>): VcxprojProject {
            return {
                name: 'MyApp',
                type: 'Application',
                sourceFiles: ['main.cpp'],
                headerFiles: [],
                resourceFiles: [],
                noneFiles: [],
                includeDirectories: [],
                preprocessorDefinitions: [],
                libraries: [],
                projectReferences: [],
                ...overrides
            };
        }

        it('should generate CMakeLists for a simple application', () => {
            const project = makeVcxProject({
                sourceFiles: ['main.cpp', 'utils.cpp'],
                headerFiles: ['utils.h'],
            });

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('cmake_minimum_required(VERSION 3.10)'));
            assert.ok(cmake.includes('project(MyApp)'));
            assert.ok(cmake.includes('add_executable(${PROJECT_NAME} ${SOURCES})'));
            assert.ok(cmake.includes('main.cpp'));
            assert.ok(cmake.includes('utils.cpp'));
            assert.ok(cmake.includes('utils.h'));
        });

        it('should generate CMakeLists for a static library', () => {
            const project = makeVcxProject({
                name: 'MyLib',
                type: 'StaticLibrary',
                sourceFiles: ['lib.cpp'],
                headerFiles: ['lib.h'],
            });

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('add_library(${PROJECT_NAME} STATIC ${SOURCES})'));
            assert.ok(cmake.includes('lib.cpp'));
            assert.ok(cmake.includes('lib.h'));
        });

        it('should generate CMakeLists for a dynamic library', () => {
            const project = makeVcxProject({
                name: 'MyDll',
                type: 'DynamicLibrary',
                sourceFiles: ['dll.cpp'],
                headerFiles: ['dll.h'],
            });

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('add_library(${PROJECT_NAME} SHARED ${SOURCES})'));
        });

        it('should include directories', () => {
            const project = makeVcxProject({
                includeDirectories: ['include', '../external/include'],
            });

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('target_include_directories(${PROJECT_NAME} PRIVATE'));
            assert.ok(cmake.includes('include'));
            assert.ok(cmake.includes('../external/include'));
        });

        it('should include preprocessor definitions', () => {
            const project = makeVcxProject({
                preprocessorDefinitions: ['WIN32', '_DEBUG', '_CONSOLE'],
            });

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('target_compile_definitions(${PROJECT_NAME} PRIVATE'));
            assert.ok(cmake.includes('WIN32'));
            assert.ok(cmake.includes('_DEBUG'));
            assert.ok(cmake.includes('_CONSOLE'));
        });

        it('should include libraries', () => {
            const project = makeVcxProject({
                libraries: ['opengl32', 'glu32']
            });

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('target_link_libraries(${PROJECT_NAME} PRIVATE'));
            assert.ok(cmake.includes('opengl32'));
            assert.ok(cmake.includes('glu32'));
        });

        it('should set C++ standard', () => {
            const project = makeVcxProject();

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('set(CMAKE_CXX_STANDARD 17)'));
            assert.ok(cmake.includes('set(CMAKE_CXX_STANDARD_REQUIRED ON)'));
        });

        it('should handle project with no files', () => {
            const project = makeVcxProject({
                name: 'EmptyApp',
                sourceFiles: [],
            });

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('add_executable(${PROJECT_NAME} main.cpp)'));
        });

        it('should generate complete CMakeLists with all features', () => {
            const project = makeVcxProject({
                name: 'CompleteApp',
                sourceFiles: ['main.cpp', 'utils.cpp'],
                headerFiles: ['utils.h', 'config.h'],
                includeDirectories: ['include', '../external/include'],
                preprocessorDefinitions: ['WIN32', '_DEBUG'],
                libraries: ['opengl32', 'user32']
            });

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
            const project = makeVcxProject({
                cxxStandard: 14
            });

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('set(CMAKE_CXX_STANDARD 14)'));
        });

        it('should use parsed C++ standard (20)', () => {
            const project = makeVcxProject({
                cxxStandard: 20
            });

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('set(CMAKE_CXX_STANDARD 20)'));
        });

        it('should include Windows SDK version', () => {
            const project = makeVcxProject({
                windowsSdkVersion: '10.0.19041.0'
            });

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('set(CMAKE_SYSTEM_VERSION 10.0.19041.0)'));
        });

        it('should include platform toolset as comment', () => {
            const project = makeVcxProject({
                platformToolset: 'v142'
            });

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('# Original Visual Studio platform toolset: v142'));
        });

        it('should add Unicode definitions for Unicode character set', () => {
            const project = makeVcxProject({
                characterSet: 'Unicode'
            });

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('add_definitions(-DUNICODE -D_UNICODE)'));
        });

        it('should add MBCS definition for MultiByte character set', () => {
            const project = makeVcxProject({
                characterSet: 'MultiByte'
            });

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('add_definitions(-D_MBCS)'));
        });

        it('should set WIN32_EXECUTABLE for Windows subsystem', () => {
            const project = makeVcxProject({
                subsystem: 'Windows'
            });

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('set_target_properties(${PROJECT_NAME} PROPERTIES WIN32_EXECUTABLE TRUE)'));
        });

        it('should handle Console subsystem with a comment', () => {
            const project = makeVcxProject({
                subsystem: 'Console'
            });

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('# Console application (default on Windows)'));
        });

        it('should generate complete CMakeLists with all extended properties', () => {
            const project = makeVcxProject({
                name: 'FullApp',
                headerFiles: ['header.h'],
                includeDirectories: ['include'],
                preprocessorDefinitions: ['DEBUG'],
                libraries: ['user32'],
                cxxStandard: 20,
                windowsSdkVersion: '10.0.22000.0',
                platformToolset: 'v143',
                characterSet: 'Unicode',
                subsystem: 'Windows'
            });

            const cmake = generateCMakeLists(project);
            
            // Verify all new properties are present
            assert.ok(cmake.includes('set(CMAKE_CXX_STANDARD 20)'));
            assert.ok(cmake.includes('set(CMAKE_SYSTEM_VERSION 10.0.22000.0)'));
            assert.ok(cmake.includes('# Original Visual Studio platform toolset: v143'));
            assert.ok(cmake.includes('add_definitions(-DUNICODE -D_UNICODE)'));
            assert.ok(cmake.includes('set_target_properties(${PROJECT_NAME} PROPERTIES WIN32_EXECUTABLE TRUE)'));
        });

        it('should generate compiler and linker options', () => {
            const project = makeVcxProject({
                name: 'OptionsApp',
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
            });

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
            const project = makeVcxProject({
                name: 'ConfigApp',
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
            });

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
            const project = makeVcxProject({
                sourceFiles: ['main.cpp', 'pch.cpp'],
                headerFiles: ['pch.h'],
                pchConfig: {
                    enabled: true,
                    headerFile: 'pch.h',
                    sourceFile: 'pch.cpp',
                    excludedFiles: []
                }
            });

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('cmake_minimum_required(VERSION 3.16)'), 'Should require CMake 3.16 for PCH');
            assert.ok(cmake.includes('target_precompile_headers(${PROJECT_NAME} PRIVATE pch.h)'));
            assert.ok(cmake.includes('# Note: Original PCH source file was: pch.cpp'));
        });

        it('should generate precompiled headers with excluded files', () => {
            const project = makeVcxProject({
                sourceFiles: ['main.cpp', 'pch.cpp', 'external/lib.cpp'],
                headerFiles: ['pch.h'],
                pchConfig: {
                    enabled: true,
                    headerFile: 'pch.h',
                    sourceFile: 'pch.cpp',
                    excludedFiles: ['external/lib.cpp', 'generated/code.cpp']
                }
            });

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('target_precompile_headers(${PROJECT_NAME} PRIVATE pch.h)'));
            assert.ok(cmake.includes('# Files excluded from precompiled headers'));
            assert.ok(cmake.includes('set_source_files_properties('));
            assert.ok(cmake.includes('external/lib.cpp'));
            assert.ok(cmake.includes('generated/code.cpp'));
            assert.ok(cmake.includes('PROPERTIES SKIP_PRECOMPILE_HEADERS ON'));
        });

        it('should not generate PCH configuration when not enabled', () => {
            const project = makeVcxProject();

            const cmake = generateCMakeLists(project);
            
            assert.ok(cmake.includes('cmake_minimum_required(VERSION 3.10)'), 'Should use CMake 3.10 without PCH');
            assert.ok(!cmake.includes('target_precompile_headers'));
            assert.ok(!cmake.includes('SKIP_PRECOMPILE_HEADERS'));
        });

        it('should not generate PCH without header file', () => {
            const project = makeVcxProject({
                pchConfig: {
                    enabled: true,
                    excludedFiles: []
                }
            });

            const cmake = generateCMakeLists(project);
            
            assert.ok(!cmake.includes('target_precompile_headers'), 'Should not generate PCH without header file');
        });

        it('should handle build events', () => {
            const project = makeVcxProject({
                buildEvents: [
                    { type: 'PreBuild', command: 'echo Building...', message: 'Pre-build step' },
                    { type: 'PostBuild', command: 'copy output.exe ../bin/', message: 'Post-build step' }
                ]
            });

            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('PRE_BUILD') || cmake.includes('POST_BUILD'), 'Should include build event');
            assert.ok(cmake.includes('echo Building...') || cmake.includes('copy output.exe'));
        });

        it('should handle optimization Disabled', () => {
            const project = makeVcxProject({
                optimization: 'Disabled'
            });

            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('/Od'));
        });

        it('should handle optimization MinSpace', () => {
            const project = makeVcxProject({
                optimization: 'MinSpace'
            });

            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('/O1'));
        });

        it('should handle optimization Full', () => {
            const project = makeVcxProject({
                optimization: 'Full'
            });

            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('/Ox'));
        });

        it('should handle debugInformationFormat EditAndContinue', () => {
            const project = makeVcxProject({
                debugInformationFormat: 'EditAndContinue'
            });

            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('/ZI'));
        });

        it('should handle debugInformationFormat OldStyle', () => {
            const project = makeVcxProject({
                debugInformationFormat: 'OldStyle'
            });

            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('/Z7'));
        });

        it('should handle exceptionHandling Async', () => {
            const project = makeVcxProject({
                exceptionHandling: 'Async'
            });

            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('/EHa'));
        });

        it('should handle exceptionHandling SyncCThrow', () => {
            const project = makeVcxProject({
                exceptionHandling: 'SyncCThrow'
            });

            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('/EHs'));
        });

        it('should handle runtimeTypeInfo false', () => {
            const project = makeVcxProject({
                runtimeTypeInfo: false
            });

            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('/GR-'));
        });

        it('should handle unknown optimization gracefully', () => {
            const project = makeVcxProject({
                optimization: 'UnknownLevel'
            });

            const cmake = generateCMakeLists(project);
            // Should not crash, just skip the unknown optimization
            assert.ok(cmake.includes('project(MyApp)'));
            assert.ok(!cmake.includes('/O'));
        });

        it('should handle unknown debug info format gracefully', () => {
            const project = makeVcxProject({
                debugInformationFormat: 'UnknownFormat'
            });

            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('project(MyApp)'));
            assert.ok(!cmake.includes('/Z'));
        });

        it('should handle unknown exception handling gracefully', () => {
            const project = makeVcxProject({
                exceptionHandling: 'UnknownMode'
            });

            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('project(MyApp)'));
            assert.ok(!cmake.includes('/EH'));
        });

        it('should handle config-specific link options and library directories', () => {
            const project = makeVcxProject({
                name: 'ConfigApp',
                configurations: {
                    Debug: {
                        additionalLinkOptions: ['/DEBUG:FULL'],
                        additionalLibraryDirectories: ['debug/lib']
                    }
                }
            });

            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('Linker options (Debug)'));
            assert.ok(cmake.includes('Additional library directories (Debug)'));
        });

        it('should handle output directory property (no-op in cmake)', () => {
            const project = makeVcxProject({
                outputDirectory: 'bin/Release'
            });

            const cmake = generateCMakeLists(project);
            // outputDirectory is not directly used in cmake generation
            assert.ok(cmake.includes('project(MyApp)'));
        });

        it('should generate /Oi for intrinsicFunctions', () => {
            const project = makeVcxProject({ intrinsicFunctions: true });
            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('/Oi'));
        });

        it('should generate /Gy for functionLevelLinking', () => {
            const project = makeVcxProject({ functionLevelLinking: true });
            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('/Gy'));
        });

        it('should generate /Os for favorSizeOrSpeed=Size', () => {
            const project = makeVcxProject({ favorSizeOrSpeed: 'Size' });
            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('/Os'));
        });

        it('should generate /Ot for favorSizeOrSpeed=Speed', () => {
            const project = makeVcxProject({ favorSizeOrSpeed: 'Speed' });
            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('/Ot'));
        });

        it('should generate /guard:cf for controlFlowGuard', () => {
            const project = makeVcxProject({ controlFlowGuard: true });
            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('/guard:cf'));
        });

        it('should generate /permissive- for conformanceMode', () => {
            const project = makeVcxProject({ conformanceMode: true });
            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('/permissive-'));
        });

        it('should generate /RTC1 for basicRuntimeChecks=EnableFastChecks', () => {
            const project = makeVcxProject({ basicRuntimeChecks: 'EnableFastChecks' });
            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('/RTC1'));
        });

        it('should generate /wd flags for disableSpecificWarnings', () => {
            const project = makeVcxProject({ disableSpecificWarnings: ['4251', '4275'] });
            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('/wd4251'));
            assert.ok(cmake.includes('/wd4275'));
        });

        it('should generate /GL and /LTCG for wholeProgramOptimization', () => {
            const project = makeVcxProject({ wholeProgramOptimization: true });
            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('/GL'), 'Should include /GL compiler flag');
            assert.ok(cmake.includes('/LTCG'), 'Should include /LTCG linker flag');
        });

        it('should generate /OPT:REF for optimizeReferences', () => {
            const project = makeVcxProject({ optimizeReferences: true });
            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('/OPT:REF'));
        });

        it('should generate /OPT:ICF for enableCOMDATFolding', () => {
            const project = makeVcxProject({ enableCOMDATFolding: true });
            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('/OPT:ICF'));
        });

        it('should generate /MAP for generateMapFile', () => {
            const project = makeVcxProject({ generateMapFile: true });
            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('/MAP'));
        });

        it('should generate INTERPROCEDURAL_OPTIMIZATION for wholeProgramOptimization', () => {
            const project = makeVcxProject({ wholeProgramOptimization: true });
            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('INTERPROCEDURAL_OPTIMIZATION TRUE'));
        });

        it('should generate /GF for stringPooling', () => {
            const project = makeVcxProject({ stringPooling: true });
            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('/GF'));
        });

        it('should include resource files in the build', () => {
            const project = makeVcxProject({
                resourceFiles: ['SampleApp.rc']
            });
            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('# Resource files'));
            assert.ok(cmake.includes('set(RESOURCE_FILES'));
            assert.ok(cmake.includes('SampleApp.rc'));
            assert.ok(cmake.includes('${RESOURCE_FILES}'));
        });

        it('should include project references as dependencies', () => {
            const project = makeVcxProject({
                projectReferences: [
                    { path: '../GenerateProtobuf/GenerateProtobuf.vcxproj', name: 'GenerateProtobuf', projectGuid: '12345' }
                ]
            });
            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('# Project dependencies'));
            assert.ok(cmake.includes('GenerateProtobuf'));
        });

        it('should filter out disabled build events', () => {
            const project = makeVcxProject({
                buildEvents: [
                    { type: 'PreBuild', command: 'echo enabled', enabled: true },
                    { type: 'PreBuild', command: 'echo disabled', enabled: false }
                ]
            });
            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('echo enabled'));
            assert.ok(!cmake.includes('echo disabled'));
        });

        it('should wrap config-specific build events with generator expressions', () => {
            const project = makeVcxProject({
                buildEvents: [
                    { type: 'PreBuild', command: 'call build_spcpp.bat', condition: 'Release|Win32', enabled: true }
                ]
            });
            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('$<$<CONFIG:Release>:call build_spcpp.bat>'));
        });

        it('should convert MSBuild variables in library directories', () => {
            const project = makeVcxProject({
                additionalLibraryDirectories: ['$(OutDir)lib']
            });
            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('WARNING'));
            assert.ok(cmake.includes('${CMAKE_BINARY_DIR}'));
        });

        it('should generate config-specific compiler options with new flags', () => {
            const project = makeVcxProject({
                configurations: {
                    Release: {
                        intrinsicFunctions: true,
                        functionLevelLinking: true,
                        favorSizeOrSpeed: 'Size',
                        controlFlowGuard: true,
                        conformanceMode: true,
                        optimizeReferences: true,
                        enableCOMDATFolding: true,
                        generateMapFile: true
                    },
                    Debug: {
                        basicRuntimeChecks: 'EnableFastChecks',
                        disableSpecificWarnings: ['4251'],
                        debugInformationFormat: 'EditAndContinue'
                    }
                }
            });
            const cmake = generateCMakeLists(project);
            // Release compile options
            assert.ok(cmake.includes('$<$<CONFIG:Release>:$<$<CXX_COMPILER_ID:MSVC>:/Oi>>'));
            assert.ok(cmake.includes('$<$<CONFIG:Release>:$<$<CXX_COMPILER_ID:MSVC>:/Gy>>'));
            assert.ok(cmake.includes('$<$<CONFIG:Release>:$<$<CXX_COMPILER_ID:MSVC>:/Os>>'));
            assert.ok(cmake.includes('$<$<CONFIG:Release>:$<$<CXX_COMPILER_ID:MSVC>:/guard:cf>>'));
            assert.ok(cmake.includes('$<$<CONFIG:Release>:$<$<CXX_COMPILER_ID:MSVC>:/permissive->>'));
            // Release link options
            assert.ok(cmake.includes('$<$<CONFIG:Release>:$<$<CXX_COMPILER_ID:MSVC>:/OPT:REF>>'));
            assert.ok(cmake.includes('$<$<CONFIG:Release>:$<$<CXX_COMPILER_ID:MSVC>:/OPT:ICF>>'));
            assert.ok(cmake.includes('$<$<CONFIG:Release>:$<$<CXX_COMPILER_ID:MSVC>:/MAP>>'));
            // Debug compile options
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:$<$<CXX_COMPILER_ID:MSVC>:/RTC1>>'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:$<$<CXX_COMPILER_ID:MSVC>:/wd4251>>'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:$<$<CXX_COMPILER_ID:MSVC>:/ZI>>'));
        });

        it('should use cmake 3.13 when link options from settings exist', () => {
            const project = makeVcxProject({
                optimizeReferences: true,
                enableCOMDATFolding: true
            });
            const cmake = generateCMakeLists(project);
            assert.ok(cmake.includes('cmake_minimum_required(VERSION 3.13)'));
        });
    });

    describe('generateCMakeListsFromXcode', () => {
        function makeXcodeProject(overrides?: Partial<XcodeprojProject>): XcodeprojProject {
            return {
                name: 'MyXcodeApp',
                type: 'Application',
                sourceFiles: ['main.cpp'],
                headerFiles: [],
                resourceFiles: [],
                includeDirectories: [],
                preprocessorDefinitions: [],
                libraries: [],
                frameworks: [],
                ...overrides
            };
        }

        it('should generate basic CMakeLists for an Xcode application', () => {
            const project = makeXcodeProject({
                sourceFiles: ['main.cpp', 'utils.cpp'],
                headerFiles: ['utils.h']
            });

            const cmake = generateCMakeListsFromXcode(project);

            assert.ok(cmake.includes('cmake_minimum_required(VERSION 3.10)'));
            assert.ok(cmake.includes('project(MyXcodeApp)'));
            assert.ok(cmake.includes('add_executable(${PROJECT_NAME} ${SOURCES})'));
            assert.ok(cmake.includes('main.cpp'));
            assert.ok(cmake.includes('utils.cpp'));
            assert.ok(cmake.includes('utils.h'));
        });

        it('should generate CMakeLists for a static library', () => {
            const project = makeXcodeProject({ type: 'StaticLibrary', sourceFiles: ['lib.cpp'] });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('add_library(${PROJECT_NAME} STATIC ${SOURCES})'));
        });

        it('should generate CMakeLists for a dynamic library', () => {
            const project = makeXcodeProject({ type: 'DynamicLibrary', sourceFiles: ['lib.cpp'] });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('add_library(${PROJECT_NAME} SHARED ${SOURCES})'));
        });

        it('should handle empty source files for Application', () => {
            const project = makeXcodeProject({ sourceFiles: [], headerFiles: [] });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('add_executable(${PROJECT_NAME} main.cpp)'));
        });

        it('should handle empty source files for StaticLibrary', () => {
            const project = makeXcodeProject({ type: 'StaticLibrary', sourceFiles: [], headerFiles: [] });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('add_library(${PROJECT_NAME} STATIC lib.cpp)'));
        });

        it('should handle empty source files for DynamicLibrary', () => {
            const project = makeXcodeProject({ type: 'DynamicLibrary', sourceFiles: [], headerFiles: [] });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('add_library(${PROJECT_NAME} SHARED lib.cpp)'));
        });

        it('should set C++ standard from project', () => {
            const project = makeXcodeProject({ cxxStandard: 20 });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('set(CMAKE_CXX_STANDARD 20)'));
            assert.ok(cmake.includes('set(CMAKE_CXX_STANDARD_REQUIRED ON)'));
        });

        it('should default to C++ 17 when not specified', () => {
            const project = makeXcodeProject();
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('set(CMAKE_CXX_STANDARD 17)'));
        });

        it('should set macOS deployment target', () => {
            const project = makeXcodeProject({ deploymentTarget: '12.0' });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('set(CMAKE_OSX_DEPLOYMENT_TARGET 12.0)'));
        });

        it('should set architecture', () => {
            const project = makeXcodeProject({ architecture: 'arm64' });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('set(CMAKE_OSX_ARCHITECTURES arm64)'));
        });

        it('should include directories', () => {
            const project = makeXcodeProject({ includeDirectories: ['/usr/local/include', '../deps/include'] });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('target_include_directories(${PROJECT_NAME} PRIVATE'));
            assert.ok(cmake.includes('/usr/local/include'));
            assert.ok(cmake.includes('../deps/include'));
        });

        it('should include preprocessor definitions', () => {
            const project = makeXcodeProject({ preprocessorDefinitions: ['DEBUG', 'FEATURE_X=1'] });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('target_compile_definitions(${PROJECT_NAME} PRIVATE'));
            assert.ok(cmake.includes('DEBUG'));
            assert.ok(cmake.includes('FEATURE_X=1'));
        });

        it('should link libraries and frameworks', () => {
            const project = makeXcodeProject({
                libraries: ['z', 'pthread'],
                frameworks: ['Foundation', 'AppKit']
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('target_link_libraries(${PROJECT_NAME} PRIVATE'));
            assert.ok(cmake.includes('z'));
            assert.ok(cmake.includes('pthread'));
            assert.ok(cmake.includes('-framework Foundation'));
            assert.ok(cmake.includes('-framework AppKit'));
        });

        it('should add additional library directories', () => {
            const project = makeXcodeProject({ additionalLibraryDirectories: ['/usr/local/lib', '../deps/lib'] });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('target_link_directories(${PROJECT_NAME} PRIVATE'));
            assert.ok(cmake.includes('/usr/local/lib'));
            assert.ok(cmake.includes('../deps/lib'));
        });

        it('should add additional compile options', () => {
            const project = makeXcodeProject({ additionalCompileOptions: ['-Wno-deprecated', '-fvisibility=hidden'] });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('target_compile_options(${PROJECT_NAME} PRIVATE'));
            assert.ok(cmake.includes('-Wno-deprecated'));
            assert.ok(cmake.includes('-fvisibility=hidden'));
        });

        it('should add additional link options', () => {
            const project = makeXcodeProject({ additionalLinkOptions: ['-dead_strip', '-ObjC'] });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('target_link_options(${PROJECT_NAME} PRIVATE'));
            assert.ok(cmake.includes('-dead_strip'));
            assert.ok(cmake.includes('-ObjC'));
        });

        it('should use cmake 3.13 when link options are present', () => {
            const project = makeXcodeProject({ additionalLinkOptions: ['-dead_strip'] });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('cmake_minimum_required(VERSION 3.13)'));
        });

        it('should use cmake 3.13 when library directories are present', () => {
            const project = makeXcodeProject({ additionalLibraryDirectories: ['/some/path'] });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('cmake_minimum_required(VERSION 3.13)'));
        });

        it('should handle configuration-specific include directories', () => {
            const project = makeXcodeProject({
                configurations: {
                    Debug: { includeDirectories: ['debug/include'] },
                    Release: { includeDirectories: ['release/include'] }
                }
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('# Include directories (Debug)'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:debug/include>'));
            assert.ok(cmake.includes('# Include directories (Release)'));
            assert.ok(cmake.includes('$<$<CONFIG:Release>:release/include>'));
        });

        it('should handle configuration-specific preprocessor definitions', () => {
            const project = makeXcodeProject({
                configurations: {
                    Debug: { preprocessorDefinitions: ['DEBUG=1'] },
                    Release: { preprocessorDefinitions: ['NDEBUG'] }
                }
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:DEBUG=1>'));
            assert.ok(cmake.includes('$<$<CONFIG:Release>:NDEBUG>'));
        });

        it('should handle configuration-specific compile options', () => {
            const project = makeXcodeProject({
                configurations: {
                    Debug: { additionalCompileOptions: ['-O0', '-g'] },
                    Release: { additionalCompileOptions: ['-O3'] }
                }
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('# Compiler options (Debug)'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:-O0>'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:-g>'));
            assert.ok(cmake.includes('# Compiler options (Release)'));
            assert.ok(cmake.includes('$<$<CONFIG:Release>:-O3>'));
        });

        it('should handle configuration-specific link options', () => {
            const project = makeXcodeProject({
                configurations: {
                    Debug: { additionalLinkOptions: ['-Wl,-dead_strip'] }
                }
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('# Linker options (Debug)'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:-Wl,-dead_strip>'));
        });

        it('should handle shell script phases without outputs (POST_BUILD)', () => {
            const project = makeXcodeProject({
                shellScriptPhases: [{
                    name: 'Copy Resources',
                    shellScript: 'cp -r resources/ build/',
                    shellPath: '/bin/bash'
                }]
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('# Shell script build phases'));
            assert.ok(cmake.includes('# Copy Resources'));
            assert.ok(cmake.includes('TARGET ${PROJECT_NAME} POST_BUILD'));
            assert.ok(cmake.includes('/bin/bash'));
            assert.ok(cmake.includes('cp -r resources/ build/'));
        });

        it('should handle shell script phases with outputs (custom command)', () => {
            const project = makeXcodeProject({
                shellScriptPhases: [{
                    name: 'Generate Code',
                    shellScript: 'python generate.py',
                    outputPaths: ['generated.cpp'],
                    inputPaths: ['schema.json']
                }]
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('add_custom_command(OUTPUT generated.cpp'));
            assert.ok(cmake.includes('DEPENDS schema.json'));
            assert.ok(cmake.includes('COMMENT "Generate Code"'));
        });

        it('should handle shell script phases without name', () => {
            const project = makeXcodeProject({
                shellScriptPhases: [{
                    shellScript: 'echo hello'
                }]
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('TARGET ${PROJECT_NAME} POST_BUILD'));
            assert.ok(cmake.includes('echo hello'));
        });

        it('should use default shell /bin/sh when shellPath not specified', () => {
            const project = makeXcodeProject({
                shellScriptPhases: [{
                    shellScript: 'echo test'
                }]
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('/bin/sh'));
        });

        it('should escape quotes in shell scripts', () => {
            const project = makeXcodeProject({
                shellScriptPhases: [{
                    shellScript: 'echo "hello world"'
                }]
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('\\"hello world\\"'));
        });

        it('should generate a complete Xcode project with all features', () => {
            const project = makeXcodeProject({
                name: 'FullMacApp',
                sourceFiles: ['main.cpp', 'app.mm'],
                headerFiles: ['app.h'],
                includeDirectories: ['/usr/local/include'],
                preprocessorDefinitions: ['MACOS_TARGET'],
                libraries: ['z'],
                frameworks: ['Cocoa'],
                cxxStandard: 20,
                deploymentTarget: '13.0',
                architecture: 'arm64',
                additionalCompileOptions: ['-fmodules'],
                additionalLinkOptions: ['-Wl,-rpath,@loader_path/../Frameworks'],
                additionalLibraryDirectories: ['/opt/local/lib'],
                configurations: {
                    Debug: {
                        preprocessorDefinitions: ['DEBUG=1'],
                        additionalCompileOptions: ['-O0']
                    }
                },
                shellScriptPhases: [{
                    name: 'Run SwiftLint',
                    shellScript: 'swiftlint',
                    shellPath: '/bin/sh'
                }]
            });

            const cmake = generateCMakeListsFromXcode(project);

            assert.ok(cmake.includes('cmake_minimum_required(VERSION 3.13)'));
            assert.ok(cmake.includes('project(FullMacApp)'));
            assert.ok(cmake.includes('set(CMAKE_CXX_STANDARD 20)'));
            assert.ok(cmake.includes('set(CMAKE_OSX_DEPLOYMENT_TARGET 13.0)'));
            assert.ok(cmake.includes('set(CMAKE_OSX_ARCHITECTURES arm64)'));
            assert.ok(cmake.includes('add_executable(${PROJECT_NAME} ${SOURCES})'));
            assert.ok(cmake.includes('/usr/local/include'));
            assert.ok(cmake.includes('MACOS_TARGET'));
            assert.ok(cmake.includes('-framework Cocoa'));
            assert.ok(cmake.includes('/opt/local/lib'));
            assert.ok(cmake.includes('-fmodules'));
            assert.ok(cmake.includes('-Wl,-rpath,@loader_path/../Frameworks'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:DEBUG=1>'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:-O0>'));
            assert.ok(cmake.includes('# Run SwiftLint'));
        });

        it('should omit sections when arrays are empty', () => {
            const project = makeXcodeProject();
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(!cmake.includes('target_include_directories'));
            assert.ok(!cmake.includes('target_compile_definitions'));
            assert.ok(!cmake.includes('target_link_libraries'));
            assert.ok(!cmake.includes('target_link_directories'));
            assert.ok(!cmake.includes('target_compile_options'));
            assert.ok(!cmake.includes('target_link_options'));
            assert.ok(!cmake.includes('Shell script'));
        });

        it('should skip configs with empty settings', () => {
            const project = makeXcodeProject({
                configurations: {
                    Debug: {
                        includeDirectories: [],
                        preprocessorDefinitions: [],
                        additionalCompileOptions: [],
                        additionalLinkOptions: []
                    }
                }
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(!cmake.includes('# Include directories (Debug)'));
            assert.ok(!cmake.includes('# Preprocessor definitions (Debug)'));
            assert.ok(!cmake.includes('# Compiler options (Debug)'));
            assert.ok(!cmake.includes('# Linker options (Debug)'));
        });

        it('should output C standard when specified', () => {
            const project = makeXcodeProject({ cStandard: 11 });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('set(CMAKE_C_STANDARD 11)'));
            assert.ok(cmake.includes('set(CMAKE_C_STANDARD_REQUIRED ON)'));
        });

        it('should output iOS deployment target', () => {
            const project = makeXcodeProject({ iosDeploymentTarget: '15.0' });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('# iOS deployment target'));
            assert.ok(cmake.includes('set(CMAKE_OSX_DEPLOYMENT_TARGET 15.0)'));
        });

        it('should output SDKROOT as CMAKE_OSX_SYSROOT', () => {
            const project = makeXcodeProject({ sdkRoot: 'iphoneos' });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('set(CMAKE_OSX_SYSROOT iphoneos)'));
        });

        it('should output C++ standard library', () => {
            const project = makeXcodeProject({ cxxLibrary: 'libc++' });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('-stdlib=libc++'));
        });

        it('should output -fobjc-arc for ARC enabled', () => {
            const project = makeXcodeProject({ enableARC: true });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('-fobjc-arc'));
        });

        it('should output -fno-objc-arc for ARC disabled', () => {
            const project = makeXcodeProject({ enableARC: false });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('-fno-objc-arc'));
        });

        it('should output -fmodules for enable modules', () => {
            const project = makeXcodeProject({ enableModules: true });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('-fmodules'));
        });

        it('should output -Werror for treat warnings as errors', () => {
            const project = makeXcodeProject({ treatWarningsAsErrors: true });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('-Werror'));
        });

        it('should output -dead_strip for dead code stripping', () => {
            const project = makeXcodeProject({ deadCodeStripping: true });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('-dead_strip'));
            assert.ok(cmake.includes('target_link_options'));
        });

        it('should output framework search paths', () => {
            const project = makeXcodeProject({
                frameworkSearchPaths: ['/Library/Frameworks', '/opt/local/Library/Frameworks']
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('# Framework search paths'));
            assert.ok(cmake.includes('target_link_directories'));
            assert.ok(cmake.includes('/Library/Frameworks'));
            assert.ok(cmake.includes('/opt/local/Library/Frameworks'));
        });

        it('should output config-specific framework search paths', () => {
            const project = makeXcodeProject({
                configurations: {
                    Debug: { frameworkSearchPaths: ['/debug/frameworks'] }
                }
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('# Framework search paths (Debug)'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:/debug/frameworks>'));
        });

        it('should output config-specific library directories', () => {
            const project = makeXcodeProject({
                configurations: {
                    Release: { additionalLibraryDirectories: ['/release/lib'] }
                }
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('# Additional library directories (Release)'));
            assert.ok(cmake.includes('$<$<CONFIG:Release>:/release/lib>'));
        });

        it('should output runpath search paths', () => {
            const project = makeXcodeProject({
                runpathSearchPaths: ['@executable_path/../Frameworks', '@loader_path/../Frameworks']
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('BUILD_RPATH'));
            assert.ok(cmake.includes('INSTALL_RPATH'));
            assert.ok(cmake.includes('@executable_path/../Frameworks'));
        });

        it('should handle Framework type', () => {
            const project = makeXcodeProject({
                type: 'Framework',
                sourceFiles: ['MyFramework.cpp'],
                headerFiles: ['MyFramework.h']
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('# Create framework'));
            assert.ok(cmake.includes('add_library(${PROJECT_NAME} SHARED ${SOURCES})'));
            assert.ok(cmake.includes('FRAMEWORK TRUE'));
        });

        it('should handle Bundle type', () => {
            const project = makeXcodeProject({
                type: 'Bundle',
                sourceFiles: ['MyPlugin.cpp']
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('# Create bundle'));
            assert.ok(cmake.includes('add_library(${PROJECT_NAME} MODULE ${SOURCES})'));
            assert.ok(cmake.includes('BUNDLE TRUE'));
        });

        it('should create MACOSX_BUNDLE for app with Info.plist', () => {
            const project = makeXcodeProject({
                infoPlistFile: 'MyApp/Info.plist'
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('MACOSX_BUNDLE'));
            assert.ok(cmake.includes('MACOSX_BUNDLE_INFO_PLIST MyApp/Info.plist'));
        });

        it('should output product name when different from project name', () => {
            const project = makeXcodeProject({
                name: 'MyInternalName',
                productName: 'MyPublicName'
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('OUTPUT_NAME "MyPublicName"'));
        });

        it('should not output product name when same as project name', () => {
            const project = makeXcodeProject({
                name: 'MyApp',
                productName: 'MyApp'
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(!cmake.includes('OUTPUT_NAME'));
        });

        it('should output bundle identifier', () => {
            const project = makeXcodeProject({
                bundleIdentifier: 'com.example.MyApp'
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('MACOSX_BUNDLE_GUI_IDENTIFIER com.example.MyApp'));
        });

        it('should output resource files and mark for bundle', () => {
            const project = makeXcodeProject({
                resourceFiles: ['Assets.xcassets', 'LaunchScreen.storyboard'],
                infoPlistFile: 'Info.plist'
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('set(RESOURCE_FILES'));
            assert.ok(cmake.includes('Assets.xcassets'));
            assert.ok(cmake.includes('LaunchScreen.storyboard'));
            assert.ok(cmake.includes('${RESOURCE_FILES}'));
            assert.ok(cmake.includes('MACOSX_PACKAGE_LOCATION Resources'));
        });

        it('should output copy files phases', () => {
            const project = makeXcodeProject({
                copyFilesPhases: [{
                    name: 'Copy Libraries',
                    dstPath: '/usr/local/lib',
                    files: ['libfoo.dylib']
                }]
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('# Copy files build phases'));
            assert.ok(cmake.includes('# Copy Libraries'));
            assert.ok(cmake.includes('copy_if_different libfoo.dylib /usr/local/lib'));
        });

        it('should output target dependencies', () => {
            const project = makeXcodeProject({
                targetDependencies: ['CoreLib', 'NetworkLib']
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('# Target dependencies'));
            assert.ok(cmake.includes('add_dependencies(${PROJECT_NAME} CoreLib)'));
            assert.ok(cmake.includes('add_dependencies(${PROJECT_NAME} NetworkLib)'));
        });

        it('should output config-specific optimization flags', () => {
            const project = makeXcodeProject({
                configurations: {
                    Debug: { optimization: '0', debugInformationFormat: 'dwarf-with-dsym' },
                    Release: { optimization: 's', debugInformationFormat: 'dwarf' }
                }
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:-O0>'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:-g>'));
            assert.ok(cmake.includes('$<$<CONFIG:Release>:-Os>'));
            assert.ok(cmake.includes('$<$<CONFIG:Release>:-g>'));
        });

        it('should output config-specific dead code stripping', () => {
            const project = makeXcodeProject({
                configurations: {
                    Release: { deadCodeStripping: true }
                }
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('$<$<CONFIG:Release>:-dead_strip>'));
        });

        it('should output config-specific -Werror', () => {
            const project = makeXcodeProject({
                configurations: {
                    Debug: { treatWarningsAsErrors: true }
                }
            });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:-Werror>'));
        });

        it('should use cmake 3.13 for dead code stripping', () => {
            const project = makeXcodeProject({ deadCodeStripping: true });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('cmake_minimum_required(VERSION 3.13)'));
        });

        it('should use cmake 3.14 for MACOSX_BUNDLE app', () => {
            const project = makeXcodeProject({ infoPlistFile: 'Info.plist' });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('cmake_minimum_required(VERSION 3.14)'));
        });

        it('should use cmake 3.14 for Framework type', () => {
            const project = makeXcodeProject({ type: 'Framework', sourceFiles: ['lib.cpp'] });
            const cmake = generateCMakeListsFromXcode(project);
            assert.ok(cmake.includes('cmake_minimum_required(VERSION 3.14)'));
        });

        it('should generate complete Xcode project with all new features', () => {
            const project = makeXcodeProject({
                name: 'FulliOSApp',
                type: 'Application',
                sourceFiles: ['main.m', 'AppDelegate.m'],
                headerFiles: ['AppDelegate.h'],
                resourceFiles: ['Assets.xcassets', 'Main.storyboard'],
                cxxStandard: 20,
                cStandard: 11,
                sdkRoot: 'iphoneos',
                iosDeploymentTarget: '15.0',
                architecture: 'arm64',
                bundleIdentifier: 'com.example.FulliOSApp',
                infoPlistFile: 'FulliOSApp/Info.plist',
                productName: 'Full iOS App',
                enableARC: true,
                enableModules: true,
                treatWarningsAsErrors: true,
                deadCodeStripping: true,
                cxxLibrary: 'libc++',
                runpathSearchPaths: ['@executable_path/Frameworks'],
                frameworks: ['UIKit', 'Foundation'],
                frameworkSearchPaths: ['/opt/frameworks'],
                targetDependencies: ['CoreLib'],
                configurations: {
                    Debug: {
                        optimization: '0',
                        debugInformationFormat: 'dwarf-with-dsym',
                        preprocessorDefinitions: ['DEBUG=1']
                    },
                    Release: {
                        optimization: 's',
                        preprocessorDefinitions: ['NDEBUG'],
                        deadCodeStripping: true
                    }
                }
            });

            const cmake = generateCMakeListsFromXcode(project);

            assert.ok(cmake.includes('cmake_minimum_required(VERSION 3.14)'));
            assert.ok(cmake.includes('project(FulliOSApp)'));
            assert.ok(cmake.includes('set(CMAKE_CXX_STANDARD 20)'));
            assert.ok(cmake.includes('set(CMAKE_C_STANDARD 11)'));
            assert.ok(cmake.includes('set(CMAKE_OSX_SYSROOT iphoneos)'));
            assert.ok(cmake.includes('set(CMAKE_OSX_DEPLOYMENT_TARGET 15.0)'));
            assert.ok(cmake.includes('set(CMAKE_OSX_ARCHITECTURES arm64)'));
            assert.ok(cmake.includes('-stdlib=libc++'));
            assert.ok(cmake.includes('MACOSX_BUNDLE'));
            assert.ok(cmake.includes('${RESOURCE_FILES}'));
            assert.ok(cmake.includes('MACOSX_PACKAGE_LOCATION Resources'));
            assert.ok(cmake.includes('OUTPUT_NAME "Full iOS App"'));
            assert.ok(cmake.includes('MACOSX_BUNDLE_GUI_IDENTIFIER com.example.FulliOSApp'));
            assert.ok(cmake.includes('MACOSX_BUNDLE_INFO_PLIST FulliOSApp/Info.plist'));
            assert.ok(cmake.includes('-fobjc-arc'));
            assert.ok(cmake.includes('-fmodules'));
            assert.ok(cmake.includes('-Werror'));
            assert.ok(cmake.includes('-dead_strip'));
            assert.ok(cmake.includes('BUILD_RPATH'));
            assert.ok(cmake.includes('-framework UIKit'));
            assert.ok(cmake.includes('-framework Foundation'));
            assert.ok(cmake.includes('/opt/frameworks'));
            assert.ok(cmake.includes('add_dependencies(${PROJECT_NAME} CoreLib)'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:-O0>'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:-g>'));
            assert.ok(cmake.includes('$<$<CONFIG:Debug>:DEBUG=1>'));
            assert.ok(cmake.includes('$<$<CONFIG:Release>:-Os>'));
            assert.ok(cmake.includes('$<$<CONFIG:Release>:NDEBUG>'));
            assert.ok(cmake.includes('$<$<CONFIG:Release>:-dead_strip>'));
        });
    });
});

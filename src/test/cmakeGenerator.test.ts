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
    });
});

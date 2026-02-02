# =============================================================================
# Build Script Example for CMake Path Helper Extension
# =============================================================================
# This file demonstrates a typical build script workflow
# It shows various CMake invocations and path references

# Usage:
#   cmake -P build-script.cmake

# Note: This is a CMake script mode file (-P flag)
# It doesn't define a project, but runs CMake commands

message(STATUS "=== CMake Build Script ===")

# =============================================================================
# Configuration
# =============================================================================

# Set script directory as project root
set(SCRIPT_DIR ${CMAKE_CURRENT_LIST_DIR})
set(PROJECT_ROOT ${SCRIPT_DIR})
set(BUILD_DIR ${PROJECT_ROOT}/build)
set(SRC_DIR ${PROJECT_ROOT}/src)
set(INCLUDE_DIR ${PROJECT_ROOT}/include)
set(DIST_DIR ${PROJECT_ROOT}/dist)

message(STATUS "Script directory: ${SCRIPT_DIR}")
message(STATUS "Project root: ${PROJECT_ROOT}")
message(STATUS "Build directory: ${BUILD_DIR}")

# =============================================================================
# Platform Detection
# =============================================================================

if(WIN32)
    set(PLATFORM "windows")
    set(EXECUTABLE_EXT ".exe")
    message(STATUS "Platform: Windows")
elseif(APPLE)
    set(PLATFORM "macos")
    set(EXECUTABLE_EXT "")
    message(STATUS "Platform: macOS")
else()
    set(PLATFORM "linux")
    set(EXECUTABLE_EXT "")
    message(STATUS "Platform: Linux")
endif()

# =============================================================================
# Directory Setup
# =============================================================================

message(STATUS "Creating build directories...")

# Create build directories if they don't exist
file(MAKE_DIRECTORY ${BUILD_DIR})
file(MAKE_DIRECTORY ${BUILD_DIR}/Debug)
file(MAKE_DIRECTORY ${BUILD_DIR}/Release)
file(MAKE_DIRECTORY ${DIST_DIR})

message(STATUS "✓ Created: ${BUILD_DIR}")
message(STATUS "✓ Created: ${BUILD_DIR}/Debug")
message(STATUS "✓ Created: ${BUILD_DIR}/Release")
message(STATUS "✓ Created: ${DIST_DIR}")

# =============================================================================
# File Verification
# =============================================================================

message(STATUS "Verifying project files...")

set(REQUIRED_FILES
    ${PROJECT_ROOT}/CMakeLists.txt
    ${PROJECT_ROOT}/config.txt
    ${SRC_DIR}/main.cpp
    ${SRC_DIR}/utils.cpp
    ${INCLUDE_DIR}/utils.h
)

foreach(FILE ${REQUIRED_FILES})
    if(EXISTS ${FILE})
        message(STATUS "✓ Found: ${FILE}")
    else()
        message(WARNING "✗ Missing: ${FILE}")
    endif()
endforeach()

# =============================================================================
# Configuration Options
# =============================================================================

# Build type
if(NOT DEFINED BUILD_TYPE)
    set(BUILD_TYPE "Release")
endif()

message(STATUS "Build type: ${BUILD_TYPE}")
message(STATUS "Output directory: ${BUILD_DIR}/${BUILD_TYPE}")

# Generator
if(WIN32)
    set(GENERATOR "Visual Studio 17 2022")
elseif(APPLE)
    set(GENERATOR "Xcode")
else()
    set(GENERATOR "Unix Makefiles")
endif()

message(STATUS "Generator: ${GENERATOR}")

# =============================================================================
# CMake Command Examples
# =============================================================================

message(STATUS "")
message(STATUS "To configure the project, run:")
message(STATUS "  cmake -S ${PROJECT_ROOT} -B ${BUILD_DIR} -G \"${GENERATOR}\"")
message(STATUS "")
message(STATUS "To build the project, run:")
message(STATUS "  cmake --build ${BUILD_DIR} --config ${BUILD_TYPE}")
message(STATUS "")
message(STATUS "To install the project, run:")
message(STATUS "  cmake --install ${BUILD_DIR} --prefix ${DIST_DIR}")
message(STATUS "")
message(STATUS "To test the project, run:")
message(STATUS "  ctest --test-dir ${BUILD_DIR} --build-config ${BUILD_TYPE}")
message(STATUS "")

# =============================================================================
# Clean Command
# =============================================================================

message(STATUS "To clean build files, run:")
message(STATUS "  cmake -E remove_directory ${BUILD_DIR}")
message(STATUS "")

# =============================================================================
# Platform-Specific Commands
# =============================================================================

if(WIN32)
    message(STATUS "Windows-specific commands:")
    message(STATUS "  Build with MSBuild:")
    message(STATUS "    msbuild ${BUILD_DIR}/SampleApp.sln /p:Configuration=${BUILD_TYPE}")
    message(STATUS "")
elseif(APPLE)
    message(STATUS "macOS-specific commands:")
    message(STATUS "  Build with xcodebuild:")
    message(STATUS "    xcodebuild -project ${BUILD_DIR}/SampleApp.xcodeproj -configuration ${BUILD_TYPE}")
    message(STATUS "")
else()
    message(STATUS "Linux-specific commands:")
    message(STATUS "  Build with make:")
    message(STATUS "    make -C ${BUILD_DIR} -j$(nproc)")
    message(STATUS "")
endif()

# =============================================================================
# Path References for Testing
# =============================================================================

# The CMake Path Helper extension should resolve these:

# Source files:
# ${SRC_DIR}/main.cpp
# ${SRC_DIR}/utils.cpp
# ${SRC_DIR}/config.c
# ${SRC_DIR}/example.cc

# Header files:
# ${INCLUDE_DIR}/utils.h
# ${INCLUDE_DIR}/config.h
# ${INCLUDE_DIR}/config.hpp

# CMake files:
# ${PROJECT_ROOT}/CMakeLists.txt
# ${PROJECT_ROOT}/test-paths.cmake
# ${PROJECT_ROOT}/advanced-features.cmake

# Build outputs:
# ${BUILD_DIR}/${BUILD_TYPE}/bin/sample_app${EXECUTABLE_EXT}
# ${BUILD_DIR}/${BUILD_TYPE}/lib/
# ${BUILD_DIR}/CMakeCache.txt

# Install outputs:
# ${DIST_DIR}/bin/sample_app${EXECUTABLE_EXT}
# ${DIST_DIR}/include/
# ${DIST_DIR}/lib/

# Configuration files:
# ${PROJECT_ROOT}/config.txt
# ${BUILD_DIR}/${BUILD_TYPE}/config.txt

# =============================================================================
# Useful CMake Variables
# =============================================================================

message(STATUS "=== CMake Environment ===")
message(STATUS "CMake version: ${CMAKE_VERSION}")
message(STATUS "CMake command: ${CMAKE_COMMAND}")
message(STATUS "CTest command: ${CMAKE_CTEST_COMMAND}")
message(STATUS "System name: ${CMAKE_SYSTEM_NAME}")
message(STATUS "System processor: ${CMAKE_SYSTEM_PROCESSOR}")
message(STATUS "")

# =============================================================================
# Custom Build Workflow Example
# =============================================================================

function(run_build_workflow)
    message(STATUS "=== Build Workflow ===")
    
    # Step 1: Configure
    message(STATUS "Step 1: Configure")
    message(STATUS "  Command: cmake -S ${PROJECT_ROOT} -B ${BUILD_DIR}")
    
    # Step 2: Build
    message(STATUS "Step 2: Build")
    message(STATUS "  Command: cmake --build ${BUILD_DIR}")
    
    # Step 3: Test
    message(STATUS "Step 3: Test")
    message(STATUS "  Command: ctest --test-dir ${BUILD_DIR}")
    
    # Step 4: Install
    message(STATUS "Step 4: Install")
    message(STATUS "  Command: cmake --install ${BUILD_DIR} --prefix ${DIST_DIR}")
    
    # Step 5: Package
    message(STATUS "Step 5: Package")
    message(STATUS "  Command: cpack --config ${BUILD_DIR}/CPackConfig.cmake")
    
    message(STATUS "===================")
endfunction()

# Uncomment to see workflow:
# run_build_workflow()

# =============================================================================
# File Operations
# =============================================================================

message(STATUS "=== Available File Operations ===")
message(STATUS "Copy file:")
message(STATUS "  cmake -E copy ${PROJECT_ROOT}/config.txt ${BUILD_DIR}/config.txt")
message(STATUS "")
message(STATUS "Remove file:")
message(STATUS "  cmake -E remove ${BUILD_DIR}/config.txt")
message(STATUS "")
message(STATUS "Create directory:")
message(STATUS "  cmake -E make_directory ${BUILD_DIR}/custom")
message(STATUS "")
message(STATUS "Remove directory:")
message(STATUS "  cmake -E remove_directory ${BUILD_DIR}/custom")
message(STATUS "")

# =============================================================================
# Environment Variable Examples
# =============================================================================

message(STATUS "=== Environment Variables ===")

# Check common environment variables
if(DEFINED ENV{HOME})
    message(STATUS "HOME: $ENV{HOME}")
endif()

if(DEFINED ENV{USERPROFILE})
    message(STATUS "USERPROFILE: $ENV{USERPROFILE}")
endif()

if(DEFINED ENV{PATH})
    message(STATUS "PATH is defined (value hidden)")
endif()

# Example environment variable paths:
# $ENV{HOME}/.cache/myapp
# $ENV{USERPROFILE}/Documents/projects
# $ENV{TEMP}/build

message(STATUS "")

# =============================================================================
# Summary
# =============================================================================

message(STATUS "=== Summary ===")
message(STATUS "Project: SampleApp")
message(STATUS "Root: ${PROJECT_ROOT}")
message(STATUS "Build: ${BUILD_DIR}")
message(STATUS "Dist: ${DIST_DIR}")
message(STATUS "Platform: ${PLATFORM}")
message(STATUS "")
message(STATUS "All paths should be clickable in VS Code with CMake Path Helper")
message(STATUS "Hover over paths to see resolved values")
message(STATUS "Ctrl+Click to navigate to files")
message(STATUS "================")

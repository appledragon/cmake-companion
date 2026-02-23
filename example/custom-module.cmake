# =============================================================================
# Custom CMake Module Example
# =============================================================================
# This file demonstrates a reusable CMake module
# It can be included in other CMake files using: include(custom-module.cmake)

# Prevent multiple inclusion
if(CUSTOM_MODULE_INCLUDED)
    return()
endif()
set(CUSTOM_MODULE_INCLUDED TRUE)

message(STATUS "Loading custom CMake module...")

# =============================================================================
# Helper Functions
# =============================================================================

# Function to print all variables (for debugging)
function(print_all_paths)
    message(STATUS "=== Current Path Configuration ===")
    message(STATUS "PROJECT_ROOT: ${PROJECT_ROOT}")
    message(STATUS "SRC_DIR: ${SRC_DIR}")
    message(STATUS "INCLUDE_DIR: ${INCLUDE_DIR}")
    message(STATUS "BUILD_DIR: ${BUILD_DIR}")
    message(STATUS "CMAKE_SOURCE_DIR: ${CMAKE_SOURCE_DIR}")
    message(STATUS "CMAKE_BINARY_DIR: ${CMAKE_BINARY_DIR}")
    message(STATUS "CMAKE_CURRENT_SOURCE_DIR: ${CMAKE_CURRENT_SOURCE_DIR}")
    message(STATUS "CMAKE_CURRENT_BINARY_DIR: ${CMAKE_CURRENT_BINARY_DIR}")
    message(STATUS "==================================")
endfunction()

# Function to add source files from a directory
function(add_sources_from_dir DIR_PATH OUT_VAR)
    file(GLOB_RECURSE SOURCES
        ${DIR_PATH}/*.cpp
        ${DIR_PATH}/*.cc
        ${DIR_PATH}/*.c
    )
    set(${OUT_VAR} ${SOURCES} PARENT_SCOPE)
    message(STATUS "Found ${CMAKE_MATCH_COUNT} source files in ${DIR_PATH}")
endfunction()

# Function to add headers from a directory
function(add_headers_from_dir DIR_PATH OUT_VAR)
    file(GLOB_RECURSE HEADERS
        ${DIR_PATH}/*.h
        ${DIR_PATH}/*.hpp
    )
    set(${OUT_VAR} ${HEADERS} PARENT_SCOPE)
    message(STATUS "Found ${CMAKE_MATCH_COUNT} header files in ${DIR_PATH}")
endfunction()

# Macro to setup standard paths
macro(setup_standard_paths)
    if(NOT DEFINED PROJECT_ROOT)
        set(PROJECT_ROOT ${CMAKE_CURRENT_SOURCE_DIR})
    endif()
    
    if(NOT DEFINED SRC_DIR)
        set(SRC_DIR ${PROJECT_ROOT}/src)
    endif()
    
    if(NOT DEFINED INCLUDE_DIR)
        set(INCLUDE_DIR ${PROJECT_ROOT}/include)
    endif()
    
    if(NOT DEFINED BUILD_DIR)
        set(BUILD_DIR ${CMAKE_BINARY_DIR})
    endif()
    
    message(STATUS "Standard paths configured:")
    message(STATUS "  PROJECT_ROOT: ${PROJECT_ROOT}")
    message(STATUS "  SRC_DIR: ${SRC_DIR}")
    message(STATUS "  INCLUDE_DIR: ${INCLUDE_DIR}")
    message(STATUS "  BUILD_DIR: ${BUILD_DIR}")
endmacro()

# Function to check if a file exists and report
function(check_file_exists FILE_PATH)
    if(EXISTS ${FILE_PATH})
        message(STATUS "✓ File exists: ${FILE_PATH}")
    else()
        message(WARNING "✗ File not found: ${FILE_PATH}")
    endif()
endfunction()

# Function to verify all project files
function(verify_project_files)
    message(STATUS "Verifying project files...")
    
    # Check source files
    check_file_exists(${SRC_DIR}/main.cpp)
    check_file_exists(${SRC_DIR}/utils.cpp)
    check_file_exists(${SRC_DIR}/config.c)
    check_file_exists(${SRC_DIR}/example.cc)
    
    # Check header files
    check_file_exists(${INCLUDE_DIR}/utils.h)
    check_file_exists(${INCLUDE_DIR}/config.h)
    check_file_exists(${INCLUDE_DIR}/config.hpp)
    
    # Check CMake files
    check_file_exists(${PROJECT_ROOT}/CMakeLists.txt)
    check_file_exists(${PROJECT_ROOT}/config.txt)
endfunction()

# =============================================================================
# Platform Detection Helper
# =============================================================================

function(detect_platform)
    if(WIN32)
        set(PLATFORM_NAME "Windows" PARENT_SCOPE)
        set(PLATFORM_DIR "windows" PARENT_SCOPE)
        message(STATUS "Platform: Windows")
    elseif(APPLE)
        set(PLATFORM_NAME "macOS" PARENT_SCOPE)
        set(PLATFORM_DIR "macos" PARENT_SCOPE)
        message(STATUS "Platform: macOS")
    elseif(UNIX)
        set(PLATFORM_NAME "Linux" PARENT_SCOPE)
        set(PLATFORM_DIR "linux" PARENT_SCOPE)
        message(STATUS "Platform: Linux")
    else()
        set(PLATFORM_NAME "Unknown" PARENT_SCOPE)
        set(PLATFORM_DIR "unknown" PARENT_SCOPE)
        message(WARNING "Platform: Unknown")
    endif()
endfunction()

# =============================================================================
# Compiler Configuration Helper
# =============================================================================

function(configure_compiler TARGET_NAME)
    # Warning flags
    if(MSVC)
        target_compile_options(${TARGET_NAME} PRIVATE
            /W4        # Warning level 4
            /WX-       # Warnings not as errors
        )
        message(STATUS "Configured MSVC compiler flags for ${TARGET_NAME}")
    else()
        target_compile_options(${TARGET_NAME} PRIVATE
            -Wall      # Enable all warnings
            -Wextra    # Extra warnings
            -Wpedantic # Pedantic warnings
        )
        message(STATUS "Configured GCC/Clang compiler flags for ${TARGET_NAME}")
    endif()
    
    # Optimization flags for different configurations
    if(CMAKE_BUILD_TYPE STREQUAL "Debug")
        if(MSVC)
            target_compile_options(${TARGET_NAME} PRIVATE /Od)
        else()
            target_compile_options(${TARGET_NAME} PRIVATE -O0 -g)
        endif()
        message(STATUS "Applied Debug optimization flags")
    elseif(CMAKE_BUILD_TYPE STREQUAL "Release")
        if(MSVC)
            target_compile_options(${TARGET_NAME} PRIVATE /O2)
        else()
            target_compile_options(${TARGET_NAME} PRIVATE -O3)
        endif()
        message(STATUS "Applied Release optimization flags")
    endif()
endfunction()

# =============================================================================
# Path Resolution Helper
# =============================================================================

# Function to resolve a path with variables
function(resolve_path PATH_EXPR OUT_VAR)
    # This simulates path resolution (actual resolution happens by the extension)
    string(REPLACE "${PROJECT_ROOT}" "${CMAKE_CURRENT_SOURCE_DIR}" RESOLVED "${PATH_EXPR}")
    string(REPLACE "${SRC_DIR}" "${CMAKE_CURRENT_SOURCE_DIR}/src" RESOLVED "${RESOLVED}")
    string(REPLACE "${INCLUDE_DIR}" "${CMAKE_CURRENT_SOURCE_DIR}/include" RESOLVED "${RESOLVED}")
    string(REPLACE "${BUILD_DIR}" "${CMAKE_BINARY_DIR}" RESOLVED "${RESOLVED}")
    
    set(${OUT_VAR} ${RESOLVED} PARENT_SCOPE)
    message(STATUS "Resolved: ${PATH_EXPR} -> ${RESOLVED}")
endfunction()

# =============================================================================
# Usage Examples (in comments)
# =============================================================================

# To use this module in your CMakeLists.txt:
#
# include(${CMAKE_CURRENT_SOURCE_DIR}/custom-module.cmake)
#
# setup_standard_paths()
# detect_platform()
# print_all_paths()
# verify_project_files()
#
# add_executable(myapp ...)
# configure_compiler(myapp)

# =============================================================================
# Test Paths (hover and click these in VS Code)
# =============================================================================

# Module paths:
# ${PROJECT_ROOT}/custom-module.cmake
# ${CMAKE_MODULE_PATH}/FindPackage.cmake

# Function-referenced paths:
# ${SRC_DIR}/main.cpp
# ${INCLUDE_DIR}/utils.h
# ${BUILD_DIR}/bin/output

message(STATUS "Custom CMake module loaded successfully")

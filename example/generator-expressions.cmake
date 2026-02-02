# =============================================================================
# Generator Expressions Test File for CMake Path Helper Extension
# =============================================================================
# This file demonstrates CMake generator expressions and their usage
# Note: Generator expressions are evaluated at build/generate time, not parse time
# The extension provides basic syntax highlighting for these

cmake_minimum_required(VERSION 3.16)
project(GeneratorExpressionsDemo)

# =============================================================================
# Introduction to Generator Expressions
# =============================================================================
# Generator expressions have the form: $<...>
# They are evaluated during build system generation, not during CMake execution
# Common use cases: conditional compilation, platform-specific settings, etc.

# =============================================================================
# Basic Boolean Generator Expressions
# =============================================================================

# Configuration-based conditions
# $<CONFIG:Debug>                    - True for Debug configuration
# $<CONFIG:Release>                  - True for Release configuration
# $<CONFIG:MinSizeRel>              - True for MinSizeRel configuration

# Example with target properties:
add_executable(demo_app ${CMAKE_CURRENT_SOURCE_DIR}/src/main.cpp)

# Conditional compile definitions
target_compile_definitions(demo_app PRIVATE
    # Add DEBUG_MODE only in Debug builds
    $<$<CONFIG:Debug>:DEBUG_MODE=1>
    # Add OPTIMIZED only in Release builds
    $<$<CONFIG:Release>:OPTIMIZED=1>
)

# =============================================================================
# Logical Generator Expressions
# =============================================================================

# AND: $<AND:condition1,condition2>
# OR:  $<OR:condition1,condition2>
# NOT: $<NOT:condition>
# BOOL: $<BOOL:string>               - True if string is not empty/0/false

target_compile_definitions(demo_app PRIVATE
    # Windows Debug mode
    $<$<AND:$<PLATFORM_ID:Windows>,$<CONFIG:Debug>>:WIN32_DEBUG>
    # Not MSVC
    $<$<NOT:$<CXX_COMPILER_ID:MSVC>>:NON_MSVC_COMPILER>
)

# =============================================================================
# Platform and Compiler Generator Expressions
# =============================================================================

# Platform identification
# $<PLATFORM_ID:Windows>
# $<PLATFORM_ID:Linux>
# $<PLATFORM_ID:Darwin>              - macOS

# Compiler identification
# $<CXX_COMPILER_ID:GNU>             - GCC
# $<CXX_COMPILER_ID:Clang>           - Clang
# $<CXX_COMPILER_ID:MSVC>            - Microsoft Visual C++

target_compile_options(demo_app PRIVATE
    # MSVC-specific warnings
    $<$<CXX_COMPILER_ID:MSVC>:/W4>
    # GCC/Clang warnings
    $<$<OR:$<CXX_COMPILER_ID:GNU>,$<CXX_COMPILER_ID:Clang>>:-Wall -Wextra>
)

# =============================================================================
# String Generator Expressions
# =============================================================================

# String operations
# $<LOWER_CASE:string>               - Convert to lowercase
# $<UPPER_CASE:string>               - Convert to uppercase
# $<MAKE_C_IDENTIFIER:string>        - Convert to valid C identifier

# Conditional string selection
# $<IF:condition,true_value,false_value>

set(BUILD_SUFFIX $<IF:$<CONFIG:Debug>,debug,release>)
set(PLATFORM_NAME $<LOWER_CASE:$<PLATFORM_ID>>)

# =============================================================================
# Target-Related Generator Expressions
# =============================================================================

# Target properties
# $<TARGET_FILE:target>              - Full path to target file
# $<TARGET_FILE_NAME:target>         - Name of target file
# $<TARGET_FILE_DIR:target>          - Directory of target file
# $<TARGET_LINKER_FILE:target>       - Linker file (.lib on Windows)
# $<TARGET_PROPERTY:target,property> - Value of target property

# Example: Copy executable to a custom location after build
add_custom_command(TARGET demo_app POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy
        $<TARGET_FILE:demo_app>
        ${CMAKE_CURRENT_SOURCE_DIR}/dist/$<TARGET_FILE_NAME:demo_app>
    COMMENT "Copying executable to dist directory"
)

# =============================================================================
# Install-Related Generator Expressions
# =============================================================================

# Install prefix
# $<INSTALL_PREFIX>                  - CMAKE_INSTALL_PREFIX

# Install configuration
# $<INSTALL_INTERFACE:content>       - Used when installed
# $<BUILD_INTERFACE:content>         - Used when building

target_include_directories(demo_app PUBLIC
    # During build: use source includes
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    # When installed: use installed includes
    $<INSTALL_INTERFACE:include>
)

# =============================================================================
# Compile Features and Properties
# =============================================================================

# Compile features
# $<COMPILE_FEATURES:feature>        - True if feature is available
# $<CXX_COMPILER_VERSION>            - Compiler version
# $<VERSION_GREATER:v1,v2>           - Version comparison

# Require C++17 only if compiler supports it
target_compile_features(demo_app PUBLIC
    cxx_std_17
)

# Conditional compilation based on compiler version
target_compile_definitions(demo_app PRIVATE
    $<$<VERSION_GREATER:$<CXX_COMPILER_VERSION>,7.0>:MODERN_COMPILER>
)

# =============================================================================
# Path Construction with Generator Expressions
# =============================================================================

set(PROJECT_ROOT ${CMAKE_CURRENT_SOURCE_DIR})
set(OUTPUT_DIR ${CMAKE_BINARY_DIR}/output)

# Paths with configuration-specific subdirectories
# ${OUTPUT_DIR}/$<CONFIG>/bin
# ${OUTPUT_DIR}/$<CONFIG>/lib
# ${PROJECT_ROOT}/resources/$<PLATFORM_ID>

# Configuration-dependent paths
set(RUNTIME_OUTPUT_DIR ${OUTPUT_DIR}/$<CONFIG>/bin)
set(LIBRARY_OUTPUT_DIR ${OUTPUT_DIR}/$<CONFIG>/lib)

# Set output directory with generator expression
set_target_properties(demo_app PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${RUNTIME_OUTPUT_DIR}
)

# =============================================================================
# Complex Examples
# =============================================================================

# Multi-configuration build with platform-specific paths
set(CONFIG_FILE_PATH 
    ${PROJECT_ROOT}/config/$<PLATFORM_ID>/$<CONFIG>/app.config
)

# Platform and config specific definitions
target_compile_definitions(demo_app PRIVATE
    # Windows-specific debug settings
    $<$<AND:$<PLATFORM_ID:Windows>,$<CONFIG:Debug>>:WIN32_DEBUG;_DEBUG>
    
    # Linux-specific release settings
    $<$<AND:$<PLATFORM_ID:Linux>,$<CONFIG:Release>>:LINUX_RELEASE;NDEBUG>
    
    # macOS-specific settings
    $<$<PLATFORM_ID:Darwin>:MACOS_BUILD>
    
    # Compiler-specific optimizations
    $<$<CXX_COMPILER_ID:MSVC>:MSVC_OPTIMIZATIONS>
    $<$<OR:$<CXX_COMPILER_ID:GNU>,$<CXX_COMPILER_ID:Clang>>:GCC_OPTIMIZATIONS>
)

# =============================================================================
# File Path Examples with Generator Expressions
# =============================================================================

# The CMake Path Helper extension should recognize these patterns:

# Configuration-specific output paths:
# ${CMAKE_BINARY_DIR}/$<CONFIG>/bin/demo_app
# ${CMAKE_BINARY_DIR}/$<CONFIG>/lib/library.lib
# ${PROJECT_ROOT}/output/$<CONFIG>/data

# Platform-specific resource paths:
# ${PROJECT_ROOT}/resources/$<PLATFORM_ID>/icons
# ${PROJECT_ROOT}/platform/$<LOWER_CASE:$<PLATFORM_ID>>/config.h

# Target file locations:
# $<TARGET_FILE:demo_app>
# $<TARGET_FILE_DIR:demo_app>/resources
# $<TARGET_FILE_DIR:demo_app>/config.txt

# Install interface paths:
# $<INSTALL_INTERFACE:include>
# $<BUILD_INTERFACE:${PROJECT_ROOT}/include>

# =============================================================================
# Custom Command with Generator Expressions
# =============================================================================

# Create output directory based on configuration
add_custom_target(create_output_dirs ALL
    COMMAND ${CMAKE_COMMAND} -E make_directory 
        ${OUTPUT_DIR}/$<CONFIG>/bin
    COMMAND ${CMAKE_COMMAND} -E make_directory 
        ${OUTPUT_DIR}/$<CONFIG>/lib
    COMMAND ${CMAKE_COMMAND} -E make_directory 
        ${OUTPUT_DIR}/$<CONFIG>/data
    COMMENT "Creating configuration-specific output directories"
)

# Copy configuration file based on build type
add_custom_command(TARGET demo_app POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        ${PROJECT_ROOT}/config/$<CONFIG>/app.config
        $<TARGET_FILE_DIR:demo_app>/app.config
    COMMENT "Copying config for $<CONFIG> build"
)

# =============================================================================
# Generator Expression Cheat Sheet (In Comments)
# =============================================================================

# Boolean expressions:
#   $<CONFIG:cfg>                          - Config matches cfg
#   $<PLATFORM_ID:platform>                - Platform matches platform
#   $<CXX_COMPILER_ID:compiler>            - Compiler matches compiler
#   $<BOOL:string>                         - String is not empty/0/false/NO
#   $<AND:conditions>                      - All conditions are true
#   $<OR:conditions>                       - Any condition is true
#   $<NOT:condition>                       - Condition is false

# String expressions:
#   $<IF:condition,true_val,false_val>     - Conditional evaluation
#   $<LOWER_CASE:string>                   - Convert to lowercase
#   $<UPPER_CASE:string>                   - Convert to uppercase

# Target expressions:
#   $<TARGET_FILE:target>                  - Path to target file
#   $<TARGET_FILE_NAME:target>             - Name of target file
#   $<TARGET_FILE_DIR:target>              - Directory of target file
#   $<TARGET_PROPERTY:target,prop>         - Value of property

# Version expressions:
#   $<VERSION_GREATER:v1,v2>               - v1 > v2
#   $<VERSION_LESS:v1,v2>                  - v1 < v2
#   $<VERSION_EQUAL:v1,v2>                 - v1 == v2

# Compile expressions:
#   $<COMPILE_FEATURES:feature>            - Feature is available
#   $<CXX_COMPILER_VERSION>                - Compiler version

# =============================================================================
# Testing Paths - Hover and Click These!
# =============================================================================

# Basic paths with variables:
# ${PROJECT_ROOT}/src/main.cpp
# ${CMAKE_BINARY_DIR}/CMakeCache.txt

# Paths with generator expressions:
# ${CMAKE_BINARY_DIR}/$<CONFIG>/bin/demo_app
# ${OUTPUT_DIR}/$<CONFIG>/lib
# ${PROJECT_ROOT}/resources/$<PLATFORM_ID>

# Target file paths:
# $<TARGET_FILE:demo_app>
# $<TARGET_FILE_DIR:demo_app>

# =============================================================================
# End of Generator Expressions Test
# =============================================================================

message(STATUS "Generator expressions demonstration configured")
message(STATUS "Output directory: ${OUTPUT_DIR}/$<CONFIG>")
message(STATUS "Platform: $<PLATFORM_ID>")
message(STATUS "Compiler: $<CXX_COMPILER_ID> $<CXX_COMPILER_VERSION>")

# =============================================================================
# Advanced Features Test File for CMake Path Helper Extension
# =============================================================================
# This file demonstrates advanced CMake features that the extension supports:
# - Nested variable resolution
# - Environment variables
# - Generator expressions
# - Complex path constructions
# - Conditional logic
# - Functions and macros

cmake_minimum_required(VERSION 3.16)

# =============================================================================
# Basic Variable Definitions
# =============================================================================

set(PROJECT_ROOT ${CMAKE_CURRENT_SOURCE_DIR})
set(SRC_DIR ${PROJECT_ROOT}/src)
set(INCLUDE_DIR ${PROJECT_ROOT}/include)
set(BUILD_DIR ${CMAKE_BINARY_DIR})

# =============================================================================
# Nested Variable Resolution
# =============================================================================
# The extension should recursively resolve these nested variables

# Define base path
set(BASE_PATH ${PROJECT_ROOT})

# Define nested path using previous variable
set(NESTED_PATH ${BASE_PATH}/src)

# Triple nested
set(DEEPLY_NESTED ${NESTED_PATH}/subdir)

# Test paths with nested variables:
# ${NESTED_PATH}/main.cpp
# ${DEEPLY_NESTED}/file.cpp
# ${BASE_PATH}/include/config.h

# =============================================================================
# Environment Variables
# =============================================================================
# The extension supports $ENV{VAR} syntax

# Test environment variable paths:
# $ENV{USERPROFILE}/Documents
# $ENV{HOME}/.config
# $ENV{TEMP}/build
# $ENV{PATH}

# Combined with regular variables:
# ${PROJECT_ROOT}/$ENV{USERNAME}/data

# =============================================================================
# Complex Path Constructions
# =============================================================================

# Multiple variables in one path
set(INSTALL_PREFIX "/usr/local")
set(APP_NAME "myapp")
set(VERSION "1.0.0")

# Constructed paths - the extension should resolve these:
# ${INSTALL_PREFIX}/bin/${APP_NAME}
# ${INSTALL_PREFIX}/lib/${APP_NAME}-${VERSION}
# ${PROJECT_ROOT}/build/${CMAKE_BUILD_TYPE}/bin

# =============================================================================
# List Variables and File Collections
# =============================================================================

# File lists - hover over these to see resolved paths
set(SOURCE_FILES
    ${SRC_DIR}/main.cpp
    ${SRC_DIR}/utils.cpp
    ${SRC_DIR}/config.c
    ${SRC_DIR}/example.cc
)

set(HEADER_FILES
    ${INCLUDE_DIR}/utils.h
    ${INCLUDE_DIR}/config.h
    ${INCLUDE_DIR}/config.hpp
)

# Multiple paths on single lines
message("Source: ${SRC_DIR}/main.cpp Header: ${INCLUDE_DIR}/utils.h")

# =============================================================================
# Conditional Paths
# =============================================================================

if(WIN32)
    # Windows-specific paths
    set(PLATFORM_DIR ${PROJECT_ROOT}/platform/windows)
    # ${PLATFORM_DIR}/windows_utils.cpp
    # ${PLATFORM_DIR}/win32.h
elseif(UNIX)
    # Unix-specific paths
    set(PLATFORM_DIR ${PROJECT_ROOT}/platform/unix)
    # ${PLATFORM_DIR}/unix_utils.cpp
    # ${PLATFORM_DIR}/posix.h
endif()

# =============================================================================
# Functions with Path Variables
# =============================================================================

function(process_sources)
    # Function-local variables
    set(LOCAL_SRC ${PROJECT_ROOT}/src)
    set(LOCAL_BUILD ${BUILD_DIR}/obj)
    
    # Paths within function scope:
    # ${LOCAL_SRC}/local.cpp
    # ${LOCAL_BUILD}/output.o
    
    message("Processing: ${LOCAL_SRC}/main.cpp")
endfunction()

# =============================================================================
# Macro with Path Variables
# =============================================================================

macro(add_resource RESOURCE_NAME)
    set(RESOURCE_PATH ${PROJECT_ROOT}/resources/${RESOURCE_NAME})
    # The extension should resolve:
    # ${RESOURCE_PATH}/data.xml
    # ${RESOURCE_PATH}/config.json
endmacro()

# =============================================================================
# Cache Variables
# =============================================================================

set(CUSTOM_INSTALL_DIR "${CMAKE_INSTALL_PREFIX}/custom" CACHE PATH "Custom install directory")
set(ENABLE_TESTS ON CACHE BOOL "Enable testing")

# Paths using cache variables:
# ${CUSTOM_INSTALL_DIR}/bin
# ${CUSTOM_INSTALL_DIR}/lib

# =============================================================================
# Generator Expressions (Limited Support)
# =============================================================================
# Note: Generator expressions are evaluated at build time, not parse time
# The extension may have limited support for these

# $<CONFIG:Debug>
# $<BOOL:${ENABLE_TESTS}>
# $<TARGET_FILE_DIR:myapp>
# $<INSTALL_PREFIX>

# Generator expression with paths:
# $<$<CONFIG:Debug>:${PROJECT_ROOT}/debug/config.h>
# $<$<CONFIG:Release>:${PROJECT_ROOT}/release/config.h>

# =============================================================================
# String Operations with Paths
# =============================================================================

# String concatenation
set(PREFIX "/usr")
set(SUFFIX "local/bin")
set(FULL_PATH "${PREFIX}/${SUFFIX}")

# The extension should resolve:
# ${FULL_PATH}/executable

# =============================================================================
# Cross-referencing Variables
# =============================================================================

set(CONFIG_FILE "config.txt")
set(CONFIG_PATH "${PROJECT_ROOT}/${CONFIG_FILE}")

# Should resolve to: ${PROJECT_ROOT}/config.txt
# ${CONFIG_PATH}

set(DATA_SUBDIR "data")
set(DATA_PATH "${PROJECT_ROOT}/${DATA_SUBDIR}")

# Should resolve to: ${PROJECT_ROOT}/data
# ${DATA_PATH}/file.dat

# =============================================================================
# File Operations References
# =============================================================================

# file(GLOB ...) - list files matching pattern
file(GLOB CPP_FILES "${SRC_DIR}/*.cpp")
file(GLOB_RECURSE ALL_HEADERS "${INCLUDE_DIR}/*.h")

# These variables now contain file paths
# foreach(src ${CPP_FILES})
#   message("Source file: ${src}")
# endforeach()

# =============================================================================
# Include and Add Subdirectory
# =============================================================================

# Include another cmake file - the extension should make this clickable
# include(${PROJECT_ROOT}/cmake/helper.cmake)
# include(${CMAKE_MODULE_PATH}/FindPackage.cmake)

# Add subdirectories - should be navigable
# add_subdirectory(${PROJECT_ROOT}/src)
# add_subdirectory(${PROJECT_ROOT}/tests)

# =============================================================================
# Test All Variable Types
# =============================================================================

message(STATUS "=== Path Resolution Test ===")
message(STATUS "Project root: ${PROJECT_ROOT}")
message(STATUS "Source directory: ${SRC_DIR}")
message(STATUS "Include directory: ${INCLUDE_DIR}")
message(STATUS "Build directory: ${BUILD_DIR}")
message(STATUS "Nested path: ${NESTED_PATH}")
message(STATUS "Deeply nested: ${DEEPLY_NESTED}")
message(STATUS "Config path: ${CONFIG_PATH}")
message(STATUS "Data path: ${DATA_PATH}")

# =============================================================================
# Example Paths for Testing - Hover and Click These!
# =============================================================================

# Basic paths:
# ${PROJECT_ROOT}/CMakeLists.txt
# ${SRC_DIR}/main.cpp
# ${INCLUDE_DIR}/utils.h
# ${BUILD_DIR}/bin/output

# Nested variable paths:
# ${NESTED_PATH}/main.cpp
# ${DEEPLY_NESTED}/file.cpp

# Environment variable paths:
# $ENV{HOME}/documents
# $ENV{TEMP}/cache

# Complex constructed paths:
# ${PROJECT_ROOT}/build/${CMAKE_BUILD_TYPE}/bin
# ${INSTALL_PREFIX}/lib/${APP_NAME}-${VERSION}

# List variable paths:
# ${SOURCE_FILES}
# ${HEADER_FILES}

# Cache variable paths:
# ${CUSTOM_INSTALL_DIR}/bin
# ${CMAKE_INSTALL_PREFIX}/include

# =============================================================================
# End of Advanced Features Test
# =============================================================================

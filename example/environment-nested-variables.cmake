# =============================================================================
# Environment and Nested Variables Test for CMake Path Helper Extension
# =============================================================================
# This file demonstrates:
# - Environment variable usage ($ENV{VAR})
# - Nested variable resolution
# - Complex variable dependencies
# - Real-world path construction patterns

cmake_minimum_required(VERSION 3.16)
project(EnvironmentAndNestedVariables)

# =============================================================================
# Environment Variables
# =============================================================================
# Access system environment variables using $ENV{VAR_NAME} syntax

message(STATUS "=== Environment Variables ===")

# Common environment variables across platforms:

# User directories
# $ENV{HOME}                        - User home directory (Unix/macOS)
# $ENV{USERPROFILE}                 - User profile directory (Windows)
# $ENV{USERNAME}                    - Current username (Windows)
# $ENV{USER}                        - Current username (Unix/macOS)

# System paths
# $ENV{PATH}                        - System PATH variable
# $ENV{TEMP}                        - Temporary directory (Windows)
# $ENV{TMP}                         - Temporary directory (Windows)
# $ENV{TMPDIR}                      - Temporary directory (Unix)

# Development environment
# $ENV{JAVA_HOME}                   - Java installation path
# $ENV{PYTHON_HOME}                 - Python installation path
# $ENV{VCINSTALLDIR}                - Visual Studio install directory
# $ENV{VS_ROOT}                     - Visual Studio root

# =============================================================================
# Using Environment Variables in Paths
# =============================================================================

# Platform-specific user directories
if(WIN32)
    # Windows paths
    set(USER_HOME $ENV{USERPROFILE})
    set(USER_NAME $ENV{USERNAME})
    set(TEMP_DIR $ENV{TEMP})
    
    # Example paths on Windows:
    # $ENV{USERPROFILE}/Documents/Projects
    # $ENV{APPDATA}/MyApp/config
    # $ENV{LOCALAPPDATA}/Cache
    # $ENV{PROGRAMFILES}/MyApp
    # $ENV{TEMP}/build
    
elseif(UNIX)
    # Unix/macOS paths
    set(USER_HOME $ENV{HOME})
    set(USER_NAME $ENV{USER})
    set(TEMP_DIR $ENV{TMPDIR})
    
    # Example paths on Unix:
    # $ENV{HOME}/.config/myapp
    # $ENV{HOME}/Documents/Projects
    # $ENV{HOME}/.local/share/myapp
    # $ENV{TMPDIR}/build
endif()

message(STATUS "User home: ${USER_HOME}")
message(STATUS "User name: ${USER_NAME}")
message(STATUS "Temp directory: ${TEMP_DIR}")

# =============================================================================
# Combining Environment and Regular Variables
# =============================================================================

set(PROJECT_ROOT ${CMAKE_CURRENT_SOURCE_DIR})
set(APP_NAME "MyApplication")

# Build paths using environment variables
set(USER_CONFIG_DIR ${USER_HOME}/.config/${APP_NAME})
set(USER_DATA_DIR ${USER_HOME}/.local/share/${APP_NAME})
set(CACHE_DIR ${TEMP_DIR}/${APP_NAME}/cache)

# Example combined paths:
# ${USER_HOME}/.config/${APP_NAME}/settings.ini
# ${TEMP_DIR}/${APP_NAME}/build/output
# ${USER_HOME}/Documents/${APP_NAME}/data

# =============================================================================
# Simple Nested Variables
# =============================================================================

message(STATUS "=== Nested Variable Resolution ===")

# Level 1: Base variables
set(BASE_DIR ${PROJECT_ROOT})
set(BUILD_TYPE "Release")

# Level 2: Variables using level 1
set(SOURCE_BASE ${BASE_DIR}/src)
set(INCLUDE_BASE ${BASE_DIR}/include)
set(BUILD_BASE ${BASE_DIR}/build)

# Level 3: Variables using level 2
set(CPP_SOURCE_DIR ${SOURCE_BASE}/cpp)
set(C_SOURCE_DIR ${SOURCE_BASE}/c)
set(PUBLIC_HEADERS ${INCLUDE_BASE}/public)
set(PRIVATE_HEADERS ${INCLUDE_BASE}/private)
set(BUILD_OUTPUT ${BUILD_BASE}/${BUILD_TYPE})

# Level 4: Deeply nested
set(MAIN_CPP_FILE ${CPP_SOURCE_DIR}/main.cpp)
set(UTILS_CPP_FILE ${CPP_SOURCE_DIR}/utils.cpp)
set(CONFIG_HEADER ${PUBLIC_HEADERS}/config.h)
set(BUILD_BIN_DIR ${BUILD_OUTPUT}/bin)
set(BUILD_LIB_DIR ${BUILD_OUTPUT}/lib)

# Test nested resolution - hover over these to see full paths:
# ${CPP_SOURCE_DIR}/main.cpp
# ${PUBLIC_HEADERS}/config.h
# ${BUILD_OUTPUT}/bin/app.exe
# ${BUILD_LIB_DIR}/library.a

# =============================================================================
# Complex Nested Variable Dependencies
# =============================================================================

# Create a dependency chain
set(LEVEL_0 ${PROJECT_ROOT})
set(LEVEL_1 ${LEVEL_0}/dir1)
set(LEVEL_2 ${LEVEL_1}/dir2)
set(LEVEL_3 ${LEVEL_2}/dir3)
set(LEVEL_4 ${LEVEL_3}/dir4)
set(LEVEL_5 ${LEVEL_4}/dir5)

# Test deep nesting - these should all resolve correctly:
# ${LEVEL_1}/file.txt
# ${LEVEL_2}/file.txt
# ${LEVEL_3}/file.txt
# ${LEVEL_4}/file.txt
# ${LEVEL_5}/file.txt

# =============================================================================
# Variables with Multiple References
# =============================================================================

# Version components
set(VERSION_MAJOR 1)
set(VERSION_MINOR 2)
set(VERSION_PATCH 3)
set(VERSION_STRING "${VERSION_MAJOR}.${VERSION_MINOR}.${VERSION_PATCH}")

# Platform and architecture
set(PLATFORM "linux")
set(ARCH "x64")
set(PLATFORM_ARCH "${PLATFORM}-${ARCH}")

# Build directory structure
set(DIST_DIR ${PROJECT_ROOT}/dist)
set(VERSIONED_DIST ${DIST_DIR}/v${VERSION_STRING})
set(PLATFORM_DIST ${VERSIONED_DIST}/${PLATFORM_ARCH})

# Test multi-component paths:
# ${VERSIONED_DIST}/${PLATFORM_ARCH}/bin
# ${PLATFORM_DIST}/lib
# ${DIST_DIR}/v${VERSION_STRING}/readme.txt

# =============================================================================
# Conditional Nested Variables
# =============================================================================

# Configuration-dependent paths
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    set(CONFIG_SUFFIX "debug")
    set(OPTIMIZATION_LEVEL "O0")
elseif(CMAKE_BUILD_TYPE STREQUAL "Release")
    set(CONFIG_SUFFIX "release")
    set(OPTIMIZATION_LEVEL "O3")
else()
    set(CONFIG_SUFFIX "unknown")
    set(OPTIMIZATION_LEVEL "O2")
endif()

# Build nested paths based on configuration
set(OUTPUT_BASE ${PROJECT_ROOT}/output)
set(CONFIG_OUTPUT ${OUTPUT_BASE}/${CONFIG_SUFFIX})
set(BIN_OUTPUT ${CONFIG_OUTPUT}/bin)
set(LIB_OUTPUT ${CONFIG_OUTPUT}/lib)
set(OBJ_OUTPUT ${CONFIG_OUTPUT}/obj)

# Test configuration-dependent paths:
# ${CONFIG_OUTPUT}/bin/app
# ${BIN_OUTPUT}/executable
# ${LIB_OUTPUT}/library.so
# ${OBJ_OUTPUT}/main.o

# =============================================================================
# List Variables with Nested Paths
# =============================================================================

# Define base paths
set(SRC_ROOT ${PROJECT_ROOT}/src)
set(INCLUDE_ROOT ${PROJECT_ROOT}/include)

# Create lists of files using nested variables
set(SOURCE_FILES
    ${SRC_ROOT}/main.cpp
    ${SRC_ROOT}/utils.cpp
    ${SRC_ROOT}/config.c
    ${SRC_ROOT}/example.cc
)

set(HEADER_FILES
    ${INCLUDE_ROOT}/utils.h
    ${INCLUDE_ROOT}/config.h
    ${INCLUDE_ROOT}/config.hpp
)

# Nested list iteration would look like:
# foreach(src_file ${SOURCE_FILES})
#     message("Source: ${src_file}")
# endforeach()

# =============================================================================
# Function with Nested Variables
# =============================================================================

function(setup_output_directory target_name config)
    # Function-local nested variables
    set(BASE ${CMAKE_BINARY_DIR})
    set(CONFIG_DIR ${BASE}/${config})
    set(TARGET_DIR ${CONFIG_DIR}/${target_name})
    set(BIN_DIR ${TARGET_DIR}/bin)
    set(LIB_DIR ${TARGET_DIR}/lib)
    
    message("Binary directory: ${BIN_DIR}")
    message("Library directory: ${LIB_DIR}")
    
    # Paths in function scope:
    # ${BIN_DIR}/executable
    # ${LIB_DIR}/library.a
    # ${TARGET_DIR}/resources
endfunction()

# =============================================================================
# Cross-Platform Path Construction
# =============================================================================

# Determine platform-specific directories
if(WIN32)
    set(PLATFORM_NAME "windows")
    set(EXECUTABLE_SUFFIX ".exe")
    set(LIBRARY_PREFIX "")
    set(LIBRARY_SUFFIX ".dll")
elseif(APPLE)
    set(PLATFORM_NAME "macos")
    set(EXECUTABLE_SUFFIX "")
    set(LIBRARY_PREFIX "lib")
    set(LIBRARY_SUFFIX ".dylib")
else()
    set(PLATFORM_NAME "linux")
    set(EXECUTABLE_SUFFIX "")
    set(LIBRARY_PREFIX "lib")
    set(LIBRARY_SUFFIX ".so")
endif()

# Build platform-specific paths
set(PLATFORM_DIR ${PROJECT_ROOT}/platform/${PLATFORM_NAME})
set(PLATFORM_SRC ${PLATFORM_DIR}/src)
set(PLATFORM_INCLUDE ${PLATFORM_DIR}/include)

# Test platform paths:
# ${PLATFORM_SRC}/platform_utils.cpp
# ${PLATFORM_INCLUDE}/platform.h
# ${PLATFORM_DIR}/resources

# =============================================================================
# Real-World Example: Third-Party Libraries
# =============================================================================

# External library paths (typically from environment or cache variables)
set(THIRD_PARTY_ROOT $ENV{THIRD_PARTY_DIR})

if(NOT THIRD_PARTY_ROOT)
    set(THIRD_PARTY_ROOT ${PROJECT_ROOT}/../third_party)
endif()

# Library-specific paths
set(BOOST_ROOT ${THIRD_PARTY_ROOT}/boost)
set(BOOST_INCLUDE ${BOOST_ROOT}/include)
set(BOOST_LIB ${BOOST_ROOT}/lib)

set(OPENSSL_ROOT ${THIRD_PARTY_ROOT}/openssl)
set(OPENSSL_INCLUDE ${OPENSSL_ROOT}/include)
set(OPENSSL_LIB ${OPENSSL_ROOT}/lib)

# Test third-party paths:
# ${BOOST_INCLUDE}/boost/version.hpp
# ${BOOST_LIB}/libboost_system.a
# ${OPENSSL_INCLUDE}/openssl/ssl.h
# ${OPENSSL_LIB}/libssl.so

# =============================================================================
# Generated Files with Nested Variables
# =============================================================================

set(GENERATED_DIR ${CMAKE_BINARY_DIR}/generated)
set(CONFIG_GENERATED ${GENERATED_DIR}/config)
set(PROTO_GENERATED ${GENERATED_DIR}/proto)
set(UI_GENERATED ${GENERATED_DIR}/ui)

# Generated file paths:
# ${CONFIG_GENERATED}/config.h
# ${PROTO_GENERATED}/messages.pb.h
# ${UI_GENERATED}/mainwindow.ui.h
# ${GENERATED_DIR}/version.h

# =============================================================================
# Installation Paths with Nested Variables
# =============================================================================

set(INSTALL_ROOT ${CMAKE_INSTALL_PREFIX})
set(INSTALL_BIN ${INSTALL_ROOT}/bin)
set(INSTALL_LIB ${INSTALL_ROOT}/lib)
set(INSTALL_INCLUDE ${INSTALL_ROOT}/include)
set(INSTALL_SHARE ${INSTALL_ROOT}/share)

set(APP_INSTALL_DIR ${INSTALL_SHARE}/${APP_NAME})
set(APP_DOC_DIR ${APP_INSTALL_DIR}/doc)
set(APP_DATA_DIR ${APP_INSTALL_DIR}/data)

# Installation paths:
# ${INSTALL_BIN}/myapp
# ${INSTALL_LIB}/libmylib.so
# ${INSTALL_INCLUDE}/myapp/header.h
# ${APP_DATA_DIR}/resources

# =============================================================================
# Summary: All Test Paths
# =============================================================================

message(STATUS "=== Path Resolution Test Summary ===")
message(STATUS "Environment-based paths:")
message(STATUS "  User config: ${USER_CONFIG_DIR}")
message(STATUS "  User data: ${USER_DATA_DIR}")
message(STATUS "  Cache: ${CACHE_DIR}")

message(STATUS "Nested variable paths:")
message(STATUS "  CPP source: ${CPP_SOURCE_DIR}")
message(STATUS "  Public headers: ${PUBLIC_HEADERS}")
message(STATUS "  Build output: ${BUILD_OUTPUT}")

message(STATUS "Platform-specific:")
message(STATUS "  Platform: ${PLATFORM_NAME}")
message(STATUS "  Platform directory: ${PLATFORM_DIR}")

message(STATUS "Third-party:")
message(STATUS "  Boost: ${BOOST_ROOT}")
message(STATUS "  OpenSSL: ${OPENSSL_ROOT}")

# =============================================================================
# Test Paths - Hover and Click These!
# =============================================================================

# Environment variable paths:
# $ENV{HOME}/.config/app
# $ENV{USERPROFILE}/Documents
# $ENV{TEMP}/build
# ${USER_HOME}/.local/share

# Simple nested paths:
# ${CPP_SOURCE_DIR}/main.cpp
# ${PUBLIC_HEADERS}/config.h
# ${BUILD_OUTPUT}/bin/app

# Deep nesting:
# ${LEVEL_5}/file.txt
# ${PLATFORM_DIST}/bin/app

# Combined environment and nested:
# ${USER_HOME}/.config/${APP_NAME}/settings.ini
# ${TEMP_DIR}/${APP_NAME}/cache/data.tmp

# Third-party nested:
# ${BOOST_INCLUDE}/boost/version.hpp
# ${OPENSSL_LIB}/libssl.so

# Generated files:
# ${CONFIG_GENERATED}/config.h
# ${PROTO_GENERATED}/messages.pb.cc

# =============================================================================
# End of Environment and Nested Variables Test
# =============================================================================

# Test script for directory path resolution
# This script demonstrates CMake variable paths for directories

## Directory paths within the project
# Jump to source directory: ${PROJECT_ROOT}/src
# Jump to include directory: ${PROJECT_ROOT}/include
# Jump to build directory: ${BUILD_DIR}
# Jump to third-party directory: ${THIRD_PARTY}

## File paths for reference
# Open main file: ${SRC_DIR}/main.cpp
# Open config: ${PROJECT_ROOT}/config.txt
# Open header: ${INCLUDE_DIR}/utils.h

## Nested paths
# Configuration: ${PROJECT_ROOT}/include/config.h
# Utilities source: ${SRC_DIR}/utils.cpp
# Build output: ${BUILD_DIR}/bin/output.log

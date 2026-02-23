cmake_minimum_required(VERSION 3.16)

# Define project with version and languages
project(SampleApp VERSION 1.0.0 LANGUAGES C CXX)

# ============================================================================
# Project-specific Variables
# ============================================================================
# These variables can be resolved by the CMake Path Helper extension

# Define directory paths
set(PROJECT_ROOT ${CMAKE_CURRENT_SOURCE_DIR})
set(SRC_DIR ${PROJECT_ROOT}/src)
set(INCLUDE_DIR ${PROJECT_ROOT}/include)
set(BUILD_DIR ${CMAKE_BINARY_DIR})
set(THIRD_PARTY ${PROJECT_ROOT}/../third_party)

# Output directories
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${BUILD_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${BUILD_DIR}/lib)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${BUILD_DIR}/lib)

# ============================================================================
# Build Configuration
# ============================================================================

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Set C standard
set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

# Build type
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
endif()

message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "Project root: ${PROJECT_ROOT}")
message(STATUS "Source directory: ${SRC_DIR}")
message(STATUS "Include directory: ${INCLUDE_DIR}")
message(STATUS "Build directory: ${BUILD_DIR}")

# ============================================================================
# Source Files
# ============================================================================

# Collect all source files
set(SOURCES
    ${SRC_DIR}/main.cpp
    ${SRC_DIR}/utils.cpp
    ${SRC_DIR}/example.cc
    ${SRC_DIR}/config.c
)

# Collect all header files
set(HEADERS
    ${INCLUDE_DIR}/utils.h
    ${INCLUDE_DIR}/config.h
    ${INCLUDE_DIR}/config.hpp
)

# ============================================================================
# Target Definition
# ============================================================================

# Create executable
add_executable(${PROJECT_NAME} ${SOURCES} ${HEADERS})

# Set target properties
set_target_properties(${PROJECT_NAME} PROPERTIES
    OUTPUT_NAME "sample_app"
    DEBUG_POSTFIX "_d"
)

# ============================================================================
# Include Directories
# ============================================================================

# Public include directories (propagated to dependencies)
target_include_directories(${PROJECT_NAME} PUBLIC
    $<BUILD_INTERFACE:${INCLUDE_DIR}>
    $<INSTALL_INTERFACE:include>
)

# Private include directories
target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${THIRD_PARTY}/include
)

# ============================================================================
# Compile Definitions
# ============================================================================

# Platform-specific definitions
if(WIN32)
    target_compile_definitions(${PROJECT_NAME} PRIVATE
        WIN32
        _WINDOWS
        NOMINMAX
    )
endif()

# Build configuration definitions
target_compile_definitions(${PROJECT_NAME} PRIVATE
    $<$<CONFIG:Debug>:_DEBUG>
    $<$<CONFIG:Debug>:DEBUG_MODE>
    $<$<CONFIG:Release>:NDEBUG>
    $<$<CONFIG:Release>:RELEASE_MODE>
)

# Feature definitions
target_compile_definitions(${PROJECT_NAME} PRIVATE
    PROJECT_VERSION="${PROJECT_VERSION}"
    PROJECT_NAME="${PROJECT_NAME}"
    USE_CUSTOM_FEATURES
)

# ============================================================================
# Compiler Options
# ============================================================================

# Warning flags
if(MSVC)
    target_compile_options(${PROJECT_NAME} PRIVATE
        /W4
        /WX-
        $<$<CONFIG:Release>:/O2>
    )
else()
    target_compile_options(${PROJECT_NAME} PRIVATE
        -Wall
        -Wextra
        -Wpedantic
        $<$<CONFIG:Release>:-O3>
        $<$<CONFIG:Debug>:-g>
    )
endif()

# ============================================================================
# Link Libraries
# ============================================================================

# Platform-specific libraries
if(WIN32)
    target_link_libraries(${PROJECT_NAME} PRIVATE
        user32
        kernel32
    )
endif()

# Find and link threads
find_package(Threads)
if(Threads_FOUND)
    target_link_libraries(${PROJECT_NAME} PRIVATE Threads::Threads)
endif()

# ============================================================================
# Custom Commands and Targets
# ============================================================================

# Custom command to copy config file after build
add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        ${PROJECT_ROOT}/config.txt
        $<TARGET_FILE_DIR:${PROJECT_NAME}>/config.txt
    COMMENT "Copying config file to output directory"
)

# Custom target for documentation (example)
add_custom_target(docs
    COMMAND ${CMAKE_COMMAND} -E echo "Generating documentation..."
    WORKING_DIRECTORY ${PROJECT_ROOT}
    COMMENT "Documentation generation target"
)

# ============================================================================
# Installation Rules
# ============================================================================

# Install executable
install(TARGETS ${PROJECT_NAME}
    RUNTIME DESTINATION bin
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
)

# Install headers
install(FILES ${HEADERS}
    DESTINATION include/${PROJECT_NAME}
)

# Install config file
install(FILES ${PROJECT_ROOT}/config.txt
    DESTINATION share/${PROJECT_NAME}
)

# ============================================================================
# Testing
# ============================================================================

# Enable testing
enable_testing()

# Add a simple test
add_test(NAME basic_test
    COMMAND ${PROJECT_NAME}
    WORKING_DIRECTORY ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}
)

# ============================================================================
# Feature Summary
# ============================================================================

message(STATUS "")
message(STATUS "========== Configuration Summary ==========")
message(STATUS "  Project:         ${PROJECT_NAME} ${PROJECT_VERSION}")
message(STATUS "  C++ Standard:    C++${CMAKE_CXX_STANDARD}")
message(STATUS "  C Standard:      C${CMAKE_C_STANDARD}")
message(STATUS "  Build Type:      ${CMAKE_BUILD_TYPE}")
message(STATUS "  Install Prefix:  ${CMAKE_INSTALL_PREFIX}")
message(STATUS "  Source Files:    ${SOURCES}")
message(STATUS "==========================================")
message(STATUS "")

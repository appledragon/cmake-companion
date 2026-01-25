cmake_minimum_required(VERSION 3.10)

project(SampleApp)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Source files
set(SOURCES
    src/main.cpp
    src/graphics.cpp
    src/utils.cpp
    include/graphics.h
    include/utils.h
    include/config.h
)

# Create executable
add_executable(${PROJECT_NAME} ${SOURCES})

# Include directories
target_include_directories(${PROJECT_NAME} PRIVATE
    include
    ../third_party/include
)

# Preprocessor definitions
target_compile_definitions(${PROJECT_NAME} PRIVATE
    WIN32
    _DEBUG
    _CONSOLE
    USE_OPENGL
    NDEBUG
)

# Link libraries
target_link_libraries(${PROJECT_NAME} PRIVATE
    opengl32
    glu32
    user32
    kernel32
)

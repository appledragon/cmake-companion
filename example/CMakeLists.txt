cmake_minimum_required(VERSION 3.10)
project(ExampleProject)

set(CMAKE_CXX_STANDARD 17)

# 定义自定义变量
set(PROJECT_ROOT ${CMAKE_CURRENT_SOURCE_DIR})
set(SRC_DIR ${PROJECT_ROOT}/src)
set(INCLUDE_DIR ${PROJECT_ROOT}/include)
set(BUILD_DIR ${PROJECT_ROOT}/build)
set(THIRD_PARTY ${PROJECT_ROOT}/third_party)

# 添加包含目录
include_directories(${INCLUDE_DIR})
include_directories(${THIRD_PARTY}/boost/include)

# 添加源文件
add_executable(example_app 
    ${SRC_DIR}/main.cpp
    ${SRC_DIR}/utils.cpp
)

# 链接库
target_link_directories(example_app PRIVATE ${THIRD_PARTY}/lib)

# 设置输出目录
set_target_properties(example_app PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${BUILD_DIR}/bin
)

# 配置消息
message(STATUS "Project root: ${PROJECT_ROOT}")
message(STATUS "Source directory: ${SRC_DIR}")
message(STATUS "Include directory: ${INCLUDE_DIR}")

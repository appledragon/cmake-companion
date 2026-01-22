#ifndef EXAMPLE_UTILS_H
#define EXAMPLE_UTILS_H

#include <string>
#include <vector>

// 包含来自CMake变量的路径
// 这些路径会被插件解析和链接
// 示例: ${PROJECT_ROOT}/include/config.h
// 示例: ${SRC_DIR}/utils.cpp
// 示例: ${BUILD_DIR}/bin/output

namespace utils {
    void printMessage(const std::string& msg);
    std::vector<std::string> getConfigPaths();
}

#endif // EXAMPLE_UTILS_H

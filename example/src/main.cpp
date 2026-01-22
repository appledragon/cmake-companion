#include "../include/utils.h"
#include "../include/config.hpp"
#include <iostream>

// 包含带有CMake变量的路径
// 这些路径会被插件检测和处理
// 示例：${PROJECT_ROOT}/include/utils.h
// 示例：${INCLUDE_DIR}/config.hpp
// 示例：${SRC_DIR}/main.cpp

int main() {
    std::cout << "=== CMake Path Resolver Test ===" << std::endl;
    
    // 测试工具函数
    utils::printMessage("Hello from example project!");
    
    // 获取配置路径
    auto paths = utils::getConfigPaths();
    std::cout << "Config paths:" << std::endl;
    for (const auto& path : paths) {
        std::cout << "  - " << path << std::endl;
    }
    
    // 输出一些CMake变量路径
    std::cout << "\nCMake variable paths:" << std::endl;
    std::cout << "  - ${PROJECT_ROOT}/CMakeLists.txt" << std::endl;
    std::cout << "  - ${SRC_DIR}/main.cpp" << std::endl;
    std::cout << "  - ${INCLUDE_DIR}/utils.h" << std::endl;
    std::cout << "  - ${BUILD_DIR}/bin/main" << std::endl;
    std::cout << "  - ${THIRD_PARTY}/boost/include/boost.hpp" << std::endl;
    
    return 0;
}

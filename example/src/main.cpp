#include "../include/utils.h"
#include "../include/config.hpp"
#include <iostream>

// Paths containing CMake variables
// These paths will be detected and processed by the plugin
// Example: ${PROJECT_ROOT}/include/utils.h
// Example: ${INCLUDE_DIR}/config.hpp
// Example: ${SRC_DIR}/main.cpp

int main() {
    std::cout << "=== CMake Path Resolver Test ===" << std::endl;
    
    // Test utility function
    utils::printMessage("Hello from example project!");
    
    // Fetch configuration paths
    auto paths = utils::getConfigPaths();
    std::cout << "Config paths:" << std::endl;
    for (const auto& path : paths) {
        std::cout << "  - " << path << std::endl;
    }
    
    // Print sample CMake variable paths
    std::cout << "\nCMake variable paths:" << std::endl;
    std::cout << "  - ${PROJECT_ROOT}/CMakeLists.txt" << std::endl;
    std::cout << "  - ${SRC_DIR}/main.cpp" << std::endl;
    std::cout << "  - ${INCLUDE_DIR}/utils.h" << std::endl;
    std::cout << "  - ${BUILD_DIR}/bin/main" << std::endl;
    std::cout << "  - ${THIRD_PARTY}/boost/include/boost.hpp" << std::endl;
    
    return 0;
}

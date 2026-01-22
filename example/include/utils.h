#ifndef EXAMPLE_UTILS_H
#define EXAMPLE_UTILS_H

#include <string>
#include <vector>

// Paths originating from CMake variables
// These paths will be resolved and linked by the plugin
// Example: ${PROJECT_ROOT}/include/config.h
// Example: ${SRC_DIR}/utils.cpp
// Example: ${BUILD_DIR}/bin/output

namespace utils {
    void printMessage(const std::string& msg);
    std::vector<std::string> getConfigPaths();
}

#endif // EXAMPLE_UTILS_H

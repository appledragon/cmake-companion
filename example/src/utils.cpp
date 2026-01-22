#include "../include/utils.h"
#include <iostream>

// 使用CMake变量定义的路径
// ${SRC_DIR}/utils.cpp
// ${INCLUDE_DIR}/utils.h
// ${BUILD_DIR}/bin/utils.o

namespace utils {
    void printMessage(const std::string& msg) {
        std::cout << "Message: " << msg << std::endl;
    }
    
    std::vector<std::string> getConfigPaths() {
        return {
            "${PROJECT_ROOT}/config.xml",
            "${SRC_DIR}/config.ini",
            "${BUILD_DIR}/generated/config.h"
        };
    }
}

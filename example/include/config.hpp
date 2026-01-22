#pragma once

#include <cstddef>
#include <cstdint>

// CMake variable path examples - the plugin recognizes and links these
// ${PROJECT_ROOT}/include/common.hpp
// ${INCLUDE_DIR}/config.hpp
// ${THIRD_PARTY}/boost/include/boost.hpp

class Config {
public:
    static constexpr const char* CONFIG_PATH = "${PROJECT_ROOT}/config.txt";
    static constexpr const char* DATA_DIR = "${PROJECT_ROOT}/data";
    static constexpr const char* CACHE_DIR = "${BUILD_DIR}/cache";
    
    void loadConfig();
    void printInfo();
    
private:
    std::int32_t version;
};

#endif

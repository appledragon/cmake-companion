// example.cc - Alternative C++ source file
// Demonstrates CMake variable path resolution in .cc files

#include <iostream>
#include <fstream>

// Include paths with CMake variables
// #include "${INCLUDE_DIR}/config.h"
// #include "${PROJECT_ROOT}/include/common.h"

class ExampleApp {
public:
    ExampleApp() {
        // File paths using CMake variables
        config_path_ = "${PROJECT_ROOT}/config.txt";
        output_path_ = "${BUILD_DIR}/bin/output.log";
        data_path_ = "${PROJECT_ROOT}/data";
    }
    
    void run() {
        std::cout << "Running example application\n";
        std::cout << "Config: " << config_path_ << "\n";
        std::cout << "Output: " << output_path_ << "\n";
        std::cout << "Data: " << data_path_ << "\n";
    }
    
private:
    std::string config_path_;
    std::string output_path_;
    std::string data_path_;
};

int main() {
    // Path to resource files
    const char* resource_dir = "${PROJECT_ROOT}/resources";
    const char* template_dir = "${SRC_DIR}/templates";
    const char* cache_dir = "${BUILD_DIR}/cache";
    
    ExampleApp app;
    app.run();
    
    return 0;
}

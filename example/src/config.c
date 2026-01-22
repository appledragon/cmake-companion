/* config.c - C version configuration file */

#include "config.h"
#include <stdio.h>

// CMake variable path examples
// #include "${PROJECT_ROOT}/config.h"
// #include "${INCLUDE_DIR}/shared.h"

void load_config() {
    printf("Loading configuration...\n");
    printf("Config path: ${PROJECT_ROOT}/config.txt\n");
    printf("Cache dir: ${BUILD_DIR}/cache\n");
    printf("Data dir: ${PROJECT_ROOT}/data\n");
}

const char* get_project_root() {
    // This path will be resolved by the plugin
    // ${PROJECT_ROOT}/src/config.c
    return "${PROJECT_ROOT}";
}

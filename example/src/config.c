/* config.c - C语言版本的配置文件 */

#include "config.h"
#include <stdio.h>

// CMake变量路径示例
// #include "${PROJECT_ROOT}/config.h"
// #include "${INCLUDE_DIR}/shared.h"

void load_config() {
    printf("Loading configuration...\n");
    printf("Config path: ${PROJECT_ROOT}/config.txt\n");
    printf("Cache dir: ${BUILD_DIR}/cache\n");
    printf("Data dir: ${PROJECT_ROOT}/data\n");
}

const char* get_project_root() {
    // 这个路径会被插件解析
    // ${PROJECT_ROOT}/src/config.c
    return "${PROJECT_ROOT}";
}

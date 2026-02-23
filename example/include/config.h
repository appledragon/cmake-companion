#ifndef CONFIG_H
#define CONFIG_H

// C header file with CMake variable paths
// ${INCLUDE_DIR}/config.h
// ${PROJECT_ROOT}/include/config.h

#define PROJECT_CONFIG_PATH "${PROJECT_ROOT}/config.txt"
#define DATA_DIRECTORY "${PROJECT_ROOT}/data"
#define CACHE_DIRECTORY "${BUILD_DIR}/cache"
#define INCLUDE_DIRECTORY "${INCLUDE_DIR}"

void load_config(void);
const char* get_project_root(void);

#endif // CONFIG_H

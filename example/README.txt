README for CMake Path Resolver Plugin Example
==============================================

This example project contains various file types with CMake variable paths
that the cmake-path-resolver plugin can detect and resolve.

Directory Structure:
--------------------
example/
├── CMakeLists.txt          - CMake configuration file
├── config.txt              - Configuration file with CMake variables
├── include/                - Header files
│   ├── config.h            - C header
│   ├── config.hpp          - C++ header
│   └── utils.h             - Utility header
├── src/                    - Source files
│   ├── config.c            - C source file
│   ├── example.cc          - C++ alternative source
│   ├── main.cpp            - Main C++ source
│   └── utils.cpp           - Utility source
└── README.txt              - This file

CMake Variables Used:
---------------------
- ${PROJECT_ROOT}  - Project root directory
- ${SRC_DIR}       - Source directory (src/)
- ${INCLUDE_DIR}   - Include directory (include/)
- ${BUILD_DIR}     - Build directory (build/)
- ${THIRD_PARTY}   - Third-party libraries directory

Features to Test:
-----------------
1. Open any file in this example directory
2. Hover over CMake variable paths like ${PROJECT_ROOT}/file.txt
3. Click on the underlined paths to navigate to referenced files
4. Use the definition provider to jump to variable definitions
5. Use the document link provider to follow links

Supported File Types:
---------------------
- .cmake files (CMakeLists.txt)
- .cpp files (C++ source)
- .cc files (C++ alternative source)
- .c files (C source)
- .h files (C headers)
- .hpp files (C++ headers)
- .txt files (Text files)

Testing Tips:
-------------
1. The plugin should recognize and underline CMake variable paths
2. Hover tooltips should show the resolved paths
3. Click on paths to open the referenced files/definitions
4. The plugin automatically watches for changes in CMakeLists.txt

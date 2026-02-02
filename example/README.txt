README for CMake Path Resolver Plugin Example
==============================================

This example project demonstrates the features of the CMake Path Helper 
VS Code extension. The extension provides intelligent path resolution, 
navigation, hover tips, and syntax highlighting for CMake files.

=============================================================================
DIRECTORY STRUCTURE
=============================================================================

example/
├── CMakeLists.txt                      - Main CMake configuration
├── config.txt                          - Configuration file
├── README.txt                          - This file
├── SampleApp.vcxproj                   - Visual Studio project
├── test-paths.cmake                    - Basic path testing
├── test-plain-paths.cmake              - Plain paths (no variables)
├── advanced-features.cmake             - Advanced CMake features
├── generator-expressions.cmake         - Generator expressions
├── environment-nested-variables.cmake  - Environment and nested vars
├── include/                            - Header files
│   ├── config.h                        - C header
│   ├── config.hpp                      - C++ header
│   └── utils.h                         - Utility header
└── src/                                - Source files
    ├── config.c                        - C source
    ├── example.cc                      - C++ alternative source
    ├── main.cpp                        - Main C++ source
    └── utils.cpp                       - Utility source

=============================================================================
FILE DESCRIPTIONS
=============================================================================

CMakeLists.txt
--------------
Complete CMake project configuration demonstrating:
- Project definition with version and languages
- Variable definitions (PROJECT_ROOT, SRC_DIR, INCLUDE_DIR, etc.)
- Source file organization
- Target creation (executable)
- Include directories (public and private)
- Compile definitions (platform-specific, build configuration)
- Compiler options (MSVC, GCC/Clang)
- Link libraries
- Custom commands and targets
- Installation rules
- Testing configuration

test-paths.cmake
----------------
Basic path resolution testing with CMake variables:
- Directory paths (${PROJECT_ROOT}/src, ${INCLUDE_DIR})
- File paths (${SRC_DIR}/main.cpp, ${INCLUDE_DIR}/utils.h)
- Nested paths (${PROJECT_ROOT}/include/config.h)
- Build output paths (${BUILD_DIR}/bin/output.log)

test-plain-paths.cmake
----------------------
Plain file path resolution without variables:
- Relative paths (src/main.cpp, include/utils.h)
- Paths with ./ prefix (./src/example.cc)
- Paths with ../ prefix (../include/utils.h)
- Simple filenames (config.txt)
- Multiple paths on same line

advanced-features.cmake
-----------------------
Advanced CMake features and patterns:
- Nested variable resolution (variables referencing other variables)
- Environment variables ($ENV{HOME}, $ENV{USERPROFILE})
- Complex path constructions
- List variables with file collections
- Conditional paths (platform-specific)
- Functions and macros with path variables
- Cache variables
- Generator expressions (basic)
- String operations with paths
- Cross-referencing variables
- File operations (GLOB, GLOB_RECURSE)
- Include and add_subdirectory examples

generator-expressions.cmake
---------------------------
Comprehensive generator expressions demonstration:
- Boolean expressions ($<CONFIG:Debug>, $<PLATFORM_ID:Windows>)
- Logical expressions ($<AND:...>, $<OR:...>, $<NOT:...>)
- Platform and compiler detection
- String operations ($<LOWER_CASE:...>, $<UPPER_CASE:...>)
- Target-related expressions ($<TARGET_FILE:...>, $<TARGET_FILE_DIR:...>)
- Install interface expressions ($<BUILD_INTERFACE>, $<INSTALL_INTERFACE>)
- Compile features and properties
- Configuration-specific paths
- Complex conditional definitions
- Custom commands with generator expressions
- Complete cheat sheet in comments

environment-nested-variables.cmake
----------------------------------
Environment and nested variable resolution:
- Environment variable usage (Windows: %USERPROFILE%, Unix: $HOME)
- Common environment variables (PATH, TEMP, USER, etc.)
- Platform-specific environment paths
- Combining environment and regular variables
- Simple to deeply nested variables (5+ levels)
- Complex variable dependency chains
- Variables with multiple references
- Conditional nested variables
- List variables with nested paths
- Function-scoped nested variables
- Cross-platform path construction
- Third-party library path patterns
- Generated file paths
- Installation path hierarchies

=============================================================================
CMAKE VARIABLES USED IN EXAMPLES
=============================================================================

Built-in CMake Variables:
-------------------------
CMAKE_SOURCE_DIR              - Top-level source directory
CMAKE_BINARY_DIR              - Top-level build directory
CMAKE_CURRENT_SOURCE_DIR      - Current source directory being processed
CMAKE_CURRENT_BINARY_DIR      - Current build directory being processed
CMAKE_CURRENT_LIST_DIR        - Directory of current CMakeLists.txt
CMAKE_CURRENT_LIST_FILE       - Path to current CMakeLists.txt
PROJECT_NAME                  - Project name from project() command
PROJECT_VERSION               - Project version
CMAKE_BUILD_TYPE              - Build type (Debug, Release, etc.)
CMAKE_INSTALL_PREFIX          - Installation prefix
CMAKE_CXX_STANDARD            - C++ standard version
CMAKE_C_STANDARD              - C standard version

Custom Project Variables:
-------------------------
PROJECT_ROOT                  - Project root directory
SRC_DIR                       - Source directory (src/)
INCLUDE_DIR                   - Include directory (include/)
BUILD_DIR                     - Build directory (build/)
THIRD_PARTY                   - Third-party libraries directory

Environment Variables:
----------------------
$ENV{HOME}                    - User home (Unix/macOS)
$ENV{USERPROFILE}             - User profile (Windows)
$ENV{USERNAME}                - Username (Windows)
$ENV{USER}                    - Username (Unix/macOS)
$ENV{TEMP}                    - Temporary directory (Windows)
$ENV{TMP}                     - Temporary directory (Windows)
$ENV{TMPDIR}                  - Temporary directory (Unix/macOS)
$ENV{PATH}                    - System PATH
$ENV{JAVA_HOME}               - Java installation
$ENV{PYTHON_HOME}             - Python installation

=============================================================================
EXTENSION FEATURES TO TEST
=============================================================================

1. Path Resolution & Navigation
   ------------------------------
   - Open any .cmake file or CMakeLists.txt
   - Hover over paths with ${VARIABLE} syntax to see resolved paths
   - Ctrl+Click (Cmd+Click on Mac) on paths to navigate to files
   - Extension shows whether files exist or not in hover tooltip

2. Variable Definition Lookup
   ---------------------------
   - Hover over a variable name to see its value and definition location
   - Ctrl+Click on a variable to jump to its definition
   - Works with set() commands in all CMake files

3. Syntax Highlighting
   --------------------
   - Commands (set, add_executable, target_link_libraries)
   - Variables (${VAR})
   - Strings ("text")
   - Comments (# comment)
   - Generator expressions ($<...>)
   - Keywords (PUBLIC, PRIVATE, INTERFACE)

4. Semantic Tokens
   ----------------
   - Different colors for different variable types:
     * Built-in variables (CMAKE_*, PROJECT_*)
     * User-defined variables
     * Environment variables ($ENV{})
     * Cache variables

5. Document Formatting
   --------------------
   - Right-click → Format Document (or Shift+Alt+F)
   - Configurable indentation
   - Command casing (lowercase/uppercase)
   - Parentheses spacing

6. Code Completion
   ----------------
   - Type ${ to trigger variable completions
   - Command completions at line start
   - Context-aware keyword completions

7. Diagnostics
   ------------
   - Undefined variable warnings
   - Non-existent file path warnings
   - Unmatched block pairs (if/endif)
   - Deprecated command warnings

8. Folding
   --------
   - Fold/unfold blocks (if/endif, function/endfunction, etc.)
   - Fold comments

9. Document Links
   ---------------
   - Clickable paths in comments
   - Include file navigation
   - CMake module links

10. Project Conversion
    -------------------
    - Right-click .vcxproj → Convert to CMake
    - Right-click .xcodeproj → Convert to CMake
    - Generates CMakeLists.txt automatically

=============================================================================
HOW TO USE THIS EXAMPLE
=============================================================================

1. Open VS Code in the cmake-path-resolver directory
2. Install the CMake Path Helper extension
3. Open any .cmake file in the example/ folder
4. Try the following:

   a) Hover over a path with variables:
      - Open CMakeLists.txt
      - Hover over ${SRC_DIR}/main.cpp
      - You should see the resolved path and file status

   b) Navigate to a file:
      - Ctrl+Click on ${INCLUDE_DIR}/utils.h
      - The utils.h file should open

   c) Jump to variable definition:
      - Ctrl+Click on PROJECT_ROOT variable
      - You should jump to the set(PROJECT_ROOT...) line

   d) Test nested variables:
      - Open environment-nested-variables.cmake
      - Hover over deeply nested variable paths
      - See multi-level resolution in action

   e) Test generator expressions:
      - Open generator-expressions.cmake
      - See syntax highlighting for $<CONFIG:Debug>
      - Hover over paths with generator expressions

   f) Format a document:
      - Open any .cmake file
      - Press Shift+Alt+F (Windows/Linux) or Shift+Option+F (Mac)
      - Document will be formatted

   g) Get completions:
      - Type ${ in any .cmake file
      - See variable completion suggestions
      - Type a CMake command name for snippets

=============================================================================
TESTING CHECKLIST
=============================================================================

[ ] Basic path resolution (${VAR}/path)
[ ] Plain path resolution (relative/path)
[ ] Nested variable resolution (${VAR1}/${VAR2})
[ ] Environment variable resolution ($ENV{HOME})
[ ] Generator expressions ($<CONFIG:Debug>)
[ ] Click to navigate to existing files
[ ] Click to navigate to variable definitions
[ ] Hover tooltips show resolved paths
[ ] Hover tooltips show file existence status
[ ] Syntax highlighting for all CMake elements
[ ] Document formatting works
[ ] Code completion for variables
[ ] Code completion for commands
[ ] Diagnostics for undefined variables
[ ] Diagnostics for non-existent paths
[ ] Folding for blocks and comments
[ ] Document links work in comments
[ ] vcxproj to CMake conversion
[ ] Xcode to CMake conversion

=============================================================================
TROUBLESHOOTING
=============================================================================

Extension not working?
- Check that .cmake files are associated with "cmake" language mode
- Try "Refresh CMake Variables" command from Command Palette
- Check Output panel → CMake Path Resolver for debug messages
- Enable debug logging in settings: cmake-path-resolver.debugLogging

Paths not resolving?
- Make sure CMakeLists.txt has been opened (variables need to be parsed)
- Check that variable is defined with set() command
- Try "Refresh CMake Variables" command
- For environment variables, make sure they exist in your system

Can't navigate to files?
- Check that file paths are relative to workspace root
- Make sure files actually exist at the resolved path
- Try hovering first to see the resolved path

=============================================================================
CUSTOMIZATION
=============================================================================

You can customize the extension behavior in VS Code settings:

cmake-path-resolver.customVariables
  - Define custom variable mappings
  - Example: { "MY_VAR": "/custom/path" }

cmake-path-resolver.debugLogging
  - Enable debug output for troubleshooting
  - Check Output → CMake Path Resolver

cmake-path-resolver.formatting.indentSize
  - Number of spaces for indentation (default: 4)

cmake-path-resolver.formatting.commandCase
  - "lowercase" or "uppercase" (default: "lowercase")

cmake-path-resolver.formatting.parenthesesSpacing
  - Add space after ( and before ) (default: false)

=============================================================================
SUPPORTED FILE TYPES
=============================================================================

- CMakeLists.txt
- *.cmake
- *.cmake.in (CMake template files)
- *.vcxproj (for conversion)
- *.xcodeproj (for conversion)

=============================================================================
LEARN MORE
=============================================================================

Extension Features:
- Check the main README.md for complete feature documentation
- Review source code in src/ directory for implementation details

CMake Documentation:
- https://cmake.org/documentation/
- https://cmake.org/cmake/help/latest/manual/cmake-variables.7.html
- https://cmake.org/cmake/help/latest/manual/cmake-generator-expressions.7.html

=============================================================================
FEEDBACK & CONTRIBUTIONS
=============================================================================

Found a bug? Have a feature request?
- Open an issue on GitHub
- Check existing issues first
- Provide example files that reproduce the issue

Want to contribute?
- Fork the repository
- Create a feature branch
- Submit a pull request
- Follow the coding style in existing files

=============================================================================
End of README
=============================================================================

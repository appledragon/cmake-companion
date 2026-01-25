# CMake Path Resolver

A VS Code extension for resolving CMake variable paths (like `${MY_WORKSPACE_PATH}/path/file.h`) with underline decoration, hover tips, and click-to-navigate functionality.

## Features

- **Syntax Highlighting**: Rich syntax highlighting for CMake files including commands, variables, strings, comments, and generator expressions
- **Semantic Tokens**: Enhanced semantic highlighting that distinguishes between different variable types (built-in, user-defined, environment, cache)
- **Document Formatting**: Format CMake files with configurable indentation, command casing, and parentheses spacing
- **Underline Decoration**: CMake paths with variables are underlined and clickable
- **Hover Tips**: Hover over CMake paths to see the resolved path and file existence status
- **Click to Navigate**: Ctrl+Click (Cmd+Click on Mac) to jump directly to the resolved file
- **Variable Resolution**: Automatic parsing of `set()` commands in CMakeLists.txt and .cmake files
- **Built-in Variables**: Support for common CMake variables like `PROJECT_SOURCE_DIR`, `CMAKE_SOURCE_DIR`, etc.
- **Nested Variables**: Recursive resolution of nested variable references
- **Custom Variables**: Define custom variable mappings in VS Code settings
- **vcxproj to CMake Conversion**: Convert Visual Studio project files (.vcxproj) to CMakeLists.txt with one click

## Supported File Types

- CMakeLists.txt
- *.cmake files

## Usage

1. Open a workspace containing CMakeLists.txt files
2. Open a CMake file (CMakeLists.txt or *.cmake) to parse its variable definitions
3. CMake variable paths will be underlined
4. Hover over a path to see the resolved value
5. Ctrl+Click to navigate to the resolved file

### Commands

- **Resolve CMake Path**: Manually resolve a CMake path expression
- **Refresh CMake Variables**: Re-scan the workspace for CMake variable definitions
- **Convert vcxproj to CMake**: Convert a Visual Studio project file (.vcxproj) to CMakeLists.txt

### Formatting

To format a CMake document:
- Right-click and select "Format Document"
- Use the keyboard shortcut (Shift+Alt+F on Windows/Linux, Shift+Option+F on Mac)
- Enable "Format on Save" in VS Code settings

### Converting Visual Studio Projects to CMake

To convert a .vcxproj file to CMakeLists.txt:
1. **Right-click on a .vcxproj file** in the Explorer panel and select "Convert vcxproj to CMake"
2. Or open a .vcxproj file and use the Command Palette (Ctrl+Shift+P or Cmd+Shift+P on Mac) to run "Convert vcxproj to CMake"
3. The extension will parse the project file and generate a CMakeLists.txt in the same directory

The conversion automatically extracts:
- Project name and type (executable, static library, or shared library)
- Source files (.cpp, .c, etc.)
- Header files (.h, .hpp, etc.)
- Include directories
- Preprocessor definitions
- Library dependencies
- C++ language standard (CMAKE_CXX_STANDARD from LanguageStandard)
- Windows SDK version (CMAKE_SYSTEM_VERSION from WindowsTargetPlatformVersion)
- Platform toolset (informational comment)
- Character set (UNICODE/_UNICODE or _MBCS definitions)
- Subsystem (WIN32_EXECUTABLE property for Windows GUI applications)
- **Precompiled headers (PCH)** - converted to CMake's target_precompile_headers (requires CMake 3.16+)
  - PCH header file configuration
  - PCH source file that creates the precompiled header
  - Per-file exclusions from PCH (files marked as "Not Using Precompiled Headers")

**Note**: The generated CMakeLists.txt is a starting point and may require manual adjustments for complex projects with custom build configurations.

## Configuration

### Custom Variables

You can define custom variable mappings in your VS Code settings:

```json
{
  "cmake-path-resolver.customVariables": {
    "MY_WORKSPACE_PATH": "/path/to/workspace",
    "THIRD_PARTY_DIR": "/path/to/third_party"
  }
}
```

### Enabled File Types

Configure which file types should have CMake path resolution enabled:

```json
{
  "cmake-path-resolver.enabledFileTypes": ["cmake"]
}
```

### Formatting Options

Configure document formatting behavior:

```json
{
  "cmake-path-resolver.formatting.style": "google",
  "cmake-path-resolver.formatting.maxLineLength": 0,
  "cmake-path-resolver.formatting.spaceAfterOpenParen": false,
  "cmake-path-resolver.formatting.spaceBeforeCloseParen": false,
  "cmake-path-resolver.formatting.uppercaseCommands": false
}
```

- `style`: Formatting style preset (`"default"` or `"google"`)
- `maxLineLength`: Maximum line length (0 = no limit). Overrides the style preset value when set.
- `spaceAfterOpenParen`: Add space after opening parenthesis in commands. Overrides the style preset value when set.
- `spaceBeforeCloseParen`: Add space before closing parenthesis in commands. Overrides the style preset value when set.
- `uppercaseCommands`: Convert CMake command names to uppercase. Overrides the style preset value when set.

#### Google Style Formatting

To use Google-style formatting (similar to clang-format's Google style for CMake):

```json
{
  "cmake-path-resolver.formatting.style": "google"
}
```

The Google style preset uses:
- Lowercase commands
- 2-space indentation
- No spaces inside parentheses
- 80 character line length limit

## Built-in Variables

The following CMake built-in variables are automatically set based on your workspace:

- `CMAKE_SOURCE_DIR` - Root of the workspace
- `CMAKE_CURRENT_SOURCE_DIR` - Current directory being processed
- `PROJECT_SOURCE_DIR` - Root of the project
- `CMAKE_BINARY_DIR` - Build directory (workspace/build)
- `CMAKE_CURRENT_BINARY_DIR` - Current build directory
- `PROJECT_BINARY_DIR` - Project build directory
- `PROJECT_NAME` - Name from project() command
- `CMAKE_PROJECT_NAME` - Project name

## Syntax Highlighting

The extension provides syntax highlighting for:

- **Commands**: CMake commands like `set()`, `if()`, `add_executable()`, etc.
- **Variables**: `${VARIABLE}`, `$ENV{VARIABLE}`, `$CACHE{VARIABLE}`
- **Strings**: Quoted strings with escape sequence support
- **Comments**: Line comments (`#`) and block comments (`#[[ ]]`)
- **Generator Expressions**: `$<...>` syntax
- **Keywords**: CMake keywords like `PUBLIC`, `PRIVATE`, `INTERFACE`, `ON`, `OFF`, etc.
- **Numbers**: Numeric literals

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "CMake Path Resolver"
4. Click Install

## Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Run tests
npm run test:unit

# Lint
npm run lint

# Watch mode
npm run watch
```

## License

MIT
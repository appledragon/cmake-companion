# CMake Path Resolver

A VS Code extension for resolving CMake variable paths (like `${MY_WORKSPACE_PATH}/path/file.h`) with underline decoration, hover tips, and click-to-navigate functionality.

## Features

- **Underline Decoration**: CMake paths with variables are underlined and clickable
- **Hover Tips**: Hover over CMake paths to see the resolved path and file existence status
- **Click to Navigate**: Ctrl+Click (Cmd+Click on Mac) to jump directly to the resolved file
- **Variable Resolution**: Automatic parsing of `set()` commands in CMakeLists.txt and .cmake files
- **Built-in Variables**: Support for common CMake variables like `PROJECT_SOURCE_DIR`, `CMAKE_SOURCE_DIR`, etc.
- **Nested Variables**: Recursive resolution of nested variable references
- **Custom Variables**: Define custom variable mappings in VS Code settings

## Supported File Types

- CMakeLists.txt
- *.cmake files
- C/C++ files (.c, .cpp, .h, .hpp)

## Usage

1. Open a workspace containing CMakeLists.txt files
2. The extension automatically parses all CMake files and extracts variable definitions
3. In any supported file, CMake variable paths will be underlined
4. Hover over a path to see the resolved value
5. Ctrl+Click to navigate to the resolved file

### Commands

- **Resolve CMake Path**: Manually resolve a CMake path expression
- **Refresh CMake Variables**: Re-scan the workspace for CMake variable definitions

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
  "cmake-path-resolver.enabledFileTypes": ["cmake", "cpp", "c", "h", "hpp"]
}
```

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
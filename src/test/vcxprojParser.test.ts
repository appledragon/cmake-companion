/**
 * Unit tests for vcxproj parser
 */

import { parseVcxproj } from '../parsers/vcxprojParser';
import * as assert from 'assert';

describe('Vcxproj Parser', () => {
    describe('parseVcxproj', () => {
        it('should parse a simple application project', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup>
    <ConfigurationType>Application</ConfigurationType>
  </PropertyGroup>
  <ItemGroup>
    <ClCompile Include="main.cpp" />
    <ClCompile Include="utils.cpp" />
  </ItemGroup>
  <ItemGroup>
    <ClInclude Include="utils.h" />
  </ItemGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.name, 'MyApp');
            assert.strictEqual(project.type, 'Application');
            assert.strictEqual(project.sourceFiles.length, 2);
            assert.strictEqual(project.sourceFiles[0], 'main.cpp');
            assert.strictEqual(project.sourceFiles[1], 'utils.cpp');
            assert.strictEqual(project.headerFiles.length, 1);
            assert.strictEqual(project.headerFiles[0], 'utils.h');
        });

        it('should parse a static library project', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup>
    <ConfigurationType>StaticLibrary</ConfigurationType>
  </PropertyGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyLib.vcxproj');
            
            assert.strictEqual(project.name, 'MyLib');
            assert.strictEqual(project.type, 'StaticLibrary');
        });

        it('should parse a dynamic library project', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup>
    <ConfigurationType>DynamicLibrary</ConfigurationType>
  </PropertyGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyDll.vcxproj');
            
            assert.strictEqual(project.name, 'MyDll');
            assert.strictEqual(project.type, 'DynamicLibrary');
        });

        it('should parse include directories', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <ClCompile>
      <AdditionalIncludeDirectories>include;../external/include;%(AdditionalIncludeDirectories)</AdditionalIncludeDirectories>
    </ClCompile>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.includeDirectories.length, 2);
            assert.strictEqual(project.includeDirectories[0], 'include');
            assert.strictEqual(project.includeDirectories[1], '../external/include');
        });

        it('should parse preprocessor definitions', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <ClCompile>
      <PreprocessorDefinitions>WIN32;_DEBUG;_CONSOLE;%(PreprocessorDefinitions)</PreprocessorDefinitions>
    </ClCompile>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.preprocessorDefinitions.length, 3);
            assert.strictEqual(project.preprocessorDefinitions[0], 'WIN32');
            assert.strictEqual(project.preprocessorDefinitions[1], '_DEBUG');
            assert.strictEqual(project.preprocessorDefinitions[2], '_CONSOLE');
        });

        it('should parse libraries', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <Link>
      <AdditionalDependencies>kernel32.lib;user32.lib;opengl32.lib;%(AdditionalDependencies)</AdditionalDependencies>
    </Link>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.libraries.length, 3);
            assert.strictEqual(project.libraries[0], 'kernel32');
            assert.strictEqual(project.libraries[1], 'user32');
            assert.strictEqual(project.libraries[2], 'opengl32');
        });

        it('should normalize path separators', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemGroup>
    <ClCompile Include="src\\main.cpp" />
    <ClInclude Include="include\\utils.h" />
  </ItemGroup>
  <ItemDefinitionGroup>
    <ClCompile>
      <AdditionalIncludeDirectories>..\\external\\include</AdditionalIncludeDirectories>
    </ClCompile>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, 'C:\\Projects\\MyApp.vcxproj');
            
            assert.strictEqual(project.sourceFiles[0], 'src/main.cpp');
            assert.strictEqual(project.headerFiles[0], 'include/utils.h');
            assert.strictEqual(project.includeDirectories[0], '../external/include');
        });

        it('should handle ClCompile with closing tags', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemGroup>
    <ClCompile Include="main.cpp">
      <PrecompiledHeader>Use</PrecompiledHeader>
    </ClCompile>
  </ItemGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.sourceFiles.length, 1);
            assert.strictEqual(project.sourceFiles[0], 'main.cpp');
        });
    });
});

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

        it('should parse C++ language standard (stdcpp14)', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <ClCompile>
      <LanguageStandard>stdcpp14</LanguageStandard>
    </ClCompile>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.cxxStandard, 14);
        });

        it('should parse C++ language standard (stdcpp17)', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <ClCompile>
      <LanguageStandard>stdcpp17</LanguageStandard>
    </ClCompile>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.cxxStandard, 17);
        });

        it('should parse C++ language standard (stdcpp20)', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <ClCompile>
      <LanguageStandard>stdcpp20</LanguageStandard>
    </ClCompile>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.cxxStandard, 20);
        });

        it('should parse C++ language standard (stdcpplatest as 23)', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <ClCompile>
      <LanguageStandard>stdcpplatest</LanguageStandard>
    </ClCompile>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.cxxStandard, 23);
        });

        it('should parse Windows SDK version', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup Label="Globals">
    <WindowsTargetPlatformVersion>10.0.19041.0</WindowsTargetPlatformVersion>
  </PropertyGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.windowsSdkVersion, '10.0.19041.0');
        });

        it('should parse platform toolset', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup Label="Configuration">
    <PlatformToolset>v142</PlatformToolset>
  </PropertyGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.platformToolset, 'v142');
        });

        it('should parse character set (Unicode)', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup Label="Configuration">
    <CharacterSet>Unicode</CharacterSet>
  </PropertyGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.characterSet, 'Unicode');
        });

        it('should parse character set (MultiByte)', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup Label="Configuration">
    <CharacterSet>MultiByte</CharacterSet>
  </PropertyGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.characterSet, 'MultiByte');
        });

        it('should parse subsystem (Console)', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <Link>
      <SubSystem>Console</SubSystem>
    </Link>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.subsystem, 'Console');
        });

        it('should parse subsystem (Windows)', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <Link>
      <SubSystem>Windows</SubSystem>
    </Link>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.subsystem, 'Windows');
        });

        it('should parse all extended properties together', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup Label="Globals">
    <WindowsTargetPlatformVersion>10.0.22000.0</WindowsTargetPlatformVersion>
  </PropertyGroup>
  <PropertyGroup Label="Configuration">
    <ConfigurationType>Application</ConfigurationType>
    <PlatformToolset>v143</PlatformToolset>
    <CharacterSet>Unicode</CharacterSet>
  </PropertyGroup>
  <ItemDefinitionGroup>
    <ClCompile>
      <LanguageStandard>stdcpp20</LanguageStandard>
    </ClCompile>
    <Link>
      <SubSystem>Windows</SubSystem>
    </Link>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.type, 'Application');
            assert.strictEqual(project.cxxStandard, 20);
            assert.strictEqual(project.windowsSdkVersion, '10.0.22000.0');
            assert.strictEqual(project.platformToolset, 'v143');
            assert.strictEqual(project.characterSet, 'Unicode');
            assert.strictEqual(project.subsystem, 'Windows');
        });

        it('should parse additional compiler and linker options', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <ClCompile>
      <WarningLevel>Level4</WarningLevel>
      <Optimization>MaxSpeed</Optimization>
      <DebugInformationFormat>ProgramDatabase</DebugInformationFormat>
      <RuntimeLibrary>MultiThreadedDebugDLL</RuntimeLibrary>
      <ExceptionHandling>Sync</ExceptionHandling>
      <RuntimeTypeInfo>true</RuntimeTypeInfo>
      <TreatWarningAsError>true</TreatWarningAsError>
      <MultiProcessorCompilation>true</MultiProcessorCompilation>
      <AdditionalOptions>/bigobj /permissive- %(AdditionalOptions)</AdditionalOptions>
    </ClCompile>
    <Link>
      <AdditionalOptions>/INCREMENTAL:NO /OPT:REF</AdditionalOptions>
      <AdditionalLibraryDirectories>lib;../libs;%(AdditionalLibraryDirectories)</AdditionalLibraryDirectories>
    </Link>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');

            assert.strictEqual(project.warningLevel, 4);
            assert.strictEqual(project.optimization, 'MaxSpeed');
            assert.strictEqual(project.debugInformationFormat, 'ProgramDatabase');
            assert.strictEqual(project.runtimeLibrary, 'MultiThreadedDebugDLL');
            assert.strictEqual(project.exceptionHandling, 'Sync');
            assert.strictEqual(project.runtimeTypeInfo, true);
            assert.strictEqual(project.treatWarningAsError, true);
            assert.strictEqual(project.multiProcessorCompilation, true);
            assert.ok(project.additionalCompileOptions?.includes('/bigobj'));
            assert.ok(project.additionalCompileOptions?.includes('/permissive-'));
            assert.ok(project.additionalLinkOptions?.includes('/INCREMENTAL:NO'));
            assert.ok(project.additionalLinkOptions?.includes('/OPT:REF'));
            assert.ok(project.additionalLibraryDirectories?.includes('lib'));
            assert.ok(project.additionalLibraryDirectories?.includes('../libs'));
        });

        it('should parse configuration-specific settings', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup Condition="'$(Configuration)|$(Platform)'=='Debug|Win32'">
    <ClCompile>
      <PreprocessorDefinitions>DEBUG;_DEBUG;%(PreprocessorDefinitions)</PreprocessorDefinitions>
      <AdditionalIncludeDirectories>debug/include;%(AdditionalIncludeDirectories)</AdditionalIncludeDirectories>
      <WarningLevel>Level4</WarningLevel>
      <Optimization>Disabled</Optimization>
      <DebugInformationFormat>ProgramDatabase</DebugInformationFormat>
      <RuntimeLibrary>MultiThreadedDebugDLL</RuntimeLibrary>
      <AdditionalOptions>/bigobj %(AdditionalOptions)</AdditionalOptions>
    </ClCompile>
    <Link>
      <AdditionalDependencies>debuglib.lib;%(AdditionalDependencies)</AdditionalDependencies>
      <AdditionalOptions>/DEBUG:FULL</AdditionalOptions>
      <AdditionalLibraryDirectories>debug/lib;%(AdditionalLibraryDirectories)</AdditionalLibraryDirectories>
    </Link>
  </ItemDefinitionGroup>
  <ItemDefinitionGroup Condition="'$(Configuration)|$(Platform)'=='Release|Win32'">
    <ClCompile>
      <PreprocessorDefinitions>NDEBUG;%(PreprocessorDefinitions)</PreprocessorDefinitions>
      <AdditionalIncludeDirectories>release/include;%(AdditionalIncludeDirectories)</AdditionalIncludeDirectories>
      <WarningLevel>Level3</WarningLevel>
      <Optimization>MaxSpeed</Optimization>
      <RuntimeLibrary>MultiThreadedDLL</RuntimeLibrary>
    </ClCompile>
    <Link>
      <AdditionalDependencies>releaselib.lib;%(AdditionalDependencies)</AdditionalDependencies>
    </Link>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');

            assert.ok(project.configurations, 'configurations should be defined');
            const debug = project.configurations?.Debug;
            const release = project.configurations?.Release;

            assert.ok(debug, 'Debug configuration should be defined');
            assert.ok(release, 'Release configuration should be defined');

            assert.ok(debug?.preprocessorDefinitions?.includes('DEBUG'));
            assert.ok(debug?.includeDirectories?.includes('debug/include'));
            assert.strictEqual(debug?.warningLevel, 4);
            assert.strictEqual(debug?.optimization, 'Disabled');
            assert.strictEqual(debug?.debugInformationFormat, 'ProgramDatabase');
            assert.strictEqual(debug?.runtimeLibrary, 'MultiThreadedDebugDLL');
            assert.ok(debug?.additionalCompileOptions?.includes('/bigobj'));
            assert.ok(debug?.additionalLinkOptions?.includes('/DEBUG:FULL'));
            assert.ok(debug?.additionalLibraryDirectories?.includes('debug/lib'));
            assert.ok(debug?.libraries?.includes('debuglib'));

            assert.ok(release?.preprocessorDefinitions?.includes('NDEBUG'));
            assert.ok(release?.includeDirectories?.includes('release/include'));
            assert.strictEqual(release?.warningLevel, 3);
            assert.strictEqual(release?.optimization, 'MaxSpeed');
            assert.strictEqual(release?.runtimeLibrary, 'MultiThreadedDLL');
            assert.ok(release?.libraries?.includes('releaselib'));
        });

        it('should parse precompiled header with Create setting', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <ClCompile>
      <PrecompiledHeader>Use</PrecompiledHeader>
      <PrecompiledHeaderFile>pch.h</PrecompiledHeaderFile>
    </ClCompile>
  </ItemDefinitionGroup>
  <ItemGroup>
    <ClCompile Include="main.cpp" />
    <ClCompile Include="pch.cpp">
      <PrecompiledHeader>Create</PrecompiledHeader>
    </ClCompile>
  </ItemGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.ok(project.pchConfig, 'pchConfig should be defined');
            assert.strictEqual(project.pchConfig.enabled, true);
            assert.strictEqual(project.pchConfig.headerFile, 'pch.h');
            assert.strictEqual(project.pchConfig.sourceFile, 'pch.cpp');
        });

        it('should parse precompiled header with NotUsing exclusions', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <ClCompile>
      <PrecompiledHeader>Use</PrecompiledHeader>
      <PrecompiledHeaderFile>stdafx.h</PrecompiledHeaderFile>
    </ClCompile>
  </ItemDefinitionGroup>
  <ItemGroup>
    <ClCompile Include="main.cpp" />
    <ClCompile Include="stdafx.cpp">
      <PrecompiledHeader>Create</PrecompiledHeader>
    </ClCompile>
    <ClCompile Include="external/thirdparty.cpp">
      <PrecompiledHeader>NotUsing</PrecompiledHeader>
    </ClCompile>
    <ClCompile Include="generated/code.cpp">
      <PrecompiledHeader>NotUsing</PrecompiledHeader>
    </ClCompile>
  </ItemGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.ok(project.pchConfig, 'pchConfig should be defined');
            assert.strictEqual(project.pchConfig.enabled, true);
            assert.strictEqual(project.pchConfig.headerFile, 'stdafx.h');
            assert.strictEqual(project.pchConfig.sourceFile, 'stdafx.cpp');
            assert.strictEqual(project.pchConfig.excludedFiles.length, 2);
            assert.ok(project.pchConfig.excludedFiles.includes('external/thirdparty.cpp'));
            assert.ok(project.pchConfig.excludedFiles.includes('generated/code.cpp'));
        });

        it('should not have pchConfig when PCH is not used', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemGroup>
    <ClCompile Include="main.cpp" />
    <ClCompile Include="utils.cpp" />
  </ItemGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.pchConfig, undefined);
        });

        it('should normalize PCH file paths', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <ClCompile>
      <PrecompiledHeader>Use</PrecompiledHeader>
      <PrecompiledHeaderFile>src\\pch.h</PrecompiledHeaderFile>
    </ClCompile>
  </ItemDefinitionGroup>
  <ItemGroup>
    <ClCompile Include="src\\pch.cpp">
      <PrecompiledHeader>Create</PrecompiledHeader>
    </ClCompile>
    <ClCompile Include="external\\lib.cpp">
      <PrecompiledHeader>NotUsing</PrecompiledHeader>
    </ClCompile>
  </ItemGroup>
</Project>`;

            const project = parseVcxproj(content, 'C:\\Projects\\MyApp.vcxproj');
            
            assert.ok(project.pchConfig, 'pchConfig should be defined');
            assert.strictEqual(project.pchConfig.headerFile, 'src/pch.h');
            assert.strictEqual(project.pchConfig.sourceFile, 'src/pch.cpp');
            assert.ok(project.pchConfig.excludedFiles.includes('external/lib.cpp'));
        });
    });
});

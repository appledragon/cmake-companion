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

        it('should extract project name from RootNamespace', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup Label="Globals">
    <RootNamespace>MySuperProject</RootNamespace>
  </PropertyGroup>
  <PropertyGroup>
    <ConfigurationType>Application</ConfigurationType>
  </PropertyGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/DifferentName.vcxproj');
            assert.strictEqual(project.name, 'MySuperProject');
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

        it('should parse resource files (.rc)', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemGroup>
    <ClCompile Include="main.cpp" />
    <ResourceCompile Include="app.rc" />
    <ResourceCompile Include="resources\\icons.rc" />
  </ItemGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.resourceFiles.length, 2);
            assert.strictEqual(project.resourceFiles[0], 'app.rc');
            assert.strictEqual(project.resourceFiles[1], 'resources/icons.rc');
        });

        it('should parse None items (non-compiled files)', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemGroup>
    <ClCompile Include="main.cpp" />
    <None Include="README.md" />
    <None Include="config.json" />
  </ItemGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.noneFiles.length, 2);
            assert.ok(project.noneFiles.includes('README.md'));
            assert.ok(project.noneFiles.includes('config.json'));
        });

        it('should parse project references', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemGroup>
    <ProjectReference Include="..\\MyLib\\MyLib.vcxproj">
      <Project>{12345678-1234-1234-1234-123456789012}</Project>
      <Name>MyLib</Name>
    </ProjectReference>
    <ProjectReference Include="..\\Utils\\Utils.vcxproj">
      <Project>{ABCDEF12-3456-7890-ABCD-EF1234567890}</Project>
    </ProjectReference>
  </ItemGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.projectReferences.length, 2);
            assert.strictEqual(project.projectReferences[0].path, '../MyLib/MyLib.vcxproj');
            assert.strictEqual(project.projectReferences[0].name, 'MyLib');
            assert.strictEqual(project.projectReferences[0].projectGuid, '12345678-1234-1234-1234-123456789012');
            assert.strictEqual(project.projectReferences[1].path, '../Utils/Utils.vcxproj');
            assert.strictEqual(project.projectReferences[1].name, 'Utils');
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

        it('should parse C language standard', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <ClCompile>
      <LanguageStandard_C>stdc17</LanguageStandard_C>
    </ClCompile>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.cStandard, 17);
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

        it('should parse function-level linking and intrinsic functions', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <ClCompile>
      <FunctionLevelLinking>true</FunctionLevelLinking>
      <IntrinsicFunctions>true</IntrinsicFunctions>
    </ClCompile>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.functionLevelLinking, true);
            assert.strictEqual(project.intrinsicFunctions, true);
        });

        it('should parse whole program optimization', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup>
    <WholeProgramOptimization>true</WholeProgramOptimization>
  </PropertyGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.wholeProgramOptimization, true);
        });

        it('should parse generate debug information', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <Link>
      <GenerateDebugInformation>true</GenerateDebugInformation>
    </Link>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.generateDebugInformation, true);
        });

        it('should parse generate debug information with string value (DebugFull)', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <Link>
      <GenerateDebugInformation>DebugFull</GenerateDebugInformation>
    </Link>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.generateDebugInformation, 'DebugFull');
        });

        it('should parse conformance mode and string pooling', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <ClCompile>
      <ConformanceMode>true</ConformanceMode>
      <StringPooling>true</StringPooling>
    </ClCompile>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.conformanceMode, true);
            assert.strictEqual(project.stringPooling, true);
        });

        it('should parse intermediate directory and target name', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup>
    <IntDir>obj\\Debug\\</IntDir>
    <TargetName>MyCustomOutput</TargetName>
  </PropertyGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.intermediateDirectory, 'obj/Debug/');
            assert.strictEqual(project.targetName, 'MyCustomOutput');
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
      <FunctionLevelLinking>true</FunctionLevelLinking>
      <IntrinsicFunctions>true</IntrinsicFunctions>
    </ClCompile>
    <Link>
      <AdditionalDependencies>releaselib.lib;%(AdditionalDependencies)</AdditionalDependencies>
      <GenerateDebugInformation>true</GenerateDebugInformation>
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
            assert.strictEqual(release?.functionLevelLinking, true);
            assert.strictEqual(release?.intrinsicFunctions, true);
            assert.strictEqual(release?.generateDebugInformation, true);
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

        it('should parse build events with XML entities in commands', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <PreBuildEvent>
      <Command>echo &amp;quot;Building...&amp;quot;</Command>
      <Message>Pre-build step</Message>
    </PreBuildEvent>
    <PostBuildEvent>
      <Command>copy /Y "$(OutDir)*.dll" "$(SolutionDir)bin\\"&#xD;&#xA;echo Done</Command>
      <Message>Copying output</Message>
    </PostBuildEvent>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.ok(project.buildEvents, 'buildEvents should be defined');
            assert.strictEqual(project.buildEvents.length, 2);
            assert.strictEqual(project.buildEvents[0].type, 'PreBuild');
            assert.strictEqual(project.buildEvents[0].message, 'Pre-build step');
            assert.strictEqual(project.buildEvents[1].type, 'PostBuild');
            // Should decode XML entities
            assert.ok(project.buildEvents[1].command.includes('echo Done'));
        });

        it('should parse the example SampleApp.vcxproj correctly', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" ToolsVersion="16.0" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup Label="Globals">
    <ProjectGuid>{12345678-1234-1234-1234-123456789012}</ProjectGuid>
    <RootNamespace>SampleApp</RootNamespace>
    <WindowsTargetPlatformVersion>10.0.19041.0</WindowsTargetPlatformVersion>
  </PropertyGroup>
  <PropertyGroup Condition="'$(Configuration)|$(Platform)'=='Debug|Win32'" Label="Configuration">
    <ConfigurationType>Application</ConfigurationType>
    <PlatformToolset>v142</PlatformToolset>
    <CharacterSet>Unicode</CharacterSet>
  </PropertyGroup>
  <ItemDefinitionGroup Condition="'$(Configuration)|$(Platform)'=='Debug|Win32'">
    <ClCompile>
      <PrecompiledHeader>Use</PrecompiledHeader>
      <PrecompiledHeaderFile>include\\pch.h</PrecompiledHeaderFile>
      <WarningLevel>Level3</WarningLevel>
      <Optimization>Disabled</Optimization>
      <PreprocessorDefinitions>WIN32;_DEBUG;_CONSOLE;USE_OPENGL;%(PreprocessorDefinitions)</PreprocessorDefinitions>
      <AdditionalIncludeDirectories>include;../third_party/include;%(AdditionalIncludeDirectories)</AdditionalIncludeDirectories>
      <LanguageStandard>stdcpp17</LanguageStandard>
    </ClCompile>
    <Link>
      <SubSystem>Console</SubSystem>
      <AdditionalDependencies>opengl32.lib;glu32.lib;user32.lib;kernel32.lib;%(AdditionalDependencies)</AdditionalDependencies>
    </Link>
  </ItemDefinitionGroup>
  <ItemDefinitionGroup Condition="'$(Configuration)|$(Platform)'=='Release|Win32'">
    <ClCompile>
      <WarningLevel>Level3</WarningLevel>
      <Optimization>MaxSpeed</Optimization>
      <FunctionLevelLinking>true</FunctionLevelLinking>
      <IntrinsicFunctions>true</IntrinsicFunctions>
      <PreprocessorDefinitions>WIN32;NDEBUG;_CONSOLE;%(PreprocessorDefinitions)</PreprocessorDefinitions>
      <AdditionalIncludeDirectories>include;%(AdditionalIncludeDirectories)</AdditionalIncludeDirectories>
    </ClCompile>
    <Link>
      <SubSystem>Console</SubSystem>
      <AdditionalDependencies>opengl32.lib;%(AdditionalDependencies)</AdditionalDependencies>
    </Link>
  </ItemDefinitionGroup>
  <ItemGroup>
    <ClCompile Include="src\\main.cpp" />
    <ClCompile Include="src\\graphics.cpp">
      <PrecompiledHeader>NotUsing</PrecompiledHeader>
    </ClCompile>
    <ClCompile Include="src\\utils.cpp">
      <PrecompiledHeader>NotUsing</PrecompiledHeader>
    </ClCompile>
  </ItemGroup>
  <ItemGroup>
    <ClInclude Include="include\\graphics.h" />
    <ClInclude Include="include\\utils.h" />
    <ClInclude Include="include\\config.h" />
  </ItemGroup>
</Project>`;

            const project = parseVcxproj(content, 'C:\\Projects\\SampleApp.vcxproj');
            
            assert.strictEqual(project.name, 'SampleApp');
            assert.strictEqual(project.type, 'Application');
            assert.strictEqual(project.windowsSdkVersion, '10.0.19041.0');
            assert.strictEqual(project.platformToolset, 'v142');
            assert.strictEqual(project.characterSet, 'Unicode');
            assert.strictEqual(project.subsystem, 'Console');

            // Source files
            assert.strictEqual(project.sourceFiles.length, 3);
            assert.ok(project.sourceFiles.includes('src/main.cpp'));
            assert.ok(project.sourceFiles.includes('src/graphics.cpp'));
            assert.ok(project.sourceFiles.includes('src/utils.cpp'));

            // Header files
            assert.strictEqual(project.headerFiles.length, 3);
            assert.ok(project.headerFiles.includes('include/graphics.h'));
            assert.ok(project.headerFiles.includes('include/utils.h'));
            assert.ok(project.headerFiles.includes('include/config.h'));

            // PCH Config
            assert.ok(project.pchConfig, 'pchConfig should be defined');
            assert.strictEqual(project.pchConfig.enabled, true);
            assert.strictEqual(project.pchConfig.headerFile, 'include/pch.h');
            assert.strictEqual(project.pchConfig.excludedFiles.length, 2);
            assert.ok(project.pchConfig.excludedFiles.includes('src/graphics.cpp'));
            assert.ok(project.pchConfig.excludedFiles.includes('src/utils.cpp'));

            // Configuration-specific settings
            assert.ok(project.configurations);
            const debug = project.configurations!.Debug;
            const release = project.configurations!.Release;
            assert.ok(debug);
            assert.ok(release);

            assert.ok(debug.preprocessorDefinitions?.includes('_DEBUG'));
            assert.ok(debug.preprocessorDefinitions?.includes('USE_OPENGL'));
            assert.ok(debug.includeDirectories?.includes('../third_party/include'));
            assert.strictEqual(debug.optimization, 'Disabled');
            assert.strictEqual(debug.warningLevel, 3);

            assert.ok(release.preprocessorDefinitions?.includes('NDEBUG'));
            assert.strictEqual(release.optimization, 'MaxSpeed');
            assert.strictEqual(release.functionLevelLinking, true);
            assert.strictEqual(release.intrinsicFunctions, true);
        });

        it('should handle empty project gracefully', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
</Project>`;

            const project = parseVcxproj(content, '/path/to/Empty.vcxproj');
            
            assert.strictEqual(project.name, 'Empty');
            assert.strictEqual(project.type, 'Application');
            assert.strictEqual(project.sourceFiles.length, 0);
            assert.strictEqual(project.headerFiles.length, 0);
            assert.strictEqual(project.resourceFiles.length, 0);
            assert.strictEqual(project.noneFiles.length, 0);
            assert.strictEqual(project.projectReferences.length, 0);
        });

        it('should deduplicate files from self-closing and block forms', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemGroup>
    <ClCompile Include="main.cpp">
      <Optimization>Disabled</Optimization>
    </ClCompile>
  </ItemGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            // Should not have duplicates
            assert.strictEqual(project.sourceFiles.length, 1);
            assert.strictEqual(project.sourceFiles[0], 'main.cpp');
        });

        it('should parse ResourceCompile with closing tags', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemGroup>
    <ResourceCompile Include="app.rc">
      <PreprocessorDefinitions>_DEBUG;%(PreprocessorDefinitions)</PreprocessorDefinitions>
    </ResourceCompile>
  </ItemGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.resourceFiles.length, 1);
            assert.strictEqual(project.resourceFiles[0], 'app.rc');
        });

        it('should parse self-closing ProjectReference', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemGroup>
    <ProjectReference Include="..\\MyLib\\MyLib.vcxproj" />
  </ItemGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            
            assert.strictEqual(project.projectReferences.length, 1);
            assert.strictEqual(project.projectReferences[0].path, '../MyLib/MyLib.vcxproj');
            assert.strictEqual(project.projectReferences[0].name, 'MyLib');
        });

        it('should parse BasicRuntimeChecks', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <ClCompile>
      <BasicRuntimeChecks>EnableFastChecks</BasicRuntimeChecks>
    </ClCompile>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            assert.strictEqual(project.basicRuntimeChecks, 'EnableFastChecks');
        });

        it('should parse DisableSpecificWarnings', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <ClCompile>
      <DisableSpecificWarnings>4251;4275;%(DisableSpecificWarnings)</DisableSpecificWarnings>
    </ClCompile>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            assert.deepStrictEqual(project.disableSpecificWarnings, ['4251', '4275']);
        });

        it('should parse FavorSizeOrSpeed', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <ClCompile>
      <FavorSizeOrSpeed>Size</FavorSizeOrSpeed>
    </ClCompile>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            assert.strictEqual(project.favorSizeOrSpeed, 'Size');
        });

        it('should parse ControlFlowGuard', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <ClCompile>
      <ControlFlowGuard>Guard</ControlFlowGuard>
    </ClCompile>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            assert.strictEqual(project.controlFlowGuard, true);
        });

        it('should parse EnableCOMDATFolding', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <Link>
      <EnableCOMDATFolding>true</EnableCOMDATFolding>
    </Link>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            assert.strictEqual(project.enableCOMDATFolding, true);
        });

        it('should parse OptimizeReferences', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <Link>
      <OptimizeReferences>true</OptimizeReferences>
    </Link>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            assert.strictEqual(project.optimizeReferences, true);
        });

        it('should parse GenerateMapFile', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup>
    <Link>
      <GenerateMapFile>true</GenerateMapFile>
    </Link>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');
            assert.strictEqual(project.generateMapFile, true);
        });

        it('should parse config-specific new fields', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup Condition="'$(Configuration)|$(Platform)'=='Release|Win32'">
    <ClCompile>
      <IntrinsicFunctions>true</IntrinsicFunctions>
      <FunctionLevelLinking>true</FunctionLevelLinking>
      <FavorSizeOrSpeed>Size</FavorSizeOrSpeed>
      <ControlFlowGuard>Guard</ControlFlowGuard>
      <ConformanceMode>true</ConformanceMode>
    </ClCompile>
    <Link>
      <EnableCOMDATFolding>true</EnableCOMDATFolding>
      <OptimizeReferences>true</OptimizeReferences>
      <GenerateMapFile>true</GenerateMapFile>
    </Link>
  </ItemDefinitionGroup>
  <ItemDefinitionGroup Condition="'$(Configuration)|$(Platform)'=='Debug|Win32'">
    <ClCompile>
      <BasicRuntimeChecks>EnableFastChecks</BasicRuntimeChecks>
      <DisableSpecificWarnings>4251;%(DisableSpecificWarnings)</DisableSpecificWarnings>
      <DebugInformationFormat>EditAndContinue</DebugInformationFormat>
    </ClCompile>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');

            assert.ok(project.configurations);
            const release = project.configurations!['Release'];
            assert.ok(release);
            assert.strictEqual(release.intrinsicFunctions, true);
            assert.strictEqual(release.functionLevelLinking, true);
            assert.strictEqual(release.favorSizeOrSpeed, 'Size');
            assert.strictEqual(release.controlFlowGuard, true);
            assert.strictEqual(release.conformanceMode, true);
            assert.strictEqual(release.enableCOMDATFolding, true);
            assert.strictEqual(release.optimizeReferences, true);
            assert.strictEqual(release.generateMapFile, true);

            const debug = project.configurations!['Debug'];
            assert.ok(debug);
            assert.strictEqual(debug.basicRuntimeChecks, 'EnableFastChecks');
            assert.deepStrictEqual(debug.disableSpecificWarnings, ['4251']);
            assert.strictEqual(debug.debugInformationFormat, 'EditAndContinue');
        });

        it('should parse build events with conditions', () => {
            const content = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemDefinitionGroup Condition="'$(Configuration)|$(Platform)'=='Release|Win32'">
    <PreBuildEvent>
      <Command>call build_spcpp.bat</Command>
    </PreBuildEvent>
  </ItemDefinitionGroup>
  <ItemDefinitionGroup Condition="'$(Configuration)|$(Platform)'=='Debug|Win32'">
    <PreBuildEvent>
      <Command>echo debug build</Command>
    </PreBuildEvent>
    <PreBuildEventUseInBuild>false</PreBuildEventUseInBuild>
  </ItemDefinitionGroup>
</Project>`;

            const project = parseVcxproj(content, '/path/to/MyApp.vcxproj');

            assert.ok(project.buildEvents);
            assert.strictEqual(project.buildEvents!.length, 2);

            const releaseEvent = project.buildEvents!.find(e => e.command === 'call build_spcpp.bat');
            assert.ok(releaseEvent);
            assert.strictEqual(releaseEvent!.condition, 'Release|Win32');
            assert.strictEqual(releaseEvent!.enabled, true);

            const debugEvent = project.buildEvents!.find(e => e.command === 'echo debug build');
            assert.ok(debugEvent);
            assert.strictEqual(debugEvent!.condition, 'Debug|Win32');
            assert.strictEqual(debugEvent!.enabled, false);
        });

        it('should parse LanguageStandard stdcpp20', () => {
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
    });
});

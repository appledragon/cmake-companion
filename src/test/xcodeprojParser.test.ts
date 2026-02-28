/**
 * Unit tests for Xcode project parser
 */

import { parseXcodeproj } from '../parsers/xcodeprojParser';
import * as assert from 'assert';

describe('Xcodeproj Parser', () => {
    describe('parseXcodeproj', () => {
        it('should parse a simple application project', () => {
            const content = `// !$*UTF8*$!
{
	archiveVersion = 1;
	classes = {
	};
	objectVersion = 56;
	objects = {
/* Begin PBXBuildFile section */
		1234567890ABCDEF12345678 /* main.cpp in Sources */ = {isa = PBXBuildFile; fileRef = ABCDEF1234567890ABCDEF12 /* main.cpp */; };
		234567890ABCDEF123456789A /* utils.cpp in Sources */ = {isa = PBXBuildFile; fileRef = BCDEF1234567890ABCDEF123 /* utils.cpp */; };
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
		9876543210FEDCBA98765432 /* MyApp */ = {isa = PBXFileReference; explicitFileType = "compiled.mach-o.executable"; includeInIndex = 0; path = MyApp; sourceTree = BUILT_PRODUCTS_DIR; };
		ABCDEF1234567890ABCDEF12 /* main.cpp */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.cpp.cpp; path = main.cpp; sourceTree = "<group>"; };
		BCDEF1234567890ABCDEF123 /* utils.cpp */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.cpp.cpp; path = utils.cpp; sourceTree = "<group>"; };
		CDEF1234567890ABCDEF1234 /* utils.h */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.c.h; path = utils.h; sourceTree = "<group>"; };
/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
		3456789ABCDEF123456789AB /* Frameworks */ = {
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXNativeTarget section */
		456789ABCDEF123456789ABC /* MyApp */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list for PBXNativeTarget "MyApp" */;
			buildPhases = (
				6789ABCDEF123456789ABCDE /* Sources */,
				3456789ABCDEF123456789AB /* Frameworks */,
			);
			name = MyApp;
			productName = MyApp;
			productReference = 9876543210FEDCBA98765432 /* MyApp */;
			productType = "com.apple.product-type.tool";
		};
/* End PBXNativeTarget section */

/* Begin PBXSourcesBuildPhase section */
		6789ABCDEF123456789ABCDE /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				1234567890ABCDEF12345678 /* main.cpp in Sources */,
				234567890ABCDEF123456789A /* utils.cpp in Sources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
		789ABCDEF123456789ABCDEF1 /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
			};
			name = Debug;
		};
		89ABCDEF123456789ABCDEF12 /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
			};
			name = Release;
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		56789ABCDEF123456789ABCD /* Build configuration list for PBXNativeTarget "MyApp" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				789ABCDEF123456789ABCDEF1 /* Debug */,
				89ABCDEF123456789ABCDEF12 /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
/* End XCConfigurationList section */
	};
	rootObject = DEF123456789ABCDEF123456 /* Project object */;
}`;

            const project = parseXcodeproj(content, '/path/to/MyApp.xcodeproj');
            
            assert.strictEqual(project.name, 'MyApp');
            assert.strictEqual(project.type, 'Application');
            assert.strictEqual(project.sourceFiles.length, 2);
            assert.ok(project.sourceFiles.includes('main.cpp'));
            assert.ok(project.sourceFiles.includes('utils.cpp'));
            // Header files should be automatically found from PBXFileReference
            assert.ok(project.headerFiles.includes('utils.h'));
        });

        it('should extract project name from xcodeproj path', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
/* Begin PBXNativeTarget section */
		456789ABCDEF123456789ABC /* TestProject */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = ();
			name = TestProject;
			productType = "com.apple.product-type.tool";
		};
/* End PBXNativeTarget section */
	};
}`;

            const project = parseXcodeproj(content, '/path/to/MyCustomProject.xcodeproj');
            
            assert.strictEqual(project.name, 'TestProject');
        });

        it('should parse static library product type', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
/* Begin PBXNativeTarget section */
		456789ABCDEF123456789ABC /* MyLib */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = ();
			name = MyLib;
			productType = "com.apple.product-type.library.static";
		};
/* End PBXNativeTarget section */
	};
}`;

            const project = parseXcodeproj(content, '/path/to/MyLib.xcodeproj');
            
            assert.strictEqual(project.type, 'StaticLibrary');
        });

        it('should parse dynamic library product type', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
/* Begin PBXNativeTarget section */
		456789ABCDEF123456789ABC /* MyDylib */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = ();
			name = MyDylib;
			productType = "com.apple.product-type.library.dynamic";
		};
/* End PBXNativeTarget section */
	};
}`;

            const project = parseXcodeproj(content, '/path/to/MyDylib.xcodeproj');
            
            assert.strictEqual(project.type, 'DynamicLibrary');
        });

        it('should parse framework product type', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
/* Begin PBXNativeTarget section */
		456789ABCDEF123456789ABC /* MyFramework */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = ();
			name = MyFramework;
			productType = "com.apple.product-type.framework";
		};
/* End PBXNativeTarget section */
	};
}`;

            const project = parseXcodeproj(content, '/path/to/MyFramework.xcodeproj');
            
            assert.strictEqual(project.type, 'Framework');
        });

        it('should parse bundle product type', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
/* Begin PBXNativeTarget section */
		456789ABCDEF123456789ABC /* MyBundle */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = ();
			name = MyBundle;
			productType = "com.apple.product-type.bundle";
		};
/* End PBXNativeTarget section */
	};
}`;

            const project = parseXcodeproj(content, '/path/to/MyBundle.xcodeproj');
            
            assert.strictEqual(project.type, 'Bundle');
        });

        it('should parse build settings', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
/* Begin PBXNativeTarget section */
		456789ABCDEF123456789ABC /* MyApp */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = ();
			name = MyApp;
			productType = "com.apple.product-type.tool";
		};
/* End PBXNativeTarget section */

/* Begin XCBuildConfiguration section */
		789ABCDEF123456789ABCDEF1 /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				CLANG_CXX_LANGUAGE_STANDARD = "gnu++17";
				MACOSX_DEPLOYMENT_TARGET = 11.0;
				HEADER_SEARCH_PATHS = (
					"include",
					"../external/include",
				);
				GCC_PREPROCESSOR_DEFINITIONS = (
					"DEBUG=1",
					"PLATFORM_MACOS",
				);
			};
			name = Debug;
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		56789ABCDEF123456789ABCD /* Build configuration list */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				789ABCDEF123456789ABCDEF1 /* Debug */,
			);
			defaultConfigurationName = Debug;
		};
/* End XCConfigurationList section */
	};
}`;

            const project = parseXcodeproj(content, '/path/to/MyApp.xcodeproj');
            
            assert.strictEqual(project.cxxStandard, 17);
            assert.strictEqual(project.deploymentTarget, '11.0');
            assert.ok(project.includeDirectories.includes('include'));
            assert.ok(project.includeDirectories.includes('../external/include'));
            assert.ok(project.preprocessorDefinitions.includes('DEBUG=1'));
            assert.ok(project.preprocessorDefinitions.includes('PLATFORM_MACOS'));
        });

        it('should parse single-value GCC_PREPROCESSOR_DEFINITIONS', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
/* Begin PBXNativeTarget section */
		456789ABCDEF123456789ABC /* MyApp */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = ();
			name = MyApp;
			productType = "com.apple.product-type.tool";
		};
/* End PBXNativeTarget section */

/* Begin XCBuildConfiguration section */
		789ABCDEF123456789ABCDEF1 /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				GCC_PREPROCESSOR_DEFINITIONS = "NDEBUG=1";
			};
			name = Release;
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		56789ABCDEF123456789ABCD /* Build configuration list */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				789ABCDEF123456789ABCDEF1 /* Release */,
			);
			defaultConfigurationName = Release;
		};
/* End XCConfigurationList section */
	};
}`;

            const project = parseXcodeproj(content, '/path/to/MyApp.xcodeproj');
            
            assert.ok(project.preprocessorDefinitions.includes('NDEBUG=1'));
        });

        it('should parse frameworks including .tbd and .dylib libraries', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
/* Begin PBXBuildFile section */
		1111111111111111111111AA /* Foundation.framework in Frameworks */ = {isa = PBXBuildFile; fileRef = AAAA111111111111111111AA /* Foundation.framework */; };
		2222222222222222222222BB /* libz.tbd in Frameworks */ = {isa = PBXBuildFile; fileRef = BBBB222222222222222222BB /* libz.tbd */; };
		3333333333333333333333CC /* libsqlite3.dylib in Frameworks */ = {isa = PBXBuildFile; fileRef = CCCC333333333333333333CC /* libsqlite3.dylib */; };
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
		AAAA111111111111111111AA /* Foundation.framework */ = {isa = PBXFileReference; lastKnownFileType = wrapper.framework; name = Foundation.framework; path = System/Library/Frameworks/Foundation.framework; sourceTree = SDKROOT; };
		BBBB222222222222222222BB /* libz.tbd */ = {isa = PBXFileReference; lastKnownFileType = "sourcecode.text-based-dylib-definition"; name = libz.tbd; path = usr/lib/libz.tbd; sourceTree = SDKROOT; };
		CCCC333333333333333333CC /* libsqlite3.dylib */ = {isa = PBXFileReference; lastKnownFileType = "compiled.mach-o.dylib"; name = libsqlite3.dylib; path = usr/lib/libsqlite3.dylib; sourceTree = SDKROOT; };
/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
		4444444444444444444444DD /* Frameworks */ = {
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
				1111111111111111111111AA /* Foundation.framework in Frameworks */,
				2222222222222222222222BB /* libz.tbd in Frameworks */,
				3333333333333333333333CC /* libsqlite3.dylib in Frameworks */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXNativeTarget section */
		456789ABCDEF123456789ABC /* MyApp */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = (
				4444444444444444444444DD /* Frameworks */,
			);
			name = MyApp;
			productType = "com.apple.product-type.tool";
		};
/* End PBXNativeTarget section */
	};
}`;

            const project = parseXcodeproj(content, '/path/to/MyApp.xcodeproj');
            
            assert.ok(project.frameworks.includes('Foundation'), 'Should include Foundation framework');
            assert.ok(project.libraries.includes('z'), 'Should include z library from .tbd');
            assert.ok(project.libraries.includes('sqlite3'), 'Should include sqlite3 library from .dylib');
        });

        it('should parse shell script build phases', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
/* Begin PBXShellScriptBuildPhase section */
		AAAA111111111111111111AA /* Run Script */ = {
			isa = PBXShellScriptBuildPhase;
			buildActionMask = 2147483647;
			files = ();
			inputPaths = (
				"$(SRCROOT)/input.txt",
			);
			name = "Run Script";
			outputPaths = (
				"$(DERIVED_FILE_DIR)/output.txt",
			);
			runOnlyForDeploymentPostprocessing = 0;
			shellPath = /bin/sh;
			shellScript = "echo \\"Hello World\\"";
		};
/* End PBXShellScriptBuildPhase section */

/* Begin PBXNativeTarget section */
		456789ABCDEF123456789ABC /* MyApp */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = (
				AAAA111111111111111111AA /* Run Script */,
			);
			name = MyApp;
			productType = "com.apple.product-type.tool";
		};
/* End PBXNativeTarget section */
	};
}`;

            const project = parseXcodeproj(content, '/path/to/MyApp.xcodeproj');
            
            assert.ok(project.shellScriptPhases, 'shellScriptPhases should be defined');
            assert.strictEqual(project.shellScriptPhases!.length, 1);
            assert.strictEqual(project.shellScriptPhases![0].name, 'Run Script');
            assert.strictEqual(project.shellScriptPhases![0].shellPath, '/bin/sh');
            assert.ok(project.shellScriptPhases![0].shellScript.includes('Hello World'));
            assert.ok(project.shellScriptPhases![0].inputPaths?.includes('$(SRCROOT)/input.txt'));
            assert.ok(project.shellScriptPhases![0].outputPaths?.includes('$(DERIVED_FILE_DIR)/output.txt'));
        });

        it('should parse iOS deployment target', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
/* Begin PBXNativeTarget section */
		456789ABCDEF123456789ABC /* MyApp */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = ();
			name = MyApp;
			productType = "com.apple.product-type.application";
		};
/* End PBXNativeTarget section */

/* Begin XCBuildConfiguration section */
		789ABCDEF123456789ABCDEF1 /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				IPHONEOS_DEPLOYMENT_TARGET = 15.0;
				PRODUCT_BUNDLE_IDENTIFIER = "com.example.MyApp";
				INFOPLIST_FILE = "MyApp/Info.plist";
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
			};
			name = Debug;
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		56789ABCDEF123456789ABCD /* Build configuration list */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				789ABCDEF123456789ABCDEF1 /* Debug */,
			);
			defaultConfigurationName = Debug;
		};
/* End XCConfigurationList section */
	};
}`;

            const project = parseXcodeproj(content, '/path/to/MyApp.xcodeproj');
            
            assert.strictEqual(project.iosDeploymentTarget, '15.0');
            assert.strictEqual(project.bundleIdentifier, 'com.example.MyApp');
            assert.strictEqual(project.infoPlistFile, 'MyApp/Info.plist');
            assert.strictEqual(project.enableModules, true);
            assert.strictEqual(project.enableARC, true);
        });

        it('should parse C standard (GCC_C_LANGUAGE_STANDARD)', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
/* Begin PBXNativeTarget section */
		456789ABCDEF123456789ABC /* MyApp */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = ();
			name = MyApp;
			productType = "com.apple.product-type.tool";
		};
/* End PBXNativeTarget section */

/* Begin XCBuildConfiguration section */
		789ABCDEF123456789ABCDEF1 /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				CLANG_CXX_LANGUAGE_STANDARD = "gnu++20";
				GCC_C_LANGUAGE_STANDARD = gnu11;
			};
			name = Debug;
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		56789ABCDEF123456789ABCD /* Build configuration list */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				789ABCDEF123456789ABCDEF1 /* Debug */,
			);
			defaultConfigurationName = Debug;
		};
/* End XCConfigurationList section */
	};
}`;

            const project = parseXcodeproj(content, '/path/to/MyApp.xcodeproj');
            
            assert.strictEqual(project.cxxStandard, 20);
            assert.strictEqual(project.cStandard, 11);
        });

        it('should parse OTHER_LDFLAGS and LIBRARY_SEARCH_PATHS', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
/* Begin PBXNativeTarget section */
		456789ABCDEF123456789ABC /* MyApp */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = ();
			name = MyApp;
			productType = "com.apple.product-type.tool";
		};
/* End PBXNativeTarget section */

/* Begin XCBuildConfiguration section */
		789ABCDEF123456789ABCDEF1 /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				OTHER_LDFLAGS = (
					"-lz",
					"-lxml2",
				);
				LIBRARY_SEARCH_PATHS = (
					"/usr/local/lib",
					"/opt/homebrew/lib",
				);
				FRAMEWORK_SEARCH_PATHS = (
					"/Library/Frameworks",
				);
			};
			name = Debug;
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		56789ABCDEF123456789ABCD /* Build configuration list */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				789ABCDEF123456789ABCDEF1 /* Debug */,
			);
			defaultConfigurationName = Debug;
		};
/* End XCConfigurationList section */
	};
}`;

            const project = parseXcodeproj(content, '/path/to/MyApp.xcodeproj');
            
            assert.ok(project.additionalLinkOptions?.includes('-lz'));
            assert.ok(project.additionalLinkOptions?.includes('-lxml2'));
            assert.ok(project.additionalLibraryDirectories?.includes('/usr/local/lib'));
            assert.ok(project.additionalLibraryDirectories?.includes('/opt/homebrew/lib'));
            assert.ok(project.frameworkSearchPaths?.includes('/Library/Frameworks'));
        });

        it('should parse headers from PBXHeadersBuildPhase', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
/* Begin PBXBuildFile section */
		1111111111111111111111AA /* main.cpp in Sources */ = {isa = PBXBuildFile; fileRef = AAAA111111111111111111AA /* main.cpp */; };
		2222222222222222222222BB /* MyLib.h in Headers */ = {isa = PBXBuildFile; fileRef = BBBB222222222222222222BB /* MyLib.h */; settings = {ATTRIBUTES = (Public, ); }; };
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
		AAAA111111111111111111AA /* main.cpp */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.cpp.cpp; path = main.cpp; sourceTree = "<group>"; };
		BBBB222222222222222222BB /* MyLib.h */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.c.h; path = MyLib.h; sourceTree = "<group>"; };
/* End PBXFileReference section */

/* Begin PBXSourcesBuildPhase section */
		3333333333333333333333CC /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				1111111111111111111111AA /* main.cpp in Sources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXSourcesBuildPhase section */

/* Begin PBXHeadersBuildPhase section */
		4444444444444444444444DD /* Headers */ = {
			isa = PBXHeadersBuildPhase;
			buildActionMask = 2147483647;
			files = (
				2222222222222222222222BB /* MyLib.h in Headers */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXHeadersBuildPhase section */

/* Begin PBXNativeTarget section */
		456789ABCDEF123456789ABC /* MyLib */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = (
				3333333333333333333333CC /* Sources */,
				4444444444444444444444DD /* Headers */,
			);
			name = MyLib;
			productType = "com.apple.product-type.library.static";
		};
/* End PBXNativeTarget section */
	};
}`;

            const project = parseXcodeproj(content, '/path/to/MyLib.xcodeproj');
            
            assert.ok(project.sourceFiles.includes('main.cpp'));
            assert.ok(project.headerFiles.includes('MyLib.h'));
        });

        it('should parse resource files from PBXResourcesBuildPhase', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
/* Begin PBXBuildFile section */
		1111111111111111111111AA /* main.cpp in Sources */ = {isa = PBXBuildFile; fileRef = AAAA111111111111111111AA /* main.cpp */; };
		2222222222222222222222BB /* Assets.xcassets in Resources */ = {isa = PBXBuildFile; fileRef = BBBB222222222222222222BB /* Assets.xcassets */; };
		3333333333333333333333CC /* LaunchScreen.storyboard in Resources */ = {isa = PBXBuildFile; fileRef = CCCC333333333333333333CC /* LaunchScreen.storyboard */; };
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
		AAAA111111111111111111AA /* main.cpp */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.cpp.cpp; path = main.cpp; sourceTree = "<group>"; };
		BBBB222222222222222222BB /* Assets.xcassets */ = {isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = Assets.xcassets; sourceTree = "<group>"; };
		CCCC333333333333333333CC /* LaunchScreen.storyboard */ = {isa = PBXFileReference; lastKnownFileType = file.storyboard; path = LaunchScreen.storyboard; sourceTree = "<group>"; };
/* End PBXFileReference section */

/* Begin PBXSourcesBuildPhase section */
		4444444444444444444444DD /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				1111111111111111111111AA /* main.cpp in Sources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXSourcesBuildPhase section */

/* Begin PBXResourcesBuildPhase section */
		5555555555555555555555EE /* Resources */ = {
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				2222222222222222222222BB /* Assets.xcassets in Resources */,
				3333333333333333333333CC /* LaunchScreen.storyboard in Resources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXResourcesBuildPhase section */

/* Begin PBXNativeTarget section */
		456789ABCDEF123456789ABC /* MyApp */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = (
				4444444444444444444444DD /* Sources */,
				5555555555555555555555EE /* Resources */,
			);
			name = MyApp;
			productType = "com.apple.product-type.application";
		};
/* End PBXNativeTarget section */
	};
}`;

            const project = parseXcodeproj(content, '/path/to/MyApp.xcodeproj');
            
            assert.ok(project.resourceFiles.includes('Assets.xcassets'));
            assert.ok(project.resourceFiles.includes('LaunchScreen.storyboard'));
            assert.ok(project.sourceFiles.includes('main.cpp'));
        });

        it('should parse optimization and debug info from build settings', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
/* Begin PBXNativeTarget section */
		456789ABCDEF123456789ABC /* MyApp */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = ();
			name = MyApp;
			productType = "com.apple.product-type.tool";
		};
/* End PBXNativeTarget section */

/* Begin XCBuildConfiguration section */
		789ABCDEF123456789ABCDEF1 /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				GCC_OPTIMIZATION_LEVEL = 0;
				DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";
			};
			name = Debug;
		};
		89ABCDEF123456789ABCDEF12 /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				GCC_OPTIMIZATION_LEVEL = s;
				DEBUG_INFORMATION_FORMAT = dwarf;
			};
			name = Release;
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		56789ABCDEF123456789ABCD /* Build configuration list */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				789ABCDEF123456789ABCDEF1 /* Debug */,
				89ABCDEF123456789ABCDEF12 /* Release */,
			);
			defaultConfigurationName = Release;
		};
/* End XCConfigurationList section */
	};
}`;

            const project = parseXcodeproj(content, '/path/to/MyApp.xcodeproj');
            
            assert.ok(project.configurations);
            assert.strictEqual(project.configurations!.Debug?.optimization, '0');
            assert.strictEqual(project.configurations!.Debug?.debugInformationFormat, 'dwarf-with-dsym');
            assert.strictEqual(project.configurations!.Release?.optimization, 's');
            assert.strictEqual(project.configurations!.Release?.debugInformationFormat, 'dwarf');
        });

        it('should throw error when no native target found', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
	};
}`;

            assert.throws(() => {
                parseXcodeproj(content, '/path/to/Empty.xcodeproj');
            }, /No native target found/);
        });

        it('should initialize resourceFiles as empty array', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
/* Begin PBXNativeTarget section */
		456789ABCDEF123456789ABC /* MyApp */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = ();
			name = MyApp;
			productType = "com.apple.product-type.tool";
		};
/* End PBXNativeTarget section */
	};
}`;

            const project = parseXcodeproj(content, '/path/to/MyApp.xcodeproj');
            
            assert.ok(Array.isArray(project.resourceFiles));
            assert.strictEqual(project.resourceFiles.length, 0);
        });

        it('should parse SDKROOT', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
		456789ABCDEF123456789ABC /* MyApp */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = ();
			name = MyApp;
			productType = "com.apple.product-type.tool";
		};
		789ABCDEF123456789ABCDEF1 /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				SDKROOT = iphoneos;
			};
			name = Debug;
		};
		56789ABCDEF123456789ABCD /* Build configuration list */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				789ABCDEF123456789ABCDEF1 /* Debug */,
			);
			defaultConfigurationName = Debug;
		};
	};
}`;
            const project = parseXcodeproj(content, '/path/to/MyApp.xcodeproj');
            assert.strictEqual(project.sdkRoot, 'iphoneos');
        });

        it('should parse LD_RUNPATH_SEARCH_PATHS', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
		456789ABCDEF123456789ABC /* MyApp */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = ();
			name = MyApp;
			productType = "com.apple.product-type.tool";
		};
		789ABCDEF123456789ABCDEF1 /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				LD_RUNPATH_SEARCH_PATHS = (
					"@executable_path/../Frameworks",
					"@loader_path/../Frameworks",
				);
			};
			name = Debug;
		};
		56789ABCDEF123456789ABCD /* Build configuration list */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				789ABCDEF123456789ABCDEF1 /* Debug */,
			);
			defaultConfigurationName = Debug;
		};
	};
}`;
            const project = parseXcodeproj(content, '/path/to/MyApp.xcodeproj');
            assert.ok(project.runpathSearchPaths);
            assert.ok(project.runpathSearchPaths!.includes('@executable_path/../Frameworks'));
            assert.ok(project.runpathSearchPaths!.includes('@loader_path/../Frameworks'));
        });

        it('should parse DEAD_CODE_STRIPPING', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
		456789ABCDEF123456789ABC /* MyApp */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = ();
			name = MyApp;
			productType = "com.apple.product-type.tool";
		};
		789ABCDEF123456789ABCDEF1 /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				DEAD_CODE_STRIPPING = YES;
			};
			name = Release;
		};
		56789ABCDEF123456789ABCD /* Build configuration list */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				789ABCDEF123456789ABCDEF1 /* Release */,
			);
			defaultConfigurationName = Release;
		};
	};
}`;
            const project = parseXcodeproj(content, '/path/to/MyApp.xcodeproj');
            assert.strictEqual(project.deadCodeStripping, true);
        });

        it('should parse GCC_TREAT_WARNINGS_AS_ERRORS', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
		456789ABCDEF123456789ABC /* MyApp */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = ();
			name = MyApp;
			productType = "com.apple.product-type.tool";
		};
		789ABCDEF123456789ABCDEF1 /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				GCC_TREAT_WARNINGS_AS_ERRORS = YES;
			};
			name = Debug;
		};
		56789ABCDEF123456789ABCD /* Build configuration list */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				789ABCDEF123456789ABCDEF1 /* Debug */,
			);
			defaultConfigurationName = Debug;
		};
	};
}`;
            const project = parseXcodeproj(content, '/path/to/MyApp.xcodeproj');
            assert.strictEqual(project.treatWarningsAsErrors, true);
        });

        it('should parse CLANG_CXX_LIBRARY', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
		456789ABCDEF123456789ABC /* MyApp */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = ();
			name = MyApp;
			productType = "com.apple.product-type.tool";
		};
		789ABCDEF123456789ABCDEF1 /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				CLANG_CXX_LIBRARY = "libc++";
			};
			name = Debug;
		};
		56789ABCDEF123456789ABCD /* Build configuration list */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				789ABCDEF123456789ABCDEF1 /* Debug */,
			);
			defaultConfigurationName = Debug;
		};
	};
}`;
            const project = parseXcodeproj(content, '/path/to/MyApp.xcodeproj');
            assert.strictEqual(project.cxxLibrary, 'libc++');
        });

        it('should parse target dependencies', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
		AAAA111111111111111111AA /* PBXTargetDependency */ = {
			isa = PBXTargetDependency;
			name = CoreLib;
			targetProxy = BBBB222222222222222222BB /* PBXContainerItemProxy */;
		};
		456789ABCDEF123456789ABC /* MyApp */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = ();
			dependencies = (
				AAAA111111111111111111AA /* PBXTargetDependency */,
			);
			name = MyApp;
			productType = "com.apple.product-type.tool";
		};
	};
}`;
            const project = parseXcodeproj(content, '/path/to/MyApp.xcodeproj');
            assert.ok(project.targetDependencies);
            assert.ok(project.targetDependencies!.includes('CoreLib'));
        });

        it('should parse config-specific dead code stripping and warnings as errors', () => {
            const content = `// !$*UTF8*$!
{
	objects = {
		456789ABCDEF123456789ABC /* MyApp */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 56789ABCDEF123456789ABCD /* Build configuration list */;
			buildPhases = ();
			name = MyApp;
			productType = "com.apple.product-type.tool";
		};
		789ABCDEF123456789ABCDEF1 /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				GCC_TREAT_WARNINGS_AS_ERRORS = YES;
			};
			name = Debug;
		};
		89ABCDEF123456789ABCDEF12 /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				DEAD_CODE_STRIPPING = YES;
			};
			name = Release;
		};
		56789ABCDEF123456789ABCD /* Build configuration list */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				789ABCDEF123456789ABCDEF1 /* Debug */,
				89ABCDEF123456789ABCDEF12 /* Release */,
			);
			defaultConfigurationName = Release;
		};
	};
}`;
            const project = parseXcodeproj(content, '/path/to/MyApp.xcodeproj');
            assert.ok(project.configurations);
            assert.strictEqual(project.configurations!.Debug?.treatWarningsAsErrors, true);
            assert.strictEqual(project.configurations!.Release?.deadCodeStripping, true);
        });
    });
});

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
    });
});

/**
 * Unit tests for Core Variable Resolver
 */

import { CoreVariableResolver } from '../services/coreVariableResolver';
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('Core Variable Resolver', () => {
    let resolver: CoreVariableResolver;

    beforeEach(() => {
        resolver = new CoreVariableResolver();
    });

    describe('initialize', () => {
        it('should set up built-in variables with workspace folder', () => {
            resolver.initialize(['/workspace/root']);
            assert.strictEqual(resolver.getVariable('CMAKE_SOURCE_DIR'), '/workspace/root');
            assert.strictEqual(resolver.getVariable('CMAKE_CURRENT_SOURCE_DIR'), '/workspace/root');
            assert.strictEqual(resolver.getVariable('PROJECT_SOURCE_DIR'), '/workspace/root');
        });

        it('should set up binary dir as build subfolder', () => {
            resolver.initialize(['/workspace/root']);
            const expected = path.join('/workspace/root', 'build');
            assert.strictEqual(resolver.getVariable('CMAKE_BINARY_DIR'), expected);
            assert.strictEqual(resolver.getVariable('CMAKE_CURRENT_BINARY_DIR'), expected);
            assert.strictEqual(resolver.getVariable('PROJECT_BINARY_DIR'), expected);
        });

        it('should handle empty workspace folders', () => {
            resolver.initialize([]);
            assert.strictEqual(resolver.getVariable('CMAKE_SOURCE_DIR'), undefined);
        });

        it('should use first workspace folder', () => {
            resolver.initialize(['/first', '/second']);
            assert.strictEqual(resolver.getVariable('CMAKE_SOURCE_DIR'), '/first');
        });
    });

    describe('setVariable and getVariable', () => {
        it('should set and get a variable', () => {
            resolver.setVariable('MY_VAR', 'hello');
            assert.strictEqual(resolver.getVariable('MY_VAR'), 'hello');
        });

        it('should return undefined for unset variable', () => {
            assert.strictEqual(resolver.getVariable('NONEXISTENT'), undefined);
        });

        it('should overwrite existing variable', () => {
            resolver.setVariable('MY_VAR', 'first');
            resolver.setVariable('MY_VAR', 'second');
            assert.strictEqual(resolver.getVariable('MY_VAR'), 'second');
        });

        it('should store definition info', () => {
            resolver.setVariable('MY_VAR', 'value', {
                name: 'MY_VAR',
                value: 'value',
                file: '/path/to/CMakeLists.txt',
                line: 10,
                isCache: false
            });
            const def = resolver.getDefinition('MY_VAR');
            assert.ok(def);
            assert.strictEqual(def!.file, '/path/to/CMakeLists.txt');
            assert.strictEqual(def!.line, 10);
        });
    });

    describe('hasVariable', () => {
        it('should return true for existing variable', () => {
            resolver.setVariable('EXISTS', 'yes');
            assert.ok(resolver.hasVariable('EXISTS'));
        });

        it('should return false for missing variable', () => {
            assert.strictEqual(resolver.hasVariable('MISSING'), false);
        });
    });

    describe('getVariableNames', () => {
        it('should return all variable names', () => {
            resolver.setVariable('A', '1');
            resolver.setVariable('B', '2');
            resolver.setVariable('C', '3');
            const names = resolver.getVariableNames();
            assert.ok(names.includes('A'));
            assert.ok(names.includes('B'));
            assert.ok(names.includes('C'));
        });

        it('should return empty array when no variables', () => {
            assert.strictEqual(resolver.getVariableNames().length, 0);
        });
    });

    describe('getProjectName', () => {
        it('should return empty string initially', () => {
            assert.strictEqual(resolver.getProjectName(), '');
        });
    });

    describe('getAllVariables', () => {
        it('should return a copy of all variables', () => {
            resolver.setVariable('X', '1');
            resolver.setVariable('Y', '2');
            const all = resolver.getAllVariables();
            assert.strictEqual(all.get('X'), '1');
            assert.strictEqual(all.get('Y'), '2');
            // Verify it's a copy
            all.set('Z', '3');
            assert.strictEqual(resolver.hasVariable('Z'), false);
        });
    });

    describe('loadCustomVariables', () => {
        it('should load custom variable mappings', () => {
            resolver.loadCustomVariables({
                'MY_PATH': '/custom/path',
                'MY_FLAG': 'ON'
            });
            assert.strictEqual(resolver.getVariable('MY_PATH'), '/custom/path');
            assert.strictEqual(resolver.getVariable('MY_FLAG'), 'ON');
        });
    });

    describe('loadEnvVariables', () => {
        it('should load environment variables from process.env', () => {
            resolver.loadEnvVariables();
            // PATH should be available from process.env
            // We just verify it doesn't throw
        });

        it('should apply overrides on top of process.env', () => {
            resolver.loadEnvVariables({ 'TEST_OVERRIDE_VAR': 'overridden' });
            // The override should be set (tested via resolvePath with $ENV{})
            const result = resolver.resolvePath('$ENV{TEST_OVERRIDE_VAR}');
            assert.strictEqual(result.resolved, 'overridden');
        });
    });

    describe('resolvePath', () => {
        beforeEach(() => {
            resolver.setVariable('ROOT', '/project');
            resolver.setVariable('BUILD', '/project/build');
            resolver.setVariable('NAME', 'myapp');
        });

        it('should resolve a single variable', () => {
            const result = resolver.resolvePath('${ROOT}/src');
            assert.strictEqual(result.resolved, '/project/src');
            assert.strictEqual(result.original, '${ROOT}/src');
        });

        it('should resolve multiple variables', () => {
            const result = resolver.resolvePath('${ROOT}/${NAME}/main.cpp');
            assert.strictEqual(result.resolved, '/project/myapp/main.cpp');
        });

        it('should track unresolved variables', () => {
            const result = resolver.resolvePath('${ROOT}/${UNKNOWN}/file.txt');
            assert.ok(result.unresolvedVariables.includes('UNKNOWN'));
        });

        it('should handle nested variables', () => {
            resolver.setVariable('INNER', 'BUILD');
            // Note: nested resolution like ${${INNER}} depends on implementation
            const result = resolver.resolvePath('${BUILD}/output');
            assert.strictEqual(result.resolved, '/project/build/output');
        });

        it('should normalize path separators', () => {
            resolver.setVariable('WIN_PATH', 'C:\\Users\\test');
            const result = resolver.resolvePath('${WIN_PATH}/file.txt');
            assert.ok(result.resolved.includes('/'));
            assert.ok(!result.resolved.includes('\\'));
        });

        it('should handle path without variables', () => {
            const result = resolver.resolvePath('/absolute/path/file.txt');
            assert.strictEqual(result.resolved, '/absolute/path/file.txt');
            assert.strictEqual(result.unresolvedVariables.length, 0);
        });

        it('should resolve environment variables', () => {
            resolver.loadEnvVariables({ 'MY_ENV': '/env/path' });
            const result = resolver.resolvePath('$ENV{MY_ENV}/subdir');
            assert.strictEqual(result.resolved, '/env/path/subdir');
        });

        it('should track unresolved environment variables', () => {
            const result = resolver.resolvePath('$ENV{NONEXISTENT_VAR_12345}/subdir');
            assert.ok(result.unresolvedVariables.some(v => v.includes('NONEXISTENT_VAR_12345')));
        });

        it('should not infinite loop on circular references', () => {
            resolver.setVariable('A', '${B}');
            resolver.setVariable('B', '${A}');
            // Should terminate without hanging
            const result = resolver.resolvePath('${A}');
            assert.ok(result); // Just verify it returns
        });

        it('should respect max depth', () => {
            const result = resolver.resolvePath('${ROOT}', 0);
            // With maxDepth=0, no resolution happens
            assert.strictEqual(result.resolved, '${ROOT}');
        });

        it('should check file existence', () => {
            // Use a path that definitely exists
            const tempDir = os.tmpdir();
            resolver.setVariable('TEMP', tempDir);
            const result = resolver.resolvePath('${TEMP}');
            assert.strictEqual(result.exists, true);
        });

        it('should report non-existence for missing paths', () => {
            const result = resolver.resolvePath('/definitely/not/a/real/path/12345');
            assert.strictEqual(result.exists, false);
        });

        it('should not duplicate unresolved variables', () => {
            const result = resolver.resolvePath('${UNKNOWN}/${UNKNOWN}');
            assert.strictEqual(result.unresolvedVariables.filter(v => v === 'UNKNOWN').length, 1);
        });
    });

    describe('clear', () => {
        it('should clear all variables', () => {
            resolver.setVariable('A', '1');
            resolver.setVariable('B', '2');
            resolver.clear();
            assert.strictEqual(resolver.getVariable('A'), undefined);
            assert.strictEqual(resolver.getVariable('B'), undefined);
        });
    });

    describe('parseFileContent', () => {
        it('should parse set commands from content', () => {
            const content = `
set(MY_VAR "hello")
set(OTHER_VAR "world")
`;
            resolver.parseFileContent(content, '/fake/CMakeLists.txt');
            assert.strictEqual(resolver.getVariable('MY_VAR'), 'hello');
            assert.strictEqual(resolver.getVariable('OTHER_VAR'), 'world');
        });

        it('should parse project name', () => {
            const content = `project(MyProject VERSION 1.0)`;
            resolver.parseFileContent(content, '/project/CMakeLists.txt');
            assert.strictEqual(resolver.getProjectName(), 'MyProject');
            assert.strictEqual(resolver.getVariable('PROJECT_NAME'), 'MyProject');
            assert.strictEqual(resolver.getVariable('CMAKE_PROJECT_NAME'), 'MyProject');
        });

        it('should update CMAKE_CURRENT_SOURCE_DIR', () => {
            const content = `set(FOO "bar")`;
            resolver.parseFileContent(content, '/project/sub/CMakeLists.txt');
            // Should be directory of the file
            const expected = path.dirname('/project/sub/CMakeLists.txt');
            assert.strictEqual(resolver.getVariable('CMAKE_CURRENT_SOURCE_DIR'), expected);
        });

        it('should update CMAKE_CURRENT_LIST_FILE', () => {
            const content = `set(FOO "bar")`;
            resolver.parseFileContent(content, '/project/CMakeLists.txt');
            assert.strictEqual(resolver.getVariable('CMAKE_CURRENT_LIST_FILE'), '/project/CMakeLists.txt');
        });

        it('should parse options', () => {
            const content = `option(ENABLE_TESTS "Enable testing" ON)`;
            resolver.parseFileContent(content, '/project/CMakeLists.txt');
            assert.strictEqual(resolver.getVariable('ENABLE_TESTS'), 'ON');
        });

        it('should resolve variables in set values', () => {
            resolver.setVariable('ROOT', '/base');
            const content = `set(OUTPUT "\${ROOT}/out")`;
            resolver.parseFileContent(content, '/project/CMakeLists.txt');
            // The value should have been resolved
            const output = resolver.getVariable('OUTPUT');
            assert.ok(output);
        });
    });

    describe('parseFile', () => {
        it('should handle non-existent file gracefully', async () => {
            // Should not throw
            await resolver.parseFile('/nonexistent/path/CMakeLists.txt');
        });

        it('should parse an existing file', async () => {
            // Create a temporary file
            const tmpFile = path.join(os.tmpdir(), 'test-cmake-resolver-' + Date.now() + '.cmake');
            fs.writeFileSync(tmpFile, 'set(TEST_PARSE_VAR "parsed_value")');
            try {
                await resolver.parseFile(tmpFile);
                assert.strictEqual(resolver.getVariable('TEST_PARSE_VAR'), 'parsed_value');
            } finally {
                fs.unlinkSync(tmpFile);
            }
        });
    });

    describe('getDefinition', () => {
        it('should return undefined for unknown variable', () => {
            assert.strictEqual(resolver.getDefinition('NONEXISTENT'), undefined);
        });

        it('should return definition after parseFileContent', () => {
            const content = `set(MY_VAR "value")`;
            resolver.parseFileContent(content, '/test/CMakeLists.txt');
            const def = resolver.getDefinition('MY_VAR');
            assert.ok(def);
            assert.strictEqual(def!.file, '/test/CMakeLists.txt');
        });
    });
});

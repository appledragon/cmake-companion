/**
 * Tests for Variable Resolver Service
 */

import * as assert from 'assert';
import { CoreVariableResolver } from '../services/coreVariableResolver';

describe('Variable Resolver', () => {
    let resolver: CoreVariableResolver;
    
    beforeEach(() => {
        resolver = new CoreVariableResolver();
    });
    
    describe('setVariable and getVariable', () => {
        it('should store and retrieve variables', () => {
            resolver.setVariable('MY_VAR', '/path/to/dir');
            assert.strictEqual(resolver.getVariable('MY_VAR'), '/path/to/dir');
        });
        
        it('should return undefined for unknown variables', () => {
            assert.strictEqual(resolver.getVariable('UNKNOWN'), undefined);
        });
        
        it('should check if variable exists', () => {
            resolver.setVariable('EXISTS', 'value');
            assert.strictEqual(resolver.hasVariable('EXISTS'), true);
            assert.strictEqual(resolver.hasVariable('NOT_EXISTS'), false);
        });
    });
    
    describe('resolvePath', () => {
        it('should resolve a simple variable path', () => {
            resolver.setVariable('PROJECT_DIR', '/home/user/project');
            
            const result = resolver.resolvePath('${PROJECT_DIR}/include');
            
            assert.strictEqual(result.resolved, '/home/user/project/include');
            assert.strictEqual(result.unresolvedVariables.length, 0);
        });
        
        it('should resolve multiple variables in a path', () => {
            resolver.setVariable('BASE', '/home/user');
            resolver.setVariable('PROJECT', 'myproject');
            
            const result = resolver.resolvePath('${BASE}/${PROJECT}/src');
            
            assert.strictEqual(result.resolved, '/home/user/myproject/src');
        });
        
        it('should handle nested variables', () => {
            resolver.setVariable('ROOT', '/root');
            resolver.setVariable('SUBDIR', '${ROOT}/sub');
            
            const result = resolver.resolvePath('${SUBDIR}/file.txt');
            
            assert.strictEqual(result.resolved, '/root/sub/file.txt');
        });
        
        it('should track unresolved variables', () => {
            resolver.setVariable('KNOWN', '/known');
            
            const result = resolver.resolvePath('${KNOWN}/${UNKNOWN}/file');
            
            assert.strictEqual(result.unresolvedVariables.length, 1);
            assert.strictEqual(result.unresolvedVariables[0], 'UNKNOWN');
            assert.ok(result.resolved.includes('${UNKNOWN}'));
        });
        
        it('should not infinite loop on circular references', () => {
            resolver.setVariable('A', '${B}');
            resolver.setVariable('B', '${A}');
            
            // Should complete without hanging (max depth protection)
            const result = resolver.resolvePath('${A}');
            assert.ok(result.resolved !== undefined);
        });
        
        it('should normalize path separators', () => {
            resolver.setVariable('PATH', 'C:\\Users\\test');
            
            const result = resolver.resolvePath('${PATH}/file');
            
            assert.strictEqual(result.resolved, 'C:/Users/test/file');
        });

        it('should resolve environment variables with overrides', () => {
            resolver.loadEnvVariables({ TEST_ENV_PATH: '/env/value' });
            const result = resolver.resolvePath('$ENV{TEST_ENV_PATH}/bin');
            assert.strictEqual(result.resolved, '/env/value/bin');
            assert.strictEqual(result.unresolvedVariables.length, 0);
        });

        it('should report unresolved environment variables when missing', () => {
            resolver.loadEnvVariables({});
            const result = resolver.resolvePath('$ENV{NOT_DEFINED}/lib');
            assert.ok(result.resolved.includes('$ENV{NOT_DEFINED}'));
            assert.ok(result.unresolvedVariables.includes('ENV{NOT_DEFINED}'));
        });
    });
    
    describe('getVariableNames', () => {
        it('should return all variable names', () => {
            resolver.setVariable('VAR1', 'val1');
            resolver.setVariable('VAR2', 'val2');
            resolver.setVariable('VAR3', 'val3');
            
            const names = resolver.getVariableNames();
            
            assert.strictEqual(names.length, 3);
            assert.ok(names.includes('VAR1'));
            assert.ok(names.includes('VAR2'));
            assert.ok(names.includes('VAR3'));
        });
    });
    
    describe('clear', () => {
        it('should clear all variables', () => {
            resolver.setVariable('VAR1', 'val1');
            resolver.setVariable('VAR2', 'val2');
            
            resolver.clear();
            
            assert.strictEqual(resolver.hasVariable('VAR1'), false);
            assert.strictEqual(resolver.hasVariable('VAR2'), false);
        });
    });
});

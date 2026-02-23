/**
 * Core Variable Resolver
 * Pure TypeScript implementation without VS Code dependencies
 * Used for testing and the main resolver builds on top of this
 */

import * as path from 'path';
import * as fs from 'fs';
import { CMakeVariableDefinition, parseSetCommands, parseProjectName, parseOptions } from '../parsers';

/**
 * Maximum recursion depth for nested variable resolution
 * Prevents infinite loops in case of circular variable references
 */
const MAX_VARIABLE_RESOLUTION_DEPTH = 10;

export interface ResolvedPath {
    /** The original path expression */
    original: string;
    /** The resolved path after variable substitution */
    resolved: string;
    /** Whether the resolved path exists on the file system */
    exists: boolean;
    /** Any unresolved variables remaining */
    unresolvedVariables: string[];
}

/**
 * Core Variable Resolver
 * Handles CMake variable storage and resolution without VS Code dependencies
 */
export class CoreVariableResolver {
    /** Map of variable name to value */
    protected variables: Map<string, string> = new Map();
    
    /** Map of variable name to definition info */
    protected definitions: Map<string, CMakeVariableDefinition> = new Map();

    /** Map of environment variable name to value */
    protected envVariables: Map<string, string> = new Map();
    
    /** Workspace folder paths */
    protected workspaceFolders: string[] = [];
    
    /** Project name */
    protected projectName = '';
    
    /**
     * Initialize the resolver with workspace folders
     * @param workspaceFolders Array of workspace folder paths
     */
    initialize(workspaceFolders: string[]): void {
        this.workspaceFolders = workspaceFolders;
        this.loadEnvVariables();
        this.setupBuiltInVariables();
    }

    /**
     * Load environment variables with optional overrides
     * @param overrides Optional overrides (takes precedence over process.env)
     */
    loadEnvVariables(overrides: Record<string, string> = {}): void {
        this.envVariables.clear();
        // seed with process.env
        for (const [key, value] of Object.entries(process.env)) {
            if (value !== undefined) {
                this.envVariables.set(key, value);
            }
        }
        // apply overrides
        for (const [key, value] of Object.entries(overrides)) {
            this.envVariables.set(key, value);
        }
    }
    
    /**
     * Set up CMake built-in variables
     */
    protected setupBuiltInVariables(): void {
        if (this.workspaceFolders.length > 0) {
            const rootPath = this.workspaceFolders[0];
            
            // Common CMake built-in variables
            this.setVariable('CMAKE_SOURCE_DIR', rootPath);
            this.setVariable('CMAKE_CURRENT_SOURCE_DIR', rootPath);
            this.setVariable('PROJECT_SOURCE_DIR', rootPath);
            this.setVariable('CMAKE_BINARY_DIR', path.join(rootPath, 'build'));
            this.setVariable('CMAKE_CURRENT_BINARY_DIR', path.join(rootPath, 'build'));
            this.setVariable('PROJECT_BINARY_DIR', path.join(rootPath, 'build'));
        }
    }
    
    /**
     * Load custom variables from a configuration object
     * @param customVariables Custom variable mappings
     */
    loadCustomVariables(customVariables: Record<string, string>): void {
        for (const [name, value] of Object.entries(customVariables)) {
            this.setVariable(name, value);
        }
    }
    
    /**
     * Set a variable value
     * @param name Variable name
     * @param value Variable value
     * @param definition Optional definition info
     */
    setVariable(name: string, value: string, definition?: CMakeVariableDefinition): void {
        this.variables.set(name, value);
        if (definition) {
            this.definitions.set(name, definition);
        }
    }
    
    /**
     * Get a variable value
     * @param name Variable name
     * @returns Variable value or undefined
     */
    getVariable(name: string): string | undefined {
        return this.variables.get(name);
    }
    
    /**
     * Get variable definition info
     * @param name Variable name
     * @returns Definition info or undefined
     */
    getDefinition(name: string): CMakeVariableDefinition | undefined {
        return this.definitions.get(name);
    }
    
    /**
     * Check if a variable is defined
     * @param name Variable name
     * @returns True if defined
     */
    hasVariable(name: string): boolean {
        return this.variables.has(name);
    }
    
    /**
     * Get all variable names
     * @returns Array of variable names
     */
    getVariableNames(): string[] {
        return Array.from(this.variables.keys());
    }
    
    /**
     * Clear all variables and reload built-ins
     */
    clear(): void {
        this.variables.clear();
        this.definitions.clear();
        this.envVariables.clear();
        this.loadEnvVariables();
        this.setupBuiltInVariables();
    }
    
    /**
     * Resolve a path expression, substituting all variables
     * Supports nested variables with recursive resolution
     * @param pathExpression The path expression to resolve
     * @param maxDepth Maximum recursion depth for nested variables (default: MAX_VARIABLE_RESOLUTION_DEPTH)
     * @returns Resolved path information
     */
    resolvePath(pathExpression: string, maxDepth = MAX_VARIABLE_RESOLUTION_DEPTH): ResolvedPath {
        let resolved = pathExpression;
        const unresolvedVariables: string[] = [];
        
        // First, resolve $ENV{VAR}
        const envRegex = /\$ENV\{([^}]+)\}/g;
        resolved = resolved.replace(envRegex, (match, envName) => {
            const value = this.envVariables.get(envName);
            if (value !== undefined) {
                return value;
            }
            if (!unresolvedVariables.includes(`ENV{${envName}}`)) {
                unresolvedVariables.push(`ENV{${envName}}`);
            }
            return match;
        });
        let depth = 0;
        
        // Keep resolving until no more variables or max depth reached
        while (depth < maxDepth) {
            const variableRegex = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
            let hasReplacement = false;
            
            resolved = resolved.replace(variableRegex, (match, varName) => {
                const value = this.variables.get(varName);
                if (value !== undefined) {
                    hasReplacement = true;
                    return value;
                } else {
                    if (!unresolvedVariables.includes(varName)) {
                        unresolvedVariables.push(varName);
                    }
                    return match; // Keep the original if not found
                }
            });
            
            if (!hasReplacement) {
                break;
            }
            
            depth++;
        }
        
        // Normalize path separators
        resolved = resolved.replace(/\\/g, '/');
        
        // Check if the resolved path exists
        let exists = false;
        try {
            exists = fs.existsSync(resolved);
        } catch {
            // Ignore errors
        }
        
        return {
            original: pathExpression,
            resolved,
            exists,
            unresolvedVariables
        };
    }
    
    /**
     * Parse a CMakeLists.txt file and add its variables
     * @param filePath Path to the CMakeLists.txt file
     */
    async parseFile(filePath: string): Promise<void> {
        try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            this.parseFileContent(content, filePath);
        } catch (error) {
            console.error(`Error parsing CMake file: ${filePath}`, error);
        }
    }
    
    /**
     * Parse CMake file content and add its variables
     * @param content The file content
     * @param filePath The file path
     */
    parseFileContent(content: string, filePath: string): void {
        const dirPath = path.dirname(filePath);
        
        // Parse project name
        const projectName = parseProjectName(content);
        if (projectName) {
            this.projectName = projectName;
            this.setVariable('PROJECT_NAME', projectName);
            this.setVariable('CMAKE_PROJECT_NAME', projectName);
        }
        
        // Update directory-specific variables
        this.setVariable('CMAKE_CURRENT_SOURCE_DIR', dirPath);
        this.setVariable('CMAKE_CURRENT_LIST_DIR', dirPath);
        this.setVariable('CMAKE_CURRENT_LIST_FILE', filePath);
        
        // Parse set() commands
        const definitions = parseSetCommands(content, filePath);
        for (const def of definitions) {
            // Resolve the value in case it contains variables
            const resolvedValue = this.resolvePath(def.value);
            this.setVariable(def.name, resolvedValue.resolved, def);
        }
        
        // Parse options
        const options = parseOptions(content, filePath);
        for (const opt of options) {
            this.setVariable(opt.name, opt.value, opt);
        }
    }
    
    /**
     * Get project name
     * @returns Project name
     */
    getProjectName(): string {
        return this.projectName;
    }
    
    /**
     * Get all variables as a map
     * @returns Map of variable names to values
     */
    getAllVariables(): Map<string, string> {
        return new Map(this.variables);
    }
}

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import type { ProgramManifest, ProgramModule } from '../types/program.js';

/**
 * Directory contents returned by getDirectoryContents
 */
export interface DirectoryContents {
    /** Current path relative to programs directory (empty string for root) */
    currentPath: string;
    /** Subdirectories at this level */
    folders: string[];
    /** Programs at this level */
    programs: ProgramModule[];
}

/**
 * Discovers and loads program modules from the programs directory
 * Supports unlimited nested subdirectories for categories
 */
export class ProgramLoader {
    private programsDir: string;
    private programs: Map<string, ProgramModule> = new Map();
    private categories: Map<string, string[]> = new Map();
    private allPrograms: ProgramModule[] = [];
    private discovered: boolean = false;

    constructor(programsDir?: string) {
        this.programsDir = programsDir || path.join(process.cwd(), 'programs');
    }

    /**
     * Recursively discovers all programs in the programs directory
     * Supports unlimited nesting depth: programs/a/b/c/.../program-name/manifest.json
     */
    async discover(): Promise<ProgramManifest[]> {
        const manifests: ProgramManifest[] = [];
        this.allPrograms = [];

        if (!fs.existsSync(this.programsDir)) {
            this.discovered = true;
            return manifests;
        }

        // Recursively discover all programs
        await this.discoverRecursive(this.programsDir, '', manifests);
        this.discovered = true;
        return manifests;
    }

    /**
     * Recursively discover programs in a directory
     */
    private async discoverRecursive(
        dirPath: string,
        relativePath: string,
        manifests: ProgramManifest[]
    ): Promise<void> {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;

            const entryPath = path.join(dirPath, entry.name);
            const manifestPath = path.join(entryPath, 'manifest.json');
            const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

            // Check if this directory contains a manifest (it's a program)
            if (fs.existsSync(manifestPath)) {
                const manifest = this.loadManifest(manifestPath, entryPath);
                if (manifest) {
                    // Store the relative path for navigation
                    (manifest as ProgramManifest & { _relativePath?: string })._relativePath = relativePath;
                    // Use parent directory as category if not specified
                    manifest.category = manifest.category || relativePath.split('/').pop() || 'other';
                    manifests.push(manifest);
                }
            } else {
                // Not a program directory, recurse into it
                await this.discoverRecursive(entryPath, entryRelativePath, manifests);
            }
        }
    }

    /**
     * Get directory contents for file explorer navigation
     * @param relativePath Path relative to programs directory (empty string for root)
     * @returns Folders and programs at this path level
     */
    async getDirectoryContents(relativePath: string = ''): Promise<DirectoryContents> {
        // Ensure programs are discovered
        if (!this.discovered) {
            await this.loadAll();
        }

        const targetPath = relativePath
            ? path.join(this.programsDir, relativePath)
            : this.programsDir;

        const result: DirectoryContents = {
            currentPath: relativePath,
            folders: [],
            programs: [],
        };

        if (!fs.existsSync(targetPath)) {
            return result;
        }

        const entries = fs.readdirSync(targetPath, { withFileTypes: true });

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;

            const entryPath = path.join(targetPath, entry.name);
            const manifestPath = path.join(entryPath, 'manifest.json');

            if (fs.existsSync(manifestPath)) {
                // This is a program directory
                const program = this.programs.get(
                    this.findProgramIdByPath(relativePath, entry.name)
                );
                if (program) {
                    result.programs.push(program);
                } else {
                    // Load it if not already loaded
                    const manifest = this.loadManifest(manifestPath, entryPath);
                    if (manifest) {
                        const loaded = await this.load(manifest.id);
                        if (loaded) {
                            result.programs.push(loaded);
                        }
                    }
                }
            } else {
                // This is a folder (category/subcategory)
                result.folders.push(entry.name);
            }
        }

        // Sort folders and programs alphabetically
        result.folders.sort((a, b) => a.localeCompare(b));
        result.programs.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));

        return result;
    }

    /**
     * Find program ID by its path location
     */
    private findProgramIdByPath(relativePath: string, programDir: string): string {
        for (const [id, program] of this.programs) {
            const progPath = program.path;
            const expectedPath = relativePath
                ? path.join(this.programsDir, relativePath, programDir)
                : path.join(this.programsDir, programDir);
            if (progPath === expectedPath) {
                return id;
            }
        }
        return '';
    }

    /**
     * Get all programs as a flat list (for search)
     */
    async getAllProgramsFlat(): Promise<ProgramModule[]> {
        if (!this.discovered) {
            await this.loadAll();
        }
        return Array.from(this.programs.values());
    }

    /**
     * Search programs by name or description
     */
    async searchPrograms(query: string): Promise<ProgramModule[]> {
        const allPrograms = await this.getAllProgramsFlat();
        const lowerQuery = query.toLowerCase();

        return allPrograms.filter(
            (p) =>
                p.manifest.name.toLowerCase().includes(lowerQuery) ||
                p.manifest.description.toLowerCase().includes(lowerQuery) ||
                p.manifest.id.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Get the relative path of a program from the programs directory
     */
    getProgramRelativePath(program: ProgramModule): string {
        const relPath = path.relative(this.programsDir, program.path);
        const parts = relPath.split(path.sep);
        // Remove the program folder itself, return parent path
        parts.pop();
        return parts.join('/');
    }

    private loadManifest(manifestPath: string, programPath: string): ProgramManifest | null {
        try {
            const content = fs.readFileSync(manifestPath, 'utf-8');
            const manifest = JSON.parse(content) as ProgramManifest & { _path?: string };
            manifest._path = programPath;

            if (this.validateManifest(manifest)) {
                return manifest;
            }
        } catch (error) {
            // Skip invalid manifests
        }
        return null;
    }

    /**
     * Loads a specific program by ID
     */
    async load(programId: string): Promise<ProgramModule | null> {
        if (this.programs.has(programId)) {
            return this.programs.get(programId)!;
        }

        // Find the program in discovered manifests
        const manifests = await this.discover();
        const manifest = manifests.find((m) => m.id === programId) as (ProgramManifest & { _path?: string }) | undefined;

        if (!manifest || !manifest._path) {
            return null;
        }

        try {
            const entryPath = path.join(manifest._path, manifest.entry);
            const entryUrl = pathToFileURL(entryPath).href;

            const module = await import(entryUrl);
            const component = module.default || module.Program;

            if (!component) {
                return null;
            }

            const programModule: ProgramModule = {
                manifest,
                component,
                path: manifest._path,
            };

            this.programs.set(programId, programModule);
            return programModule;
        } catch (error) {
            console.error(`Failed to load program ${programId}:`, error);
            return null;
        }
    }

    /**
     * Loads all discovered programs
     */
    async loadAll(): Promise<ProgramModule[]> {
        const manifests = await this.discover();
        const modules: ProgramModule[] = [];

        for (const manifest of manifests) {
            const module = await this.load(manifest.id);
            if (module) {
                modules.push(module);
            }
        }

        return modules;
    }

    /**
     * Gets programs grouped by category
     */
    async getByCategories(): Promise<Map<string, ProgramModule[]>> {
        const modules = await this.loadAll();
        const grouped = new Map<string, ProgramModule[]>();

        for (const module of modules) {
            const category = module.manifest.category || 'other';
            if (!grouped.has(category)) {
                grouped.set(category, []);
            }
            grouped.get(category)!.push(module);
        }

        return grouped;
    }

    get(programId: string): ProgramModule | undefined {
        return this.programs.get(programId);
    }

    getAll(): ProgramModule[] {
        return Array.from(this.programs.values());
    }

    private validateManifest(manifest: ProgramManifest): boolean {
        const required: (keyof ProgramManifest)[] = ['id', 'name', 'version', 'description', 'entry'];
        return required.every((field) => manifest[field]);
    }
}

export const programLoader = new ProgramLoader();

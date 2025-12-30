import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import type { ProgramManifest, ProgramModule } from '../types/program.js';

/**
 * Discovers and loads program modules from the programs directory
 * Now supports nested subdirectories for categories
 */
export class ProgramLoader {
    private programsDir: string;
    private programs: Map<string, ProgramModule> = new Map();
    private categories: Map<string, string[]> = new Map();

    constructor(programsDir?: string) {
        this.programsDir = programsDir || path.join(process.cwd(), 'programs');
    }

    /**
     * Recursively discovers all programs in the programs directory
     * Supports: programs/category/program-name/manifest.json
     */
    async discover(): Promise<ProgramManifest[]> {
        const manifests: ProgramManifest[] = [];

        if (!fs.existsSync(this.programsDir)) {
            return manifests;
        }

        const topLevel = fs.readdirSync(this.programsDir, { withFileTypes: true });

        for (const entry of topLevel) {
            if (!entry.isDirectory()) continue;

            const categoryPath = path.join(this.programsDir, entry.name);
            const categoryManifest = path.join(categoryPath, 'manifest.json');

            // Check if this is a program directly in programs/ (legacy support)
            if (fs.existsSync(categoryManifest)) {
                const manifest = this.loadManifest(categoryManifest, categoryPath);
                if (manifest) {
                    manifest.category = manifest.category || 'other';
                    manifests.push(manifest);
                }
                continue;
            }

            // Otherwise, treat as a category directory
            const categoryName = entry.name;
            const subEntries = fs.readdirSync(categoryPath, { withFileTypes: true });

            for (const subEntry of subEntries) {
                if (!subEntry.isDirectory()) continue;

                const programPath = path.join(categoryPath, subEntry.name);
                const programManifest = path.join(programPath, 'manifest.json');

                if (fs.existsSync(programManifest)) {
                    const manifest = this.loadManifest(programManifest, programPath);
                    if (manifest) {
                        // Use directory name as category if not specified
                        manifest.category = manifest.category || categoryName;
                        manifests.push(manifest);

                        // Track category membership
                        if (!this.categories.has(categoryName)) {
                            this.categories.set(categoryName, []);
                        }
                        this.categories.get(categoryName)!.push(manifest.id);
                    }
                }
            }
        }

        return manifests;
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

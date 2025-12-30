import fs from 'fs';
import path from 'path';
import os from 'os';

const REGISTRY_PATH = path.join(os.homedir(), '.ashigaru-packages.json');

/**
 * Load the package registry
 */
export function loadRegistry() {
    if (!fs.existsSync(REGISTRY_PATH)) {
        return { packages: [] };
    }

    try {
        const content = fs.readFileSync(REGISTRY_PATH, 'utf-8');
        return JSON.parse(content);
    } catch {
        return { packages: [] };
    }
}

/**
 * Save the package registry
 */
export function saveRegistry(registry) {
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf-8');
}

/**
 * Add or update a package in the registry
 */
export function addPackage(info) {
    const registry = loadRegistry();

    // Check if package already exists
    const existingIndex = registry.packages.findIndex(p => p.id === info.id);

    const packageEntry = {
        id: info.id,
        name: info.name,
        version: info.version,
        source: info.source,
        sourceUrl: info.sourceUrl,
        installPath: info.installPath,
        installedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
        // Update existing
        registry.packages[existingIndex] = {
            ...registry.packages[existingIndex],
            ...packageEntry,
            updatedAt: new Date().toISOString()
        };
    } else {
        // Add new
        registry.packages.push(packageEntry);
    }

    saveRegistry(registry);
    return packageEntry;
}

/**
 * Remove a package from the registry
 */
export function removePackage(id) {
    const registry = loadRegistry();
    registry.packages = registry.packages.filter(p => p.id !== id);
    saveRegistry(registry);
}

/**
 * Get all installed packages
 */
export function getInstalledPackages() {
    const registry = loadRegistry();
    return registry.packages;
}

/**
 * Get a specific package by ID
 */
export function getPackage(id) {
    const registry = loadRegistry();
    return registry.packages.find(p => p.id === id);
}

/**
 * Check if a package is installed
 */
export function isPackageInstalled(id) {
    const pkg = getPackage(id);
    return !!pkg;
}

/**
 * Compare versions to check if update is available
 * Returns true if remoteVersion is newer than localVersion
 */
export function isNewerVersion(localVersion, remoteVersion) {
    const local = localVersion.replace(/^v/, '').split('.').map(Number);
    const remote = remoteVersion.replace(/^v/, '').split('.').map(Number);

    for (let i = 0; i < 3; i++) {
        const l = local[i] || 0;
        const r = remote[i] || 0;
        if (r > l) return true;
        if (r < l) return false;
    }

    return false;
}

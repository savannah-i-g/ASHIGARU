import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const TEMP_DIR = path.join(os.tmpdir(), 'ashigaru-packages');

/**
 * Download a file from URL with progress callback
 * Handles HTTP redirects
 */
export async function downloadFile(url, dest, onProgress) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;

        const request = (targetUrl) => {
            protocol.get(targetUrl, {
                headers: { 'User-Agent': 'ASHIGARU-PackageManager' }
            }, (res) => {
                // Handle redirects
                if (res.statusCode === 302 || res.statusCode === 301) {
                    return request(res.headers.location);
                }

                if (res.statusCode !== 200) {
                    reject(new Error(`Download failed: HTTP ${res.statusCode}`));
                    return;
                }

                const totalBytes = parseInt(res.headers['content-length'], 10) || 0;
                let downloadedBytes = 0;
                const fileStream = fs.createWriteStream(dest);

                res.on('data', (chunk) => {
                    downloadedBytes += chunk.length;
                    if (onProgress && totalBytes > 0) {
                        onProgress(downloadedBytes, totalBytes);
                    }
                });

                res.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close(() => resolve(dest));
                });

                fileStream.on('error', (err) => {
                    fs.unlink(dest, () => { });
                    reject(err);
                });

                res.on('error', (err) => {
                    fs.unlink(dest, () => { });
                    reject(err);
                });
            }).on('error', reject);
        };

        request(url);
    });
}

/**
 * Download to temp directory
 */
export async function downloadToTemp(url, filename, onProgress) {
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    const destPath = path.join(TEMP_DIR, filename);
    await downloadFile(url, destPath, onProgress);
    return destPath;
}

/**
 * Extract archive (tar.gz or zip) to destination
 * Preserves the full folder structure from the archive
 * Returns info about what was extracted
 */
export async function extractArchive(archivePath, destDir) {
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    const isTarGz = archivePath.endsWith('.tar.gz') || archivePath.endsWith('.tgz');
    const isZip = archivePath.endsWith('.zip');

    if (isTarGz) {
        // Extract tar.gz - first strip the GitHub wrapper, then preserve internal structure
        execSync(
            `tar -xzf "${archivePath}" -C "${destDir}" --strip-components=1`,
            { stdio: 'pipe' }
        );
    } else if (isZip) {
        // Extract zip
        execSync(
            `unzip -o "${archivePath}" -d "${destDir}"`,
            { stdio: 'pipe' }
        );

        // Handle wrapper directory for zip files (GitHub adds one)
        const entries = fs.readdirSync(destDir);
        if (entries.length === 1) {
            const wrapperDir = path.join(destDir, entries[0]);
            if (fs.statSync(wrapperDir).isDirectory()) {
                // Move contents up from wrapper
                const innerEntries = fs.readdirSync(wrapperDir);
                for (const entry of innerEntries) {
                    const src = path.join(wrapperDir, entry);
                    const dest = path.join(destDir, entry);
                    if (fs.existsSync(dest)) {
                        fs.rmSync(dest, { recursive: true, force: true });
                    }
                    fs.renameSync(src, dest);
                }
                fs.rmdirSync(wrapperDir);
            }
        }
    } else {
        throw new Error('Unsupported archive format. Use .tar.gz or .zip');
    }

    // Return the extracted structure info
    return analyzeExtractedStructure(destDir);
}

/**
 * Analyze extracted folder structure to find install path
 * Looks for the path containing manifest.json
 */
function analyzeExtractedStructure(extractDir) {
    // Check if manifest is at root level (flat package)
    if (fs.existsSync(path.join(extractDir, 'manifest.json'))) {
        return {
            type: 'flat',
            programPath: extractDir,
            relativePath: ''
        };
    }

    // Search for manifest.json in subdirectories
    const findManifest = (dir, relativePath = '') => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;

            const subDir = path.join(dir, entry.name);
            const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
            const manifestPath = path.join(subDir, 'manifest.json');

            if (fs.existsSync(manifestPath)) {
                return {
                    type: 'nested',
                    programPath: subDir,
                    relativePath: relPath
                };
            }

            // Recurse deeper
            const found = findManifest(subDir, relPath);
            if (found) return found;
        }

        return null;
    };

    return findManifest(extractDir);
}

/**
 * Get temp extraction directory
 */
export function getTempExtractDir() {
    const dir = path.join(TEMP_DIR, 'extract-' + Date.now());
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

/**
 * Clean up temp files
 */
export function cleanupTemp() {
    if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
}

/**
 * Copy directory recursively
 */
export function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

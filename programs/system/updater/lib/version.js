import fs from 'fs';
import path from 'path';

/**
 * Get current installed version from package.json
 * @returns {string} Semantic version string (e.g., "1.0.0")
 */
export function getCurrentVersion() {
  const packagePath = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return pkg.version;
}

/**
 * Compare two semantic versions
 * @param {string} v1 - First version (e.g., "1.0.0")
 * @param {string} v2 - Second version (e.g., "1.2.0")
 * @returns {number} -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return 1;
    if (parts1[i] < parts2[i]) return -1;
  }
  return 0;
}

/**
 * Check if an update is available
 * @param {string} current - Current version
 * @param {string} latest - Latest available version
 * @returns {boolean} True if update is available
 */
export function isUpdateAvailable(current, latest) {
  return compareVersions(current, latest) < 0;
}

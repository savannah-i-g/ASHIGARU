import fs from 'fs';
import path from 'path';

/**
 * Required fields in manifest.json
 */
const REQUIRED_FIELDS = ['id', 'name', 'version', 'description', 'entry'];

/**
 * Validate manifest.json structure
 */
export function validateManifest(manifestPath) {
    if (!fs.existsSync(manifestPath)) {
        return { valid: false, error: 'manifest.json not found' };
    }

    try {
        const content = fs.readFileSync(manifestPath, 'utf-8');
        const manifest = JSON.parse(content);

        const missing = REQUIRED_FIELDS.filter(field => !manifest[field]);

        if (missing.length > 0) {
            return {
                valid: false,
                error: `Missing required fields: ${missing.join(', ')}`
            };
        }

        // Validate id format (alphanumeric and hyphens)
        if (!/^[a-z0-9-]+$/.test(manifest.id)) {
            return {
                valid: false,
                error: 'Invalid id format. Use lowercase alphanumeric characters and hyphens only.'
            };
        }

        // Validate version format (semver-like)
        if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
            return {
                valid: false,
                error: 'Invalid version format. Use semantic versioning (e.g., 1.0.0)'
            };
        }

        return { valid: true, manifest };
    } catch (err) {
        return {
            valid: false,
            error: `Failed to parse manifest.json: ${err.message}`
        };
    }
}

/**
 * Validate entry file exists
 */
export function validateEntry(programPath, manifest) {
    const entryPath = path.join(programPath, manifest.entry);

    if (!fs.existsSync(entryPath)) {
        return {
            valid: false,
            error: `Entry file not found: ${manifest.entry}`
        };
    }

    // Check file extension
    const ext = path.extname(manifest.entry);
    if (!['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
        return {
            valid: false,
            error: `Invalid entry file extension: ${ext}. Must be .js, .jsx, .ts, or .tsx`
        };
    }

    return { valid: true };
}

/**
 * Basic syntax check - try to read and check for obvious errors
 */
export function checkSyntax(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Check for common syntax issues
        const openBraces = (content.match(/\{/g) || []).length;
        const closeBraces = (content.match(/\}/g) || []).length;

        if (openBraces !== closeBraces) {
            return {
                valid: false,
                error: 'Unbalanced braces detected'
            };
        }

        const openParens = (content.match(/\(/g) || []).length;
        const closeParens = (content.match(/\)/g) || []).length;

        if (openParens !== closeParens) {
            return {
                valid: false,
                error: 'Unbalanced parentheses detected'
            };
        }

        // Check for export default or named export
        if (!content.includes('export default') && !content.includes('export {')) {
            return {
                valid: false,
                error: 'No exports found. Program must export a default React component.'
            };
        }

        return { valid: true };
    } catch (err) {
        return {
            valid: false,
            error: `Failed to read file: ${err.message}`
        };
    }
}

/**
 * Full validation of a program package
 */
export function validatePackage(programPath) {
    const manifestPath = path.join(programPath, 'manifest.json');

    // Validate manifest
    const manifestResult = validateManifest(manifestPath);
    if (!manifestResult.valid) {
        return manifestResult;
    }

    // Validate entry file
    const entryResult = validateEntry(programPath, manifestResult.manifest);
    if (!entryResult.valid) {
        return entryResult;
    }

    // Basic syntax check
    const entryPath = path.join(programPath, manifestResult.manifest.entry);
    const syntaxResult = checkSyntax(entryPath);
    if (!syntaxResult.valid) {
        return syntaxResult;
    }

    return {
        valid: true,
        manifest: manifestResult.manifest
    };
}

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Download release tarball to temporary location
 * @param {string} url - Tarball URL from GitHub
 * @param {function} onProgress - Progress callback (bytesDownloaded, totalBytes)
 * @returns {Promise<string>} Path to downloaded file
 */
export async function downloadRelease(url, onProgress) {
  const { downloadFile } = await import('./github.js');

  const tmpDir = path.join(os.tmpdir(), 'ashigaru-update');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const tarballPath = path.join(tmpDir, 'release.tar.gz');

  await downloadFile(url, tarballPath, onProgress);

  return tarballPath;
}

/**
 * Extract release tarball to installation directory
 * Preserves .env file
 * @param {string} tarballPath - Path to the downloaded tarball
 * @returns {Promise<void>}
 */
export async function extractRelease(tarballPath) {
  const installDir = process.cwd();
  const tmpExtract = path.join(os.tmpdir(), 'ashigaru-extract');

  // Clean and create extraction directory
  if (fs.existsSync(tmpExtract)) {
    fs.rmSync(tmpExtract, { recursive: true, force: true });
  }
  fs.mkdirSync(tmpExtract, { recursive: true });

  // Extract to temporary location
  // --strip-components=1 removes the GitHub wrapper directory
  execSync(
    `tar -xzf "${tarballPath}" -C "${tmpExtract}" --strip-components=1`,
    { stdio: 'pipe' }
  );

  // Backup .env file if it exists
  const envPath = path.join(installDir, '.env');
  const envBackup = path.join(os.tmpdir(), '.env.backup.ashigaru');
  if (fs.existsSync(envPath)) {
    fs.copyFileSync(envPath, envBackup);
  }

  // Get list of files to copy (exclude node_modules, dist, .env, .git)
  const filesToCopy = fs.readdirSync(tmpExtract)
    .filter(f => !['node_modules', 'dist', '.env', '.git'].includes(f));

  // Copy extracted files to installation directory
  filesToCopy.forEach(file => {
    const src = path.join(tmpExtract, file);
    const dest = path.join(installDir, file);

    // Remove existing file/directory
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true });
    }

    // Copy new file/directory
    if (fs.statSync(src).isDirectory()) {
      fs.cpSync(src, dest, { recursive: true });
    } else {
      fs.copyFileSync(src, dest);
    }
  });

  // Restore .env file
  if (fs.existsSync(envBackup)) {
    fs.copyFileSync(envBackup, envPath);
    fs.unlinkSync(envBackup);
  }

  // Clean up temp extraction directory
  fs.rmSync(tmpExtract, { recursive: true, force: true });
}

/**
 * Run npm install with streaming output
 * @param {function} onOutput - Output line callback
 * @returns {Promise<void>}
 */
export function runNpmInstall(onOutput) {
  return new Promise((resolve, reject) => {
    const proc = spawn('npm', ['install'], {
      cwd: process.cwd(),
      env: process.env,
      shell: true
    });

    proc.stdout.on('data', data => {
      data.toString().split('\n').forEach(line => {
        if (line.trim()) onOutput(line.trim());
      });
    });

    proc.stderr.on('data', data => {
      data.toString().split('\n').forEach(line => {
        if (line.trim()) onOutput(line.trim());
      });
    });

    proc.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm install failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * Run npm build with streaming output
 * @param {function} onOutput - Output line callback
 * @returns {Promise<void>}
 */
export function runNpmBuild(onOutput) {
  return new Promise((resolve, reject) => {
    const proc = spawn('npm', ['run', 'build'], {
      cwd: process.cwd(),
      env: process.env,
      shell: true
    });

    proc.stdout.on('data', data => {
      data.toString().split('\n').forEach(line => {
        if (line.trim()) onOutput(line.trim());
      });
    });

    proc.stderr.on('data', data => {
      data.toString().split('\n').forEach(line => {
        if (line.trim()) onOutput(line.trim());
      });
    });

    proc.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm build failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * Clean up temporary download files
 */
export function cleanupDownloads() {
  const tmpDir = path.join(os.tmpdir(), 'ashigaru-update');
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

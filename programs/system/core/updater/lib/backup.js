import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Create a backup of the current installation
 * @param {string} currentVersion - Current version for naming the backup
 * @returns {Promise<string>} Path to the backup file
 */
export async function createBackup(currentVersion) {
  const backupDir = path.join(os.homedir(), '.ashigaru-backups');

  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `ashigaru-backup-${currentVersion}-${timestamp}.tar.gz`;
  const backupPath = path.join(backupDir, backupName);

  const installDir = process.cwd();

  // Create tarball excluding node_modules and dist (will be rebuilt)
  execSync(
    `tar -czf "${backupPath}" --exclude='node_modules' --exclude='dist' --exclude='.git' -C "${installDir}" .`,
    { stdio: 'pipe' }
  );

  return backupPath;
}

/**
 * Restore from a backup
 * @param {string} backupPath - Path to the backup tarball
 * @returns {Promise<void>}
 */
export async function restoreBackup(backupPath) {
  const installDir = process.cwd();
  const envBackup = path.join(os.tmpdir(), '.env.backup.ashigaru');

  // Backup .env file if it exists
  const envPath = path.join(installDir, '.env');
  if (fs.existsSync(envPath)) {
    fs.copyFileSync(envPath, envBackup);
  }

  // Extract backup (this will overwrite current files)
  execSync(
    `tar -xzf "${backupPath}" -C "${installDir}"`,
    { stdio: 'pipe' }
  );

  // Restore .env file
  if (fs.existsSync(envBackup)) {
    fs.copyFileSync(envBackup, envPath);
    fs.unlinkSync(envBackup);
  }
}

/**
 * Clean old backups, keeping only the last 3
 */
export function cleanOldBackups() {
  const backupDir = path.join(os.homedir(), '.ashigaru-backups');

  if (!fs.existsSync(backupDir)) {
    return;
  }

  const backups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('ashigaru-backup-') && f.endsWith('.tar.gz'))
    .map(f => ({
      name: f,
      path: path.join(backupDir, f),
      mtime: fs.statSync(path.join(backupDir, f)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime);

  // Delete all but the 3 most recent
  backups.slice(3).forEach(backup => {
    try {
      fs.unlinkSync(backup.path);
    } catch (err) {
      // Ignore errors when cleaning up
    }
  });
}

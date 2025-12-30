import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Badge } from '@inkjs/ui';
import Spinner from 'ink-spinner';
import os from 'os';
import fs from 'fs';
import path from 'path';

import { getLatestRelease } from './lib/github.js';
import { getCurrentVersion, isUpdateAvailable } from './lib/version.js';
import { createBackup, restoreBackup, cleanOldBackups } from './lib/backup.js';
import { downloadRelease, extractRelease, runNpmInstall, runNpmBuild, cleanupDownloads } from './lib/install.js';

const h = React.createElement;

// State constants
const STATES = {
  IDLE: 'idle',
  CHECKING: 'checking',
  UPDATE_AVAILABLE: 'available',
  UP_TO_DATE: 'up_to_date',
  DOWNLOADING: 'downloading',
  BACKING_UP: 'backing_up',
  EXTRACTING: 'extracting',
  INSTALLING: 'installing',
  BUILDING: 'building',
  COMPLETE: 'complete',
  ERROR: 'error',
  ROLLING_BACK: 'rolling_back'
};

// Theme loading (reuse pattern from other programs)
const loadTheme = () => {
  try {
    const p = path.join(os.homedir(), '.cypher-tui-settings.json');
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8')).theme || 'Cyberpunk';
    }
  } catch { }
  return 'Cyberpunk';
};

const getThemeColors = (t) => ({
  Cyberpunk: {
    accent: '#00ffff',
    secondary: '#ff00ff',
    good: '#00ff88',
    warn: '#ffaa00',
    bad: '#ff4444'
  },
  Mono: {
    accent: '#ffffff',
    secondary: '#888888',
    good: '#ffffff',
    warn: '#aaaaaa',
    bad: '#666666'
  },
  Matrix: {
    accent: '#00ff00',
    secondary: '#88ff00',
    good: '#00ff00',
    warn: '#88ff00',
    bad: '#ff0000'
  },
  Amber: {
    accent: '#ffaa00',
    secondary: '#ff6600',
    good: '#ffcc00',
    warn: '#ff8800',
    bad: '#ff4400'
  },
}[t] || {
  accent: '#00ffff',
  secondary: '#ff00ff',
  good: '#00ff88',
  warn: '#ffaa00',
  bad: '#ff4444'
});

const Program = ({ isFocused, onClose }) => {
  const colors = getThemeColors(loadTheme());

  const [state, setState] = useState(STATES.IDLE);
  const [currentVersion, setCurrentVersion] = useState('');
  const [latestVersion, setLatestVersion] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [outputLines, setOutputLines] = useState([]);
  const [backupPath, setBackupPath] = useState('');

  // Auto-check on mount
  useEffect(() => {
    checkForUpdates();
  }, []);

  // Keyboard controls
  useInput((input, key) => {
    if (!isFocused) return;

    if (key.escape) {
      onClose();
      return;
    }

    if (state === STATES.UPDATE_AVAILABLE && key.return) {
      startUpdate();
    }

    if (state === STATES.ERROR && input === 'r' && backupPath) {
      attemptRollback();
    }

    if ((state === STATES.COMPLETE || state === STATES.UP_TO_DATE) && input === 'c') {
      checkForUpdates();
    }
  }, { isActive: isFocused });

  const checkForUpdates = async () => {
    setState(STATES.CHECKING);
    setError('');

    try {
      const current = getCurrentVersion();
      setCurrentVersion(current);

      const release = await getLatestRelease();
      setLatestVersion(release.version);
      setReleaseNotes(release.notes);

      if (isUpdateAvailable(current, release.version)) {
        setState(STATES.UPDATE_AVAILABLE);
      } else {
        setState(STATES.UP_TO_DATE);
      }
    } catch (err) {
      setError(`Failed to check for updates: ${err.message}`);
      setState(STATES.ERROR);
    }
  };

  const startUpdate = async () => {
    try {
      // Step 1: Download
      setState(STATES.DOWNLOADING);
      setProgress(0);
      const release = await getLatestRelease();
      const tarballPath = await downloadRelease(release.tarballUrl, (downloaded, total) => {
        setProgress(Math.round((downloaded / total) * 100));
      });

      // Step 2: Backup
      setState(STATES.BACKING_UP);
      setProgress(0);
      const backup = await createBackup(currentVersion);
      setBackupPath(backup);

      // Step 3: Extract
      setState(STATES.EXTRACTING);
      await extractRelease(tarballPath);

      // Step 4: Install dependencies
      setState(STATES.INSTALLING);
      setOutputLines([]);
      await runNpmInstall((line) => {
        setOutputLines(prev => [...prev.slice(-20), line]);
      });

      // Step 5: Build
      setState(STATES.BUILDING);
      setOutputLines([]);
      await runNpmBuild((line) => {
        setOutputLines(prev => [...prev.slice(-20), line]);
      });

      // Cleanup
      cleanupDownloads();
      cleanOldBackups();

      setState(STATES.COMPLETE);
    } catch (err) {
      setError(err.message);
      setState(STATES.ERROR);
    }
  };

  const attemptRollback = async () => {
    if (!backupPath) {
      setError('No backup available for rollback');
      return;
    }

    setState(STATES.ROLLING_BACK);
    try {
      await restoreBackup(backupPath);

      // Reinstall dependencies
      setState(STATES.INSTALLING);
      setOutputLines([]);
      await runNpmInstall((line) => {
        setOutputLines(prev => [...prev.slice(-20), line]);
      });

      setState(STATES.BUILDING);
      await runNpmBuild((line) => {
        setOutputLines(prev => [...prev.slice(-20), line]);
      });

      setError('Rollback completed. Application restored to previous version.');
      setState(STATES.ERROR);
    } catch (err) {
      setError(`Rollback failed: ${err.message}`);
      setState(STATES.ERROR);
    }
  };

  const borderColor = isFocused ? colors.accent : '#333333';

  return h(Box, { flexDirection: 'column', borderStyle: 'single', borderColor, flexGrow: 1 },
    // Header
    h(Box, {
      paddingX: 1, justifyContent: 'space-between',
      borderStyle: 'single', borderColor: '#333333',
      borderTop: false, borderLeft: false, borderRight: false,
    },
      h(Text, { color: colors.accent, bold: true }, 'ASHIGARU UPDATER'),
      h(Box, { gap: 1 },
        currentVersion && h(Badge, { color: 'cyan' }, currentVersion),
        latestVersion && currentVersion && h(Text, { color: '#555555' }, '→'),
        latestVersion && h(Badge, { color: 'green' }, latestVersion)
      )
    ),

    // Content area
    h(Box, { flexDirection: 'column', paddingX: 1, paddingY: 1, flexGrow: 1 },
      // State: CHECKING
      state === STATES.CHECKING && h(Box, { gap: 1 },
        h(Spinner, { type: 'dots' }),
        h(Text, null, 'Checking for updates...')
      ),

      // State: UPDATE_AVAILABLE
      state === STATES.UPDATE_AVAILABLE && h(Box, { flexDirection: 'column' }, [
        h(Text, { key: 'title', color: colors.good, bold: true },
          `Update Available: ${latestVersion}`),
        h(Text, { key: 'space1' }, ''),
        h(Text, { key: 'current', color: '#555555' },
          `Current version: ${currentVersion}`),
        h(Text, { key: 'space2' }, ''),
        h(Text, { key: 'notes-title', color: colors.accent }, 'Release Notes:'),
        h(Box, { key: 'notes', flexDirection: 'column', paddingLeft: 2 },
          ...releaseNotes.split('\n').slice(0, 10).map((line, i) =>
            h(Text, { key: i, color: '#cccccc' }, line)
          )
        ),
      ]),

      // State: UP_TO_DATE
      state === STATES.UP_TO_DATE && h(Box, { flexDirection: 'column' },
        h(Text, { color: colors.good }, '✓ You are running the latest version'),
        h(Text, { color: '#555555' }, `Version ${currentVersion}`)
      ),

      // State: DOWNLOADING
      state === STATES.DOWNLOADING && h(Box, { flexDirection: 'column', gap: 1 },
        h(Box, { gap: 1 },
          h(Spinner, { type: 'dots' }),
          h(Text, null, `Downloading release... ${progress}%`)
        ),
        h(Box, null,
          h(Text, { color: colors.accent }, '█'.repeat(Math.floor(progress / 2))),
          h(Text, { color: '#333333' }, '░'.repeat(50 - Math.floor(progress / 2)))
        )
      ),

      // State: BACKING_UP
      state === STATES.BACKING_UP && h(Box, { gap: 1 },
        h(Spinner, { type: 'dots' }),
        h(Text, null, 'Creating backup...')
      ),

      // State: EXTRACTING
      state === STATES.EXTRACTING && h(Box, { gap: 1 },
        h(Spinner, { type: 'dots' }),
        h(Text, null, 'Extracting files...')
      ),

      // State: INSTALLING or BUILDING
      (state === STATES.INSTALLING || state === STATES.BUILDING) && h(Box, { flexDirection: 'column' },
        h(Box, { gap: 1, marginBottom: 1 },
          h(Spinner, { type: 'dots' }),
          h(Text, null, state === STATES.INSTALLING ? 'Installing dependencies...' : 'Building application...')
        ),
        h(Box, { flexDirection: 'column', height: 15 },
          ...outputLines.slice(-15).map((line, i) =>
            h(Text, { key: i, color: '#888888' }, line.slice(0, 80))
          )
        )
      ),

      // State: COMPLETE
      state === STATES.COMPLETE && h(Box, { flexDirection: 'column', gap: 1 },
        h(Text, { color: colors.good, bold: true }, '✓ Update completed successfully!'),
        h(Text, { color: '#cccccc' }, `ASHIGARU has been updated to version ${latestVersion}`),
        h(Text, null, ''),
        h(Text, { color: colors.warn }, 'Please restart the application to use the new version:'),
        h(Box, { paddingLeft: 2, flexDirection: 'column' },
          h(Text, { color: '#888888' }, '1. Close this program'),
          h(Text, { color: '#888888' }, '2. Exit ASHIGARU (if running)'),
          h(Text, { color: '#888888' }, '3. Restart ASHIGARU')
        )
      ),

      // State: ERROR
      state === STATES.ERROR && h(Box, { flexDirection: 'column', gap: 1 },
        h(Text, { color: colors.bad, bold: true }, '✗ Update failed'),
        h(Text, { color: '#cccccc' }, error),
        backupPath && h(Text, null, ''),
        backupPath && h(Text, { color: colors.warn }, 'Press R to rollback to previous version')
      ),

      // State: ROLLING_BACK
      state === STATES.ROLLING_BACK && h(Box, { gap: 1 },
        h(Spinner, { type: 'dots' }),
        h(Text, null, 'Rolling back to previous version...')
      )
    ),

    // Footer
    h(Box, {
      paddingX: 1, gap: 1,
      borderStyle: 'single', borderColor: '#333333',
      borderBottom: false, borderLeft: false, borderRight: false,
    },
      h(Badge, { color: 'red' }, 'ESC'),
      h(Text, { color: '#555555' }, 'close'),
      state === STATES.UPDATE_AVAILABLE && [
        h(Badge, { key: 'enter', color: 'green' }, 'ENTER'),
        h(Text, { key: 'enterl', color: '#555555' }, 'install')
      ],
      state === STATES.ERROR && backupPath && [
        h(Badge, { key: 'r', color: 'yellow' }, 'R'),
        h(Text, { key: 'rl', color: '#555555' }, 'rollback')
      ],
      (state === STATES.COMPLETE || state === STATES.UP_TO_DATE) && [
        h(Badge, { key: 'c', color: 'cyan' }, 'C'),
        h(Text, { key: 'cl', color: '#555555' }, 'check again')
      ]
    )
  );
};

export default Program;

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Badge } from '@inkjs/ui';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import os from 'os';
import fs from 'fs';
import path from 'path';

import { parseGitHubUrl, getLatestRelease } from './lib/github.js';
import { downloadToTemp, extractArchive, getTempExtractDir, cleanupTemp, copyDir } from './lib/download.js';
import { validatePackage } from './lib/verify.js';
import { addPackage, getInstalledPackages, getPackage, isNewerVersion } from './lib/registry.js';

const h = React.createElement;

// States
const STATES = {
    MENU: 'menu',
    INPUT_SOURCE: 'input_source',
    FETCHING: 'fetching',
    DOWNLOADING: 'downloading',
    EXTRACTING: 'extracting',
    VERIFYING: 'verifying',
    CONFLICT: 'conflict',  // New: destination exists
    INSTALLING: 'installing',
    COMPLETE: 'complete',
    ERROR: 'error',
    VIEW_INSTALLED: 'view_installed',
    CHECKING_UPDATES: 'checking_updates'
};

// Theme loading
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
    Cyberpunk: { accent: '#00ffff', secondary: '#ff00ff', good: '#00ff88', warn: '#ffaa00', bad: '#ff4444' },
    Mono: { accent: '#ffffff', secondary: '#888888', good: '#ffffff', warn: '#aaaaaa', bad: '#666666' },
    Matrix: { accent: '#00ff00', secondary: '#88ff00', good: '#00ff00', warn: '#88ff00', bad: '#ff0000' },
    Amber: { accent: '#ffaa00', secondary: '#ff6600', good: '#ffcc00', warn: '#ff8800', bad: '#ff4400' },
}[t] || { accent: '#00ffff', secondary: '#ff00ff', good: '#00ff88', warn: '#ffaa00', bad: '#ff4444' });

const PROGRAMS_DIR = path.join(process.cwd(), 'programs');

const Program = ({ isFocused, onClose }) => {
    const colors = getThemeColors(loadTheme());

    const [state, setState] = useState(STATES.MENU);
    const [sourceType, setSourceType] = useState('github'); // 'github' or 'url'
    const [inputValue, setInputValue] = useState('');
    const [releaseInfo, setReleaseInfo] = useState(null);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [installedPackages, setInstalledPackages] = useState([]);
    const [selectedInstalled, setSelectedInstalled] = useState(0);
    const [updateStatus, setUpdateStatus] = useState({});
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [menuIndex, setMenuIndex] = useState(0);
    const [conflictIndex, setConflictIndex] = useState(0);

    // Installation context
    const [extractInfo, setExtractInfo] = useState(null);
    const [installPath, setInstallPath] = useState('');
    const [manifestInfo, setManifestInfo] = useState(null);

    const menuItems = [
        { label: 'Install from GitHub', value: 'github' },
        { label: 'Install from URL', value: 'url' },
        { label: 'View Installed', value: 'installed' },
    ];

    const conflictOptions = [
        { label: 'Overwrite existing', value: 'overwrite' },
        { label: 'Cancel installation', value: 'cancel' },
    ];

    // Load installed packages
    useEffect(() => {
        setInstalledPackages(getInstalledPackages());
    }, [state]);

    // Keyboard handling for menu
    useInput((input, key) => {
        if (!isFocused) return;

        if (key.escape) {
            if (state === STATES.MENU) {
                onClose();
            } else if (state === STATES.COMPLETE || state === STATES.ERROR) {
                setState(STATES.MENU);
                setError('');
                setReleaseInfo(null);
                setProgress(0);
                setExtractInfo(null);
                setInstallPath('');
                setManifestInfo(null);
            } else if (state === STATES.VIEW_INSTALLED || state === STATES.CHECKING_UPDATES) {
                setState(STATES.MENU);
            } else if (state === STATES.CONFLICT) {
                setState(STATES.MENU);
                cleanupTemp();
            } else if (state !== STATES.DOWNLOADING && state !== STATES.EXTRACTING &&
                state !== STATES.INSTALLING && state !== STATES.FETCHING) {
                setState(STATES.MENU);
                setInputValue('');
            }
            return;
        }

        if (state === STATES.MENU) {
            if (key.upArrow) {
                setMenuIndex(i => i > 0 ? i - 1 : menuItems.length - 1);
                return;
            }
            if (key.downArrow) {
                setMenuIndex(i => i < menuItems.length - 1 ? i + 1 : 0);
                return;
            }
            if (key.return) {
                const selected = menuItems[menuIndex];
                if (selected.value === 'github') {
                    setSourceType('github');
                    setState(STATES.INPUT_SOURCE);
                    setIsInputFocused(true);
                } else if (selected.value === 'url') {
                    setSourceType('url');
                    setState(STATES.INPUT_SOURCE);
                    setIsInputFocused(true);
                } else if (selected.value === 'installed') {
                    setState(STATES.VIEW_INSTALLED);
                }
                return;
            }
        }

        if (state === STATES.INPUT_SOURCE && !isInputFocused) {
            if (key.return) {
                setIsInputFocused(true);
            }
        }

        if (state === STATES.VIEW_INSTALLED) {
            if (key.upArrow) {
                setSelectedInstalled(i => Math.max(0, i - 1));
                return;
            }
            if (key.downArrow) {
                setSelectedInstalled(i => Math.min(installedPackages.length - 1, i + 1));
                return;
            }
            if (input === 'u' && installedPackages.length > 0) {
                checkForUpdates(installedPackages[selectedInstalled]);
                return;
            }
        }

        if (state === STATES.CONFLICT) {
            if (key.upArrow || key.downArrow) {
                setConflictIndex(i => i === 0 ? 1 : 0);
                return;
            }
            if (key.return) {
                if (conflictOptions[conflictIndex].value === 'overwrite') {
                    finishInstall(true, extractInfo, installPath, manifestInfo);
                } else {
                    cleanupTemp();
                    setState(STATES.MENU);
                }
                return;
            }
        }

        if ((state === STATES.COMPLETE || state === STATES.ERROR) && input === 'r') {
            setState(STATES.MENU);
        }
    }, { isActive: isFocused });

    // Handle source input submission
    const handleSourceSubmit = async () => {
        setIsInputFocused(false);

        if (!inputValue.trim()) {
            setError('Please enter a valid URL or GitHub repo');
            setState(STATES.ERROR);
            return;
        }

        setState(STATES.FETCHING);

        try {
            if (sourceType === 'github') {
                const parsed = parseGitHubUrl(inputValue);
                if (!parsed) {
                    throw new Error('Invalid GitHub URL format');
                }

                const release = await getLatestRelease(parsed.owner, parsed.repo);
                setReleaseInfo({
                    ...release,
                    owner: parsed.owner,
                    repo: parsed.repo,
                    sourceUrl: inputValue
                });
                startDownload({
                    ...release,
                    owner: parsed.owner,
                    repo: parsed.repo,
                    sourceUrl: inputValue
                });
            } else {
                // Direct URL - check if valid archive
                if (!inputValue.endsWith('.tar.gz') && !inputValue.endsWith('.zip') && !inputValue.endsWith('.tgz')) {
                    throw new Error('URL must point to a .tar.gz or .zip file');
                }

                const info = {
                    downloadUrl: inputValue,
                    assetName: path.basename(inputValue),
                    sourceUrl: inputValue,
                    version: 'unknown',
                    name: path.basename(inputValue, path.extname(inputValue))
                };
                setReleaseInfo(info);
                startDownload(info);
            }
        } catch (err) {
            setError(err.message);
            setState(STATES.ERROR);
        }
    };

    const startDownload = async (info) => {
        try {
            // Download
            setState(STATES.DOWNLOADING);
            setProgress(0);

            const archivePath = await downloadToTemp(
                info.downloadUrl,
                info.assetName,
                (downloaded, total) => {
                    setProgress(Math.round((downloaded / total) * 100));
                }
            );

            // Extract
            setState(STATES.EXTRACTING);
            const extractDir = getTempExtractDir();
            const structureInfo = await extractArchive(archivePath, extractDir);
            setExtractInfo({ extractDir, structureInfo });

            // Verify - search for manifest in extracted structure
            setState(STATES.VERIFYING);

            if (!structureInfo) {
                throw new Error('No manifest.json found in package. Make sure the archive contains a valid program structure.');
            }

            const validation = validatePackage(structureInfo.programPath);

            if (!validation.valid) {
                throw new Error(`Validation failed: ${validation.error}`);
            }

            setManifestInfo(validation.manifest);

            // Determine install path based on extracted structure
            // If nested (e.g., games/pong), preserve that structure
            const destPath = structureInfo.relativePath
                ? path.join(PROGRAMS_DIR, structureInfo.relativePath)
                : path.join(PROGRAMS_DIR, validation.manifest.category || 'other', validation.manifest.id);

            setInstallPath(destPath);

            // Check if destination exists
            if (fs.existsSync(destPath)) {
                setState(STATES.CONFLICT);
                setConflictIndex(0);
            } else {
                finishInstall(false, { extractDir, structureInfo }, destPath, validation.manifest);
            }

        } catch (err) {
            setError(err.message);
            setState(STATES.ERROR);
            cleanupTemp();
        }
    };

    const finishInstall = async (overwrite, extractData, destPath, manifest) => {
        try {
            setState(STATES.INSTALLING);

            // Safety check
            if (!extractData || !extractData.structureInfo) {
                throw new Error('Installation data not available. Please try again.');
            }

            // Remove existing if overwriting
            if (overwrite && fs.existsSync(destPath)) {
                fs.rmSync(destPath, { recursive: true, force: true });
            }

            // Copy from extracted location to destination
            copyDir(extractData.structureInfo.programPath, destPath);

            // Register package
            const relPath = path.relative(PROGRAMS_DIR, destPath);
            addPackage({
                id: manifest.id,
                name: manifest.name,
                version: manifest.version,
                source: sourceType === 'github' ? `github:${releaseInfo.owner}/${releaseInfo.repo}` : 'url',
                sourceUrl: releaseInfo.sourceUrl,
                installPath: relPath
            });

            // Cleanup
            cleanupTemp();

            setState(STATES.COMPLETE);
            setReleaseInfo(prev => ({ ...prev, manifest: manifest, finalPath: relPath }));

        } catch (err) {
            setError(err.message);
            setState(STATES.ERROR);
            cleanupTemp();
        }
    };

    const checkForUpdates = async (pkg) => {
        setState(STATES.CHECKING_UPDATES);
        setUpdateStatus({});

        if (pkg.source && pkg.source.startsWith('github:')) {
            try {
                const [owner, repo] = pkg.source.replace('github:', '').split('/');
                const release = await getLatestRelease(owner, repo);
                const hasUpdate = isNewerVersion(pkg.version, release.version);

                setUpdateStatus({
                    package: pkg,
                    currentVersion: pkg.version,
                    latestVersion: release.version,
                    hasUpdate
                });
            } catch (err) {
                setUpdateStatus({
                    package: pkg,
                    error: err.message
                });
            }
        } else {
            setUpdateStatus({
                package: pkg,
                error: 'Package source does not support update checking'
            });
        }

        setState(STATES.VIEW_INSTALLED);
    };

    const borderColor = isFocused ? colors.accent : '#333333';

    // Render
    return h(Box, { flexDirection: 'column', borderStyle: 'single', borderColor, flexGrow: 1 },
        // Header
        h(Box, {
            paddingX: 1, justifyContent: 'space-between',
            borderStyle: 'single', borderColor: '#333333',
            borderTop: false, borderLeft: false, borderRight: false,
        },
            h(Text, { color: colors.accent, bold: true }, 'PACKAGE MANAGER'),
            h(Badge, { color: 'cyan' }, 'v1.0.0')
        ),

        // Content
        h(Box, { flexDirection: 'column', paddingX: 1, paddingY: 1, flexGrow: 1 },

            // State: MENU
            state === STATES.MENU && h(Box, { flexDirection: 'column' },
                h(Text, { color: colors.secondary, bold: true }, 'Select an action:'),
                h(Text, null, ''),
                ...menuItems.map((item, i) =>
                    h(Box, { key: item.value },
                        h(Text, { color: i === menuIndex ? colors.accent : '#666666' },
                            `${i === menuIndex ? '> ' : '  '}${item.label}`
                        )
                    )
                )
            ),

            // State: INPUT_SOURCE
            state === STATES.INPUT_SOURCE && h(Box, { flexDirection: 'column' },
                h(Text, { color: colors.secondary, bold: true },
                    sourceType === 'github' ? 'Enter GitHub repository:' : 'Enter download URL:'
                ),
                h(Text, { color: '#555555' },
                    sourceType === 'github'
                        ? 'Format: owner/repo or https://github.com/owner/repo'
                        : 'Must be a .tar.gz or .zip file'
                ),
                h(Text, null, ''),
                h(Box, null,
                    h(Text, { color: colors.accent }, '> '),
                    h(TextInput, {
                        value: inputValue,
                        onChange: setInputValue,
                        onSubmit: handleSourceSubmit,
                        focus: isInputFocused,
                        placeholder: sourceType === 'github' ? 'owner/repo' : 'https://...'
                    })
                )
            ),

            // State: FETCHING
            state === STATES.FETCHING && h(Box, { gap: 1 },
                h(Spinner, { type: 'dots' }),
                h(Text, null, 'Fetching release information...')
            ),

            // State: CONFLICT - destination already exists
            state === STATES.CONFLICT && h(Box, { flexDirection: 'column' },
                h(Text, { color: colors.warn, bold: true }, '⚠ Destination already exists'),
                h(Text, null, ''),
                h(Text, { color: '#888888' }, `Path: ${installPath}`),
                manifestInfo && h(Text, { color: '#888888' }, `Package: ${manifestInfo.name} v${manifestInfo.version}`),
                h(Text, null, ''),
                h(Text, { color: colors.secondary }, 'What would you like to do?'),
                h(Text, null, ''),
                ...conflictOptions.map((opt, i) =>
                    h(Box, { key: opt.value },
                        h(Text, { color: i === conflictIndex ? colors.accent : '#666666' },
                            `${i === conflictIndex ? '> ' : '  '}${opt.label}`
                        )
                    )
                )
            ),

            // State: DOWNLOADING
            state === STATES.DOWNLOADING && h(Box, { flexDirection: 'column', gap: 1 },
                h(Box, { gap: 1 },
                    h(Spinner, { type: 'dots' }),
                    h(Text, null, `Downloading... ${progress}%`)
                ),
                h(Box, null,
                    h(Text, { color: colors.accent }, '█'.repeat(Math.floor(progress / 2))),
                    h(Text, { color: '#333333' }, '░'.repeat(50 - Math.floor(progress / 2)))
                )
            ),

            // State: EXTRACTING
            state === STATES.EXTRACTING && h(Box, { gap: 1 },
                h(Spinner, { type: 'dots' }),
                h(Text, null, 'Extracting archive...')
            ),

            // State: VERIFYING
            state === STATES.VERIFYING && h(Box, { gap: 1 },
                h(Spinner, { type: 'dots' }),
                h(Text, null, 'Verifying package...')
            ),

            // State: INSTALLING
            state === STATES.INSTALLING && h(Box, { gap: 1 },
                h(Spinner, { type: 'dots' }),
                h(Text, null, 'Installing to programs directory...')
            ),

            // State: COMPLETE
            state === STATES.COMPLETE && h(Box, { flexDirection: 'column', gap: 1 },
                h(Text, { color: colors.good, bold: true }, '✓ Package installed successfully!'),
                releaseInfo && releaseInfo.manifest && h(Box, { flexDirection: 'column', paddingLeft: 2 },
                    h(Text, { color: '#cccccc' }, `Name: ${releaseInfo.manifest.name}`),
                    h(Text, { color: '#cccccc' }, `Version: ${releaseInfo.manifest.version}`),
                    h(Text, { color: '#cccccc' }, `Location: programs/${releaseInfo.finalPath || 'unknown'}`)
                ),
                h(Text, null, ''),
                h(Text, { color: colors.warn }, 'Press ESC to return to menu')
            ),

            // State: ERROR
            state === STATES.ERROR && h(Box, { flexDirection: 'column', gap: 1 },
                h(Text, { color: colors.bad, bold: true }, '✗ Error'),
                h(Text, { color: '#cccccc' }, error),
                h(Text, null, ''),
                h(Text, { color: colors.warn }, 'Press ESC to return')
            ),

            // State: VIEW_INSTALLED
            state === STATES.VIEW_INSTALLED && h(Box, { flexDirection: 'column' },
                h(Text, { color: colors.secondary, bold: true }, 'Installed Packages:'),
                h(Text, null, ''),
                installedPackages.length === 0
                    ? h(Text, { color: '#666666' }, 'No packages installed via Package Manager')
                    : installedPackages.map((pkg, i) =>
                        h(Box, { key: pkg.id, flexDirection: 'column' },
                            h(Box, null,
                                h(Text, { color: i === selectedInstalled ? colors.accent : '#666666' },
                                    `${i === selectedInstalled ? '> ' : '  '}`
                                ),
                                h(Text, { color: i === selectedInstalled ? colors.accent : '#ffffff' }, pkg.name),
                                h(Text, { color: '#555555' }, ` v${pkg.version}`)
                            ),
                            i === selectedInstalled && updateStatus.package?.id === pkg.id && h(Box, { paddingLeft: 4 },
                                updateStatus.error
                                    ? h(Text, { color: colors.bad }, updateStatus.error)
                                    : updateStatus.hasUpdate
                                        ? h(Text, { color: colors.good }, `Update available: v${updateStatus.latestVersion}`)
                                        : h(Text, { color: '#666666' }, 'Up to date')
                            )
                        )
                    ),
                h(Text, null, ''),
                installedPackages.length > 0 && h(Text, { color: '#555555' }, 'Press U to check for updates')
            ),

            // State: CHECKING_UPDATES
            state === STATES.CHECKING_UPDATES && h(Box, { gap: 1 },
                h(Spinner, { type: 'dots' }),
                h(Text, null, 'Checking for updates...')
            )
        ),

        // Footer
        h(Box, {
            paddingX: 1, gap: 1,
            borderStyle: 'single', borderColor: '#333333',
            borderBottom: false, borderLeft: false, borderRight: false,
        },
            h(Badge, { color: 'red' }, 'ESC'),
            h(Text, { color: '#555555' }, state === STATES.MENU ? 'close' : 'back'),
            state === STATES.MENU && [
                h(Badge, { key: 'updown', color: 'cyan' }, '↑↓'),
                h(Text, { key: 'nav', color: '#555555' }, 'navigate'),
                h(Badge, { key: 'enter', color: 'green' }, 'ENTER'),
                h(Text, { key: 'select', color: '#555555' }, 'select')
            ]
        )
    );
};

export default Program;

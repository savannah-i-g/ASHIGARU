/**
 * Sound utility for playing audio feedback
 * Uses cli-sound package and respects the sounds setting from SettingsContext
 */
import { Player } from 'cli-sound';
import path from 'path';

// Sound file paths
const SOUNDS_DIR = path.join(process.cwd(), 'sounds');

// Sound types available in the system
export type SoundType =
    | 'click'       // Button click
    | 'hover'       // Focus/selection change
    | 'success'     // Successful action
    | 'error'       // Error or failure
    | 'notify'      // Notification
    | 'open'        // Window/menu open
    | 'close';      // Window/menu close

// Map sound types to file names
const SOUND_FILES: Record<SoundType, string> = {
    click: 'click.mp3',
    hover: 'hover.mp3',
    success: 'success.mp3',
    error: 'error.mp3',
    notify: 'notify.mp3',
    open: 'open.mp3',
    close: 'close.mp3',
};

// Singleton player instance (created lazily to avoid errors if no player available)
let player: Player | null = null;
let playerInitialized = false;
let playerAvailable = false;

/**
 * Initialize the sound player
 * Called lazily on first play attempt
 */
const initPlayer = (): boolean => {
    if (playerInitialized) return playerAvailable;

    playerInitialized = true;
    try {
        player = new Player({ volume: 0.5 });
        playerAvailable = true;
    } catch {
        // No audio player available on this system
        playerAvailable = false;
    }
    return playerAvailable;
};

/**
 * Play a sound if sounds are enabled
 * @param type - The type of sound to play
 * @param soundsEnabled - Whether sounds are enabled in settings
 */
export const playSound = async (type: SoundType, soundsEnabled: boolean): Promise<void> => {
    // Don't play if sounds are disabled
    if (!soundsEnabled) return;

    // Initialize player on first use
    if (!initPlayer()) return;
    if (!player) return;

    const soundFile = SOUND_FILES[type];
    const soundPath = path.join(SOUNDS_DIR, soundFile);

    try {
        // Fire and forget - don't await to avoid blocking UI
        player.play(soundPath).catch(() => {
            // Silently ignore playback errors (file not found, etc.)
        });
    } catch {
        // Silently ignore errors
    }
};

/**
 * Play click sound - convenience wrapper
 */
export const playClick = (soundsEnabled: boolean): void => {
    playSound('click', soundsEnabled);
};

/**
 * Play hover/focus sound - convenience wrapper
 */
export const playHover = (soundsEnabled: boolean): void => {
    playSound('hover', soundsEnabled);
};

/**
 * Play success sound - convenience wrapper
 */
export const playSuccess = (soundsEnabled: boolean): void => {
    playSound('success', soundsEnabled);
};

/**
 * Play error sound - convenience wrapper
 */
export const playError = (soundsEnabled: boolean): void => {
    playSound('error', soundsEnabled);
};

export default {
    playSound,
    playClick,
    playHover,
    playSuccess,
    playError,
};

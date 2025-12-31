/**
 * Sound API
 * Provides audio feedback, wrapping the existing sound utility
 * Supports both system sounds and custom program-bundled sounds
 */

import type { SoundAPI, SoundType, APICreationContext } from './types.js';
import { playSound, playSoundFile, playProgramSound } from '../../utils/sound.js';

/**
 * Create a Sound API instance
 */
export const createSoundAPI = (
    context: APICreationContext,
    programPath?: string
): SoundAPI => {
    const getSoundsEnabled = (): boolean => {
        const settings = context.getSettings();
        return settings.sounds;
    };

    const play = (type: SoundType): void => {
        playSound(type, getSoundsEnabled());
    };

    return {
        play,

        click(): void {
            play('click');
        },

        hover(): void {
            play('hover');
        },

        success(): void {
            play('success');
        },

        error(): void {
            play('error');
        },

        notify(): void {
            play('notify');
        },

        playFile(absolutePath: string): void {
            playSoundFile(absolutePath, getSoundsEnabled());
        },

        playCustom(filename: string): void {
            const progPath = programPath || context.programPath;
            if (progPath) {
                playProgramSound(progPath, filename, getSoundsEnabled());
            }
        },

        isEnabled(): boolean {
            return getSoundsEnabled();
        },
    };
};

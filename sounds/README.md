# ASHIGARU Sound Effects

This directory contains sound files for the optional audio feedback system.

## Required Sound Files

Place the following MP3 files in this directory:

| File | Description |
|------|-------------|
| `click.mp3` | Button click/activation/submit sound |
| `hover.mp3` | Focus change/typing/selection sound |
| `success.mp3` | Successful operation sound |
| `error.mp3` | Error or failure sound |
| `notify.mp3` | Notification sound |
| `open.mp3` | Window/menu opening sound |
| `close.mp3` | Window/menu closing sound |

## Enabling Sounds

Sounds are disabled by default. To enable:
1. Open the Control Panel (Ctrl+L → Control Panel)
2. Navigate to the "Audio" section
3. Toggle "Sound Effects" to ON

## Supported Formats

The system uses `cli-sound` which supports:
- MP3 (current default)
- WAV
- OGG
- Other formats supported by your system's audio player

## Notes

- Keep sound files short (< 0.5 seconds) for responsive UI feedback
- Use low volume, subtle sounds to avoid being disruptive
- The system will gracefully fail if sound files are missing
- Sounds only play when enabled in settings

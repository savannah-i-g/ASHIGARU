/**
 * Space Shooter
 * A vertical scrolling ASCII space shooter game
 * Uses the ASHIGARU API for sounds, storage (high scores), and notifications
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useInput } from 'ink';

const h = React.createElement;

// Game constants
const VIEWPORT_WIDTH = 40;
const VIEWPORT_HEIGHT = 20;
const PLAYER_Y = VIEWPORT_HEIGHT - 2;
const SHOOT_COOLDOWN = 150; // ms
const ENEMY_SPAWN_RATE = 1500; // ms
const GAME_TICK = 80; // ms
const ENEMY_MOVE_INTERVAL = 3; // Move enemies every N ticks

// ASCII sprites
const SPRITES = {
    player: ' /^\\ ',
    playerWing: '<====>',
    bullet: '|',
    enemy1: '\\V/',
    enemy2: '<*>',
    enemy3: '[=]',
    explosion: '*',
    powerup: '♦',
};

// Enemy types with different properties
const ENEMY_TYPES = [
    { sprite: SPRITES.enemy1, points: 10, health: 1, color: '#ff6666' },
    { sprite: SPRITES.enemy2, points: 20, health: 2, color: '#ffaa00' },
    { sprite: SPRITES.enemy3, points: 30, health: 3, color: '#ff00ff' },
];

const Program = ({ isFocused, onClose, api, windowId, lockInput, unlockInput }) => {
    // Game state
    const [gameState, setGameState] = useState('menu'); // menu, playing, paused, gameover
    const [playerX, setPlayerX] = useState(Math.floor(VIEWPORT_WIDTH / 2) - 3);
    const [bullets, setBullets] = useState([]);
    const [enemies, setEnemies] = useState([]);
    const [explosions, setExplosions] = useState([]);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [highScore, setHighScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [tickCount, setTickCount] = useState(0);

    const lastShot = useRef(0);
    const gameLoop = useRef(null);
    const enemySpawner = useRef(null);
    const inputLocked = useRef(false);

    // Load high score on mount
    useEffect(() => {
        if (api) {
            api.storage.get('highScore').then(saved => {
                if (saved) setHighScore(saved);
            });
        }
    }, [api]);

    // Save high score when it changes
    useEffect(() => {
        if (api && score > highScore) {
            setHighScore(score);
            api.storage.set('highScore', score);
        }
    }, [score, highScore, api]);

    // Play sound helper
    const playSound = useCallback((soundName) => {
        if (api?.sound) {
            api.sound.playCustom(`${soundName}.mp3`);
        }
    }, [api]);

    // Spawn enemy
    const spawnEnemy = useCallback(() => {
        const typeIndex = Math.min(
            Math.floor(Math.random() * Math.min(level, ENEMY_TYPES.length)),
            ENEMY_TYPES.length - 1
        );
        const enemyType = ENEMY_TYPES[typeIndex];
        const x = Math.floor(Math.random() * (VIEWPORT_WIDTH - 5)) + 1;

        setEnemies(prev => [...prev, {
            id: Date.now() + Math.random(),
            x,
            y: 0,
            ...enemyType,
        }]);
    }, [level]);

    // Shoot bullet
    const shoot = useCallback(() => {
        const now = Date.now();
        if (now - lastShot.current < SHOOT_COOLDOWN) return;
        lastShot.current = now;

        setBullets(prev => [...prev, {
            id: Date.now(),
            x: playerX + 3,
            y: PLAYER_Y - 1,
        }]);

        playSound('shoot');
    }, [playerX, playSound]);

    // Create explosion
    const createExplosion = useCallback((x, y) => {
        const id = Date.now() + Math.random();
        setExplosions(prev => [...prev, { id, x, y, frame: 0 }]);
        setTimeout(() => {
            setExplosions(prev => prev.filter(e => e.id !== id));
        }, 300);
    }, []);

    // Game tick
    const gameTick = useCallback(() => {
        setTickCount(prev => prev + 1);

        // Move bullets up
        setBullets(prev => prev
            .map(b => ({ ...b, y: b.y - 1 }))
            .filter(b => b.y >= 0)
        );

        // Move enemies down (slower than bullets)
        setEnemies(prev => {
            if (tickCount % ENEMY_MOVE_INTERVAL !== 0) return prev;
            return prev.map(e => ({ ...e, y: e.y + 1 }));
        });

        // Check collisions
        setBullets(prevBullets => {
            const remainingBullets = [];
            let bulletsToRemove = new Set();

            prevBullets.forEach(bullet => {
                let hit = false;
                setEnemies(prevEnemies => {
                    return prevEnemies.map(enemy => {
                        if (hit) return enemy;
                        // Check collision
                        const bulletHit = Math.abs(bullet.x - enemy.x - 1) <= 2 &&
                            Math.abs(bullet.y - enemy.y) <= 1;
                        if (bulletHit) {
                            hit = true;
                            bulletsToRemove.add(bullet.id);
                            const newHealth = enemy.health - 1;
                            if (newHealth <= 0) {
                                createExplosion(enemy.x, enemy.y);
                                playSound('explosion');
                                setScore(s => s + enemy.points);
                                return null; // Remove enemy
                            }
                            return { ...enemy, health: newHealth };
                        }
                        return enemy;
                    }).filter(Boolean);
                });
            });

            return prevBullets.filter(b => !bulletsToRemove.has(b.id));
        });

        // Check if enemies reached bottom or hit player
        setEnemies(prev => {
            const remaining = [];
            prev.forEach(enemy => {
                if (enemy.y >= VIEWPORT_HEIGHT - 1) {
                    // Enemy reached bottom - lose a life
                    setLives(l => {
                        const newLives = l - 1;
                        if (newLives <= 0) {
                            setGameState('gameover');
                            playSound('gameover');
                        } else {
                            playSound('hit');
                        }
                        return newLives;
                    });
                } else if (enemy.y >= PLAYER_Y - 1 &&
                    Math.abs(enemy.x - playerX) < 4) {
                    // Enemy hit player
                    createExplosion(enemy.x, enemy.y);
                    playSound('hit');
                    setLives(l => {
                        const newLives = l - 1;
                        if (newLives <= 0) {
                            setGameState('gameover');
                            playSound('gameover');
                        }
                        return newLives;
                    });
                } else {
                    remaining.push(enemy);
                }
            });
            return remaining;
        });

        // Level up every 200 points
        setLevel(Math.floor(score / 200) + 1);

    }, [tickCount, playerX, createExplosion, playSound, score]);

    // Start game loop
    useEffect(() => {
        if (gameState === 'playing') {
            // Lock input during gameplay to prevent global shortcuts
            if (!inputLocked.current && lockInput) {
                lockInput();
                inputLocked.current = true;
            }

            gameLoop.current = setInterval(gameTick, GAME_TICK);
            enemySpawner.current = setInterval(spawnEnemy,
                Math.max(500, ENEMY_SPAWN_RATE - level * 100));

            return () => {
                clearInterval(gameLoop.current);
                clearInterval(enemySpawner.current);
            };
        } else {
            // Unlock input when not playing
            if (inputLocked.current && unlockInput) {
                unlockInput();
                inputLocked.current = false;
            }
        }
    }, [gameState, gameTick, spawnEnemy, level, lockInput, unlockInput]);

    // Start new game
    const startGame = useCallback(() => {
        setGameState('playing');
        setScore(0);
        setLives(3);
        setLevel(1);
        setBullets([]);
        setEnemies([]);
        setExplosions([]);
        setPlayerX(Math.floor(VIEWPORT_WIDTH / 2) - 3);
        setTickCount(0);
        api?.sound?.click();
    }, [api]);

    // Handle input
    useInput((input, key) => {
        if (!isFocused) return;

        if (key.escape) {
            if (gameState === 'playing') {
                setGameState('paused');
            } else if (gameState === 'paused') {
                setGameState('playing');
            } else {
                // Ensure input is unlocked before closing
                if (inputLocked.current && unlockInput) {
                    unlockInput();
                    inputLocked.current = false;
                }
                onClose();
            }
            return;
        }

        if (gameState === 'menu' || gameState === 'gameover') {
            if (key.return || input === ' ') {
                startGame();
            }
            return;
        }

        if (gameState === 'paused') {
            if (key.return || input === ' ') {
                setGameState('playing');
            }
            return;
        }

        if (gameState === 'playing') {
            if (key.leftArrow || input === 'a') {
                setPlayerX(x => Math.max(0, x - 2));
            }
            if (key.rightArrow || input === 'd') {
                setPlayerX(x => Math.min(VIEWPORT_WIDTH - 7, x + 2));
            }
            if (input === ' ' || key.upArrow) {
                shoot();
            }
        }
    }, { isActive: isFocused });

    // Render game viewport
    const renderViewport = () => {
        // Create empty viewport
        const viewport = Array(VIEWPORT_HEIGHT).fill(null).map(() =>
            Array(VIEWPORT_WIDTH).fill({ char: ' ', color: '#333333' })
        );

        // Draw stars (background)
        for (let i = 0; i < 15; i++) {
            const starX = (i * 7 + tickCount) % VIEWPORT_WIDTH;
            const starY = (i * 3 + Math.floor(tickCount / 2)) % VIEWPORT_HEIGHT;
            if (starY < VIEWPORT_HEIGHT && starX < VIEWPORT_WIDTH) {
                viewport[starY][starX] = { char: '.', color: '#444444' };
            }
        }

        // Draw enemies
        enemies.forEach(enemy => {
            const sprite = enemy.sprite;
            for (let i = 0; i < sprite.length; i++) {
                const x = enemy.x + i;
                const y = Math.floor(enemy.y);
                if (x >= 0 && x < VIEWPORT_WIDTH && y >= 0 && y < VIEWPORT_HEIGHT) {
                    viewport[y][x] = { char: sprite[i], color: enemy.color };
                }
            }
        });

        // Draw bullets
        bullets.forEach(bullet => {
            const y = Math.floor(bullet.y);
            if (bullet.x >= 0 && bullet.x < VIEWPORT_WIDTH && y >= 0 && y < VIEWPORT_HEIGHT) {
                viewport[y][bullet.x] = { char: SPRITES.bullet, color: '#ffff00' };
            }
        });

        // Draw explosions
        explosions.forEach(exp => {
            const chars = ['*', '+', 'X', 'o'];
            const char = chars[Math.floor(Math.random() * chars.length)];
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const x = exp.x + dx;
                    const y = exp.y + dy;
                    if (x >= 0 && x < VIEWPORT_WIDTH && y >= 0 && y < VIEWPORT_HEIGHT) {
                        viewport[y][x] = { char, color: '#ff8800' };
                    }
                }
            }
        });

        // Draw player
        const playerSprite1 = SPRITES.player;
        const playerSprite2 = SPRITES.playerWing;
        for (let i = 0; i < playerSprite1.length; i++) {
            const x = playerX + i;
            if (x >= 0 && x < VIEWPORT_WIDTH) {
                viewport[PLAYER_Y - 1][x] = { char: playerSprite1[i], color: '#00ffff' };
            }
        }
        for (let i = 0; i < playerSprite2.length; i++) {
            const x = playerX + i;
            if (x >= 0 && x < VIEWPORT_WIDTH) {
                viewport[PLAYER_Y][x] = { char: playerSprite2[i], color: '#00ffff' };
            }
        }

        // Convert to renderable lines
        return viewport.map((row, y) => {
            const segments = [];
            let currentColor = null;
            let currentText = '';

            row.forEach((cell, x) => {
                if (cell.color !== currentColor) {
                    if (currentText) {
                        segments.push({ text: currentText, color: currentColor });
                    }
                    currentColor = cell.color;
                    currentText = cell.char;
                } else {
                    currentText += cell.char;
                }
            });
            if (currentText) {
                segments.push({ text: currentText, color: currentColor });
            }

            return h(Text, { key: y },
                segments.map((seg, i) =>
                    h(Text, { key: i, color: seg.color }, seg.text)
                )
            );
        });
    };

    // Render menu
    const renderMenu = () => {
        return h(Box, { flexDirection: 'column', alignItems: 'center', paddingY: 2 },
            h(Text, { color: '#00ffff', bold: true }, '╔═══════════════════════════════════╗'),
            h(Text, { color: '#00ffff', bold: true }, '║       S P A C E   S H O O T E R   ║'),
            h(Text, { color: '#00ffff', bold: true }, '╚═══════════════════════════════════╝'),
            h(Text, null, ''),
            h(Text, { color: '#888888' }, '         /^\\'),
            h(Text, { color: '#00ffff' }, '        <====>'),
            h(Text, null, ''),
            h(Text, { color: '#ffff00' }, 'High Score: ' + highScore),
            h(Text, null, ''),
            h(Text, { color: '#ffffff' }, '← → or A D  -  Move'),
            h(Text, { color: '#ffffff' }, 'SPACE or ↑  -  Shoot'),
            h(Text, { color: '#ffffff' }, '   ESC      -  Pause/Quit'),
            h(Text, null, ''),
            h(Text, { color: '#00ff00', bold: true }, '[ Press SPACE to Start ]')
        );
    };

    // Render game over
    const renderGameOver = () => {
        const isNewHighScore = score >= highScore && score > 0;
        return h(Box, { flexDirection: 'column', alignItems: 'center', paddingY: 2 },
            h(Text, { color: '#ff0000', bold: true }, '╔═══════════════════════════════════╗'),
            h(Text, { color: '#ff0000', bold: true }, '║          G A M E   O V E R        ║'),
            h(Text, { color: '#ff0000', bold: true }, '╚═══════════════════════════════════╝'),
            h(Text, null, ''),
            isNewHighScore && h(Text, { color: '#ffff00', bold: true }, '★ NEW HIGH SCORE! ★'),
            h(Text, null, ''),
            h(Text, { color: '#ffffff' }, 'Final Score: ' + score),
            h(Text, { color: '#888888' }, 'Level Reached: ' + level),
            h(Text, null, ''),
            h(Text, { color: '#00ff00', bold: true }, '[ Press SPACE to Play Again ]'),
            h(Text, { color: '#888888' }, 'ESC to exit')
        );
    };

    // Render pause screen
    const renderPaused = () => {
        return h(Box, { flexDirection: 'column', alignItems: 'center', paddingY: 4 },
            h(Text, { color: '#ffff00', bold: true }, '║  P A U S E D  ║'),
            h(Text, null, ''),
            h(Text, { color: '#ffffff' }, 'Score: ' + score),
            h(Text, { color: '#ffffff' }, 'Lives: ' + '❤'.repeat(lives)),
            h(Text, null, ''),
            h(Text, { color: '#00ff00' }, '[ Press SPACE to Resume ]'),
            h(Text, { color: '#888888' }, 'ESC to quit')
        );
    };

    // Main render
    const borderColor = isFocused ? '#00ffff' : '#333333';

    return h(Box, {
        flexDirection: 'column',
        borderStyle: 'single',
        borderColor,
        flexGrow: 1,
        width: VIEWPORT_WIDTH + 4
    },
        // Header
        h(Box, {
            paddingX: 1,
            justifyContent: 'space-between',
            borderStyle: 'single',
            borderColor: '#333333',
            borderTop: false,
            borderLeft: false,
            borderRight: false,
        },
            h(Text, { color: '#00ffff', bold: true }, '🚀 SPACE SHOOTER'),
            gameState === 'playing' && h(Box, { gap: 2 },
                h(Text, { color: '#ffff00' }, 'Score: ' + score),
                h(Text, { color: '#ff6666' }, '❤'.repeat(lives)),
                h(Text, { color: '#888888' }, 'Lv.' + level)
            )
        ),

        // Game area
        h(Box, {
            flexDirection: 'column',
            paddingX: 1,
            minHeight: VIEWPORT_HEIGHT + 2,
            justifyContent: 'center',
            alignItems: gameState !== 'playing' ? 'center' : 'flex-start'
        },
            gameState === 'menu' && renderMenu(),
            gameState === 'playing' && renderViewport(),
            gameState === 'paused' && renderPaused(),
            gameState === 'gameover' && renderGameOver()
        ),

        // Footer
        h(Box, {
            paddingX: 1,
            borderStyle: 'single',
            borderColor: '#333333',
            borderBottom: false,
            borderLeft: false,
            borderRight: false,
        },
            h(Text, { color: '#555555' },
                gameState === 'playing'
                    ? '←/→ Move  SPACE Shoot  ESC Pause'
                    : 'SPACE Start  ESC Exit'
            )
        )
    );
};

export default Program;

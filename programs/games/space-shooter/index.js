/**
 * Space Shooter
 * A vertical scrolling ASCII space shooter game
 * Survive as long as possible and get the highest score!
 * Uses the ASHIGARU API for sounds, storage (high scores), and notifications
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';

const h = React.createElement;

// Game constants
const MIN_WIDTH = 30;
const MIN_HEIGHT = 15;
const SHOOT_COOLDOWN = 150; // ms
const ENEMY_SPAWN_RATE = 1200; // ms
const ENEMY_SHOOT_CHANCE = 0.02; // Chance per tick for enemy to shoot
const GAME_TICK = 80; // ms
const ENEMY_MOVE_INTERVAL = 3; // Move enemies every N ticks

// ASCII sprites - simplified
const SPRITES = {
    player: '^',
    bullet: '|',
    enemyBullet: '!',
    enemy1: 'V',
    enemy2: 'W',
    enemy3: 'M',
    enemyErratic: 'X',
    explosion: '*',
};

// Enemy types with different properties
// type: 'normal' = straight down, 'erratic' = side-to-side + towards player
const ENEMY_TYPES = [
    { sprite: SPRITES.enemy1, points: 10, health: 1, color: '#ff6666', shootChance: 0.01, type: 'normal' },
    { sprite: SPRITES.enemy2, points: 20, health: 2, color: '#ffaa00', shootChance: 0.02, type: 'normal' },
    { sprite: SPRITES.enemy3, points: 30, health: 3, color: '#ff00ff', shootChance: 0.03, type: 'normal' },
    { sprite: SPRITES.enemyErratic, points: 40, health: 2, color: '#00ff00', shootChance: 0.015, type: 'erratic' },
];

const Program = ({ isFocused, onClose, api, windowId, lockInput, unlockInput }) => {
    // Get terminal dimensions
    const { stdout } = useStdout();
    const termWidth = stdout?.columns || 80;
    const termHeight = stdout?.rows || 24;

    // Calculate viewport size (leave room for borders and UI)
    const viewportWidth = Math.max(MIN_WIDTH, termWidth - 6);
    const viewportHeight = Math.max(MIN_HEIGHT, termHeight - 8);
    const playerY = viewportHeight - 2;

    // Game state
    const [gameState, setGameState] = useState('menu'); // menu, playing, paused, gameover
    const [playerX, setPlayerX] = useState(Math.floor(viewportWidth / 2));
    const [bullets, setBullets] = useState([]);
    const [enemyBullets, setEnemyBullets] = useState([]);
    const [enemies, setEnemies] = useState([]);
    const [explosions, setExplosions] = useState([]);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [highScore, setHighScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [tickCount, setTickCount] = useState(0);
    const [survivalTime, setSurvivalTime] = useState(0);

    // Refs for game loop
    const lastShot = useRef(0);
    const gameLoopRef = useRef(null);
    const inputLocked = useRef(false);
    const lastSpawn = useRef(0);
    const gameStartTime = useRef(0);

    // Game state refs for use in intervals
    const gameStateRef = useRef(gameState);
    const levelRef = useRef(level);
    const scoreRef = useRef(score);
    const livesRef = useRef(lives);
    const playerXRef = useRef(playerX);
    const viewportWidthRef = useRef(viewportWidth);
    const viewportHeightRef = useRef(viewportHeight);
    const playerYRef = useRef(playerY);

    // Keep refs in sync
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
    useEffect(() => { levelRef.current = level; }, [level]);
    useEffect(() => { scoreRef.current = score; }, [score]);
    useEffect(() => { livesRef.current = lives; }, [lives]);
    useEffect(() => { playerXRef.current = playerX; }, [playerX]);
    useEffect(() => { viewportWidthRef.current = viewportWidth; }, [viewportWidth]);
    useEffect(() => { viewportHeightRef.current = viewportHeight; }, [viewportHeight]);
    useEffect(() => { playerYRef.current = playerY; }, [playerY]);

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

    // Shoot bullet
    const shoot = useCallback(() => {
        const now = Date.now();
        if (now - lastShot.current < SHOOT_COOLDOWN) return;
        lastShot.current = now;

        const px = playerXRef.current;
        const py = playerYRef.current;

        setBullets(prev => [...prev, {
            id: Date.now(),
            x: px,
            y: py - 1,
        }]);

        playSound('shoot');
    }, [playSound]);

    // Game loop - runs every GAME_TICK ms
    useEffect(() => {
        if (gameState !== 'playing') return;

        // Lock input during gameplay
        if (!inputLocked.current && lockInput) {
            lockInput();
            inputLocked.current = true;
        }

        let tickCounter = 0;

        const gameLoop = () => {
            tickCounter++;
            setTickCount(tickCounter);

            // Update survival time
            setSurvivalTime(Math.floor((Date.now() - gameStartTime.current) / 1000));

            // Spawn enemies periodically
            const now = Date.now();
            const spawnRate = Math.max(600, ENEMY_SPAWN_RATE - levelRef.current * 80);
            if (now - lastSpawn.current > spawnRate) {
                lastSpawn.current = now;
                const currentLevel = levelRef.current;
                const currentWidth = viewportWidthRef.current;
                const typeIndex = Math.min(
                    Math.floor(Math.random() * Math.min(currentLevel, ENEMY_TYPES.length)),
                    ENEMY_TYPES.length - 1
                );
                const enemyType = ENEMY_TYPES[typeIndex];
                const x = Math.floor(Math.random() * (currentWidth - 4)) + 2;

                setEnemies(prev => [...prev, {
                    id: now + Math.random(),
                    x,
                    y: 0,
                    ...enemyType,
                }]);
            }

            // Move player bullets up
            setBullets(prev => prev
                .map(b => ({ ...b, y: b.y - 1 }))
                .filter(b => b.y >= 0)
            );

            // Move enemy bullets down
            setEnemyBullets(prev => prev
                .map(b => ({ ...b, y: b.y + 1 }))
                .filter(b => b.y < viewportHeightRef.current)
            );

            // Move enemies (slower than bullets)
            if (tickCounter % ENEMY_MOVE_INTERVAL === 0) {
                const currentPlayerX = playerXRef.current;
                const currentWidth = viewportWidthRef.current;

                setEnemies(prev => prev.map(e => {
                    if (e.type === 'erratic') {
                        // Erratic movement: 2 random moves per 4 dedicated towards player
                        const moveCounter = (e.moveCounter || 0) + 1;
                        let newX = e.x;
                        let newY = e.y;

                        if (moveCounter % 3 === 0) {
                            // Random horizontal movement
                            const randomMove = Math.floor(Math.random() * 5) - 2; // -2 to +2
                            newX = Math.max(1, Math.min(currentWidth - 2, e.x + randomMove));
                        } else {
                            // Move towards player horizontally
                            if (currentPlayerX > e.x) {
                                newX = Math.min(currentWidth - 2, e.x + 1);
                            } else if (currentPlayerX < e.x) {
                                newX = Math.max(1, e.x - 1);
                            }
                        }

                        // Always move down (but slower - every other move tick)
                        if (moveCounter % 2 === 0) {
                            newY = e.y + 1;
                        }

                        return { ...e, x: newX, y: newY, moveCounter };
                    } else {
                        // Normal enemies just move straight down
                        return { ...e, y: e.y + 1 };
                    }
                }));
            }

            // Enemies shoot at player
            setEnemies(prev => {
                prev.forEach(enemy => {
                    if (Math.random() < (enemy.shootChance || ENEMY_SHOOT_CHANCE)) {
                        setEnemyBullets(bullets => [...bullets, {
                            id: Date.now() + Math.random(),
                            x: enemy.x,
                            y: enemy.y + 1,
                        }]);
                    }
                });
                return prev;
            });

            // Check player bullet-enemy collisions
            setBullets(prevBullets => {
                const bulletsToRemove = new Set();

                prevBullets.forEach(bullet => {
                    setEnemies(prevEnemies => {
                        return prevEnemies.map(enemy => {
                            if (bulletsToRemove.has(bullet.id)) return enemy;
                            const hit = Math.abs(bullet.x - enemy.x) <= 1 &&
                                Math.abs(bullet.y - enemy.y) <= 1;
                            if (hit) {
                                bulletsToRemove.add(bullet.id);
                                const newHealth = enemy.health - 1;
                                if (newHealth <= 0) {
                                    // Create explosion
                                    const expId = Date.now() + Math.random();
                                    setExplosions(prev => [...prev, { id: expId, x: enemy.x, y: enemy.y }]);
                                    setTimeout(() => {
                                        setExplosions(prev => prev.filter(e => e.id !== expId));
                                    }, 200);
                                    playSound('explosion');
                                    setScore(s => s + enemy.points);
                                    return null;
                                }
                                return { ...enemy, health: newHealth };
                            }
                            return enemy;
                        }).filter(Boolean);
                    });
                });

                return prevBullets.filter(b => !bulletsToRemove.has(b.id));
            });

            // Check enemy bullets hitting player
            const currentPlayerX = playerXRef.current;
            const currentPlayerY = playerYRef.current;

            setEnemyBullets(prev => {
                const remaining = [];
                prev.forEach(bullet => {
                    if (Math.abs(bullet.x - currentPlayerX) <= 1 &&
                        Math.abs(bullet.y - currentPlayerY) <= 1) {
                        // Player hit by enemy bullet
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
                        remaining.push(bullet);
                    }
                });
                return remaining;
            });

            // Check enemy-player physical collisions (remove enemies that go off screen)
            const currentHeight = viewportHeightRef.current;

            setEnemies(prev => {
                const remaining = [];
                prev.forEach(enemy => {
                    if (enemy.y >= currentHeight) {
                        // Enemy passed bottom - just remove, no penalty
                        return;
                    } else if (enemy.y >= currentPlayerY - 1 && Math.abs(enemy.x - currentPlayerX) <= 1) {
                        // Enemy physically hit player
                        const expId = Date.now() + Math.random();
                        setExplosions(exps => [...exps, { id: expId, x: enemy.x, y: enemy.y }]);
                        setTimeout(() => {
                            setExplosions(exps => exps.filter(e => e.id !== expId));
                        }, 200);
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

            // Level up based on survival time (every 30 seconds)
            setLevel(Math.floor((Date.now() - gameStartTime.current) / 30000) + 1);
        };

        gameLoopRef.current = setInterval(gameLoop, GAME_TICK);
        lastSpawn.current = Date.now();
        gameStartTime.current = Date.now();

        return () => {
            if (gameLoopRef.current) {
                clearInterval(gameLoopRef.current);
            }
        };
    }, [gameState, lockInput, playSound]);

    // Unlock input when not playing
    useEffect(() => {
        if (gameState !== 'playing' && inputLocked.current && unlockInput) {
            unlockInput();
            inputLocked.current = false;
        }
    }, [gameState, unlockInput]);

    // Start new game
    const startGame = useCallback(() => {
        setGameState('playing');
        setScore(0);
        setLives(3);
        setLevel(1);
        setBullets([]);
        setEnemyBullets([]);
        setEnemies([]);
        setExplosions([]);
        setPlayerX(Math.floor(viewportWidth / 2));
        setTickCount(0);
        setSurvivalTime(0);
        lastSpawn.current = 0;
        gameStartTime.current = Date.now();
        api?.sound?.click();
    }, [api, viewportWidth]);

    // Handle input
    useInput((input, key) => {
        if (!isFocused) return;

        if (key.escape) {
            if (gameState === 'playing') {
                setGameState('paused');
            } else if (gameState === 'paused') {
                setGameState('playing');
            } else {
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
                setPlayerX(x => Math.max(1, x - 2));
            }
            if (key.rightArrow || input === 'd') {
                setPlayerX(x => Math.min(viewportWidth - 2, x + 2));
            }
            if (input === ' ' || key.upArrow) {
                shoot();
            }
        }
    }, { isActive: isFocused });

    // Render game viewport
    const renderViewport = () => {
        const viewport = Array(viewportHeight).fill(null).map(() =>
            Array(viewportWidth).fill({ char: ' ', color: '#111111' })
        );

        // Draw stars
        for (let i = 0; i < Math.floor(viewportWidth / 3); i++) {
            const starX = (i * 7 + tickCount) % viewportWidth;
            const starY = (i * 3 + Math.floor(tickCount / 2)) % viewportHeight;
            if (starY < viewportHeight && starX < viewportWidth) {
                viewport[starY][starX] = { char: '.', color: '#333333' };
            }
        }

        // Draw enemies
        enemies.forEach(enemy => {
            const x = Math.floor(enemy.x);
            const y = Math.floor(enemy.y);
            if (x >= 0 && x < viewportWidth && y >= 0 && y < viewportHeight) {
                viewport[y][x] = { char: enemy.sprite, color: enemy.color };
            }
        });

        // Draw player bullets
        bullets.forEach(bullet => {
            const x = Math.floor(bullet.x);
            const y = Math.floor(bullet.y);
            if (x >= 0 && x < viewportWidth && y >= 0 && y < viewportHeight) {
                viewport[y][x] = { char: SPRITES.bullet, color: '#ffff00' };
            }
        });

        // Draw enemy bullets
        enemyBullets.forEach(bullet => {
            const x = Math.floor(bullet.x);
            const y = Math.floor(bullet.y);
            if (x >= 0 && x < viewportWidth && y >= 0 && y < viewportHeight) {
                viewport[y][x] = { char: SPRITES.enemyBullet, color: '#ff4444' };
            }
        });

        // Draw explosions
        explosions.forEach(exp => {
            const x = Math.floor(exp.x);
            const y = Math.floor(exp.y);
            if (x >= 0 && x < viewportWidth && y >= 0 && y < viewportHeight) {
                viewport[y][x] = { char: SPRITES.explosion, color: '#ff8800' };
            }
        });

        // Draw player
        const px = Math.floor(playerX);
        if (px >= 0 && px < viewportWidth && playerY >= 0 && playerY < viewportHeight) {
            viewport[playerY][px] = { char: SPRITES.player, color: '#00ffff' };
        }

        // Convert to renderable lines
        return viewport.map((row, y) => {
            const segments = [];
            let currentColor = null;
            let currentText = '';

            row.forEach((cell) => {
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

    // Format time as MM:SS
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Render menu
    const renderMenu = () => {
        return h(Box, { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
            h(Text, { color: '#00ffff', bold: true }, '═══ SPACE SHOOTER ═══'),
            h(Text, null, ''),
            h(Text, { color: '#00ffff', bold: true }, '  ^'),
            h(Text, { color: '#888888' }, ' /|\\'),
            h(Text, null, ''),
            h(Text, { color: '#ffff00' }, 'High Score: ' + highScore),
            h(Text, null, ''),
            h(Text, { color: '#aaaaaa' }, 'Survive as long as you can!'),
            h(Text, { color: '#aaaaaa' }, 'Dodge enemies and their shots.'),
            h(Text, null, ''),
            h(Text, { color: '#ffffff' }, '←/→ or A/D  Move'),
            h(Text, { color: '#ffffff' }, 'SPACE or ↑  Shoot'),
            h(Text, { color: '#ffffff' }, 'ESC         Pause'),
            h(Text, null, ''),
            h(Text, { color: '#00ff00', bold: true }, '[ SPACE to Start ]')
        );
    };

    // Render game over
    const renderGameOver = () => {
        const isNewHighScore = score >= highScore && score > 0;
        return h(Box, { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
            h(Text, { color: '#ff0000', bold: true }, '═══ GAME OVER ═══'),
            h(Text, null, ''),
            isNewHighScore && h(Text, { color: '#ffff00', bold: true }, '★ NEW HIGH SCORE! ★'),
            h(Text, null, ''),
            h(Text, { color: '#ffffff' }, 'Score: ' + score),
            h(Text, { color: '#888888' }, 'Survived: ' + formatTime(survivalTime)),
            h(Text, { color: '#888888' }, 'Level: ' + level),
            h(Text, null, ''),
            h(Text, { color: '#00ff00', bold: true }, '[ SPACE to Retry ]'),
            h(Text, { color: '#555555' }, 'ESC to exit')
        );
    };

    // Render pause screen
    const renderPaused = () => {
        return h(Box, { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
            h(Text, { color: '#ffff00', bold: true }, '═══ PAUSED ═══'),
            h(Text, null, ''),
            h(Text, { color: '#ffffff' }, 'Score: ' + score),
            h(Text, { color: '#ffffff' }, 'Time: ' + formatTime(survivalTime)),
            h(Text, { color: '#ffffff' }, 'Lives: ' + '❤'.repeat(lives)),
            h(Text, null, ''),
            h(Text, { color: '#00ff00' }, '[ SPACE to Resume ]'),
            h(Text, { color: '#555555' }, 'ESC to quit')
        );
    };

    const borderColor = isFocused ? '#00ffff' : '#333333';

    return h(Box, {
        flexDirection: 'column',
        borderStyle: 'single',
        borderColor,
        flexGrow: 1,
        width: '100%',
        height: '100%'
    },
        h(Box, { paddingX: 1, justifyContent: 'space-between' },
            h(Text, { color: '#00ffff', bold: true }, 'SPACE SHOOTER'),
            gameState === 'playing' && h(Box, { gap: 2 },
                h(Text, { color: '#ffff00' }, 'Score:' + score),
                h(Text, { color: '#00ff00' }, formatTime(survivalTime)),
                h(Text, { color: '#ff6666' }, '❤'.repeat(lives)),
                h(Text, { color: '#888888' }, 'Lv' + level)
            )
        ),
        h(Box, {
            flexDirection: 'column',
            flexGrow: 1,
            justifyContent: gameState !== 'playing' ? 'center' : 'flex-start',
            alignItems: gameState !== 'playing' ? 'center' : 'flex-start'
        },
            gameState === 'menu' && renderMenu(),
            gameState === 'playing' && renderViewport(),
            gameState === 'paused' && renderPaused(),
            gameState === 'gameover' && renderGameOver()
        ),
        h(Box, { paddingX: 1 },
            h(Text, { color: '#444444' },
                gameState === 'playing'
                    ? '←→ Move  SPACE Shoot  ESC Pause'
                    : 'SPACE Start  ESC Exit'
            )
        )
    );
};

export default Program;

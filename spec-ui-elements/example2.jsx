import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';

// ============================================
// WRAPPER WITH SVG BORDER ANIMATIONS
// ============================================

const BorderWrapper = ({ children, size = 100, width, height, speed = 'slow', color = '#00ffff', style = 'dashed' }) => {
    const w = width || size;
    const h = height || size;
    const [hovered, setHovered] = useState(false);

    const dashConfig = {
        dashed: { array: '8,4', offset: speed === 'fast' ? 100 : 30 },
        dotted: { array: '2,4', offset: speed === 'fast' ? 80 : 20 },
        morse: { array: '12,4,4,4', offset: speed === 'fast' ? 120 : 40 },
        zigzag: { array: '16,8', offset: speed === 'fast' ? 150 : 50 },
    };

    const config = dashConfig[style] || dashConfig.dashed;
    const duration = speed === 'fast' ? '0.3s' : '2s';

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ width: w, height: h }}
        >
            {children}
            <svg
                className="absolute inset-0 pointer-events-none"
                width={w}
                height={h}
                style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.2s' }}
            >
                <rect
                    x="1"
                    y="1"
                    width={w - 2}
                    height={h - 2}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeDasharray={config.array}
                    style={{
                        strokeDashoffset: hovered ? config.offset : 0,
                        transition: `stroke-dashoffset ${duration} linear`,
                        animation: hovered ? `marchingAnts ${duration} linear infinite` : 'none'
                    }}
                />
            </svg>
            <style>{`
        @keyframes marchingAnts {
          to { stroke-dashoffset: ${config.offset * 2}; }
        }
      `}</style>
        </div>
    );
};

// Rapid glitch border
const GlitchBorder = ({ children, size = 100, width, height }) => {
    const w = width || size;
    const h = height || size;
    const [hovered, setHovered] = useState(false);

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ width: w, height: h }}
        >
            {children}
            {hovered && (
                <>
                    <div className="absolute inset-0 pointer-events-none border-2 border-cyan-400 animate-glitch1" />
                    <div className="absolute inset-0 pointer-events-none border-2 border-magenta-400 animate-glitch2" style={{ borderColor: '#ff00ff' }} />
                    <div className="absolute inset-0 pointer-events-none border-2 border-yellow-400 animate-glitch3" />
                </>
            )}
            <style>{`
        @keyframes glitch1 {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(2px, -2px); }
          60% { transform: translate(-1px, -1px); }
          80% { transform: translate(1px, 1px); }
        }
        @keyframes glitch2 {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(2px, -2px); }
          40% { transform: translate(-2px, 2px); }
          60% { transform: translate(1px, 1px); }
          80% { transform: translate(-1px, -1px); }
        }
        @keyframes glitch3 {
          0%, 100% { transform: translate(0); opacity: 0.5; }
          25% { transform: translate(1px, -1px); opacity: 0.8; }
          50% { transform: translate(-1px, 1px); opacity: 0.3; }
          75% { transform: translate(1px, 1px); opacity: 0.6; }
        }
        .animate-glitch1 { animation: glitch1 0.1s linear infinite; }
        .animate-glitch2 { animation: glitch2 0.15s linear infinite; }
        .animate-glitch3 { animation: glitch3 0.12s linear infinite; }
      `}</style>
        </div>
    );
};

// Corner brackets that animate in
const BracketBorder = ({ children, size = 100, width, height, color = '#00ff88' }) => {
    const w = width || size;
    const h = height || size;
    const [hovered, setHovered] = useState(false);
    const cornerSize = Math.min(w, h) * 0.25;

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ width: w, height: h }}
        >
            {children}
            <svg
                className="absolute inset-0 pointer-events-none"
                width={w}
                height={h}
            >
                {/* Top-left */}
                <path
                    d={`M ${cornerSize} 2 L 2 2 L 2 ${cornerSize}`}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    style={{
                        strokeDasharray: cornerSize * 2,
                        strokeDashoffset: hovered ? 0 : cornerSize * 2,
                        transition: 'stroke-dashoffset 0.3s ease-out'
                    }}
                />
                {/* Top-right */}
                <path
                    d={`M ${w - cornerSize} 2 L ${w - 2} 2 L ${w - 2} ${cornerSize}`}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    style={{
                        strokeDasharray: cornerSize * 2,
                        strokeDashoffset: hovered ? 0 : cornerSize * 2,
                        transition: 'stroke-dashoffset 0.3s ease-out 0.05s'
                    }}
                />
                {/* Bottom-right */}
                <path
                    d={`M ${w - 2} ${h - cornerSize} L ${w - 2} ${h - 2} L ${w - cornerSize} ${h - 2}`}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    style={{
                        strokeDasharray: cornerSize * 2,
                        strokeDashoffset: hovered ? 0 : cornerSize * 2,
                        transition: 'stroke-dashoffset 0.3s ease-out 0.1s'
                    }}
                />
                {/* Bottom-left */}
                <path
                    d={`M ${cornerSize} ${h - 2} L 2 ${h - 2} L 2 ${h - cornerSize}`}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    style={{
                        strokeDasharray: cornerSize * 2,
                        strokeDashoffset: hovered ? 0 : cornerSize * 2,
                        transition: 'stroke-dashoffset 0.3s ease-out 0.15s'
                    }}
                />
            </svg>
        </div>
    );
};

// ============================================
// TERMINAL / CRT / RETRO EFFECTS
// ============================================

// Old TV static
const TVStatic = ({ size = 100, width, height }) => {
    const canvasRef = useRef();
    const w = width || size;
    const h = height || size;

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const draw = () => {
            const imageData = ctx.createImageData(w, h);
            for (let i = 0; i < imageData.data.length; i += 4) {
                const val = Math.random() * 255;
                imageData.data[i] = val;
                imageData.data[i + 1] = val;
                imageData.data[i + 2] = val;
                imageData.data[i + 3] = 255;
            }
            ctx.putImageData(imageData, 0, 0);
        };

        const interval = setInterval(draw, 50);
        return () => clearInterval(interval);
    }, [w, h]);

    return <canvas ref={canvasRef} width={w} height={h} style={{ borderRadius: 4 }} />;
};

// CRT Monitor effect with scanlines
const CRTScreen = ({ children, size = 100, width, height, color = '#00ff00' }) => {
    const w = width || size;
    const h = height || size;

    return (
        <div
            className="relative overflow-hidden"
            style={{
                width: w,
                height: h,
                background: '#0a0a0a',
                borderRadius: 4,
                boxShadow: `inset 0 0 ${w / 4}px rgba(0,255,0,0.1)`
            }}
        >
            {children}
            {/* Scanlines */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `repeating-linear-gradient(
            0deg,
            rgba(0,0,0,0.3) 0px,
            rgba(0,0,0,0.3) 1px,
            transparent 1px,
            transparent 2px
          )`
                }}
            />
            {/* Screen flicker */}
            <div
                className="absolute inset-0 pointer-events-none animate-flicker"
                style={{ background: 'rgba(255,255,255,0.03)' }}
            />
            {/* Curved edges vignette */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    boxShadow: `inset 0 0 ${w / 3}px rgba(0,0,0,0.8)`
                }}
            />
            <style>{`
        @keyframes flicker {
          0%, 100% { opacity: 0.97; }
          50% { opacity: 1; }
        }
        .animate-flicker { animation: flicker 0.1s infinite; }
      `}</style>
        </div>
    );
};

// Terminal text typing effect
const TerminalText = ({ size = 100, width, height }) => {
    const w = width || size;
    const h = height || size;
    const [text, setText] = useState('');
    const fullText = '> INIT SYS\n> LOAD 0xFF\n> RUN _\n> OK';

    useEffect(() => {
        let i = 0;
        const interval = setInterval(() => {
            setText(fullText.slice(0, i));
            i++;
            if (i > fullText.length) i = 0;
        }, 100);
        return () => clearInterval(interval);
    }, []);

    return (
        <CRTScreen width={w} height={h}>
            <pre
                className="p-2 text-green-400 font-mono"
                style={{ fontSize: Math.max(8, w / 12) }}
            >
                {text}<span className="animate-blink">█</span>
            </pre>
            <style>{`
        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
        .animate-blink { animation: blink 1s infinite; }
      `}</style>
        </CRTScreen>
    );
};

// Matrix rain
const MatrixRain = ({ size = 100, width, height }) => {
    const canvasRef = useRef();
    const w = width || size;
    const h = height || size;

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const chars = 'アイウエオカキクケコサシスセソタチツテト0123456789';
        const fontSize = Math.max(8, w / 10);
        const columns = Math.floor(w / fontSize);
        const drops = Array(columns).fill(1);

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, w, h);

        const draw = () => {
            ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';
            ctx.fillRect(0, 0, w, h);

            ctx.fillStyle = '#0f0';
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const char = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillText(char, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > h && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        };

        const interval = setInterval(draw, 50);
        return () => clearInterval(interval);
    }, [w, h]);

    return <canvas ref={canvasRef} width={w} height={h} style={{ borderRadius: 4 }} />;
};

// VHS tracking error
const VHSTracking = ({ size = 100, width, height }) => {
    const w = width || size;
    const h = height || size;
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setOffset(Math.random() > 0.7 ? (Math.random() - 0.5) * 20 : 0);
        }, 100);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            style={{
                width: w,
                height: h,
                background: '#1a1a2e',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            {/* Color bars with tracking issues */}
            {[0, 1, 2, 3, 4].map(i => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        left: offset + (Math.random() > 0.8 ? Math.random() * 5 : 0),
                        top: i * (h / 5),
                        width: w,
                        height: h / 5,
                        background: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'][i],
                        opacity: 0.7,
                        filter: `blur(${Math.random() > 0.9 ? 2 : 0}px)`
                    }}
                />
            ))}
            {/* Noise overlay */}
            <div
                className="absolute inset-0"
                style={{
                    background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                    opacity: 0.15,
                    mixBlendMode: 'overlay'
                }}
            />
        </div>
    );
};

// ============================================
// TETRIS / BLOCKY / PIXEL EFFECTS
// ============================================

// Tetris blocks falling
const TetrisBlocks = ({ size = 100, width, height }) => {
    const w = width || size;
    const h = height || size;
    const blockSize = Math.max(8, Math.floor(w / 10));
    const cols = Math.floor(w / blockSize);
    const rows = Math.floor(h / blockSize);

    const [blocks, setBlocks] = useState([]);

    const shapes = [
        { color: '#00ffff', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] }, // I
        { color: '#ffff00', cells: [[0, 0], [1, 0], [0, 1], [1, 1]] }, // O
        { color: '#ff00ff', cells: [[1, 0], [0, 1], [1, 1], [2, 1]] }, // T
        { color: '#00ff00', cells: [[1, 0], [2, 0], [0, 1], [1, 1]] }, // S
        { color: '#ff0000', cells: [[0, 0], [1, 0], [1, 1], [2, 1]] }, // Z
        { color: '#0000ff', cells: [[0, 0], [0, 1], [1, 1], [2, 1]] }, // J
        { color: '#ff8800', cells: [[2, 0], [0, 1], [1, 1], [2, 1]] }, // L
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setBlocks(prev => {
                const next = prev
                    .map(b => ({ ...b, y: b.y + 1 }))
                    .filter(b => b.y < rows + 4);

                if (Math.random() > 0.7) {
                    const shape = shapes[Math.floor(Math.random() * shapes.length)];
                    const x = Math.floor(Math.random() * (cols - 3));
                    next.push({ ...shape, x, y: -2, id: Date.now() });
                }

                return next;
            });
        }, 200);
        return () => clearInterval(interval);
    }, [cols, rows]);

    return (
        <div
            style={{
                width: w,
                height: h,
                background: '#0a0a12',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            {blocks.map(block =>
                block.cells.map((cell, i) => (
                    <div
                        key={`${block.id}-${i}`}
                        style={{
                            position: 'absolute',
                            left: (block.x + cell[0]) * blockSize,
                            top: (block.y + cell[1]) * blockSize,
                            width: blockSize - 1,
                            height: blockSize - 1,
                            background: block.color,
                            boxShadow: `inset -2px -2px 0 rgba(0,0,0,0.3), inset 2px 2px 0 rgba(255,255,255,0.2)`
                        }}
                    />
                ))
            )}
        </div>
    );
};

// Pixel grid that lights up
const PixelGrid = ({ size = 100, width, height }) => {
    const w = width || size;
    const h = height || size;
    const pixelSize = Math.max(4, Math.floor(w / 16));
    const cols = Math.floor(w / pixelSize);
    const rows = Math.floor(h / pixelSize);

    const [pixels, setPixels] = useState(() =>
        Array(rows).fill(null).map(() =>
            Array(cols).fill(null).map(() => Math.random() > 0.7)
        )
    );

    useEffect(() => {
        const interval = setInterval(() => {
            setPixels(prev =>
                prev.map(row =>
                    row.map(cell =>
                        Math.random() > 0.85 ? !cell : cell
                    )
                )
            );
        }, 100);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            style={{
                width: w,
                height: h,
                background: '#0a0a12',
                borderRadius: 4,
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, ${pixelSize}px)`,
                gap: 1
            }}
        >
            {pixels.flat().map((on, i) => (
                <div
                    key={i}
                    style={{
                        width: pixelSize - 1,
                        height: pixelSize - 1,
                        background: on ? `hsl(${(i * 7) % 360}, 100%, 60%)` : '#1a1a2e',
                        transition: 'background 0.1s'
                    }}
                />
            ))}
        </div>
    );
};

// Game of Life
const GameOfLife = ({ size = 100, width, height }) => {
    const w = width || size;
    const h = height || size;
    const cellSize = Math.max(4, Math.floor(w / 20));
    const cols = Math.floor(w / cellSize);
    const rows = Math.floor(h / cellSize);

    const [grid, setGrid] = useState(() =>
        Array(rows).fill(null).map(() =>
            Array(cols).fill(null).map(() => Math.random() > 0.7)
        )
    );

    useEffect(() => {
        const interval = setInterval(() => {
            setGrid(prev => {
                return prev.map((row, y) =>
                    row.map((cell, x) => {
                        let neighbors = 0;
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                if (dx === 0 && dy === 0) continue;
                                const ny = (y + dy + rows) % rows;
                                const nx = (x + dx + cols) % cols;
                                if (prev[ny][nx]) neighbors++;
                            }
                        }
                        if (cell) return neighbors === 2 || neighbors === 3;
                        return neighbors === 3;
                    })
                );
            });
        }, 150);
        return () => clearInterval(interval);
    }, [cols, rows]);

    return (
        <div
            style={{
                width: w,
                height: h,
                background: '#0a0a12',
                borderRadius: 4,
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`
            }}
        >
            {grid.flat().map((alive, i) => (
                <div
                    key={i}
                    style={{
                        width: cellSize,
                        height: cellSize,
                        background: alive ? '#00ff88' : 'transparent',
                        transition: 'background 0.1s'
                    }}
                />
            ))}
        </div>
    );
};

// Blocky loading bar
const BlockyLoader = ({ size = 100, width, height }) => {
    const w = width || size;
    const h = height || size / 4;
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(p => (p + Math.random() * 15) % 100);
        }, 200);
        return () => clearInterval(interval);
    }, []);

    const blocks = 10;
    const filled = Math.floor(progress / 10);

    return (
        <div
            style={{
                width: w,
                height: h,
                background: '#1a1a2e',
                borderRadius: 4,
                display: 'flex',
                gap: 2,
                padding: 4,
                alignItems: 'center'
            }}
        >
            {Array(blocks).fill(null).map((_, i) => (
                <div
                    key={i}
                    style={{
                        flex: 1,
                        height: '80%',
                        background: i < filled ? `hsl(${120 - i * 12}, 100%, 50%)` : '#2a2a3e',
                        transition: 'background 0.1s'
                    }}
                />
            ))}
        </div>
    );
};

// ============================================
// EMOJI EFFECTS
// ============================================

// Floating emojis
const FloatingEmojis = ({ size = 100, width, height, emojis = ['✨', '🌟', '💫', '⭐', '🔮'] }) => {
    const w = width || size;
    const h = height || size;
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        const interval = setInterval(() => {
            setParticles(prev => {
                const next = prev
                    .map(p => ({ ...p, y: p.y - p.speed, opacity: p.opacity - 0.02 }))
                    .filter(p => p.opacity > 0);

                if (Math.random() > 0.5 && next.length < 15) {
                    next.push({
                        id: Date.now() + Math.random(),
                        emoji: emojis[Math.floor(Math.random() * emojis.length)],
                        x: Math.random() * (w - 20),
                        y: h,
                        speed: 1 + Math.random() * 2,
                        opacity: 1,
                        rotation: Math.random() * 360,
                        rotSpeed: (Math.random() - 0.5) * 10
                    });
                }

                return next.map(p => ({ ...p, rotation: p.rotation + p.rotSpeed }));
            });
        }, 50);
        return () => clearInterval(interval);
    }, [w, h, emojis]);

    return (
        <div
            style={{
                width: w,
                height: h,
                background: '#0a0a12',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            {particles.map(p => (
                <span
                    key={p.id}
                    style={{
                        position: 'absolute',
                        left: p.x,
                        top: p.y,
                        opacity: p.opacity,
                        transform: `rotate(${p.rotation}deg)`,
                        fontSize: Math.max(12, w / 6),
                        userSelect: 'none'
                    }}
                >
                    {p.emoji}
                </span>
            ))}
        </div>
    );
};

// Emoji rain (denser, downward)
const EmojiRain = ({ size = 100, width, height, emojis = ['🌧️', '💧', '💦', '🌊', '💙'] }) => {
    const w = width || size;
    const h = height || size;
    const [drops, setDrops] = useState([]);

    useEffect(() => {
        const interval = setInterval(() => {
            setDrops(prev => {
                const next = prev
                    .map(d => ({ ...d, y: d.y + d.speed }))
                    .filter(d => d.y < h + 20);

                if (Math.random() > 0.3 && next.length < 20) {
                    next.push({
                        id: Date.now() + Math.random(),
                        emoji: emojis[Math.floor(Math.random() * emojis.length)],
                        x: Math.random() * w,
                        y: -20,
                        speed: 2 + Math.random() * 4
                    });
                }

                return next;
            });
        }, 30);
        return () => clearInterval(interval);
    }, [w, h, emojis]);

    return (
        <div
            style={{
                width: w,
                height: h,
                background: '#0a0a12',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            {drops.map(d => (
                <span
                    key={d.id}
                    style={{
                        position: 'absolute',
                        left: d.x,
                        top: d.y,
                        fontSize: Math.max(10, w / 8)
                    }}
                >
                    {d.emoji}
                </span>
            ))}
        </div>
    );
};

// Emoji explosion on hover
const EmojiExplosion = ({ size = 100, width, height, emoji = '💥' }) => {
    const w = width || size;
    const h = height || size;
    const [particles, setParticles] = useState([]);
    const [hovered, setHovered] = useState(false);

    const explode = () => {
        const newParticles = Array(12).fill(null).map((_, i) => ({
            id: Date.now() + i,
            angle: (i / 12) * Math.PI * 2,
            distance: 0,
            opacity: 1
        }));
        setParticles(newParticles);
    };

    useEffect(() => {
        if (particles.length === 0) return;

        const interval = setInterval(() => {
            setParticles(prev =>
                prev
                    .map(p => ({ ...p, distance: p.distance + 3, opacity: p.opacity - 0.05 }))
                    .filter(p => p.opacity > 0)
            );
        }, 30);
        return () => clearInterval(interval);
    }, [particles.length]);

    return (
        <div
            style={{
                width: w,
                height: h,
                background: '#0a0a12',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer'
            }}
            onMouseEnter={() => { setHovered(true); explode(); }}
            onMouseLeave={() => setHovered(false)}
        >
            <span
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: Math.max(16, w / 4),
                    transition: 'transform 0.2s',
                    ...(hovered && { transform: 'translate(-50%, -50%) scale(1.3)' })
                }}
            >
                {emoji}
            </span>
            {particles.map(p => (
                <span
                    key={p.id}
                    style={{
                        position: 'absolute',
                        left: w / 2 + Math.cos(p.angle) * p.distance,
                        top: h / 2 + Math.sin(p.angle) * p.distance,
                        transform: 'translate(-50%, -50%)',
                        opacity: p.opacity,
                        fontSize: Math.max(10, w / 6)
                    }}
                >
                    {emoji}
                </span>
            ))}
        </div>
    );
};

// Spinning emoji wheel
const EmojiWheel = ({ size = 100, emojis = ['🎰', '💎', '7️⃣', '🍒', '🔔'] }) => {
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setRotation(r => r + 5);
        }, 30);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            style={{
                width: size,
                height: size,
                background: '#0a0a12',
                borderRadius: 4,
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {emojis.map((emoji, i) => {
                const angle = (i / emojis.length) * Math.PI * 2 + (rotation * Math.PI / 180);
                const radius = size * 0.3;
                return (
                    <span
                        key={i}
                        style={{
                            position: 'absolute',
                            left: size / 2 + Math.cos(angle) * radius,
                            top: size / 2 + Math.sin(angle) * radius,
                            transform: 'translate(-50%, -50%)',
                            fontSize: Math.max(12, size / 5)
                        }}
                    >
                        {emoji}
                    </span>
                );
            })}
        </div>
    );
};

// ============================================
// THREE.JS EFFECTS (from before, enhanced)
// ============================================

const useMiniScene = (canvasRef, width, height, setupFn) => {
    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
        camera.position.z = 5;

        const cleanup = setupFn(scene, camera, renderer);

        let animationId;
        const clock = new THREE.Clock();

        const animate = () => {
            animationId = requestAnimationFrame(animate);
            const elapsed = clock.getElapsedTime();
            cleanup?.update?.(elapsed);
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            cancelAnimationFrame(animationId);
            cleanup?.dispose?.();
            renderer.dispose();
        };
    }, [width, height]);
};

// Orbital Rings
const OrbitalRings = ({ size = 100 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 4;
        const rings = [];
        const colors = [0x00ffff, 0xff00ff, 0x00ff88];

        for (let i = 0; i < 3; i++) {
            const geometry = new THREE.TorusGeometry(1 + i * 0.3, 0.02, 16, 100);
            const material = new THREE.MeshBasicMaterial({ color: colors[i], transparent: true, opacity: 0.8 });
            const ring = new THREE.Mesh(geometry, material);
            ring.rotation.x = Math.random() * Math.PI;
            ring.rotation.y = Math.random() * Math.PI;
            rings.push(ring);
            scene.add(ring);
        }

        const glowGeo = new THREE.SphereGeometry(0.3, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        scene.add(glow);

        return {
            update: (t) => {
                rings.forEach((ring, i) => {
                    ring.rotation.x += 0.01 * (i + 1);
                    ring.rotation.y += 0.015 * (i + 1);
                });
                glow.scale.setScalar(1 + Math.sin(t * 3) * 0.2);
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#0a0a12', borderRadius: 4 }} />;
};

// Particle Vortex
const ParticleVortex = ({ size = 100 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 5;
        const particleCount = 100;
        const positions = new Float32Array(particleCount * 3);
        const angles = [];

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 0.5 + Math.random() * 1.5;
            angles.push({ angle, radius, speed: 0.02 + Math.random() * 0.03, y: (Math.random() - 0.5) * 2 });
            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = angles[i].y;
            positions[i * 3 + 2] = Math.sin(angle) * radius;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xff66ff,
            size: 0.08,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const particles = new THREE.Points(geometry, material);
        scene.add(particles);

        return {
            update: (t) => {
                const pos = geometry.attributes.position.array;
                for (let i = 0; i < particleCount; i++) {
                    angles[i].angle += angles[i].speed;
                    pos[i * 3] = Math.cos(angles[i].angle) * angles[i].radius;
                    pos[i * 3 + 2] = Math.sin(angles[i].angle) * angles[i].radius;
                }
                geometry.attributes.position.needsUpdate = true;
                particles.rotation.y = t * 0.2;
                material.color.setHSL((t * 0.05) % 1, 1, 0.7);
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#0a0a12', borderRadius: 4 }} />;
};

// Neon Diamond
const NeonDiamond = ({ size = 100 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 4;

        const geometry = new THREE.OctahedronGeometry(1, 0);
        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9 });
        const wireframe = new THREE.LineSegments(edges, material);
        scene.add(wireframe);

        const innerGeo = new THREE.OctahedronGeometry(0.5, 0);
        const innerMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.3 });
        const inner = new THREE.Mesh(innerGeo, innerMat);
        scene.add(inner);

        return {
            update: (t) => {
                wireframe.rotation.y = t * 0.5;
                wireframe.rotation.x = Math.sin(t * 0.3) * 0.5;
                inner.rotation.y = -t * 0.7;
                inner.scale.setScalar(0.5 + Math.sin(t * 2) * 0.2);
                material.color.setHSL((t * 0.1) % 1, 1, 0.6);
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#0a0a12', borderRadius: 4 }} />;
};

// ============================================
// MORE RANDOM EFFECTS
// ============================================

// Gradient wave
const GradientWave = ({ size = 100, width, height }) => {
    const w = width || size;
    const h = height || size;
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setOffset(o => o + 2), 30);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            style={{
                width: w,
                height: h,
                borderRadius: 4,
                background: `linear-gradient(${offset}deg, 
          hsl(${offset % 360}, 100%, 50%), 
          hsl(${(offset + 60) % 360}, 100%, 50%), 
          hsl(${(offset + 120) % 360}, 100%, 50%)
        )`
            }}
        />
    );
};

// Pulsing circles
const PulsingCircles = ({ size = 100 }) => {
    const [scale, setScale] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setScale(s => (s + 0.02) % 1), 30);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            style={{
                width: size,
                height: size,
                background: '#0a0a12',
                borderRadius: 4,
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {[0, 0.2, 0.4, 0.6, 0.8].map((offset, i) => {
                const s = ((scale + offset) % 1);
                return (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            width: size * s,
                            height: size * s,
                            borderRadius: '50%',
                            border: '2px solid',
                            borderColor: `hsl(${180 + i * 30}, 100%, 60%)`,
                            transform: 'translate(-50%, -50%)',
                            opacity: 1 - s
                        }}
                    />
                );
            })}
        </div>
    );
};

// Bouncing dots
const BouncingDots = ({ size = 100 }) => {
    const [time, setTime] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setTime(t => t + 0.1), 30);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            style={{
                width: size,
                height: size,
                background: '#0a0a12',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: size / 10
            }}
        >
            {[0, 1, 2, 3, 4].map(i => (
                <div
                    key={i}
                    style={{
                        width: size / 8,
                        height: size / 8,
                        borderRadius: '50%',
                        background: `hsl(${i * 60}, 100%, 60%)`,
                        transform: `translateY(${Math.sin(time + i * 0.5) * size * 0.2}px)`
                    }}
                />
            ))}
        </div>
    );
};

// Spinning squares
const SpinningSquares = ({ size = 100 }) => {
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setRotation(r => r + 2), 30);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            style={{
                width: size,
                height: size,
                background: '#0a0a12',
                borderRadius: 4,
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {[0, 1, 2, 3].map(i => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        width: size * (0.7 - i * 0.15),
                        height: size * (0.7 - i * 0.15),
                        border: '2px solid',
                        borderColor: `hsl(${i * 90}, 100%, 60%)`,
                        transform: `translate(-50%, -50%) rotate(${rotation * (i % 2 ? 1 : -1) + i * 45}deg)`
                    }}
                />
            ))}
        </div>
    );
};

// Audio visualizer fake
const FakeAudioViz = ({ size = 100, width, height }) => {
    const w = width || size;
    const h = height || size;
    const bars = Math.floor(w / 8);
    const [heights, setHeights] = useState(Array(bars).fill(0.5));

    useEffect(() => {
        const interval = setInterval(() => {
            setHeights(prev => prev.map((v, i) => {
                const target = 0.2 + Math.random() * 0.8;
                return v + (target - v) * 0.3;
            }));
        }, 50);
        return () => clearInterval(interval);
    }, [bars]);

    return (
        <div
            style={{
                width: w,
                height: h,
                background: '#0a0a12',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                gap: 2,
                padding: 4
            }}
        >
            {heights.map((height, i) => (
                <div
                    key={i}
                    style={{
                        width: 4,
                        height: `${height * 100}%`,
                        background: `hsl(${i * (360 / bars)}, 100%, 60%)`,
                        borderRadius: 2,
                        transition: 'height 0.05s'
                    }}
                />
            ))}
        </div>
    );
};

// DNA double helix (simple CSS version)
const DNASimple = ({ size = 100, width, height }) => {
    const w = width || size;
    const h = height || size * 2;
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setOffset(o => o + 0.1), 30);
        return () => clearInterval(interval);
    }, []);

    const dots = 20;

    return (
        <div
            style={{
                width: w,
                height: h,
                background: '#0a0a12',
                borderRadius: 4,
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {Array(dots).fill(null).map((_, i) => {
                const y = (i / dots) * h;
                const phase = (i / dots) * Math.PI * 4 + offset;
                const x1 = w / 2 + Math.sin(phase) * (w * 0.3);
                const x2 = w / 2 + Math.sin(phase + Math.PI) * (w * 0.3);
                return (
                    <React.Fragment key={i}>
                        <div style={{
                            position: 'absolute',
                            left: x1 - 3,
                            top: y,
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: '#00ffff'
                        }} />
                        <div style={{
                            position: 'absolute',
                            left: x2 - 3,
                            top: y,
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: '#ff00ff'
                        }} />
                        <div style={{
                            position: 'absolute',
                            left: Math.min(x1, x2),
                            top: y + 2,
                            width: Math.abs(x2 - x1),
                            height: 2,
                            background: 'rgba(255,255,255,0.2)'
                        }} />
                    </React.Fragment>
                );
            })}
        </div>
    );
};

// Lava lamp blobs
const LavaLamp = ({ size = 100, width, height }) => {
    const w = width || size;
    const h = height || size * 1.5;
    const [blobs, setBlobs] = useState([
        { x: 30, y: 70, vx: 0.5, vy: -0.3, size: 30 },
        { x: 60, y: 40, vx: -0.3, vy: 0.4, size: 25 },
        { x: 45, y: 80, vx: 0.2, vy: -0.5, size: 20 },
    ]);

    useEffect(() => {
        const interval = setInterval(() => {
            setBlobs(prev => prev.map(b => {
                let { x, y, vx, vy, size } = b;
                x += vx;
                y += vy;
                if (x < 20 || x > 80) vx *= -1;
                if (y < 10 || y > 90) vy *= -1;
                return { x, y, vx, vy, size };
            }));
        }, 50);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            style={{
                width: w,
                height: h,
                background: 'linear-gradient(to bottom, #1a0a2e, #0a1a2e)',
                borderRadius: w / 4,
                position: 'relative',
                overflow: 'hidden',
                filter: 'blur(0.5px)'
            }}
        >
            <svg width={w} height={h} style={{ filter: 'blur(8px)' }}>
                <defs>
                    <filter id="goo">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
                        <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
                    </filter>
                </defs>
                <g filter="url(#goo)">
                    {blobs.map((b, i) => (
                        <circle
                            key={i}
                            cx={`${b.x}%`}
                            cy={`${b.y}%`}
                            r={b.size}
                            fill={`hsl(${280 + i * 30}, 100%, 60%)`}
                        />
                    ))}
                </g>
            </svg>
        </div>
    );
};

// Radar sweep
const RadarSweep = ({ size = 100 }) => {
    const [angle, setAngle] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setAngle(a => (a + 3) % 360), 30);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            style={{
                width: size,
                height: size,
                background: '#0a1a0a',
                borderRadius: '50%',
                position: 'relative',
                overflow: 'hidden',
                border: '2px solid #00ff00'
            }}
        >
            {/* Grid circles */}
            {[0.25, 0.5, 0.75].map(r => (
                <div
                    key={r}
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        width: size * r,
                        height: size * r,
                        borderRadius: '50%',
                        border: '1px solid rgba(0,255,0,0.3)',
                        transform: 'translate(-50%, -50%)'
                    }}
                />
            ))}
            {/* Sweep */}
            <div
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: size / 2,
                    height: 2,
                    background: 'linear-gradient(to right, #00ff00, transparent)',
                    transformOrigin: 'left center',
                    transform: `rotate(${angle}deg)`,
                    boxShadow: '0 0 20px #00ff00'
                }}
            />
            {/* Blips */}
            {[
                { x: 65, y: 30 },
                { x: 25, y: 60 },
                { x: 70, y: 75 }
            ].map((blip, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        left: `${blip.x}%`,
                        top: `${blip.y}%`,
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#00ff00',
                        boxShadow: '0 0 10px #00ff00',
                        opacity: ((angle - (Math.atan2(blip.y - 50, blip.x - 50) * 180 / Math.PI + 180)) % 360) < 30 ? 1 : 0.3
                    }}
                />
            ))}
        </div>
    );
};

// Noise texture
const NoiseTexture = ({ size = 100, width, height }) => {
    const canvasRef = useRef();
    const w = width || size;
    const h = height || size;

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const draw = () => {
            const imageData = ctx.createImageData(w, h);
            for (let i = 0; i < imageData.data.length; i += 4) {
                const val = Math.floor(Math.random() * 50);
                imageData.data[i] = val;
                imageData.data[i + 1] = val + Math.floor(Math.random() * 30);
                imageData.data[i + 2] = val + Math.floor(Math.random() * 50);
                imageData.data[i + 3] = 255;
            }
            ctx.putImageData(imageData, 0, 0);
        };

        const interval = setInterval(draw, 100);
        draw();
        return () => clearInterval(interval);
    }, [w, h]);

    return <canvas ref={canvasRef} width={w} height={h} style={{ borderRadius: 4 }} />;
};

// Glowing orb
const GlowingOrb = ({ size = 100, color = '#00ffff' }) => {
    const [pulse, setPulse] = useState(1);

    useEffect(() => {
        let frame = 0;
        const interval = setInterval(() => {
            frame += 0.1;
            setPulse(1 + Math.sin(frame) * 0.2);
        }, 30);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            style={{
                width: size,
                height: size,
                background: '#0a0a12',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <div
                style={{
                    width: size * 0.4 * pulse,
                    height: size * 0.4 * pulse,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                    boxShadow: `0 0 ${size * 0.3}px ${color}, 0 0 ${size * 0.5}px ${color}`,
                    transition: 'all 0.1s'
                }}
            />
        </div>
    );
};

// ============================================
// MAIN GALLERY COMPONENT
// ============================================

export default function ChaosBlocksGallery() {
    return (
        <div className="min-h-screen bg-gray-950 p-6">
            <h1 className="text-3xl font-light text-cyan-400 mb-2 tracking-wider">
                CHAOS BLOCKS
            </h1>
            <p className="text-gray-500 mb-8">Hover for border animations</p>

            {/* Row 1: Tiny blocks 25x25 */}
            <div className="mb-8">
                <h2 className="text-sm text-gray-500 mb-3">25×25 QUANTUM DOTS</h2>
                <div className="flex flex-wrap gap-2">
                    {Array(16).fill(null).map((_, i) => (
                        <BorderWrapper key={i} size={25} speed={i % 2 ? 'fast' : 'slow'} color={`hsl(${i * 22}, 100%, 60%)`}>
                            <GlowingOrb size={25} color={`hsl(${i * 22}, 100%, 60%)`} />
                        </BorderWrapper>
                    ))}
                </div>
            </div>

            {/* Row 2: 50x50 blocks with different borders */}
            <div className="mb-8">
                <h2 className="text-sm text-gray-500 mb-3">50×50 EFFECTS</h2>
                <div className="flex flex-wrap gap-3">
                    <BorderWrapper size={50} speed="slow" style="dashed">
                        <OrbitalRings size={50} />
                    </BorderWrapper>
                    <BorderWrapper size={50} speed="fast" style="dotted" color="#ff00ff">
                        <ParticleVortex size={50} />
                    </BorderWrapper>
                    <GlitchBorder size={50}>
                        <NeonDiamond size={50} />
                    </GlitchBorder>
                    <BracketBorder size={50}>
                        <PulsingCircles size={50} />
                    </BracketBorder>
                    <BorderWrapper size={50} speed="fast" style="morse" color="#ffff00">
                        <SpinningSquares size={50} />
                    </BorderWrapper>
                    <BorderWrapper size={50} speed="slow" color="#00ff88">
                        <BouncingDots size={50} />
                    </BorderWrapper>
                    <GlitchBorder size={50}>
                        <RadarSweep size={50} />
                    </GlitchBorder>
                    <BracketBorder size={50} color="#ff6600">
                        <GradientWave size={50} />
                    </BracketBorder>
                </div>
            </div>

            {/* Row 3: Terminal / CRT effects */}
            <div className="mb-8">
                <h2 className="text-sm text-gray-500 mb-3">TERMINAL / CRT</h2>
                <div className="flex flex-wrap gap-3">
                    <BorderWrapper size={100} speed="slow" color="#00ff00">
                        <TerminalText size={100} />
                    </BorderWrapper>
                    <GlitchBorder size={100}>
                        <MatrixRain size={100} />
                    </GlitchBorder>
                    <BorderWrapper size={100} speed="fast" style="morse" color="#ff0000">
                        <VHSTracking size={100} />
                    </BorderWrapper>
                    <BracketBorder size={100} color="#888888">
                        <TVStatic size={100} />
                    </BracketBorder>
                </div>
            </div>

            {/* Row 4: Tetris / Pixel blocks */}
            <div className="mb-8">
                <h2 className="text-sm text-gray-500 mb-3">BLOCKY / PIXEL</h2>
                <div className="flex flex-wrap gap-3">
                    <BorderWrapper size={100} speed="fast" color="#00ffff">
                        <TetrisBlocks size={100} />
                    </BorderWrapper>
                    <GlitchBorder size={100}>
                        <PixelGrid size={100} />
                    </GlitchBorder>
                    <BracketBorder size={100} color="#00ff88">
                        <GameOfLife size={100} />
                    </BracketBorder>
                    <BorderWrapper width={150} height={40} speed="slow" color="#ff8800">
                        <BlockyLoader width={150} height={40} />
                    </BorderWrapper>
                </div>
            </div>

            {/* Row 5: Emoji madness */}
            <div className="mb-8">
                <h2 className="text-sm text-gray-500 mb-3">EMOJI CHAOS</h2>
                <div className="flex flex-wrap gap-3">
                    <BorderWrapper size={100} speed="slow" color="#ffcc00">
                        <FloatingEmojis size={100} emojis={['✨', '🌟', '💫', '⭐', '🔮']} />
                    </BorderWrapper>
                    <GlitchBorder size={100}>
                        <EmojiRain size={100} emojis={['🔥', '💀', '👻', '🎃', '🦇']} />
                    </GlitchBorder>
                    <BracketBorder size={100} color="#ff69b4">
                        <FloatingEmojis size={100} emojis={['💖', '💕', '💗', '💓', '💝']} />
                    </BracketBorder>
                    <BorderWrapper size={100} speed="fast" color="#00ff00">
                        <EmojiRain size={100} emojis={['💰', '💵', '💎', '🏆', '👑']} />
                    </BorderWrapper>
                    <GlitchBorder size={80}>
                        <EmojiExplosion size={80} emoji="💥" />
                    </GlitchBorder>
                    <GlitchBorder size={80}>
                        <EmojiExplosion size={80} emoji="🎉" />
                    </GlitchBorder>
                    <BorderWrapper size={80} speed="fast" style="dotted" color="#ff00ff">
                        <EmojiWheel size={80} emojis={['🎰', '💎', '7️⃣', '🍒', '🔔']} />
                    </BorderWrapper>
                    <BorderWrapper size={80} speed="slow" color="#00ffff">
                        <EmojiWheel size={80} emojis={['🌍', '🌎', '🌏', '🌙', '☀️']} />
                    </BorderWrapper>
                </div>
            </div>

            {/* Row 6: Misc cool stuff */}
            <div className="mb-8">
                <h2 className="text-sm text-gray-500 mb-3">MISC EFFECTS</h2>
                <div className="flex flex-wrap gap-3">
                    <BorderWrapper size={100} speed="slow" color="#00ffff">
                        <FakeAudioViz size={100} />
                    </BorderWrapper>
                    <BracketBorder width={60} height={120} color="#ff00ff">
                        <DNASimple width={60} height={120} />
                    </BracketBorder>
                    <GlitchBorder width={60} height={100}>
                        <LavaLamp width={60} height={100} />
                    </GlitchBorder>
                    <BorderWrapper size={100} speed="fast" style="zigzag" color="#ff8800">
                        <NoiseTexture size={100} />
                    </BorderWrapper>
                </div>
            </div>

            {/* Row 7: Large featured */}
            <div className="mb-8">
                <h2 className="text-sm text-gray-500 mb-3">FEATURED 150×150</h2>
                <div className="flex flex-wrap gap-4">
                    <GlitchBorder size={150}>
                        <MatrixRain size={150} />
                    </GlitchBorder>
                    <BracketBorder size={150} color="#00ffff">
                        <OrbitalRings size={150} />
                    </BracketBorder>
                    <BorderWrapper size={150} speed="slow" style="morse" color="#ff00ff">
                        <TetrisBlocks size={150} />
                    </BorderWrapper>
                    <GlitchBorder size={150}>
                        <FloatingEmojis size={150} emojis={['🚀', '🛸', '👽', '🌌', '⚡']} />
                    </GlitchBorder>
                </div>
            </div>

            {/* Row 8: Wide blocks */}
            <div className="mb-8">
                <h2 className="text-sm text-gray-500 mb-3">WIDE BLOCKS</h2>
                <div className="flex flex-col gap-3">
                    <BorderWrapper width={300} height={50} speed="fast" color="#00ff88">
                        <FakeAudioViz width={300} height={50} />
                    </BorderWrapper>
                    <GlitchBorder width={300} height={60}>
                        <BlockyLoader width={300} height={60} />
                    </GlitchBorder>
                </div>
            </div>

            {/* Massive grid of tiny random blocks */}
            <div className="mb-8">
                <h2 className="text-sm text-gray-500 mb-3">MASSIVE GRID</h2>
                <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))' }}>
                    {Array(100).fill(null).map((_, i) => {
                        const effects = [
                            <GlowingOrb size={40} color={`hsl(${i * 12}, 100%, 60%)`} />,
                            <PulsingCircles size={40} />,
                            <SpinningSquares size={40} />,
                            <GradientWave size={40} />,
                            <BouncingDots size={40} />,
                            <EmojiExplosion size={40} emoji={['💎', '⭐', '🔥', '💀', '👁️'][i % 5]} />,
                        ];
                        const Effect = () => effects[i % effects.length];
                        const borders = [BorderWrapper, GlitchBorder, BracketBorder];
                        const Border = borders[i % 3];

                        return (
                            <Border
                                key={i}
                                size={40}
                                speed={i % 2 ? 'fast' : 'slow'}
                                color={`hsl(${i * 12}, 100%, 60%)`}
                            >
                                <Effect />
                            </Border>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
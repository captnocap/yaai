import React, { useRef, useEffect, useState, useCallback } from 'react';

// ============================================
// CRT WRAPPER - The monitor frame/effects
// ============================================

const CRTWrapper = ({ children, width = 200, height = 120, glowColor = '#00ff00' }) => {
    return (
        <div
            className="relative overflow-hidden"
            style={{
                width,
                height,
                background: '#0a0a0a',
                borderRadius: 4,
                border: '1px solid #222',
                boxShadow: `
          inset 0 0 60px rgba(0,0,0,0.9),
          inset 0 0 20px rgba(0,255,0,0.05),
          0 0 2px #000
        `
            }}
        >
            {/* Main content */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>

            {/* Scanlines */}
            <div
                className="absolute inset-0 pointer-events-none z-20"
                style={{
                    background: `repeating-linear-gradient(
            0deg,
            rgba(0,0,0,0) 0px,
            rgba(0,0,0,0) 1px,
            rgba(0,0,0,0.3) 1px,
            rgba(0,0,0,0.3) 2px
          )`
                }}
            />

            {/* RGB pixel effect */}
            <div
                className="absolute inset-0 pointer-events-none z-20"
                style={{
                    background: `repeating-linear-gradient(
            90deg,
            rgba(255,0,0,0.03) 0px,
            rgba(0,255,0,0.03) 1px,
            rgba(0,0,255,0.03) 2px,
            transparent 3px
          )`,
                    backgroundSize: '3px 100%'
                }}
            />

            {/* Screen flicker */}
            <div
                className="absolute inset-0 pointer-events-none z-20 animate-flicker"
                style={{ background: 'rgba(255,255,255,0.02)' }}
            />

            {/* Curved screen vignette */}
            <div
                className="absolute inset-0 pointer-events-none z-30"
                style={{
                    boxShadow: `
            inset 0 0 ${Math.min(width, height) / 3}px rgba(0,0,0,0.8),
            inset 0 0 ${Math.min(width, height) / 6}px rgba(0,0,0,0.5)
          `,
                    borderRadius: 4
                }}
            />

            {/* Phosphor glow on edges */}
            <div
                className="absolute inset-0 pointer-events-none z-5"
                style={{
                    boxShadow: `inset 0 0 30px ${glowColor}15`
                }}
            />

            {/* Subtle screen curve highlight */}
            <div
                className="absolute pointer-events-none z-25"
                style={{
                    top: '5%',
                    left: '10%',
                    right: '60%',
                    height: '15%',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
                    borderRadius: '50%',
                    filter: 'blur(4px)'
                }}
            />

            <style>{`
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          92% { opacity: 1; }
          93% { opacity: 0.8; }
          94% { opacity: 1; }
          97% { opacity: 0.9; }
          98% { opacity: 1; }
        }
        .animate-flicker { animation: flicker 4s infinite; }
      `}</style>
        </div>
    );
};

// ============================================
// SCREENSAVER: Matrix Rain
// ============================================

const MatrixScreensaver = ({ width, height }) => {
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const chars = 'アイウエオカキクケコサシスセソタチツテト0123456789';
        const fontSize = 10;
        const columns = Math.floor(width / fontSize);
        const drops = Array(columns).fill(1);

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        const draw = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, width, height);

            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const char = chars[Math.floor(Math.random() * chars.length)];
                const brightness = Math.random() > 0.95 ? '#fff' : '#0f0';
                ctx.fillStyle = brightness;
                ctx.fillText(char, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        };

        const interval = setInterval(draw, 45);
        return () => clearInterval(interval);
    }, [width, height]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
};

// ============================================
// SCREENSAVER: Starfield
// ============================================

const StarfieldScreensaver = ({ width, height }) => {
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const stars = Array(100).fill(null).map(() => ({
            x: Math.random() * width,
            y: Math.random() * height,
            z: Math.random() * width,
            pz: 0
        }));

        const draw = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(0, 0, width, height);

            const cx = width / 2;
            const cy = height / 2;

            stars.forEach(star => {
                star.pz = star.z;
                star.z -= 2;

                if (star.z < 1) {
                    star.x = Math.random() * width;
                    star.y = Math.random() * height;
                    star.z = width;
                    star.pz = width;
                }

                const sx = (star.x - cx) * (width / star.z) + cx;
                const sy = (star.y - cy) * (width / star.z) + cy;
                const px = (star.x - cx) * (width / star.pz) + cx;
                const py = (star.y - cy) * (width / star.pz) + cy;

                const size = (1 - star.z / width) * 2;
                const alpha = (1 - star.z / width);

                ctx.strokeStyle = `rgba(0, 255, 0, ${alpha})`;
                ctx.lineWidth = size;
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(sx, sy);
                ctx.stroke();
            });
        };

        const interval = setInterval(draw, 30);
        return () => clearInterval(interval);
    }, [width, height]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
};

// ============================================
// SCREENSAVER: Bouncing Logo
// ============================================

const BouncingLogoScreensaver = ({ width, height, text = 'IDLE' }) => {
    const [pos, setPos] = useState({ x: 20, y: 20, vx: 1.5, vy: 1, hue: 120 });

    useEffect(() => {
        const interval = setInterval(() => {
            setPos(p => {
                let { x, y, vx, vy, hue } = p;
                x += vx;
                y += vy;

                const textWidth = text.length * 12;
                const textHeight = 16;

                if (x <= 0 || x + textWidth >= width) {
                    vx *= -1;
                    hue = (hue + 60) % 360;
                }
                if (y <= textHeight || y >= height) {
                    vy *= -1;
                    hue = (hue + 60) % 360;
                }

                return { x: Math.max(0, Math.min(x, width - textWidth)), y: Math.max(textHeight, Math.min(y, height)), vx, vy, hue };
            });
        }, 30);
        return () => clearInterval(interval);
    }, [width, height, text]);

    return (
        <div style={{ width, height, background: '#000', position: 'relative' }}>
            <span
                style={{
                    position: 'absolute',
                    left: pos.x,
                    top: pos.y,
                    color: `hsl(${pos.hue}, 100%, 50%)`,
                    fontFamily: 'monospace',
                    fontSize: 14,
                    fontWeight: 'bold',
                    textShadow: `0 0 10px hsl(${pos.hue}, 100%, 50%)`
                }}
            >
                {text}
            </span>
        </div>
    );
};

// ============================================
// SCREENSAVER: Plasma
// ============================================

const PlasmaScreensaver = ({ width, height }) => {
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let time = 0;

        const draw = () => {
            const imageData = ctx.createImageData(width, height);

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const value = Math.sin(x / 16 + time) +
                        Math.sin(y / 8 + time) +
                        Math.sin((x + y) / 16 + time) +
                        Math.sin(Math.sqrt(x * x + y * y) / 8 + time);

                    const normalized = (value + 4) / 8;
                    const i = (y * width + x) * 4;

                    imageData.data[i] = 0;
                    imageData.data[i + 1] = Math.floor(normalized * 255 * 0.6);
                    imageData.data[i + 2] = 0;
                    imageData.data[i + 3] = 255;
                }
            }

            ctx.putImageData(imageData, 0, 0);
            time += 0.05;
        };

        const interval = setInterval(draw, 50);
        return () => clearInterval(interval);
    }, [width, height]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
};

// ============================================
// SCREENSAVER: Pipes (classic)
// ============================================

const PipesScreensaver = ({ width, height }) => {
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        let x = width / 2;
        let y = height / 2;
        let dir = 0; // 0=right, 1=down, 2=left, 3=up
        const step = 8;
        let hue = 120;
        let steps = 0;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        const draw = () => {
            // Maybe change direction
            if (Math.random() > 0.85) {
                dir = (dir + (Math.random() > 0.5 ? 1 : 3)) % 4;
                hue = (hue + 30) % 360;
            }

            const dx = [step, 0, -step, 0][dir];
            const dy = [0, step, 0, -step][dir];

            const nx = x + dx;
            const ny = y + dy;

            // Bounce off walls
            if (nx < 0 || nx > width || ny < 0 || ny > height) {
                dir = (dir + 2) % 4;
                return;
            }

            ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.shadowBlur = 5;
            ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(nx, ny);
            ctx.stroke();

            x = nx;
            y = ny;
            steps++;

            // Reset after a while
            if (steps > 300) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.fillRect(0, 0, width, height);
                steps = 0;
                x = Math.random() * width;
                y = Math.random() * height;
            }
        };

        const interval = setInterval(draw, 30);
        return () => clearInterval(interval);
    }, [width, height]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
};

// ============================================
// SCREENSAVER: Flying Toasters (simplified blocks)
// ============================================

const FlyingBlocksScreensaver = ({ width, height }) => {
    const [blocks, setBlocks] = useState(() =>
        Array(6).fill(null).map(() => ({
            id: Math.random(),
            x: Math.random() * width,
            y: Math.random() * height,
            vx: -1 - Math.random() * 2,
            vy: 0.5 + Math.random(),
            size: 8 + Math.random() * 8,
            char: ['█', '▓', '▒', '░', '■', '□'][Math.floor(Math.random() * 6)]
        }))
    );

    useEffect(() => {
        const interval = setInterval(() => {
            setBlocks(prev => prev.map(b => {
                let { x, y, vx, vy, ...rest } = b;
                x += vx;
                y += vy;

                if (x < -20) x = width + 10;
                if (y > height + 20) y = -10;

                return { x, y, vx, vy, ...rest };
            }));
        }, 40);
        return () => clearInterval(interval);
    }, [width, height]);

    return (
        <div style={{ width, height, background: '#000', position: 'relative', overflow: 'hidden' }}>
            {blocks.map(b => (
                <span
                    key={b.id}
                    style={{
                        position: 'absolute',
                        left: b.x,
                        top: b.y,
                        color: '#0f0',
                        fontSize: b.size,
                        fontFamily: 'monospace',
                        textShadow: '0 0 5px #0f0'
                    }}
                >
                    {b.char}
                </span>
            ))}
        </div>
    );
};

// ============================================
// SCREENSAVER: Sine Wave
// ============================================

const SineWaveScreensaver = ({ width, height }) => {
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let offset = 0;

        const draw = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, width, height);

            ctx.strokeStyle = '#0f0';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#0f0';
            ctx.beginPath();

            for (let x = 0; x < width; x++) {
                const y = height / 2 +
                    Math.sin((x + offset) * 0.05) * 20 +
                    Math.sin((x + offset) * 0.02) * 15 +
                    Math.sin((x + offset * 2) * 0.01) * 10;

                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            offset += 2;
        };

        const interval = setInterval(draw, 30);
        return () => clearInterval(interval);
    }, [width, height]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
};

// ============================================
// SCREENSAVER: Glitch Static
// ============================================

const GlitchStaticScreensaver = ({ width, height }) => {
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const draw = () => {
            // Mostly black with occasional glitch
            if (Math.random() > 0.9) {
                // Glitch frame
                const imageData = ctx.createImageData(width, height);
                for (let i = 0; i < imageData.data.length; i += 4) {
                    const v = Math.random() > 0.95 ? 255 : Math.random() * 30;
                    imageData.data[i] = 0;
                    imageData.data[i + 1] = v * 0.8;
                    imageData.data[i + 2] = 0;
                    imageData.data[i + 3] = 255;
                }
                ctx.putImageData(imageData, 0, 0);

                // Random horizontal tears
                if (Math.random() > 0.5) {
                    const y = Math.floor(Math.random() * height);
                    const h = 2 + Math.floor(Math.random() * 5);
                    const shift = (Math.random() - 0.5) * 20;
                    const slice = ctx.getImageData(0, y, width, h);
                    ctx.putImageData(slice, shift, y);
                }
            } else {
                // Mostly calm with subtle noise
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fillRect(0, 0, width, height);

                // Sparse green dots
                ctx.fillStyle = '#0f0';
                for (let i = 0; i < 5; i++) {
                    if (Math.random() > 0.7) {
                        ctx.fillRect(
                            Math.floor(Math.random() * width),
                            Math.floor(Math.random() * height),
                            1, 1
                        );
                    }
                }
            }
        };

        const interval = setInterval(draw, 80);
        return () => clearInterval(interval);
    }, [width, height]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
};

// ============================================
// TERMINAL CONTENT RENDERER
// ============================================

const TerminalContent = ({ lines = [], width, height, fontSize = 10 }) => {
    const containerRef = useRef();

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [lines]);

    return (
        <div
            ref={containerRef}
            style={{
                width,
                height,
                background: 'transparent',
                overflow: 'hidden',
                padding: 4,
                boxSizing: 'border-box'
            }}
        >
            <div style={{ fontFamily: 'monospace', fontSize, lineHeight: 1.3 }}>
                {lines.map((line, i) => (
                    <div
                        key={i}
                        style={{
                            color: line.color || '#0f0',
                            textShadow: `0 0 5px ${line.color || '#0f0'}`,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}
                    >
                        {line.text}
                    </div>
                ))}
                <span className="animate-blink" style={{ color: '#0f0' }}>█</span>
            </div>
            <style>{`
        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
        .animate-blink { animation: blink 1s infinite; }
      `}</style>
        </div>
    );
};

// ============================================
// MAIN MICRO TERMINAL COMPONENT
// ============================================

const MicroTerminal = ({
    width = 200,
    height = 120,
    screensaver = 'matrix', // matrix, starfield, bouncing, plasma, pipes, blocks, sine, glitch
    isActive = false,
    lines = [],
    glowColor = '#00ff00',
    idleText = 'IDLE'
}) => {
    const screensavers = {
        matrix: MatrixScreensaver,
        starfield: StarfieldScreensaver,
        bouncing: BouncingLogoScreensaver,
        plasma: PlasmaScreensaver,
        pipes: PipesScreensaver,
        blocks: FlyingBlocksScreensaver,
        sine: SineWaveScreensaver,
        glitch: GlitchStaticScreensaver
    };

    const Screensaver = screensavers[screensaver] || MatrixScreensaver;
    const innerWidth = width - 2;
    const innerHeight = height - 2;

    return (
        <CRTWrapper width={width} height={height} glowColor={glowColor}>
            {isActive ? (
                <TerminalContent lines={lines} width={innerWidth} height={innerHeight} />
            ) : (
                <Screensaver width={innerWidth} height={innerHeight} text={idleText} />
            )}
        </CRTWrapper>
    );
};

// ============================================
// DEMO/GALLERY COMPONENT
// ============================================

const MicroTerminalDemo = () => {
    const [activeTerm, setActiveTerm] = useState(null);
    const [demoLines, setDemoLines] = useState([]);

    // Simulate log streaming
    useEffect(() => {
        if (activeTerm !== null) {
            const messages = [
                { text: '> Connecting to API...', color: '#0f0' },
                { text: '> POST /v1/chat/completions', color: '#0ff' },
                { text: '> Status: 200 OK', color: '#0f0' },
                { text: '> Tokens: 127 in, 89 out', color: '#ff0' },
                { text: '> Latency: 234ms', color: '#0f0' },
                { text: '> Stream started...', color: '#0ff' },
                { text: '> Chunk 1: 12 tokens', color: '#0f0' },
                { text: '> Chunk 2: 8 tokens', color: '#0f0' },
                { text: '> Chunk 3: 15 tokens', color: '#0f0' },
                { text: '> Stream complete', color: '#0f0' },
                { text: '> Total: 35 tokens', color: '#ff0' },
            ];

            let i = 0;
            setDemoLines([]);

            const interval = setInterval(() => {
                if (i < messages.length) {
                    setDemoLines(prev => [...prev, messages[i]]);
                    i++;
                }
            }, 400);

            return () => clearInterval(interval);
        }
    }, [activeTerm]);

    const terminals = [
        { screensaver: 'matrix', label: 'Matrix Rain' },
        { screensaver: 'starfield', label: 'Starfield' },
        { screensaver: 'bouncing', label: 'Bouncing Logo' },
        { screensaver: 'plasma', label: 'Plasma' },
        { screensaver: 'pipes', label: 'Pipes' },
        { screensaver: 'blocks', label: 'Flying Blocks' },
        { screensaver: 'sine', label: 'Sine Wave' },
        { screensaver: 'glitch', label: 'Glitch Static' },
    ];

    return (
        <div className="min-h-screen bg-gray-950 p-8">
            <h1 className="text-2xl font-light text-green-400 mb-2 tracking-wider font-mono">
                MICRO TERMINALS
            </h1>
            <p className="text-gray-500 mb-8 text-sm font-mono">Click to activate / show logs</p>

            {/* Standard size */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-4 tracking-wider font-mono">200×120 STANDARD</h2>
                <div className="flex flex-wrap gap-6">
                    {terminals.map((term, i) => (
                        <div key={i} className="flex flex-col gap-2">
                            <span className="text-xs text-gray-600 font-mono">{term.label}</span>
                            <div
                                onClick={() => setActiveTerm(activeTerm === i ? null : i)}
                                className="cursor-pointer transition-transform hover:scale-105"
                            >
                                <MicroTerminal
                                    width={200}
                                    height={120}
                                    screensaver={term.screensaver}
                                    isActive={activeTerm === i}
                                    lines={activeTerm === i ? demoLines : []}
                                    idleText={term.label.toUpperCase()}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Compact sizes */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-4 tracking-wider font-mono">COMPACT SIZES</h2>
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-gray-600 font-mono">150×80</span>
                        <MicroTerminal width={150} height={80} screensaver="matrix" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-gray-600 font-mono">120×60</span>
                        <MicroTerminal width={120} height={60} screensaver="starfield" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-gray-600 font-mono">100×50</span>
                        <MicroTerminal width={100} height={50} screensaver="sine" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-gray-600 font-mono">80×40</span>
                        <MicroTerminal width={80} height={40} screensaver="glitch" />
                    </div>
                </div>
            </section>

            {/* Wide format */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-4 tracking-wider font-mono">WIDE FORMAT (strips)</h2>
                <div className="flex flex-col gap-4">
                    <MicroTerminal width={400} height={60} screensaver="sine" />
                    <MicroTerminal width={400} height={60} screensaver="pipes" />
                    <MicroTerminal width={400} height={60} screensaver="matrix" />
                </div>
            </section>

            {/* Color variants */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-4 tracking-wider font-mono">PHOSPHOR COLORS</h2>
                <div className="flex flex-wrap gap-4">
                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-gray-600 font-mono">P1 Green</span>
                        <MicroTerminal width={150} height={90} screensaver="matrix" glowColor="#00ff00" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-gray-600 font-mono">P3 Amber</span>
                        <CRTWrapper width={150} height={90} glowColor="#ffaa00">
                            <AmberMatrix width={148} height={88} />
                        </CRTWrapper>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-gray-600 font-mono">P4 White</span>
                        <CRTWrapper width={150} height={90} glowColor="#ffffff">
                            <WhiteStatic width={148} height={88} />
                        </CRTWrapper>
                    </div>
                </div>
            </section>
        </div>
    );
};

// Amber variant of matrix
const AmberMatrix = ({ width, height }) => {
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const chars = '0123456789ABCDEF';
        const fontSize = 10;
        const columns = Math.floor(width / fontSize);
        const drops = Array(columns).fill(1);

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        const draw = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, width, height);
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const char = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillStyle = Math.random() > 0.95 ? '#fff' : '#fa0';
                ctx.fillText(char, i * fontSize, drops[i] * fontSize);
                if (drops[i] * fontSize > height && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            }
        };

        const interval = setInterval(draw, 45);
        return () => clearInterval(interval);
    }, [width, height]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
};

// White phosphor static
const WhiteStatic = ({ width, height }) => {
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const draw = () => {
            const imageData = ctx.createImageData(width, height);
            for (let i = 0; i < imageData.data.length; i += 4) {
                const v = Math.random() * 60;
                imageData.data[i] = v;
                imageData.data[i + 1] = v;
                imageData.data[i + 2] = v;
                imageData.data[i + 3] = 255;
            }
            ctx.putImageData(imageData, 0, 0);
        };

        const interval = setInterval(draw, 60);
        return () => clearInterval(interval);
    }, [width, height]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
};

// ============================================
// EXPORTS
// ============================================

export {
    CRTWrapper,
    MicroTerminal,
    TerminalContent,
    MatrixScreensaver,
    StarfieldScreensaver,
    BouncingLogoScreensaver,
    PlasmaScreensaver,
    PipesScreensaver,
    FlyingBlocksScreensaver,
    SineWaveScreensaver,
    GlitchStaticScreensaver,
    AmberMatrix,
    WhiteStatic
};

export default MicroTerminalDemo;
import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';

// ============================================
// UTILITY: Mini Three.js Scene Hook
// ============================================
const useMiniScene = (canvasRef, width, height, setupFn, deps = []) => {
    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
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
    }, [width, height, ...deps]);
};

// Shared sprite texture
const createSprite = (color1 = 'rgba(255,255,255,1)', color2 = 'rgba(0,255,255,0.5)') => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(0.4, color2);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
};

// ============================================
// BORDER WRAPPERS (Enhanced)
// ============================================

const BorderWrapper = ({ children, size = 100, width, height, speed = 'slow', color = '#00ffff', style = 'dashed' }) => {
    const w = width || size;
    const h = height || size;
    const [hovered, setHovered] = useState(false);

    const dashConfig = {
        dashed: { array: '8,4', offset: speed === 'fast' ? 100 : 30 },
        dotted: { array: '2,4', offset: speed === 'fast' ? 80 : 20 },
        morse: { array: '12,4,4,4', offset: speed === 'fast' ? 120 : 40 },
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
                    x="1" y="1" width={w - 2} height={h - 2}
                    fill="none" stroke={color} strokeWidth="2"
                    strokeDasharray={config.array}
                    style={{ animation: hovered ? `marchingAnts ${duration} linear infinite` : 'none' }}
                />
            </svg>
            <style>{`@keyframes marchingAnts { to { stroke-dashoffset: ${config.offset * 2}; } }`}</style>
        </div>
    );
};

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
                    <div className="absolute inset-0 pointer-events-none border-2 border-cyan-400" style={{ animation: 'glitch1 0.1s linear infinite' }} />
                    <div className="absolute inset-0 pointer-events-none border-2" style={{ borderColor: '#ff00ff', animation: 'glitch2 0.15s linear infinite' }} />
                </>
            )}
            <style>{`
        @keyframes glitch1 { 0%,100%{transform:translate(0)} 25%{transform:translate(-2px,2px)} 50%{transform:translate(2px,-2px)} 75%{transform:translate(-1px,-1px)} }
        @keyframes glitch2 { 0%,100%{transform:translate(0)} 25%{transform:translate(2px,-2px)} 50%{transform:translate(-2px,2px)} 75%{transform:translate(1px,1px)} }
      `}</style>
        </div>
    );
};

const ScanlineBorder = ({ children, size = 100, width, height }) => {
    const w = width || size;
    const h = height || size;

    return (
        <div style={{ width: w, height: h, position: 'relative' }}>
            {children}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `repeating-linear-gradient(0deg, rgba(0,0,0,0.2) 0px, rgba(0,0,0,0.2) 1px, transparent 1px, transparent 2px)`,
                    boxShadow: 'inset 0 0 30px rgba(0,255,255,0.1)'
                }}
            />
        </div>
    );
};

// ============================================
// 25×25 ICON-GRADE EFFECTS
// ============================================

// Spark Core - pulsing star with micro sparks
const SparkCore = ({ size = 25 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 3;

        // Core glow
        const coreGeo = new THREE.CircleGeometry(0.3, 32);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
        const core = new THREE.Mesh(coreGeo, coreMat);
        scene.add(core);

        // Sparks
        const sparkCount = 8;
        const sparks = [];
        for (let i = 0; i < sparkCount; i++) {
            const geo = new THREE.CircleGeometry(0.05, 8);
            const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0 });
            const spark = new THREE.Mesh(geo, mat);
            spark.userData = { angle: (i / sparkCount) * Math.PI * 2, dist: 0, active: false, delay: Math.random() * 2 };
            sparks.push(spark);
            scene.add(spark);
        }

        return {
            update: (t) => {
                core.scale.setScalar(1 + Math.sin(t * 5) * 0.3);
                coreMat.opacity = 0.8 + Math.sin(t * 5) * 0.2;

                sparks.forEach(s => {
                    if (t > s.userData.delay && !s.userData.active) {
                        s.userData.active = true;
                        s.userData.dist = 0;
                    }
                    if (s.userData.active) {
                        s.userData.dist += 0.05;
                        s.position.x = Math.cos(s.userData.angle) * s.userData.dist;
                        s.position.y = Math.sin(s.userData.angle) * s.userData.dist;
                        s.material.opacity = Math.max(0, 1 - s.userData.dist);
                        if (s.userData.dist > 1.2) {
                            s.userData.dist = 0;
                            s.userData.angle += 0.5;
                        }
                    }
                });
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#0a0a12', borderRadius: 2 }} />;
};

// Neon Ripple Dot
const NeonRipple = ({ size = 25, color = '#00ffff' }) => {
    const [rings, setRings] = useState([0, 0.33, 0.66]);

    useEffect(() => {
        const interval = setInterval(() => {
            setRings(prev => prev.map(r => (r + 0.02) % 1));
        }, 30);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ width: size, height: size, background: '#0a0a12', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
            {rings.map((r, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        left: '50%', top: '50%',
                        width: size * r, height: size * r,
                        borderRadius: '50%',
                        border: `1px solid ${color}`,
                        transform: 'translate(-50%, -50%)',
                        opacity: 1 - r
                    }}
                />
            ))}
            <div style={{
                position: 'absolute',
                left: '50%', top: '50%',
                width: 4, height: 4,
                borderRadius: '50%',
                background: color,
                transform: 'translate(-50%, -50%)',
                boxShadow: `0 0 6px ${color}`
            }} />
        </div>
    );
};

// Micro Portal
const MicroPortal = ({ size = 25 }) => {
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setRotation(r => r + 3), 30);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ width: size, height: size, background: '#0a0a12', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
            <div style={{
                position: 'absolute', inset: 3,
                borderRadius: '50%',
                border: '2px solid #ff00ff',
                boxShadow: '0 0 8px #ff00ff'
            }} />
            <div style={{
                position: 'absolute', inset: 6,
                borderRadius: '50%',
                background: `conic-gradient(from ${rotation}deg, #00ffff, #ff00ff, #00ffff)`,
                filter: 'blur(2px)',
                opacity: 0.6
            }} />
        </div>
    );
};

// Electric Crosshair
const ElectricCrosshair = ({ size = 25 }) => {
    const [jitter, setJitter] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const interval = setInterval(() => {
            setJitter({
                x: (Math.random() - 0.5) * 2,
                y: (Math.random() - 0.5) * 2
            });
        }, 50);
        return () => clearInterval(interval);
    }, []);

    const center = size / 2;
    const len = size * 0.35;

    return (
        <svg width={size} height={size} style={{ background: '#0a0a12', borderRadius: 2 }}>
            <g transform={`translate(${jitter.x}, ${jitter.y})`} style={{ filter: 'drop-shadow(0 0 2px #00ffff)' }}>
                <line x1={center} y1={center - len} x2={center} y2={center - 3} stroke="#00ffff" strokeWidth="1" />
                <line x1={center} y1={center + 3} x2={center} y2={center + len} stroke="#00ffff" strokeWidth="1" />
                <line x1={center - len} y1={center} x2={center - 3} y2={center} stroke="#00ffff" strokeWidth="1" />
                <line x1={center + 3} y1={center} x2={center + len} y2={center} stroke="#00ffff" strokeWidth="1" />
            </g>
        </svg>
    );
};

// Orbit Dot Duo
const OrbitDotDuo = ({ size = 25 }) => {
    const [angle, setAngle] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setAngle(a => a + 0.1), 30);
        return () => clearInterval(interval);
    }, []);

    const cx = size / 2, cy = size / 2, r = size * 0.3;

    return (
        <div style={{ width: size, height: size, background: '#0a0a12', borderRadius: 2, position: 'relative' }}>
            <div style={{
                position: 'absolute',
                left: cx + Math.cos(angle) * r - 2,
                top: cy + Math.sin(angle) * r - 2,
                width: 4, height: 4,
                borderRadius: '50%',
                background: '#00ffff',
                boxShadow: '0 0 4px #00ffff'
            }} />
            <div style={{
                position: 'absolute',
                left: cx + Math.cos(angle + Math.PI) * r - 2,
                top: cy + Math.sin(angle + Math.PI) * r - 2,
                width: 4, height: 4,
                borderRadius: '50%',
                background: '#ff00ff',
                boxShadow: '0 0 4px #ff00ff'
            }} />
        </div>
    );
};

// Comet Pin
const CometPin = ({ size = 25 }) => {
    const [pos, setPos] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setPos(p => {
                const next = p + 0.08 * (1 - p * 0.8);
                return next > 1 ? 0 : next;
            });
        }, 30);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ width: size, height: size, background: '#0a0a12', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
            <div style={{
                position: 'absolute',
                left: pos * size - 3,
                top: size / 2 - 2,
                width: 6, height: 4,
                borderRadius: 2,
                background: `linear-gradient(to right, transparent, #ffff00, #ffffff)`,
                boxShadow: '0 0 6px #ffff00'
            }} />
        </div>
    );
};

// Glitch Badge
const GlitchBadge = ({ size = 25 }) => {
    const [glitch, setGlitch] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.9) {
                setGlitch(true);
                setTimeout(() => setGlitch(false), 100);
            }
        }, 100);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{
            width: size, height: size,
            background: '#0a0a12',
            borderRadius: 2,
            border: '1px solid #00ffff',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {glitch && (
                <>
                    <div style={{ position: 'absolute', top: '30%', left: 0, right: 0, height: 2, background: '#ff0000', transform: 'translateX(3px)' }} />
                    <div style={{ position: 'absolute', top: '60%', left: 0, right: 0, height: 2, background: '#00ff00', transform: 'translateX(-2px)' }} />
                </>
            )}
        </div>
    );
};

// Prism Ping
const PrismPing = ({ size = 25 }) => {
    const [hue, setHue] = useState(0);
    const [ping, setPing] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setHue(h => (h + 2) % 360);
            setPing(p => (p + 0.03) % 1);
        }, 30);
        return () => clearInterval(interval);
    }, []);

    const cx = size / 2, cy = size / 2;

    return (
        <svg width={size} height={size} style={{ background: '#0a0a12', borderRadius: 2 }}>
            <polygon
                points={`${cx},${cy - 6} ${cx + 5},${cy + 4} ${cx - 5},${cy + 4}`}
                fill={`hsl(${hue}, 100%, 60%)`}
                style={{ filter: `drop-shadow(0 0 4px hsl(${hue}, 100%, 60%))` }}
            />
            <circle
                cx={cx} cy={cy}
                r={size * 0.4 * ping}
                fill="none"
                stroke={`hsl(${hue}, 100%, 70%)`}
                strokeWidth="1"
                opacity={1 - ping}
            />
        </svg>
    );
};

// ============================================
// 50×25 PILL/STATUS STRIP EFFECTS
// ============================================

// Scan Sweep
const ScanSweep = ({ width = 50, height = 25, color = '#00ffff' }) => {
    const [pos, setPos] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setPos(p => (p + 0.02) % 1), 30);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ width, height, background: '#0a0a12', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
            <div style={{
                position: 'absolute',
                left: pos * width - 10,
                top: 0, bottom: 0,
                width: 20,
                background: `linear-gradient(to right, transparent, ${color}, transparent)`,
                boxShadow: `0 0 10px ${color}`
            }} />
        </div>
    );
};

// Oscilloscope
const Oscilloscope = ({ width = 50, height = 25 }) => {
    const canvasRef = useRef();
    const [phase, setPhase] = useState(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const draw = () => {
            ctx.fillStyle = 'rgba(10, 10, 18, 0.3)';
            ctx.fillRect(0, 0, width, height);

            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 4;
            ctx.shadowColor = '#00ff88';
            ctx.beginPath();

            for (let x = 0; x < width; x++) {
                const y = height / 2 + Math.sin((x * 0.2) + phase) * (height * 0.3) * Math.sin(x * 0.05 + phase * 0.5);
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        };

        const interval = setInterval(() => {
            setPhase(p => p + 0.15);
            draw();
        }, 30);

        return () => clearInterval(interval);
    }, [width, height, phase]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ background: '#0a0a12', borderRadius: 2 }} />;
};

// Laser Duplex
const LaserDuplex = ({ width = 50, height = 25 }) => {
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setOffset(o => o + 0.1), 30);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ width, height, background: '#0a0a12', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
            <div style={{
                position: 'absolute',
                left: 0, right: 0,
                top: height * 0.3 + Math.sin(offset) * 3,
                height: 2,
                background: `hsl(${(offset * 30) % 360}, 100%, 60%)`,
                boxShadow: `0 0 6px hsl(${(offset * 30) % 360}, 100%, 60%)`
            }} />
            <div style={{
                position: 'absolute',
                left: 0, right: 0,
                top: height * 0.7 + Math.sin(offset + 1) * 3,
                height: 2,
                background: `hsl(${(offset * 30 + 180) % 360}, 100%, 60%)`,
                boxShadow: `0 0 6px hsl(${(offset * 30 + 180) % 360}, 100%, 60%)`
            }} />
        </div>
    );
};

// Data Stream
const DataStream = ({ width = 50, height = 25 }) => {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        const interval = setInterval(() => {
            setParticles(prev => {
                const next = prev.map(p => ({ ...p, x: p.x + p.speed })).filter(p => p.x < width + 5);
                if (Math.random() > 0.5 && next.length < 20) {
                    next.push({
                        id: Date.now() + Math.random(),
                        x: -5,
                        y: Math.floor(Math.random() * 3) * (height / 3) + height / 6,
                        speed: 1 + Math.random() * 2,
                        char: String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96))
                    });
                }
                return next;
            });
        }, 50);
        return () => clearInterval(interval);
    }, [width, height]);

    return (
        <div style={{ width, height, background: '#0a0a12', borderRadius: 2, position: 'relative', overflow: 'hidden', fontFamily: 'monospace' }}>
            {particles.map(p => (
                <span key={p.id} style={{
                    position: 'absolute',
                    left: p.x,
                    top: p.y,
                    color: '#00ffff',
                    fontSize: 8,
                    textShadow: '0 0 4px #00ffff'
                }}>{p.char}</span>
            ))}
        </div>
    );
};

// Phase Bars
const PhaseBars = ({ width = 50, height = 25 }) => {
    const [time, setTime] = useState(0);
    const bars = 8;

    useEffect(() => {
        const interval = setInterval(() => setTime(t => t + 0.1), 30);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{
            width, height,
            background: '#0a0a12',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            padding: '0 4px'
        }}>
            {Array(bars).fill(null).map((_, i) => {
                const h = 0.3 + Math.sin(time + i * 0.5) * 0.5;
                return (
                    <div key={i} style={{
                        width: 3,
                        height: height * h * 0.8,
                        background: `hsl(${180 + i * 20}, 100%, 60%)`,
                        boxShadow: `0 0 4px hsl(${180 + i * 20}, 100%, 60%)`,
                        borderRadius: 1
                    }} />
                );
            })}
        </div>
    );
};

// Voltage Crawl
const VoltageCrawl = ({ width = 50, height = 25 }) => {
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const draw = () => {
            ctx.fillStyle = '#0a0a12';
            ctx.fillRect(0, 0, width, height);

            ctx.strokeStyle = '#88ffff';
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 6;
            ctx.shadowColor = '#00ffff';
            ctx.beginPath();
            ctx.moveTo(0, height / 2);

            let x = 0;
            while (x < width) {
                const segLen = 3 + Math.random() * 5;
                const y = height / 2 + (Math.random() - 0.5) * height * 0.7;
                ctx.lineTo(x + segLen, y);
                x += segLen;
            }
            ctx.stroke();
        };

        const interval = setInterval(draw, 80);
        draw();
        return () => clearInterval(interval);
    }, [width, height]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ borderRadius: 2 }} />;
};

// Neon Ribbon
const NeonRibbon = ({ width = 50, height = 25 }) => {
    const [points, setPoints] = useState([]);

    useEffect(() => {
        const interval = setInterval(() => {
            setPoints(prev => {
                const next = prev.map(p => ({ ...p, x: p.x + 1.5 })).filter(p => p.x < width + 10);
                if (next.length === 0 || next[next.length - 1]?.x > 3) {
                    const lastY = next.length > 0 ? next[next.length - 1].y : height / 2;
                    next.unshift({
                        x: 0,
                        y: Math.max(4, Math.min(height - 4, lastY + (Math.random() - 0.5) * 8))
                    });
                }
                return next.slice(0, 30);
            });
        }, 30);
        return () => clearInterval(interval);
    }, [width, height]);

    return (
        <svg width={width} height={height} style={{ background: '#0a0a12', borderRadius: 2 }}>
            <defs>
                <linearGradient id="ribbonGrad">
                    <stop offset="0%" stopColor="#ff00ff" stopOpacity="0" />
                    <stop offset="100%" stopColor="#ff00ff" stopOpacity="1" />
                </linearGradient>
            </defs>
            <polyline
                points={points.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="url(#ribbonGrad)"
                strokeWidth="2"
                style={{ filter: 'drop-shadow(0 0 4px #ff00ff)' }}
            />
        </svg>
    );
};

// ============================================
// 50×50 BADGE EFFECTS
// ============================================

// Neon Mandala
const NeonMandala = ({ size = 50 }) => {
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setRotation(r => r + 1), 30);
        return () => clearInterval(interval);
    }, []);

    const cx = size / 2, cy = size / 2;
    const spokes = 8;

    return (
        <svg width={size} height={size} style={{ background: '#0a0a12', borderRadius: 2 }}>
            <g transform={`rotate(${rotation}, ${cx}, ${cy})`} style={{ filter: 'drop-shadow(0 0 3px #00ffff)' }}>
                {Array(spokes).fill(null).map((_, i) => {
                    const angle = (i / spokes) * 360;
                    return (
                        <line
                            key={i}
                            x1={cx} y1={cy}
                            x2={cx + Math.cos(angle * Math.PI / 180) * size * 0.4}
                            y2={cy + Math.sin(angle * Math.PI / 180) * size * 0.4}
                            stroke="#00ffff"
                            strokeWidth="1"
                        />
                    );
                })}
                <circle cx={cx} cy={cy} r={size * 0.15} fill="none" stroke="#ff00ff" strokeWidth="1" />
                <circle cx={cx} cy={cy} r={size * 0.3} fill="none" stroke="#00ffff" strokeWidth="1" strokeDasharray="4,4" />
            </g>
        </svg>
    );
};

// Portal Iris
const PortalIris = ({ size = 50 }) => {
    const [open, setOpen] = useState(0.5);

    useEffect(() => {
        const interval = setInterval(() => {
            setOpen(o => 0.5 + Math.sin(Date.now() * 0.002) * 0.3);
        }, 30);
        return () => clearInterval(interval);
    }, []);

    const cx = size / 2, cy = size / 2;

    return (
        <div style={{ width: size, height: size, background: '#0a0a12', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
            <div style={{
                position: 'absolute',
                left: cx - size * open * 0.3,
                top: cy - size * open * 0.3,
                width: size * open * 0.6,
                height: size * open * 0.6,
                borderRadius: '50%',
                background: 'radial-gradient(circle, #ff00ff 0%, #000 70%)',
                boxShadow: '0 0 15px #ff00ff'
            }} />
            <svg width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
                <circle cx={cx} cy={cy} r={size * 0.4} fill="none" stroke="#00ffff" strokeWidth="2" />
                {Array(6).fill(null).map((_, i) => {
                    const angle = (i / 6) * Math.PI * 2;
                    const innerR = size * 0.15 * open;
                    const outerR = size * 0.38;
                    return (
                        <line
                            key={i}
                            x1={cx + Math.cos(angle) * innerR}
                            y1={cy + Math.sin(angle) * innerR}
                            x2={cx + Math.cos(angle) * outerR}
                            y2={cy + Math.sin(angle) * outerR}
                            stroke="#00ffff"
                            strokeWidth="2"
                        />
                    );
                })}
            </svg>
        </div>
    );
};

// Spiral Galaxy
const SpiralGalaxy = ({ size = 50 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 4;

        const particleCount = 300;
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const arm = Math.floor(Math.random() * 2);
            const dist = Math.random() * 1.5;
            const angle = dist * 3 + arm * Math.PI + (Math.random() - 0.5) * 0.5;
            positions[i * 3] = Math.cos(angle) * dist;
            positions[i * 3 + 1] = Math.sin(angle) * dist;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            size: 0.05,
            color: 0x8888ff,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const galaxy = new THREE.Points(geometry, material);
        scene.add(galaxy);

        // Core
        const coreGeo = new THREE.SphereGeometry(0.15, 16, 16);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const core = new THREE.Mesh(coreGeo, coreMat);
        scene.add(core);

        return {
            update: (t) => {
                galaxy.rotation.z = t * 0.2;
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#0a0a12', borderRadius: 2 }} />;
};

// Quantum Knot (Lissajous)
const QuantumKnot = ({ size = 50 }) => {
    const [points, setPoints] = useState([]);
    const [t, setT] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setT(prev => prev + 0.05);
            const newPoints = [];
            for (let i = 0; i < 100; i++) {
                const ti = t - i * 0.05;
                const x = Math.sin(ti * 3) * size * 0.35 + size / 2;
                const y = Math.sin(ti * 2) * size * 0.35 + size / 2;
                newPoints.push({ x, y, opacity: 1 - i * 0.01 });
            }
            setPoints(newPoints);
        }, 30);
        return () => clearInterval(interval);
    }, [size, t]);

    return (
        <svg width={size} height={size} style={{ background: '#0a0a12', borderRadius: 2 }}>
            {points.map((p, i) => (
                <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={2}
                    fill={`rgba(0, 255, 255, ${p.opacity})`}
                />
            ))}
            {points[0] && (
                <circle cx={points[0].x} cy={points[0].y} r={3} fill="#ffffff" style={{ filter: 'drop-shadow(0 0 4px #00ffff)' }} />
            )}
        </svg>
    );
};

// Void Eye
const VoidEye = ({ size = 50 }) => {
    const [pulse, setPulse] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setPulse(p => p + 0.05), 30);
        return () => clearInterval(interval);
    }, []);

    const cx = size / 2, cy = size / 2;
    const innerStars = Array(12).fill(null).map(() => ({
        x: cx + (Math.random() - 0.5) * size * 0.3,
        y: cy + (Math.random() - 0.5) * size * 0.3,
        size: 1 + Math.random()
    }));

    return (
        <div style={{ width: size, height: size, background: '#0a0a12', borderRadius: 2, position: 'relative' }}>
            {/* Bright rim */}
            <div style={{
                position: 'absolute',
                inset: 4,
                borderRadius: '50%',
                border: '2px solid #00ffff',
                boxShadow: `0 0 ${10 + Math.sin(pulse) * 5}px #00ffff`
            }} />
            {/* Dark center */}
            <div style={{
                position: 'absolute',
                inset: 12,
                borderRadius: '50%',
                background: '#000'
            }} />
            {/* Inner stars */}
            <svg width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
                {innerStars.map((star, i) => (
                    <circle
                        key={i}
                        cx={star.x}
                        cy={star.y}
                        r={star.size}
                        fill="#ffffff"
                        opacity={0.3 + Math.sin(pulse + i) * 0.3}
                    />
                ))}
            </svg>
        </div>
    );
};

// Magic Sigil
const MagicSigil = ({ size = 50 }) => {
    const [draw, setDraw] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setDraw(d => (d + 0.02) % 1), 30);
        return () => clearInterval(interval);
    }, []);

    const cx = size / 2, cy = size / 2;
    const r = size * 0.35;
    const circumference = 2 * Math.PI * r;

    return (
        <svg width={size} height={size} style={{ background: '#0a0a12', borderRadius: 2 }}>
            <circle
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke="#ff00ff"
                strokeWidth="1"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - draw)}
                style={{ filter: 'drop-shadow(0 0 3px #ff00ff)' }}
            />
            <polygon
                points={Array(6).fill(null).map((_, i) => {
                    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
                    return `${cx + Math.cos(angle) * r * 0.7},${cy + Math.sin(angle) * r * 0.7}`;
                }).join(' ')}
                fill="none"
                stroke="#00ffff"
                strokeWidth="1"
                strokeDasharray={size * 3}
                strokeDashoffset={size * 3 * (1 - draw)}
                style={{ filter: 'drop-shadow(0 0 2px #00ffff)' }}
            />
        </svg>
    );
};

// ============================================
// 50×100 VERTICAL METER EFFECTS
// ============================================

// Plasma Column
const PlasmaColumn = ({ width = 50, height = 100 }) => {
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let frame = 0;

        const draw = () => {
            ctx.fillStyle = 'rgba(10, 10, 18, 0.2)';
            ctx.fillRect(0, 0, width, height);

            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, 'rgba(255, 0, 255, 0.8)');
            gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.6)');
            gradient.addColorStop(1, 'rgba(255, 0, 255, 0.8)');

            ctx.fillStyle = gradient;

            for (let y = 0; y < height; y += 2) {
                const wobble = Math.sin((y + frame) * 0.1) * 5 + Math.sin((y + frame * 2) * 0.05) * 3;
                const w = 20 + wobble;
                ctx.fillRect((width - w) / 2, y, w, 2);
            }

            frame += 2;
        };

        const interval = setInterval(draw, 30);
        return () => clearInterval(interval);
    }, [width, height]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ borderRadius: 2 }} />;
};

// Rising Sparks
const RisingSparks = ({ width = 50, height = 100 }) => {
    const [sparks, setSparks] = useState([]);

    useEffect(() => {
        const interval = setInterval(() => {
            setSparks(prev => {
                const next = prev
                    .map(s => ({ ...s, y: s.y - s.speed, opacity: s.opacity - 0.01, x: s.x + Math.sin(s.y * 0.1) * 0.5 }))
                    .filter(s => s.opacity > 0);

                if (Math.random() > 0.7 && next.length < 30) {
                    next.push({
                        id: Date.now() + Math.random(),
                        x: width * 0.3 + Math.random() * width * 0.4,
                        y: height,
                        speed: 1 + Math.random() * 2,
                        opacity: 1,
                        size: 2 + Math.random() * 3,
                        hue: Math.random() * 60 + 20
                    });
                }

                return next;
            });
        }, 30);
        return () => clearInterval(interval);
    }, [width, height]);

    return (
        <div style={{ width, height, background: '#0a0a12', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
            {sparks.map(s => (
                <div
                    key={s.id}
                    style={{
                        position: 'absolute',
                        left: s.x,
                        top: s.y,
                        width: s.size,
                        height: s.size,
                        borderRadius: '50%',
                        background: `hsl(${s.hue}, 100%, 60%)`,
                        opacity: s.opacity,
                        boxShadow: `0 0 ${s.size * 2}px hsl(${s.hue}, 100%, 60%)`
                    }}
                />
            ))}
        </div>
    );
};

// Bubble Ladder
const BubbleLadder = ({ width = 50, height = 100 }) => {
    const [bubbles, setBubbles] = useState([]);

    useEffect(() => {
        const interval = setInterval(() => {
            setBubbles(prev => {
                const next = prev
                    .map(b => ({
                        ...b,
                        y: b.y - b.speed,
                        x: b.x + Math.sin(b.y * 0.05 + b.phase) * 0.5,
                        size: b.size * (b.y < 10 ? 1.05 : 1) // grow before pop
                    }))
                    .filter(b => b.y > -10);

                if (Math.random() > 0.8 && next.length < 15) {
                    const lane = Math.floor(Math.random() * 3);
                    next.push({
                        id: Date.now() + Math.random(),
                        x: 10 + lane * 15,
                        y: height + 10,
                        speed: 0.5 + Math.random() * 1,
                        size: 4 + Math.random() * 4,
                        phase: Math.random() * Math.PI * 2
                    });
                }

                return next;
            });
        }, 30);
        return () => clearInterval(interval);
    }, [width, height]);

    return (
        <div style={{ width, height, background: '#0a0a12', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
            {bubbles.map(b => (
                <div
                    key={b.id}
                    style={{
                        position: 'absolute',
                        left: b.x - b.size / 2,
                        top: b.y - b.size / 2,
                        width: b.size,
                        height: b.size,
                        borderRadius: '50%',
                        border: '1px solid rgba(0, 255, 255, 0.6)',
                        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3), transparent)'
                    }}
                />
            ))}
        </div>
    );
};

// Aurora Strip
const AuroraStrip = ({ width = 50, height = 100 }) => {
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setOffset(o => o + 1), 30);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ width, height, borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
            <div style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(180deg, 
          hsl(${(offset) % 360}, 70%, 30%) 0%,
          hsl(${(offset + 60) % 360}, 80%, 40%) 30%,
          hsl(${(offset + 120) % 360}, 70%, 35%) 60%,
          hsl(${(offset + 180) % 360}, 80%, 30%) 100%
        )`,
                filter: 'blur(8px)',
                transform: `translateY(${Math.sin(offset * 0.02) * 10}px)`
            }} />
            <div style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(180deg, 
          transparent 0%,
          rgba(0, 255, 200, 0.2) 50%,
          transparent 100%
        )`,
                transform: `translateY(${Math.sin(offset * 0.03 + 1) * 15}px)`
            }} />
        </div>
    );
};

// Lightning Spine
const LightningSpine = ({ width = 50, height = 100 }) => {
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const draw = () => {
            ctx.fillStyle = '#0a0a12';
            ctx.fillRect(0, 0, width, height);

            ctx.strokeStyle = '#88ffff';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#00ffff';
            ctx.beginPath();

            let x = width / 2;
            ctx.moveTo(x, 0);

            for (let y = 0; y < height; y += 5) {
                x = width / 2 + (Math.random() - 0.5) * 20;
                ctx.lineTo(x, y);
            }

            ctx.stroke();
        };

        const interval = setInterval(draw, 60);
        draw();
        return () => clearInterval(interval);
    }, [width, height]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ borderRadius: 2 }} />;
};

// Chakra Stack
const ChakraStack = ({ width = 50, height = 100 }) => {
    const [time, setTime] = useState(0);
    const chakras = 7;
    const colors = ['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'];

    useEffect(() => {
        const interval = setInterval(() => setTime(t => t + 0.05), 30);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ width, height, background: '#0a0a12', borderRadius: 2, position: 'relative' }}>
            {colors.map((color, i) => {
                const y = height * 0.1 + (i / (chakras - 1)) * height * 0.8;
                const pulse = 1 + Math.sin(time + i * 0.5) * 0.3;
                return (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            left: '50%',
                            top: y,
                            width: 12 * pulse,
                            height: 12 * pulse,
                            borderRadius: '50%',
                            border: `2px solid ${color}`,
                            transform: 'translate(-50%, -50%)',
                            boxShadow: `0 0 ${8 * pulse}px ${color}`
                        }}
                    />
                );
            })}
        </div>
    );
};

// ============================================
// 100×100 MINI-DIORAMA EFFECTS
// ============================================

// Micro Black Hole
const MicroBlackHole = ({ size = 100 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 5;

        // Accretion disk particles
        const diskCount = 500;
        const diskPositions = new Float32Array(diskCount * 3);
        const diskVelocities = [];

        for (let i = 0; i < diskCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 0.8 + Math.random() * 1.5;
            diskPositions[i * 3] = Math.cos(angle) * dist;
            diskPositions[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
            diskPositions[i * 3 + 2] = Math.sin(angle) * dist;
            diskVelocities.push({ angle, dist, speed: 0.02 + (1 / dist) * 0.03 });
        }

        const diskGeo = new THREE.BufferGeometry();
        diskGeo.setAttribute('position', new THREE.BufferAttribute(diskPositions, 3));
        const diskMat = new THREE.PointsMaterial({
            size: 0.04,
            color: 0xff8800,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        const disk = new THREE.Points(diskGeo, diskMat);
        scene.add(disk);

        // Black hole center
        const holeGeo = new THREE.SphereGeometry(0.4, 32, 32);
        const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const hole = new THREE.Mesh(holeGeo, holeMat);
        scene.add(hole);

        // Event horizon glow
        const glowGeo = new THREE.RingGeometry(0.42, 0.55, 64);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        scene.add(glow);

        return {
            update: (t) => {
                const pos = diskGeo.attributes.position.array;
                for (let i = 0; i < diskCount; i++) {
                    diskVelocities[i].angle += diskVelocities[i].speed;
                    pos[i * 3] = Math.cos(diskVelocities[i].angle) * diskVelocities[i].dist;
                    pos[i * 3 + 2] = Math.sin(diskVelocities[i].angle) * diskVelocities[i].dist;
                }
                diskGeo.attributes.position.needsUpdate = true;
                disk.rotation.x = 0.5;
                glow.rotation.x = 0.5;
                glowMat.opacity = 0.4 + Math.sin(t * 3) * 0.2;
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#050508', borderRadius: 2 }} />;
};

// Cosmic Snowglobe
const CosmicSnowglobe = ({ size = 100 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 5;

        // Glass sphere (wireframe)
        const sphereGeo = new THREE.SphereGeometry(1.8, 32, 32);
        const sphereMat = new THREE.MeshBasicMaterial({
            color: 0x4488ff,
            wireframe: true,
            transparent: true,
            opacity: 0.15
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        scene.add(sphere);

        // Inner particles
        const particleCount = 200;
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];

        for (let i = 0; i < particleCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const r = Math.random() * 1.5;
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);
            velocities.push({
                vx: (Math.random() - 0.5) * 0.01,
                vy: -0.005 - Math.random() * 0.01,
                vz: (Math.random() - 0.5) * 0.01
            });
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            size: 0.05,
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        const particles = new THREE.Points(geo, mat);
        scene.add(particles);

        return {
            update: (t) => {
                const pos = geo.attributes.position.array;
                for (let i = 0; i < particleCount; i++) {
                    pos[i * 3] += velocities[i].vx;
                    pos[i * 3 + 1] += velocities[i].vy;
                    pos[i * 3 + 2] += velocities[i].vz;

                    // Bounce off sphere
                    const dist = Math.sqrt(pos[i * 3] ** 2 + pos[i * 3 + 1] ** 2 + pos[i * 3 + 2] ** 2);
                    if (dist > 1.6 || pos[i * 3 + 1] < -1.6) {
                        pos[i * 3 + 1] = 1.5;
                        velocities[i].vy = -0.005 - Math.random() * 0.01;
                    }
                }
                geo.attributes.position.needsUpdate = true;
                sphere.rotation.y = t * 0.1;
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#0a0a15', borderRadius: 2 }} />;
};

// Neon City Chip
const NeonCityChip = ({ size = 100 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.set(3, 3, 3);
        camera.lookAt(0, 0, 0);

        // Grid of buildings
        const buildings = [];
        const colors = [0x00ffff, 0xff00ff, 0x00ff88, 0xffff00];

        for (let x = -2; x <= 2; x++) {
            for (let z = -2; z <= 2; z++) {
                const height = 0.2 + Math.random() * 0.8;
                const geo = new THREE.BoxGeometry(0.3, height, 0.3);
                const edges = new THREE.EdgesGeometry(geo);
                const mat = new THREE.LineBasicMaterial({
                    color: colors[Math.floor(Math.random() * colors.length)],
                    transparent: true,
                    opacity: 0.8
                });
                const building = new THREE.LineSegments(edges, mat);
                building.position.set(x * 0.5, height / 2, z * 0.5);
                buildings.push(building);
                scene.add(building);
            }
        }

        // Flying dots
        const flyerCount = 20;
        const flyerGeo = new THREE.BufferGeometry();
        const flyerPos = new Float32Array(flyerCount * 3);
        const flyerVel = [];

        for (let i = 0; i < flyerCount; i++) {
            flyerPos[i * 3] = (Math.random() - 0.5) * 3;
            flyerPos[i * 3 + 1] = 0.5 + Math.random() * 1;
            flyerPos[i * 3 + 2] = (Math.random() - 0.5) * 3;
            flyerVel.push({ vx: (Math.random() - 0.5) * 0.02, vz: (Math.random() - 0.5) * 0.02 });
        }

        flyerGeo.setAttribute('position', new THREE.BufferAttribute(flyerPos, 3));
        const flyerMat = new THREE.PointsMaterial({ size: 0.05, color: 0xffffff });
        const flyers = new THREE.Points(flyerGeo, flyerMat);
        scene.add(flyers);

        return {
            update: (t) => {
                const pos = flyerGeo.attributes.position.array;
                for (let i = 0; i < flyerCount; i++) {
                    pos[i * 3] += flyerVel[i].vx;
                    pos[i * 3 + 2] += flyerVel[i].vz;
                    if (Math.abs(pos[i * 3]) > 1.5) flyerVel[i].vx *= -1;
                    if (Math.abs(pos[i * 3 + 2]) > 1.5) flyerVel[i].vz *= -1;
                }
                flyerGeo.attributes.position.needsUpdate = true;

                // Pulse buildings
                buildings.forEach((b, i) => {
                    b.material.opacity = 0.5 + Math.sin(t * 2 + i * 0.3) * 0.3;
                });
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#050510', borderRadius: 2 }} />;
};

// Wave Grid (from Gemini example)
const WaveGrid = ({ size = 100 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.set(0, 25, 40);
        camera.lookAt(0, 0, 0);

        const countX = 30, countZ = 15;
        const positions = [];

        for (let x = 0; x < countX; x++) {
            for (let z = 0; z < countZ; z++) {
                positions.push((x * 1.5) - ((countX * 1.5) / 2), 0, (z * 1.5) - ((countZ * 1.5) / 2));
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            size: 1.5,
            map: createSprite(),
            transparent: true,
            blending: THREE.AdditiveBlending,
            color: 0x00ffff
        });

        const particles = new THREE.Points(geometry, material);
        scene.add(particles);

        return {
            update: (t) => {
                const pos = geometry.attributes.position.array;
                let i = 0;
                for (let x = 0; x < countX; x++) {
                    for (let z = 0; z < countZ; z++) {
                        pos[i * 3 + 1] = Math.sin((x * 0.2) + t) * 2.5 + Math.sin((z * 0.3) + t) * 2.5;
                        i++;
                    }
                }
                geometry.attributes.position.needsUpdate = true;
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#050508', borderRadius: 2 }} />;
};

// Core Sphere (from Gemini)
const CoreSphere = ({ size = 100 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 60;

        const positions = [];
        const radius = 18;

        for (let i = 0; i < 800; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            positions.push(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.sin(phi) * Math.sin(theta),
                radius * Math.cos(phi)
            );
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            size: 1.2,
            map: createSprite('rgba(255,255,255,1)', 'rgba(255,0,170,0.5)'),
            transparent: true,
            blending: THREE.AdditiveBlending,
            color: 0xff00aa
        });

        const sphere = new THREE.Points(geometry, material);
        scene.add(sphere);

        return {
            update: (t) => {
                sphere.rotation.y += 0.005;
                sphere.rotation.z += 0.002;
                const scale = 1 + Math.sin(t * 2) * 0.05;
                sphere.scale.set(scale, scale, scale);
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#050508', borderRadius: 2 }} />;
};

// Warp Tunnel (from Gemini)
const WarpTunnel = ({ size = 100 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 50;

        const numRings = 20;
        const pointsPerRing = 40;
        const positions = [];

        for (let r = 0; r < numRings; r++) {
            const z = r * -10;
            for (let i = 0; i < pointsPerRing; i++) {
                const angle = (i / pointsPerRing) * Math.PI * 2;
                positions.push(Math.cos(angle) * 15, Math.sin(angle) * 15, z);
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            size: 1.0,
            map: createSprite('rgba(255,255,255,1)', 'rgba(0,255,0,0.5)'),
            transparent: true,
            blending: THREE.AdditiveBlending,
            color: 0x00ff00
        });

        const tunnel = new THREE.Points(geometry, material);
        scene.add(tunnel);

        return {
            update: () => {
                const pos = geometry.attributes.position.array;
                for (let i = 0; i < pos.length; i += 3) {
                    pos[i + 2] += 0.5;
                    const x = pos[i], y = pos[i + 1];
                    const angle = 0.01;
                    pos[i] = x * Math.cos(angle) - y * Math.sin(angle);
                    pos[i + 1] = x * Math.sin(angle) + y * Math.cos(angle);
                    if (pos[i + 2] > 40) pos[i + 2] = -150;
                }
                geometry.attributes.position.needsUpdate = true;
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#050508', borderRadius: 2 }} />;
};

// Energy Lattice Cube
const EnergyLatticeCube = ({ size = 100 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 4;

        const cubeGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const cubeEdges = new THREE.EdgesGeometry(cubeGeo);
        const cubeMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
        const cube = new THREE.LineSegments(cubeEdges, cubeMat);
        scene.add(cube);

        // Inner cube
        const innerGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const innerEdges = new THREE.EdgesGeometry(innerGeo);
        const innerMat = new THREE.LineBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.6 });
        const inner = new THREE.LineSegments(innerEdges, innerMat);
        scene.add(inner);

        // Core glow
        const coreGeo = new THREE.SphereGeometry(0.2, 16, 16);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const core = new THREE.Mesh(coreGeo, coreMat);
        scene.add(core);

        return {
            update: (t) => {
                cube.rotation.x = t * 0.3;
                cube.rotation.y = t * 0.5;
                inner.rotation.x = -t * 0.4;
                inner.rotation.y = -t * 0.3;

                const pulse = 1 + Math.sin(t * 3) * 0.1;
                cube.scale.setScalar(pulse);
                core.scale.setScalar(0.8 + Math.sin(t * 5) * 0.2);
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#050510', borderRadius: 2 }} />;
};

// Nebula Vortex
const NebulaVortex = ({ size = 100 }) => {
    const canvasRef = useRef();

    useMiniScene(canvasRef, size, size, (scene, camera) => {
        camera.position.z = 4;

        const layers = 3;
        const particlesPerLayer = 200;
        const layerGroups = [];

        for (let l = 0; l < layers; l++) {
            const positions = new Float32Array(particlesPerLayer * 3);
            const angles = [];

            for (let i = 0; i < particlesPerLayer; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 0.3 + Math.random() * 1.5;
                positions[i * 3] = Math.cos(angle) * dist;
                positions[i * 3 + 1] = Math.sin(angle) * dist;
                positions[i * 3 + 2] = (l - 1) * 0.5;
                angles.push({ angle, dist, speed: 0.01 + Math.random() * 0.02 });
            }

            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const mat = new THREE.PointsMaterial({
                size: 0.04,
                color: [0xff00ff, 0x8800ff, 0x00ffff][l],
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending
            });

            const particles = new THREE.Points(geo, mat);
            scene.add(particles);
            layerGroups.push({ particles, geo, angles });
        }

        return {
            update: (t) => {
                layerGroups.forEach((layer, l) => {
                    const pos = layer.geo.attributes.position.array;
                    for (let i = 0; i < particlesPerLayer; i++) {
                        layer.angles[i].angle += layer.angles[i].speed * (l + 1);
                        pos[i * 3] = Math.cos(layer.angles[i].angle) * layer.angles[i].dist;
                        pos[i * 3 + 1] = Math.sin(layer.angles[i].angle) * layer.angles[i].dist;
                    }
                    layer.geo.attributes.position.needsUpdate = true;
                });
            }
        };
    });

    return <canvas ref={canvasRef} style={{ background: '#050510', borderRadius: 2 }} />;
};

// ============================================
// ADDITIONAL EFFECTS (CSS/Canvas based)
// ============================================

// Matrix Rain (CSS version for variety)
const MatrixRain = ({ size = 100, width, height }) => {
    const w = width || size;
    const h = height || size;
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const chars = 'アイウエオカキクケコサシスセソタチツテト0123456789ABCDEF';
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
                if (drops[i] * fontSize > h && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            }
        };

        const interval = setInterval(draw, 50);
        return () => clearInterval(interval);
    }, [w, h]);

    return <canvas ref={canvasRef} width={w} height={h} style={{ borderRadius: 2 }} />;
};

// Floating Emojis
const FloatingEmojis = ({ size = 100, width, height, emojis = ['✨', '🌟', '💫', '⭐', '🔮'] }) => {
    const w = width || size;
    const h = height || size;
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        const interval = setInterval(() => {
            setParticles(prev => {
                const next = prev
                    .map(p => ({ ...p, y: p.y - p.speed, opacity: p.opacity - 0.015, rotation: p.rotation + p.rotSpeed }))
                    .filter(p => p.opacity > 0);

                if (Math.random() > 0.6 && next.length < 12) {
                    next.push({
                        id: Date.now() + Math.random(),
                        emoji: emojis[Math.floor(Math.random() * emojis.length)],
                        x: Math.random() * (w - 15),
                        y: h,
                        speed: 1 + Math.random() * 1.5,
                        opacity: 1,
                        rotation: Math.random() * 360,
                        rotSpeed: (Math.random() - 0.5) * 8
                    });
                }
                return next;
            });
        }, 50);
        return () => clearInterval(interval);
    }, [w, h, emojis]);

    return (
        <div style={{ width: w, height: h, background: '#0a0a12', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
            {particles.map(p => (
                <span key={p.id} style={{
                    position: 'absolute',
                    left: p.x, top: p.y,
                    opacity: p.opacity,
                    transform: `rotate(${p.rotation}deg)`,
                    fontSize: Math.max(10, w / 7),
                    userSelect: 'none'
                }}>{p.emoji}</span>
            ))}
        </div>
    );
};

// TV Static
const TVStatic = ({ size = 100, width, height }) => {
    const w = width || size;
    const h = height || size;
    const canvasRef = useRef();

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

    return <canvas ref={canvasRef} width={w} height={h} style={{ borderRadius: 2 }} />;
};

// ============================================
// MAIN GALLERY EXPORT
// ============================================

export default function MegaVFXGallery() {
    return (
        <div className="min-h-screen bg-gray-950 p-6">
            <h1 className="text-3xl font-light text-cyan-400 mb-2 tracking-widest">VFX BLOCKS</h1>
            <p className="text-gray-500 mb-8 text-sm">Hover for border effects</p>

            {/* 25x25 Icons */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider">25×25 ICON GRADE</h2>
                <div className="flex flex-wrap gap-2">
                    <BorderWrapper size={25} speed="fast" color="#00ffff"><SparkCore size={25} /></BorderWrapper>
                    <BorderWrapper size={25} speed="slow" color="#ff00ff"><NeonRipple size={25} /></BorderWrapper>
                    <GlitchBorder size={25}><MicroPortal size={25} /></GlitchBorder>
                    <BorderWrapper size={25} speed="fast" color="#00ff88"><ElectricCrosshair size={25} /></BorderWrapper>
                    <BorderWrapper size={25} speed="slow" color="#ffff00"><OrbitDotDuo size={25} /></BorderWrapper>
                    <GlitchBorder size={25}><CometPin size={25} /></GlitchBorder>
                    <BorderWrapper size={25} speed="fast" color="#ff8800"><GlitchBadge size={25} /></BorderWrapper>
                    <BorderWrapper size={25} speed="slow" color="#ff00ff"><PrismPing size={25} /></BorderWrapper>
                    <BorderWrapper size={25} speed="fast" color="#00ffff"><NeonRipple size={25} color="#ff00ff" /></BorderWrapper>
                    <GlitchBorder size={25}><SparkCore size={25} /></GlitchBorder>
                </div>
            </section>

            {/* 50x25 Pills */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider">50×25 STATUS STRIPS</h2>
                <div className="flex flex-wrap gap-3">
                    <BorderWrapper width={50} height={25} speed="slow" color="#00ffff"><ScanSweep width={50} height={25} /></BorderWrapper>
                    <GlitchBorder width={50} height={25}><Oscilloscope width={50} height={25} /></GlitchBorder>
                    <BorderWrapper width={50} height={25} speed="fast" color="#ff00ff"><LaserDuplex width={50} height={25} /></BorderWrapper>
                    <BorderWrapper width={50} height={25} speed="slow" color="#00ff88"><DataStream width={50} height={25} /></BorderWrapper>
                    <GlitchBorder width={50} height={25}><PhaseBars width={50} height={25} /></GlitchBorder>
                    <BorderWrapper width={50} height={25} speed="fast" color="#ffff00"><VoltageCrawl width={50} height={25} /></BorderWrapper>
                    <BorderWrapper width={50} height={25} speed="slow" color="#ff8800"><NeonRibbon width={50} height={25} /></BorderWrapper>
                </div>
            </section>

            {/* 50x50 Badges */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider">50×50 BADGES</h2>
                <div className="flex flex-wrap gap-3">
                    <BorderWrapper size={50} speed="slow" color="#00ffff"><NeonMandala size={50} /></BorderWrapper>
                    <GlitchBorder size={50}><PortalIris size={50} /></GlitchBorder>
                    <BorderWrapper size={50} speed="fast" color="#8888ff"><SpiralGalaxy size={50} /></BorderWrapper>
                    <BorderWrapper size={50} speed="slow" color="#00ffff"><QuantumKnot size={50} /></BorderWrapper>
                    <GlitchBorder size={50}><VoidEye size={50} /></GlitchBorder>
                    <BorderWrapper size={50} speed="fast" color="#ff00ff"><MagicSigil size={50} /></BorderWrapper>
                    <BorderWrapper size={50} speed="slow" color="#00ff88"><FloatingEmojis size={50} emojis={['⚡', '💎', '🔮']} /></BorderWrapper>
                    <ScanlineBorder size={50}><TVStatic size={50} /></ScanlineBorder>
                </div>
            </section>

            {/* 50x100 Vertical */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider">50×100 VERTICAL METERS</h2>
                <div className="flex flex-wrap gap-3">
                    <BorderWrapper width={50} height={100} speed="slow" color="#ff00ff"><PlasmaColumn width={50} height={100} /></BorderWrapper>
                    <GlitchBorder width={50} height={100}><RisingSparks width={50} height={100} /></GlitchBorder>
                    <BorderWrapper width={50} height={100} speed="fast" color="#00ffff"><BubbleLadder width={50} height={100} /></BorderWrapper>
                    <BorderWrapper width={50} height={100} speed="slow" color="#00ff88"><AuroraStrip width={50} height={100} /></BorderWrapper>
                    <GlitchBorder width={50} height={100}><LightningSpine width={50} height={100} /></GlitchBorder>
                    <BorderWrapper width={50} height={100} speed="fast" color="#ff8800"><ChakraStack width={50} height={100} /></BorderWrapper>
                    <BorderWrapper width={50} height={100} speed="slow" color="#00ff00"><MatrixRain width={50} height={100} /></BorderWrapper>
                </div>
            </section>

            {/* 100x100 Dioramas */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider">100×100 MINI-DIORAMAS</h2>
                <div className="flex flex-wrap gap-4">
                    <ScanlineBorder size={100}><MicroBlackHole size={100} /></ScanlineBorder>
                    <BorderWrapper size={100} speed="slow" color="#4488ff"><CosmicSnowglobe size={100} /></BorderWrapper>
                    <GlitchBorder size={100}><NeonCityChip size={100} /></GlitchBorder>
                    <BorderWrapper size={100} speed="fast" color="#00ffff"><WaveGrid size={100} /></BorderWrapper>
                    <ScanlineBorder size={100}><CoreSphere size={100} /></ScanlineBorder>
                    <BorderWrapper size={100} speed="slow" color="#00ff00"><WarpTunnel size={100} /></BorderWrapper>
                    <GlitchBorder size={100}><EnergyLatticeCube size={100} /></GlitchBorder>
                    <BorderWrapper size={100} speed="fast" color="#ff00ff"><NebulaVortex size={100} /></BorderWrapper>
                </div>
            </section>

            {/* Featured Large */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider">FEATURED 200×100</h2>
                <div className="flex flex-wrap gap-4">
                    <ScanlineBorder width={200} height={100}><WaveGrid size={200} /></ScanlineBorder>
                    <BorderWrapper width={200} height={100} speed="slow" color="#ff00aa"><CoreSphere size={200} /></BorderWrapper>
                </div>
            </section>

            {/* Massive Grid */}
            <section>
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider">CHAOS GRID</h2>
                <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(35px, 1fr))' }}>
                    {Array(80).fill(null).map((_, i) => {
                        const effects = [
                            () => <SparkCore size={35} />,
                            () => <NeonRipple size={35} color={`hsl(${i * 15}, 100%, 60%)`} />,
                            () => <MicroPortal size={35} />,
                            () => <OrbitDotDuo size={35} />,
                            () => <PrismPing size={35} />,
                            () => <GlitchBadge size={35} />,
                        ];
                        const Effect = effects[i % effects.length];
                        const borders = [BorderWrapper, GlitchBorder];
                        const Border = borders[i % 2];
                        return (
                            <Border key={i} size={35} speed={i % 2 ? 'fast' : 'slow'} color={`hsl(${i * 10}, 100%, 60%)`}>
                                <Effect />
                            </Border>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
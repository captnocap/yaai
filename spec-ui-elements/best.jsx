import React, { useRef, useEffect, useState } from 'react';

// ============================================
// CRT WRAPPER (same as before)
// ============================================

const CRTWrapper = ({ children, width = 200, height = 120, glowColor = '#00ff00', intensity = 1 }) => {
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
          inset 0 0 20px ${glowColor}08,
          0 0 2px #000
        `
            }}
        >
            <div className="relative z-10 w-full h-full">{children}</div>

            {/* Scanlines */}
            <div
                className="absolute inset-0 pointer-events-none z-20"
                style={{
                    background: `repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 1px, rgba(0,0,0,${0.3 * intensity}) 1px, rgba(0,0,0,${0.3 * intensity}) 2px)`
                }}
            />

            {/* RGB subpixels */}
            <div
                className="absolute inset-0 pointer-events-none z-20"
                style={{
                    background: `repeating-linear-gradient(90deg, rgba(255,0,0,0.03) 0px, rgba(0,255,0,0.03) 1px, rgba(0,0,255,0.03) 2px, transparent 3px)`,
                    backgroundSize: '3px 100%',
                    opacity: intensity
                }}
            />

            {/* Flicker */}
            <div className="absolute inset-0 pointer-events-none z-20 animate-flicker" style={{ background: 'rgba(255,255,255,0.02)' }} />

            {/* Vignette */}
            <div
                className="absolute inset-0 pointer-events-none z-30"
                style={{
                    boxShadow: `inset 0 0 ${Math.min(width, height) / 3}px rgba(0,0,0,0.8), inset 0 0 ${Math.min(width, height) / 6}px rgba(0,0,0,0.5)`,
                    borderRadius: 4
                }}
            />

            <style>{`
        @keyframes flicker { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:0.8} 94%{opacity:1} 97%{opacity:0.9} }
        .animate-flicker { animation: flicker 4s infinite; }
      `}</style>
        </div>
    );
};

// ============================================
// PERLIN NOISE UTILITY
// ============================================

class PerlinNoise {
    constructor(seed = Math.random()) {
        this.grad3 = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
        this.p = [];
        for (let i = 0; i < 256; i++) this.p[i] = Math.floor(seed * 256 + i) % 256;
        this.perm = [];
        for (let i = 0; i < 512; i++) this.perm[i] = this.p[i & 255];
    }

    dot(g, x, y) { return g[0] * x + g[1] * y; }

    noise(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        const u = x * x * x * (x * (x * 6 - 15) + 10);
        const v = y * y * y * (y * (y * 6 - 15) + 10);
        const A = this.perm[X] + Y;
        const B = this.perm[X + 1] + Y;
        return this.lerp(v,
            this.lerp(u, this.dot(this.grad3[this.perm[A] % 12], x, y), this.dot(this.grad3[this.perm[B] % 12], x - 1, y)),
            this.lerp(u, this.dot(this.grad3[this.perm[A + 1] % 12], x, y - 1), this.dot(this.grad3[this.perm[B + 1] % 12], x - 1, y - 1))
        );
    }

    lerp(t, a, b) { return a + t * (b - a); }
}

// ============================================
// FLOW FIELD (Perlin noise particle trails)
// ============================================

const FlowFieldScreensaver = ({ width, height, color = '#00ff00' }) => {
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const perlin = new PerlinNoise();

        const particles = Array(80).fill(null).map(() => ({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: 0,
            vy: 0
        }));

        let time = 0;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        const draw = () => {
            // Slow fade for trail accumulation
            ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
            ctx.fillRect(0, 0, width, height);

            particles.forEach(p => {
                const angle = perlin.noise(p.x * 0.01, p.y * 0.01 + time) * Math.PI * 4;
                p.vx = Math.cos(angle) * 1.5;
                p.vy = Math.sin(angle) * 1.5;

                // Simulated "audio" amplitude
                const amp = 0.5 + Math.sin(time * 2 + p.x * 0.01) * 0.5;

                ctx.fillStyle = color;
                ctx.globalAlpha = 0.3 + amp * 0.4;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
                ctx.fill();

                p.x += p.vx;
                p.y += p.vy;

                // Wrap around
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;
            });

            ctx.globalAlpha = 1;
            time += 0.005;
        };

        const interval = setInterval(draw, 30);
        return () => clearInterval(interval);
    }, [width, height, color]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
};

// ============================================
// PIXEL SORT (glitchy horizontal bands)
// ============================================

const PixelSortScreensaver = ({ width, height }) => {
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Initialize with gradient noise
        const imageData = ctx.createImageData(width, height);
        for (let i = 0; i < imageData.data.length; i += 4) {
            const y = Math.floor((i / 4) / width);
            const hue = (y / height) * 360;
            const rgb = hslToRgb(hue / 360, 0.8, 0.5);
            imageData.data[i] = rgb[0] * (0.3 + Math.random() * 0.7);
            imageData.data[i + 1] = rgb[1] * (0.3 + Math.random() * 0.7);
            imageData.data[i + 2] = rgb[2] * (0.3 + Math.random() * 0.7);
            imageData.data[i + 3] = 255;
        }
        ctx.putImageData(imageData, 0, 0);

        const draw = () => {
            const data = ctx.getImageData(0, 0, width, height);

            // Simulate "beat" triggering sort
            if (Math.random() > 0.7) {
                const y = Math.floor(Math.random() * height);
                const rowStart = y * width * 4;
                const row = [];

                for (let x = 0; x < width; x++) {
                    const i = rowStart + x * 4;
                    row.push({
                        r: data.data[i],
                        g: data.data[i + 1],
                        b: data.data[i + 2],
                        brightness: data.data[i] + data.data[i + 1] + data.data[i + 2]
                    });
                }

                // Sort by brightness
                row.sort((a, b) => a.brightness - b.brightness);

                // Write back
                for (let x = 0; x < width; x++) {
                    const i = rowStart + x * 4;
                    data.data[i] = row[x].r;
                    data.data[i + 1] = row[x].g;
                    data.data[i + 2] = row[x].b;
                }
            }

            // Add occasional new color bands
            if (Math.random() > 0.9) {
                const y = Math.floor(Math.random() * height);
                const hue = Math.random() * 360;
                const rgb = hslToRgb(hue / 360, 0.9, 0.5);
                for (let x = 0; x < width; x++) {
                    const i = (y * width + x) * 4;
                    data.data[i] = rgb[0];
                    data.data[i + 1] = rgb[1];
                    data.data[i + 2] = rgb[2];
                }
            }

            ctx.putImageData(data, 0, 0);
        };

        const interval = setInterval(draw, 50);
        return () => clearInterval(interval);
    }, [width, height]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
};

// ============================================
// MANDALA (radial slices building outward)
// ============================================

const MandalaScreensaver = ({ width, height, segments = 12 }) => {
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const cx = width / 2;
        const cy = height / 2;
        let radius = 5;
        let hue = 0;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        const draw = () => {
            // Simulated beat
            if (Math.random() > 0.85) {
                const sliceAngle = (Math.PI * 2) / segments;

                for (let i = 0; i < segments; i++) {
                    const angle = i * sliceAngle + (radius * 0.02);
                    const nextAngle = (i + 1) * sliceAngle + (radius * 0.02);

                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.arc(cx, cy, radius, angle, nextAngle);
                    ctx.closePath();

                    const segHue = (hue + i * (360 / segments)) % 360;
                    ctx.fillStyle = `hsla(${segHue}, 80%, 50%, 0.6)`;
                    ctx.fill();
                }

                radius += 2;
                hue = (hue + 5) % 360;

                // Reset when full
                if (radius > Math.max(width, height) * 0.7) {
                    radius = 5;
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                    ctx.fillRect(0, 0, width, height);
                }
            }
        };

        const interval = setInterval(draw, 40);
        return () => clearInterval(interval);
    }, [width, height, segments]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
};

// ============================================
// L-SYSTEM TREE
// ============================================

const TreeScreensaver = ({ width, height }) => {
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        let trees = [];
        let hue = 120;

        const growTree = (x, y, angle, length, depth, branchHue) => {
            if (depth === 0 || length < 2) return;

            const endX = x + Math.cos(angle) * length;
            const endY = y + Math.sin(angle) * length;

            ctx.strokeStyle = `hsl(${branchHue}, 70%, ${40 + depth * 8}%)`;
            ctx.lineWidth = depth * 0.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Branch with some randomness (simulated pitch variation)
            const spread = 0.3 + Math.random() * 0.4;
            growTree(endX, endY, angle - spread, length * 0.7, depth - 1, branchHue);
            growTree(endX, endY, angle + spread, length * 0.7, depth - 1, branchHue);
        };

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        const draw = () => {
            // Fade existing
            ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
            ctx.fillRect(0, 0, width, height);

            // Simulated beat spawns a tree
            if (Math.random() > 0.95) {
                const x = Math.random() * width;
                growTree(x, height, -Math.PI / 2, 15 + Math.random() * 15, 6, hue);
                hue = (hue + 30) % 360;
            }
        };

        const interval = setInterval(draw, 60);
        return () => clearInterval(interval);
    }, [width, height]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
};

// ============================================
// RINGS (concentric circles pulsing outward)
// ============================================

const RingsScreensaver = ({ width, height }) => {
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const cx = width / 2;
        const cy = height / 2;

        let rings = [];
        let hue = 180;

        const draw = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, width, height);

            // Spawn new ring (continuous, simulating audio)
            if (Math.random() > 0.7) {
                rings.push({
                    radius: 2,
                    hue: hue,
                    alpha: 1
                });
                hue = (hue + 3) % 360;
            }

            // Update and draw rings
            rings = rings.filter(ring => {
                ring.radius += 1.5;
                ring.alpha -= 0.015;

                if (ring.alpha <= 0) return false;

                ctx.strokeStyle = `hsla(${ring.hue}, 80%, 55%, ${ring.alpha})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
                ctx.stroke();

                return true;
            });
        };

        const interval = setInterval(draw, 30);
        return () => clearInterval(interval);
    }, [width, height]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
};

// ============================================
// STARS (constellation builder)
// ============================================

const StarsScreensaver = ({ width, height }) => {
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        let stars = [];
        const maxStars = 50;
        const connectDistance = 40;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        const draw = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
            ctx.fillRect(0, 0, width, height);

            // Spawn star on "beat"
            if (Math.random() > 0.9 && stars.length < maxStars) {
                stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    size: 1 + Math.random() * 2,
                    hue: Math.random() * 60 + 180, // Blue-cyan range
                    twinkle: Math.random() * Math.PI * 2
                });
            }

            // Draw connections
            ctx.strokeStyle = 'rgba(100, 200, 255, 0.15)';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < stars.length; i++) {
                for (let j = i + 1; j < stars.length; j++) {
                    const dx = stars[i].x - stars[j].x;
                    const dy = stars[i].y - stars[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < connectDistance) {
                        ctx.beginPath();
                        ctx.moveTo(stars[i].x, stars[i].y);
                        ctx.lineTo(stars[j].x, stars[j].y);
                        ctx.stroke();
                    }
                }
            }

            // Draw stars
            stars.forEach(star => {
                star.twinkle += 0.1;
                const brightness = 0.5 + Math.sin(star.twinkle) * 0.5;
                ctx.fillStyle = `hsla(${star.hue}, 80%, ${50 + brightness * 30}%, ${0.7 + brightness * 0.3})`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size * brightness, 0, Math.PI * 2);
                ctx.fill();
            });

            // Slowly remove oldest stars
            if (stars.length > maxStars * 0.8 && Math.random() > 0.95) {
                stars.shift();
            }
        };

        const interval = setInterval(draw, 40);
        return () => clearInterval(interval);
    }, [width, height]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
};

// ============================================
// TERRAIN (scrolling mountain waveform)
// ============================================

const TerrainScreensaver = ({ width, height }) => {
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const perlin = new PerlinNoise();

        let offset = 0;
        const layers = [
            { speed: 0.5, yBase: 0.7, amplitude: 0.15, color: '#0a2a1a' },
            { speed: 0.8, yBase: 0.75, amplitude: 0.12, color: '#0d3d2d' },
            { speed: 1.2, yBase: 0.8, amplitude: 0.1, color: '#106040' },
            { speed: 2, yBase: 0.85, amplitude: 0.08, color: '#158055' },
        ];

        const draw = () => {
            // Sky gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, '#000510');
            gradient.addColorStop(0.5, '#001020');
            gradient.addColorStop(1, '#002030');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            // Draw each mountain layer
            layers.forEach(layer => {
                ctx.fillStyle = layer.color;
                ctx.beginPath();
                ctx.moveTo(0, height);

                for (let x = 0; x <= width; x += 2) {
                    const noiseVal = perlin.noise((x + offset * layer.speed) * 0.02, layer.yBase * 10);
                    const y = height * layer.yBase - noiseVal * height * layer.amplitude;
                    ctx.lineTo(x, y);
                }

                ctx.lineTo(width, height);
                ctx.closePath();
                ctx.fill();
            });

            // Stars
            ctx.fillStyle = '#fff';
            for (let i = 0; i < 30; i++) {
                const sx = (i * 47 + offset * 0.1) % width;
                const sy = (i * 31) % (height * 0.5);
                const twinkle = Math.sin(offset * 0.1 + i) * 0.5 + 0.5;
                ctx.globalAlpha = twinkle * 0.8;
                ctx.fillRect(sx, sy, 1, 1);
            }
            ctx.globalAlpha = 1;

            offset += 1;
        };

        const interval = setInterval(draw, 40);
        return () => clearInterval(interval);
    }, [width, height]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
};

// ============================================
// MIRROR (8-way kaleidoscope)
// ============================================

const MirrorScreensaver = ({ width, height, folds = 8 }) => {
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const cx = width / 2;
        const cy = height / 2;

        let particles = [];
        let hue = 0;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        const draw = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, width, height);

            // Spawn particle
            if (Math.random() > 0.7) {
                particles.push({
                    x: cx + (Math.random() - 0.5) * 20,
                    y: cy + (Math.random() - 0.5) * 20,
                    vx: (Math.random() - 0.5) * 3,
                    vy: (Math.random() - 0.5) * 3,
                    life: 1,
                    hue: hue
                });
                hue = (hue + 5) % 360;
            }

            // Update and draw with symmetry
            particles = particles.filter(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.02;

                if (p.life <= 0) return false;

                // Draw in all symmetric positions
                for (let i = 0; i < folds; i++) {
                    const angle = (i / folds) * Math.PI * 2;

                    // Original position relative to center
                    const dx = p.x - cx;
                    const dy = p.y - cy;

                    // Rotate
                    const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
                    const ry = dx * Math.sin(angle) + dy * Math.cos(angle);

                    // Mirror for more symmetry
                    const positions = [
                        [cx + rx, cy + ry],
                        [cx - rx, cy + ry]
                    ];

                    positions.forEach(([px, py]) => {
                        ctx.fillStyle = `hsla(${p.hue}, 80%, 55%, ${p.life * 0.5})`;
                        ctx.beginPath();
                        ctx.arc(px, py, 2, 0, Math.PI * 2);
                        ctx.fill();
                    });
                }

                return true;
            });
        };

        const interval = setInterval(draw, 30);
        return () => clearInterval(interval);
    }, [width, height, folds]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
};

// ============================================
// WAVEFORM (audio-style oscilloscope)
// ============================================

const WaveformScreensaver = ({ width, height, color = '#00ff00' }) => {
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let time = 0;

        const draw = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.fillRect(0, 0, width, height);

            // Simulated frequency data
            const frequencies = [];
            for (let i = 0; i < 64; i++) {
                frequencies.push(
                    Math.sin(time * 3 + i * 0.2) * 0.3 +
                    Math.sin(time * 7 + i * 0.1) * 0.2 +
                    Math.sin(time * 2 + i * 0.5) * 0.3 +
                    Math.random() * 0.1
                );
            }

            // Draw waveform
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.beginPath();

            for (let i = 0; i < frequencies.length; i++) {
                const x = (i / frequencies.length) * width;
                const y = height / 2 + frequencies[i] * height * 0.4;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;

            time += 0.05;
        };

        const interval = setInterval(draw, 30);
        return () => clearInterval(interval);
    }, [width, height, color]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
};

// ============================================
// SPECTRUM BARS
// ============================================

const SpectrumScreensaver = ({ width, height }) => {
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let time = 0;
        const bars = 32;

        const draw = () => {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);

            const barWidth = width / bars;

            for (let i = 0; i < bars; i++) {
                // Simulated frequency data
                const freq =
                    Math.sin(time * 2 + i * 0.3) * 0.3 +
                    Math.sin(time * 5 + i * 0.1) * 0.2 +
                    Math.abs(Math.sin(time * 3 + i * 0.5)) * 0.4 +
                    0.1;

                const barHeight = freq * height * 0.9;
                const hue = (i / bars) * 120 + 180; // Cyan to green

                // Gradient bar
                const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
                gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.9)`);
                gradient.addColorStop(1, `hsla(${hue}, 100%, 30%, 0.9)`);

                ctx.fillStyle = gradient;
                ctx.fillRect(i * barWidth + 1, height - barHeight, barWidth - 2, barHeight);

                // Glow cap
                ctx.fillStyle = `hsla(${hue}, 100%, 80%, 0.8)`;
                ctx.fillRect(i * barWidth + 1, height - barHeight - 2, barWidth - 2, 2);
            }

            time += 0.05;
        };

        const interval = setInterval(draw, 30);
        return () => clearInterval(interval);
    }, [width, height]);

    return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
};

// ============================================
// HELPER: HSL to RGB
// ============================================

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// ============================================
// WRAPPED CRT VERSIONS
// ============================================

const CRTFlowField = ({ width = 200, height = 120, color = '#00ff00' }) => (
    <CRTWrapper width={width} height={height} glowColor={color}>
        <FlowFieldScreensaver width={width - 2} height={height - 2} color={color} />
    </CRTWrapper>
);

const CRTPixelSort = ({ width = 200, height = 120 }) => (
    <CRTWrapper width={width} height={height} glowColor="#ff00ff">
        <PixelSortScreensaver width={width - 2} height={height - 2} />
    </CRTWrapper>
);

const CRTMandala = ({ width = 200, height = 120 }) => (
    <CRTWrapper width={width} height={height} glowColor="#ff8800">
        <MandalaScreensaver width={width - 2} height={height - 2} />
    </CRTWrapper>
);

const CRTTree = ({ width = 200, height = 120 }) => (
    <CRTWrapper width={width} height={height} glowColor="#00ff00">
        <TreeScreensaver width={width - 2} height={height - 2} />
    </CRTWrapper>
);

const CRTRings = ({ width = 200, height = 120 }) => (
    <CRTWrapper width={width} height={height} glowColor="#00ffff">
        <RingsScreensaver width={width - 2} height={height - 2} />
    </CRTWrapper>
);

const CRTStars = ({ width = 200, height = 120 }) => (
    <CRTWrapper width={width} height={height} glowColor="#4488ff">
        <StarsScreensaver width={width - 2} height={height - 2} />
    </CRTWrapper>
);

const CRTTerrain = ({ width = 200, height = 120 }) => (
    <CRTWrapper width={width} height={height} glowColor="#00aa44">
        <TerrainScreensaver width={width - 2} height={height - 2} />
    </CRTWrapper>
);

const CRTMirror = ({ width = 200, height = 120 }) => (
    <CRTWrapper width={width} height={height} glowColor="#ff00ff">
        <MirrorScreensaver width={width - 2} height={height - 2} />
    </CRTWrapper>
);

const CRTWaveform = ({ width = 200, height = 120, color = '#00ff00' }) => (
    <CRTWrapper width={width} height={height} glowColor={color}>
        <WaveformScreensaver width={width - 2} height={height - 2} color={color} />
    </CRTWrapper>
);

const CRTSpectrum = ({ width = 200, height = 120 }) => (
    <CRTWrapper width={width} height={height} glowColor="#00ffff">
        <SpectrumScreensaver width={width - 2} height={height - 2} />
    </CRTWrapper>
);

// ============================================
// DEMO GALLERY
// ============================================

const AudioArtCRTDemo = () => {
    return (
        <div className="min-h-screen bg-gray-950 p-8">
            <h1 className="text-2xl font-light text-green-400 mb-2 tracking-wider font-mono">
                AUDIO ART × CRT
            </h1>
            <p className="text-gray-500 mb-8 text-sm font-mono">Generative screensavers with retro phosphor aesthetic</p>

            {/* Standard monitors */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-4 tracking-wider font-mono">200×120 STANDARD</h2>
                <div className="flex flex-wrap gap-6">
                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-gray-600 font-mono">Flow Field</span>
                        <CRTFlowField width={200} height={120} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-gray-600 font-mono">Pixel Sort</span>
                        <CRTPixelSort width={200} height={120} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-gray-600 font-mono">Mandala</span>
                        <CRTMandala width={200} height={120} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-gray-600 font-mono">L-System Trees</span>
                        <CRTTree width={200} height={120} />
                    </div>
                </div>
            </section>

            <section className="mb-10">
                <div className="flex flex-wrap gap-6">
                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-gray-600 font-mono">Rings</span>
                        <CRTRings width={200} height={120} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-gray-600 font-mono">Constellation</span>
                        <CRTStars width={200} height={120} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-gray-600 font-mono">Terrain</span>
                        <CRTTerrain width={200} height={120} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-gray-600 font-mono">Kaleidoscope</span>
                        <CRTMirror width={200} height={120} />
                    </div>
                </div>
            </section>

            {/* Audio-style monitors */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-4 tracking-wider font-mono">AUDIO VISUALIZERS</h2>
                <div className="flex flex-wrap gap-6">
                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-gray-600 font-mono">Waveform</span>
                        <CRTWaveform width={200} height={120} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-gray-600 font-mono">Spectrum</span>
                        <CRTSpectrum width={200} height={120} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-gray-600 font-mono">Amber Waveform</span>
                        <CRTWaveform width={200} height={120} color="#ffaa00" />
                    </div>
                </div>
            </section>

            {/* Wide strips */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-4 tracking-wider font-mono">WIDE STRIPS (400×60)</h2>
                <div className="flex flex-col gap-4">
                    <CRTWaveform width={400} height={60} />
                    <CRTSpectrum width={400} height={60} />
                    <CRTFlowField width={400} height={60} color="#ff00ff" />
                </div>
            </section>

            {/* Compact */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-4 tracking-wider font-mono">COMPACT (150×90)</h2>
                <div className="flex flex-wrap gap-4">
                    <CRTFlowField width={150} height={90} color="#00ffff" />
                    <CRTMandala width={150} height={90} />
                    <CRTRings width={150} height={90} />
                    <CRTTerrain width={150} height={90} />
                    <CRTMirror width={150} height={90} />
                    <CRTStars width={150} height={90} />
                </div>
            </section>

            {/* Large feature */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-4 tracking-wider font-mono">FEATURED (300×200)</h2>
                <div className="flex flex-wrap gap-6">
                    <CRTFlowField width={300} height={200} />
                    <CRTTerrain width={300} height={200} />
                    <CRTMirror width={300} height={200} />
                </div>
            </section>
        </div>
    );
};

// ============================================
// EXPORTS
// ============================================

export {
    CRTWrapper,
    FlowFieldScreensaver,
    PixelSortScreensaver,
    MandalaScreensaver,
    TreeScreensaver,
    RingsScreensaver,
    StarsScreensaver,
    TerrainScreensaver,
    MirrorScreensaver,
    WaveformScreensaver,
    SpectrumScreensaver,
    CRTFlowField,
    CRTPixelSort,
    CRTMandala,
    CRTTree,
    CRTRings,
    CRTStars,
    CRTTerrain,
    CRTMirror,
    CRTWaveform,
    CRTSpectrum
};

export default AudioArtCRTDemo;
import React, { useState, useRef, useEffect, useMemo } from 'react';

// ============================================
// MEMORY CLASSIFICATIONS & COLORS
// ============================================

const memoryColors = {
    personal: '#EC4899',
    work: '#3B82F6',
    preferences: '#10B981',
    technical: '#8B5CF6',
    context: '#F59E0B',
    relationships: '#F43F5E',
    history: '#6366F1',
    health: '#14B8A6',
    interests: '#A855F7',
    instructions: '#06B6D4',
};

// ============================================
// PURE GRID - BLOCKS ONLY
// ============================================

const MemoryGrid = ({
    memories = [],
    width = 200,
    height = 100,
    blockSize = 8,
    glowColor = '#00ff00',
    onMemoryClick
}) => {
    const canvasRef = useRef();
    const [hoveredBlock, setHoveredBlock] = useState(null);
    const [tooltip, setTooltip] = useState(null);

    const cols = Math.floor(width / blockSize);
    const rows = Math.floor(height / blockSize);

    const blocks = useMemo(() => {
        return memories.slice(0, cols * rows).map((memory, i) => ({
            ...memory,
            index: i,
            col: i % cols,
            row: Math.floor(i / cols),
            color: memoryColors[memory.type] || '#888'
        }));
    }, [memories, cols, rows]);

    const handleMouseMove = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const col = Math.floor(x / blockSize);
        const row = Math.floor(y / blockSize);

        const block = blocks.find(b => b.col === col && b.row === row);

        if (block) {
            setHoveredBlock(block.index);
            setTooltip({ x, y, memory: block });
        } else {
            setHoveredBlock(null);
            setTooltip(null);
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Clear
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        // Grid
        ctx.strokeStyle = '#151515';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= width; x += blockSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y <= height; y += blockSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Blocks
        blocks.forEach(block => {
            const x = block.col * blockSize;
            const y = block.row * blockSize;
            const isHovered = block.index === hoveredBlock;

            ctx.fillStyle = block.color;
            ctx.globalAlpha = isHovered ? 1 : 0.75;
            ctx.fillRect(x + 1, y + 1, blockSize - 2, blockSize - 2);

            if (isHovered) {
                ctx.shadowColor = block.color;
                ctx.shadowBlur = 8;
                ctx.fillRect(x + 1, y + 1, blockSize - 2, blockSize - 2);
                ctx.shadowBlur = 0;

                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 0.5, y + 0.5, blockSize - 1, blockSize - 1);
            }

            ctx.globalAlpha = 1;
        });

        // Scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        for (let y = 0; y < height; y += 2) {
            ctx.fillRect(0, y, width, 1);
        }

    }, [blocks, width, height, blockSize, hoveredBlock]);

    return (
        <div className="relative" style={{ width, height }}>
            <div
                className="overflow-hidden"
                style={{
                    width,
                    height,
                    borderRadius: 4,
                    border: `1px solid ${glowColor}25`,
                    boxShadow: `inset 0 0 20px rgba(0,0,0,0.6)`
                }}
            >
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    style={{ display: 'block', cursor: hoveredBlock !== null ? 'pointer' : 'default' }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => { setHoveredBlock(null); setTooltip(null); }}
                    onClick={() => hoveredBlock !== null && onMemoryClick?.(blocks[hoveredBlock])}
                />
            </div>

            {/* Tooltip */}
            {tooltip && (
                <Tooltip
                    memory={tooltip.memory}
                    x={tooltip.x}
                    y={tooltip.y}
                    containerWidth={width}
                    containerHeight={height}
                />
            )}
        </div>
    );
};

// ============================================
// TOOLTIP
// ============================================

const Tooltip = ({ memory, x, y, containerWidth, containerHeight }) => {
    const w = 180;
    let left = x + 12;
    let top = y - 8;

    if (left + w > containerWidth) left = x - w - 12;
    if (left < 0) left = 4;
    if (top < 0) top = 4;

    const color = memoryColors[memory.type] || '#888';

    return (
        <div
            className="absolute z-50 pointer-events-none"
            style={{
                left,
                top,
                width: w,
                background: '#0c0c0c',
                borderRadius: 4,
                border: `1px solid ${color}`,
                boxShadow: `0 0 12px ${color}50`,
                overflow: 'hidden'
            }}
        >
            <div
                className="px-2 py-1 flex items-center gap-2"
                style={{ background: `${color}15`, borderBottom: `1px solid ${color}30` }}
            >
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="font-mono text-xs" style={{ color }}>{memory.type}</span>
                {memory.timestamp && (
                    <span className="font-mono text-xs text-gray-600 ml-auto">{memory.timestamp}</span>
                )}
            </div>
            <div className="p-2">
                <p className="font-mono text-xs text-gray-300 leading-relaxed">
                    {memory.content?.length > 80 ? memory.content.slice(0, 80) + '...' : memory.content}
                </p>
            </div>
        </div>
    );
};

// ============================================
// DEMO
// ============================================

const MemoryGridDemo = () => {
    const memories = [
        { type: 'personal', content: "User's name is Siah", timestamp: '2h' },
        { type: 'personal', content: 'Lives in Portland, Oregon', timestamp: '2h' },
        { type: 'work', content: 'Building YAAI - AI image generation app', timestamp: '1h' },
        { type: 'work', content: 'Uses Electrobun and React', timestamp: '1h' },
        { type: 'technical', content: 'TypeScript, React, Three.js', timestamp: '1h' },
        { type: 'technical', content: 'Dual GPU: 7900 XTX + RTX 3060', timestamp: '3h' },
        { type: 'preferences', content: 'Prefers concise responses', timestamp: '30m' },
        { type: 'preferences', content: 'Has ADHD', timestamp: '2h' },
        { type: 'context', content: 'Building CRT-aesthetic UI', timestamp: '10m' },
        { type: 'context', content: 'Tetris payload visualization', timestamp: '5m' },
        { type: 'interests', content: 'Retro computing aesthetics', timestamp: '1h' },
        { type: 'interests', content: 'Portland sticker culture', timestamp: '2h' },
        { type: 'technical', content: 'Self-taught programmer', timestamp: '3h' },
        { type: 'instructions', content: 'Direct communication, no fluff', timestamp: '2h' },
        { type: 'history', content: 'Built DeFi protocol, $1.1M TVL', timestamp: '1d' },
        { type: 'work', content: '7-mile commute radius policy', timestamp: '1d' },
        { type: 'technical', content: 'Uses Tor, VPNs, Whonix', timestamp: '1d' },
        { type: 'preferences', content: 'Custom solutions over off-the-shelf', timestamp: '1d' },
        { type: 'context', content: '10K-40K images/month via YAAI', timestamp: '3h' },
        { type: 'interests', content: 'Audio-code-art visualizations', timestamp: '1h' },
        { type: 'personal', content: 'Values privacy and security', timestamp: '2h' },
        { type: 'work', content: 'Downtown Portland near Powells', timestamp: '1d' },
        { type: 'technical', content: 'Linux, Unraid home server', timestamp: '1d' },
        { type: 'history', content: 'Crypto project management background', timestamp: '1d' },
    ];

    return (
        <div className="min-h-screen bg-gray-950 p-8">
            <h1 className="text-2xl font-light text-green-400 mb-2 tracking-wider font-mono">MEMORY GRID</h1>
            <p className="text-gray-500 mb-8 text-sm font-mono">Pure blocks - hover to reveal</p>

            <div className="flex flex-wrap gap-8">
                {/* Various sizes */}
                <div>
                    <span className="text-xs text-gray-600 font-mono block mb-2">200×100</span>
                    <MemoryGrid memories={memories} width={200} height={100} glowColor="#00ff00" />
                </div>

                <div>
                    <span className="text-xs text-gray-600 font-mono block mb-2">160×80</span>
                    <MemoryGrid memories={memories} width={160} height={80} glowColor="#00ffff" />
                </div>

                <div>
                    <span className="text-xs text-gray-600 font-mono block mb-2">120×60</span>
                    <MemoryGrid memories={memories} width={120} height={60} glowColor="#ff00ff" />
                </div>

                <div>
                    <span className="text-xs text-gray-600 font-mono block mb-2">80×40</span>
                    <MemoryGrid memories={memories} width={80} height={40} blockSize={6} glowColor="#ffaa00" />
                </div>

                <div>
                    <span className="text-xs text-gray-600 font-mono block mb-2">300×150</span>
                    <MemoryGrid memories={memories} width={300} height={150} glowColor="#00ff88" />
                </div>
            </div>

            {/* Legend */}
            <div className="mt-10 flex flex-wrap gap-3">
                {Object.entries(memoryColors).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-2">
                        <div className="w-3 h-3" style={{ background: color }} />
                        <span className="font-mono text-xs text-gray-600">{type}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export { MemoryGrid, memoryColors };
export default MemoryGridDemo;
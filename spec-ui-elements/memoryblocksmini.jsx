import React, { useState, useRef, useEffect, useMemo } from 'react';

// ============================================
// MEMORY CLASSIFICATIONS & COLORS
// ============================================

const memoryColors = {
    personal: '#EC4899',     // pink - name, age, location
    work: '#3B82F6',         // blue - job, company, role
    preferences: '#10B981',  // green - likes, dislikes, style
    technical: '#8B5CF6',    // purple - skills, tools, languages
    context: '#F59E0B',      // amber - ongoing projects, goals
    relationships: '#F43F5E', // red - family, friends, pets
    history: '#6366F1',      // indigo - past events, experiences
    health: '#14B8A6',       // teal - medical, fitness
    interests: '#A855F7',    // violet - hobbies, media
    instructions: '#06B6D4', // cyan - user preferences for AI behavior
};

// ============================================
// MEMORY BLOCK GRID
// ============================================

const MemoryBlockGrid = ({
    memories = [],
    width = 200,
    height = 100,
    glowColor = '#00ff00',
    onMemoryClick,
    onMemoryHover,
    showStats = true
}) => {
    const canvasRef = useRef();
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const [tooltip, setTooltip] = useState(null);

    const gridWidth = showStats ? Math.floor(width / 2) : width;
    const blockSize = 8;
    const cols = Math.floor(gridWidth / blockSize);
    const rows = Math.floor(height / blockSize);

    // Map memories to grid positions
    const blocks = useMemo(() => {
        return memories.map((memory, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            return {
                ...memory,
                index: i,
                col,
                row,
                color: memoryColors[memory.type] || '#888'
            };
        }).filter(b => b.row < rows); // Only show what fits
    }, [memories, cols, rows]);

    // Count by type
    const typeCounts = useMemo(() => {
        const counts = {};
        memories.forEach(m => {
            counts[m.type] = (counts[m.type] || 0) + 1;
        });
        return counts;
    }, [memories]);

    // Handle mouse move for hover detection
    const handleMouseMove = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (x > gridWidth) {
            setHoveredIndex(null);
            setTooltip(null);
            return;
        }

        const col = Math.floor(x / blockSize);
        const row = Math.floor(y / blockSize);
        const index = row * cols + col;

        const block = blocks.find(b => b.col === col && b.row === row);

        if (block) {
            setHoveredIndex(block.index);
            setTooltip({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                memory: block
            });
            onMemoryHover?.(block);
        } else {
            setHoveredIndex(null);
            setTooltip(null);
        }
    };

    const handleMouseLeave = () => {
        setHoveredIndex(null);
        setTooltip(null);
    };

    const handleClick = (e) => {
        if (hoveredIndex !== null) {
            onMemoryClick?.(blocks.find(b => b.index === hoveredIndex));
        }
    };

    // Draw
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Clear
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        // Grid lines (subtle)
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= gridWidth; x += blockSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y <= height; y += blockSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(gridWidth, y);
            ctx.stroke();
        }

        // Draw blocks
        blocks.forEach(block => {
            const x = block.col * blockSize;
            const y = block.row * blockSize;
            const isHovered = block.index === hoveredIndex;

            // Block fill
            ctx.fillStyle = block.color;
            ctx.globalAlpha = isHovered ? 1 : 0.8;
            ctx.fillRect(x + 1, y + 1, blockSize - 2, blockSize - 2);

            // Highlight on hover
            if (isHovered) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 0.5, y + 0.5, blockSize - 1, blockSize - 1);

                // Glow effect
                ctx.shadowColor = block.color;
                ctx.shadowBlur = 8;
                ctx.fillRect(x + 1, y + 1, blockSize - 2, blockSize - 2);
                ctx.shadowBlur = 0;
            }

            ctx.globalAlpha = 1;
        });

        // Divider line (if showing stats)
        if (showStats) {
            ctx.strokeStyle = glowColor;
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(gridWidth, 0);
            ctx.lineTo(gridWidth, height);
            ctx.stroke();
            ctx.globalAlpha = 1;

            // Stats side
            const statsX = gridWidth + 8;

            // Title
            ctx.font = '9px monospace';
            ctx.fillStyle = glowColor;
            ctx.fillText('MEMORY', statsX, 10);

            // Count
            ctx.fillStyle = '#888';
            ctx.fillText(`${memories.length} blocks`, statsX, 22);

            // Overflow indicator
            const overflow = memories.length - blocks.length;
            if (overflow > 0) {
                ctx.fillStyle = '#F59E0B';
                ctx.fillText(`+${overflow} more`, statsX, 34);
            }

            // Top categories
            const sortedTypes = Object.entries(typeCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4);

            let legendY = 50;
            sortedTypes.forEach(([type, count]) => {
                ctx.fillStyle = memoryColors[type] || '#888';
                ctx.fillRect(statsX, legendY, 6, 6);
                ctx.fillStyle = '#666';
                ctx.font = '7px monospace';
                ctx.fillText(`${type.slice(0, 5)} ${count}`, statsX + 9, legendY + 5);
                legendY += 10;
            });
        }

        // Scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let y = 0; y < height; y += 2) {
            ctx.fillRect(0, y, width, 1);
        }

    }, [blocks, width, height, gridWidth, blockSize, hoveredIndex, memories.length, typeCounts, showStats, glowColor]);

    return (
        <div
            className="relative"
            style={{ width, height }}
        >
            <div
                className="relative overflow-hidden"
                style={{
                    width,
                    height,
                    borderRadius: 4,
                    border: `1px solid ${glowColor}30`,
                    boxShadow: `0 0 10px ${glowColor}10, inset 0 0 20px rgba(0,0,0,0.5)`
                }}
            >
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    style={{ display: 'block', cursor: hoveredIndex !== null ? 'pointer' : 'default' }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleClick}
                />

                {/* Vignette */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ boxShadow: 'inset 0 0 25px rgba(0,0,0,0.5)' }}
                />
            </div>

            {/* Tooltip */}
            {tooltip && (
                <MemoryTooltip
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
// MEMORY TOOLTIP
// ============================================

const MemoryTooltip = ({ memory, x, y, containerWidth, containerHeight }) => {
    const tooltipWidth = 180;
    const tooltipHeight = 80;

    // Position tooltip to avoid overflow
    let left = x + 12;
    let top = y - 10;

    if (left + tooltipWidth > containerWidth) {
        left = x - tooltipWidth - 12;
    }
    if (top + tooltipHeight > containerHeight) {
        top = containerHeight - tooltipHeight - 5;
    }
    if (top < 0) top = 5;

    const color = memoryColors[memory.type] || '#888';

    return (
        <div
            className="absolute z-50 pointer-events-none"
            style={{
                left,
                top,
                width: tooltipWidth,
                background: '#0a0a0c',
                borderRadius: 4,
                border: `1px solid ${color}`,
                boxShadow: `0 0 15px ${color}40, 0 4px 12px rgba(0,0,0,0.5)`,
                overflow: 'hidden'
            }}
        >
            {/* Header */}
            <div
                className="px-2 py-1 flex items-center gap-2"
                style={{ background: `${color}20`, borderBottom: `1px solid ${color}30` }}
            >
                <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                />
                <span className="font-mono text-xs" style={{ color }}>
                    {memory.type}
                </span>
                {memory.timestamp && (
                    <span className="font-mono text-xs text-gray-600 ml-auto">
                        {memory.timestamp}
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="p-2">
                <p
                    className="font-mono text-xs leading-relaxed"
                    style={{ color: '#ccc' }}
                >
                    {memory.content?.length > 100
                        ? memory.content.slice(0, 100) + '...'
                        : memory.content}
                </p>
            </div>

            {/* Scanlines */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 1px, rgba(0,0,0,0.1) 1px, rgba(0,0,0,0.1) 2px)'
                }}
            />
        </div>
    );
};

// ============================================
// MINI VERSION (no stats, just blocks)
// ============================================

const MemoryBlockMini = ({
    memories = [],
    width = 60,
    height = 40,
    glowColor = '#00ff00',
    onHover
}) => {
    const canvasRef = useRef();
    const [hovered, setHovered] = useState(null);

    const blockSize = 4;
    const cols = Math.floor(width / blockSize);
    const rows = Math.floor(height / blockSize);

    const blocks = useMemo(() => {
        return memories.slice(0, cols * rows).map((memory, i) => ({
            ...memory,
            col: i % cols,
            row: Math.floor(i / cols),
            color: memoryColors[memory.type] || '#888'
        }));
    }, [memories, cols, rows]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        blocks.forEach((block, i) => {
            ctx.fillStyle = block.color;
            ctx.globalAlpha = i === hovered ? 1 : 0.7;
            ctx.fillRect(
                block.col * blockSize,
                block.row * blockSize,
                blockSize - 1,
                blockSize - 1
            );
        });
        ctx.globalAlpha = 1;

        // Scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        for (let y = 0; y < height; y += 2) {
            ctx.fillRect(0, y, width, 1);
        }
    }, [blocks, width, height, blockSize, hovered]);

    const handleMouseMove = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const col = Math.floor(x / blockSize);
        const row = Math.floor(y / blockSize);
        const index = row * cols + col;

        if (index < blocks.length) {
            setHovered(index);
            onHover?.(blocks[index]);
        } else {
            setHovered(null);
            onHover?.(null);
        }
    };

    return (
        <div
            style={{
                width,
                height,
                borderRadius: 2,
                border: `1px solid ${glowColor}20`,
                overflow: 'hidden'
            }}
        >
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                style={{ display: 'block', cursor: 'pointer' }}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => { setHovered(null); onHover?.(null); }}
            />
        </div>
    );
};

// ============================================
// STREAMING MEMORY BLOCKS (animated arrival)
// ============================================

const MemoryBlockStream = ({
    memories = [],
    width = 200,
    height = 100,
    glowColor = '#00ff00',
    streamDelay = 100
}) => {
    const [visibleCount, setVisibleCount] = useState(0);
    const canvasRef = useRef();

    const gridWidth = Math.floor(width / 2);
    const blockSize = 8;
    const cols = Math.floor(gridWidth / blockSize);
    const rows = Math.floor(height / blockSize);

    // Animate memories appearing
    useEffect(() => {
        setVisibleCount(0);
        let count = 0;
        const interval = setInterval(() => {
            count++;
            if (count > memories.length) {
                clearInterval(interval);
                return;
            }
            setVisibleCount(count);
        }, streamDelay);

        return () => clearInterval(interval);
    }, [memories, streamDelay]);

    const visibleMemories = memories.slice(0, visibleCount);

    const blocks = useMemo(() => {
        return visibleMemories.map((memory, i) => ({
            ...memory,
            col: i % cols,
            row: Math.floor(i / cols),
            color: memoryColors[memory.type] || '#888',
            isNew: i === visibleCount - 1
        })).filter(b => b.row < rows);
    }, [visibleMemories, cols, rows, visibleCount]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        // Grid
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= gridWidth; x += blockSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y <= height; y += blockSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(gridWidth, y);
            ctx.stroke();
        }

        // Blocks
        blocks.forEach(block => {
            const x = block.col * blockSize;
            const y = block.row * blockSize;

            ctx.fillStyle = block.color;
            ctx.fillRect(x + 1, y + 1, blockSize - 2, blockSize - 2);

            // Glow on newest
            if (block.isNew) {
                ctx.shadowColor = block.color;
                ctx.shadowBlur = 10;
                ctx.fillRect(x + 1, y + 1, blockSize - 2, blockSize - 2);
                ctx.shadowBlur = 0;
            }
        });

        // Divider
        ctx.strokeStyle = glowColor;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(gridWidth, 0);
        ctx.lineTo(gridWidth, height);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Stats
        const statsX = gridWidth + 8;
        ctx.font = '9px monospace';
        ctx.fillStyle = glowColor;
        ctx.fillText('MEMORY', statsX, 10);

        ctx.fillStyle = '#888';
        ctx.fillText(`${visibleCount} / ${memories.length}`, statsX, 22);

        // Progress bar
        const barY = 32;
        const barW = gridWidth - 16;
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(statsX, barY, barW, 4);
        ctx.fillStyle = glowColor;
        ctx.fillRect(statsX, barY, barW * (visibleCount / memories.length), 4);

        // Type being added
        if (blocks.length > 0) {
            const latest = blocks[blocks.length - 1];
            ctx.fillStyle = latest.color;
            ctx.fillRect(statsX, 45, 6, 6);
            ctx.fillStyle = '#666';
            ctx.font = '7px monospace';
            ctx.fillText(latest.type, statsX + 9, 50);
        }

        // Scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let y = 0; y < height; y += 2) {
            ctx.fillRect(0, y, width, 1);
        }

    }, [blocks, width, height, gridWidth, blockSize, visibleCount, memories.length, glowColor]);

    return (
        <div
            className="relative overflow-hidden"
            style={{
                width,
                height,
                borderRadius: 4,
                border: `1px solid ${glowColor}30`,
                boxShadow: `0 0 10px ${glowColor}10, inset 0 0 20px rgba(0,0,0,0.5)`
            }}
        >
            <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ boxShadow: 'inset 0 0 25px rgba(0,0,0,0.5)' }}
            />
        </div>
    );
};

// ============================================
// FULL MEMORY PANEL (grid + list view)
// ============================================

const MemoryPanel = ({
    memories = [],
    width = 400,
    height = 200,
    glowColor = '#00ff00',
    onMemoryClick,
    onMemoryDelete
}) => {
    const [selectedMemory, setSelectedMemory] = useState(null);
    const [filter, setFilter] = useState(null);

    const filteredMemories = filter
        ? memories.filter(m => m.type === filter)
        : memories;

    const types = [...new Set(memories.map(m => m.type))];

    return (
        <div
            className="flex gap-4"
            style={{
                width,
                padding: 12,
                background: '#0a0a0c',
                borderRadius: 6,
                border: `1px solid ${glowColor}30`
            }}
        >
            {/* Grid view */}
            <div className="flex flex-col gap-2">
                <MemoryBlockGrid
                    memories={filteredMemories}
                    width={200}
                    height={120}
                    glowColor={glowColor}
                    showStats={true}
                    onMemoryClick={(m) => setSelectedMemory(m)}
                    onMemoryHover={(m) => { }}
                />

                {/* Filter chips */}
                <div className="flex flex-wrap gap-1">
                    <button
                        onClick={() => setFilter(null)}
                        className="px-2 py-0.5 rounded font-mono text-xs"
                        style={{
                            background: filter === null ? `${glowColor}20` : 'transparent',
                            color: filter === null ? glowColor : '#666',
                            border: `1px solid ${filter === null ? glowColor : '#333'}`
                        }}
                    >
                        All
                    </button>
                    {types.map(type => (
                        <button
                            key={type}
                            onClick={() => setFilter(filter === type ? null : type)}
                            className="px-2 py-0.5 rounded font-mono text-xs"
                            style={{
                                background: filter === type ? `${memoryColors[type]}20` : 'transparent',
                                color: filter === type ? memoryColors[type] : '#666',
                                border: `1px solid ${filter === type ? memoryColors[type] : '#333'}`
                            }}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Selected memory detail */}
            <div
                className="flex-1 flex flex-col"
                style={{
                    background: '#111',
                    borderRadius: 4,
                    border: '1px solid #222',
                    minHeight: 120
                }}
            >
                {selectedMemory ? (
                    <>
                        <div
                            className="px-3 py-2 flex items-center gap-2"
                            style={{ borderBottom: '1px solid #222' }}
                        >
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ background: memoryColors[selectedMemory.type] }}
                            />
                            <span
                                className="font-mono text-xs"
                                style={{ color: memoryColors[selectedMemory.type] }}
                            >
                                {selectedMemory.type}
                            </span>
                            {selectedMemory.timestamp && (
                                <span className="font-mono text-xs text-gray-600 ml-auto">
                                    {selectedMemory.timestamp}
                                </span>
                            )}
                        </div>
                        <div className="flex-1 p-3 overflow-auto">
                            <p className="font-mono text-xs text-gray-300 leading-relaxed">
                                {selectedMemory.content}
                            </p>
                        </div>
                        <div className="px-3 py-2 flex justify-end gap-2" style={{ borderTop: '1px solid #222' }}>
                            <button
                                onClick={() => onMemoryDelete?.(selectedMemory)}
                                className="px-2 py-1 font-mono text-xs rounded"
                                style={{ color: '#EF4444', border: '1px solid #EF444440' }}
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => onMemoryClick?.(selectedMemory)}
                                className="px-2 py-1 font-mono text-xs rounded"
                                style={{ color: glowColor, border: `1px solid ${glowColor}40` }}
                            >
                                Edit
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <span className="font-mono text-xs text-gray-600">
                            Click a block to view
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
// DEMO
// ============================================

const MemoryBlockDemo = () => {
    const [streamKey, setStreamKey] = useState(0);

    // Sample memories
    const sampleMemories = [
        { type: 'personal', content: 'User\'s name is Siah', timestamp: '2h ago' },
        { type: 'personal', content: 'Lives in Portland, Oregon', timestamp: '2h ago' },
        { type: 'work', content: 'Works on YAAI - an AI image generation app', timestamp: '1h ago' },
        { type: 'work', content: 'Uses Electrobun and React for development', timestamp: '1h ago' },
        { type: 'technical', content: 'Experienced with TypeScript, React, Three.js', timestamp: '1h ago' },
        { type: 'technical', content: 'Runs Linux with dual GPU setup (7900 XTX, RTX 3060)', timestamp: '3h ago' },
        { type: 'preferences', content: 'Prefers concise responses without excessive formatting', timestamp: '30m ago' },
        { type: 'preferences', content: 'Has ADHD - expects conversation to take sudden turns', timestamp: '2h ago' },
        { type: 'context', content: 'Currently building CRT-aesthetic UI components', timestamp: '10m ago' },
        { type: 'context', content: 'Working on tetris-style payload visualization', timestamp: '5m ago' },
        { type: 'interests', content: 'Appreciates retro computing aesthetics', timestamp: '1h ago' },
        { type: 'interests', content: 'Portland sticker culture enthusiast', timestamp: '2h ago' },
        { type: 'technical', content: 'Self-taught programmer', timestamp: '3h ago' },
        { type: 'instructions', content: 'Values direct communication, no fluff', timestamp: '2h ago' },
        { type: 'history', content: 'Built DeFi protocol reaching $1.1M TVL in 2021', timestamp: '1d ago' },
        { type: 'work', content: 'Maintains 7-mile commute radius policy', timestamp: '1d ago' },
        { type: 'technical', content: 'Uses privacy tools: Tor, VPNs, Whonix', timestamp: '1d ago' },
        { type: 'preferences', content: 'Prefers building custom solutions over off-the-shelf', timestamp: '1d ago' },
        { type: 'context', content: 'Processing 10K-40K+ images monthly through YAAI', timestamp: '3h ago' },
        { type: 'interests', content: 'Audio-code-art generative visualizations', timestamp: '1h ago' },
    ];

    return (
        <div className="min-h-screen bg-gray-950 p-8">
            <h1 className="text-2xl font-light text-green-400 mb-2 tracking-wider font-mono">MEMORY BLOCKS</h1>
            <p className="text-gray-500 mb-8 text-sm font-mono">User memory visualization - hover to reveal</p>

            {/* Standard grid */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">STANDARD (200×100)</h2>
                <MemoryBlockGrid
                    memories={sampleMemories}
                    width={200}
                    height={100}
                    glowColor="#00ff00"
                    showStats={true}
                />
            </section>

            {/* Streaming animation */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">STREAMING (memories loading)</h2>
                <div className="flex items-center gap-4">
                    <MemoryBlockStream
                        key={streamKey}
                        memories={sampleMemories}
                        width={200}
                        height={100}
                        glowColor="#00ffff"
                        streamDelay={80}
                    />
                    <button
                        onClick={() => setStreamKey(k => k + 1)}
                        className="px-3 py-1 font-mono text-xs rounded"
                        style={{ background: '#00ffff20', color: '#00ffff', border: '1px solid #00ffff40' }}
                    >
                        REPLAY
                    </button>
                </div>
            </section>

            {/* Mini versions */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">MINI INDICATORS</h2>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center gap-1">
                        <MemoryBlockMini memories={sampleMemories.slice(0, 5)} width={50} height={30} glowColor="#10B981" />
                        <span className="text-xs text-gray-600 font-mono">5 memories</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <MemoryBlockMini memories={sampleMemories.slice(0, 12)} width={50} height={30} glowColor="#00ffff" />
                        <span className="text-xs text-gray-600 font-mono">12 memories</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <MemoryBlockMini memories={sampleMemories} width={50} height={30} glowColor="#F59E0B" />
                        <span className="text-xs text-gray-600 font-mono">20 memories</span>
                    </div>
                </div>
            </section>

            {/* Inline example */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">INLINE USE</h2>
                <div
                    className="flex items-center gap-3 p-3 rounded"
                    style={{ background: '#111', border: '1px solid #333' }}
                >
                    <MemoryBlockMini memories={sampleMemories} width={50} height={30} glowColor="#00ff00" />
                    <span className="font-mono text-sm text-gray-400">{sampleMemories.length} memories</span>
                    <span className="font-mono text-xs text-gray-600">|</span>
                    <span className="font-mono text-xs text-gray-600">Last updated 5m ago</span>
                </div>
            </section>

            {/* Full panel */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">FULL PANEL</h2>
                <MemoryPanel
                    memories={sampleMemories}
                    width={500}
                    height={220}
                    glowColor="#00ff00"
                    onMemoryClick={(m) => console.log('Edit:', m)}
                    onMemoryDelete={(m) => console.log('Delete:', m)}
                />
            </section>

            {/* Color legend */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">CLASSIFICATIONS</h2>
                <div className="flex flex-wrap gap-3">
                    {Object.entries(memoryColors).map(([type, color]) => (
                        <div key={type} className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ background: color }} />
                            <span className="font-mono text-xs text-gray-500">{type}</span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

// ============================================
// EXPORTS
// ============================================

export {
    MemoryBlockGrid,
    MemoryBlockMini,
    MemoryBlockStream,
    MemoryPanel,
    memoryColors
};

export default MemoryBlockDemo;
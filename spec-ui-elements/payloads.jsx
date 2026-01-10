import React, { useState, useEffect, useRef, useMemo } from 'react';

// ============================================
// PAYLOAD TYPES & COLORS
// ============================================

const payloadColors = {
    system: '#4A90D9',
    context: '#7C3AED',
    user: '#10B981',
    assistant: '#F59E0B',
    attachment: '#EC4899',
    image: '#F43F5E',
    tool: '#06B6D4',
    model: '#8B5CF6',
    settings: '#6366F1',
};

// ============================================
// TETRIS PAYLOAD METER
// ============================================

const TetrisPayloadMeter = ({
    payload = [],
    maxTokens = 128000,
    width = 200,
    height = 100,
    glowColor = '#00ff00',
    showLabels = true
}) => {
    const canvasRef = useRef();
    const gridWidth = Math.floor(width / 2);
    const gridHeight = height;

    // Block settings
    const blockSize = 8;
    const cols = Math.floor(gridWidth / blockSize);
    const rows = Math.floor(gridHeight / blockSize);
    const totalCells = cols * rows;

    // Calculate blocks needed per payload item
    const totalTokens = payload.reduce((sum, p) => sum + p.tokens, 0);
    const utilization = totalTokens / maxTokens;

    const blocks = useMemo(() => {
        const result = [];
        let cellIndex = 0;

        payload.forEach(item => {
            const cellsForItem = Math.max(1, Math.round((item.tokens / maxTokens) * totalCells));
            const color = payloadColors[item.type] || '#888';

            for (let i = 0; i < cellsForItem && cellIndex < totalCells; i++) {
                const col = cellIndex % cols;
                const row = rows - 1 - Math.floor(cellIndex / cols); // Fill from bottom
                result.push({ col, row, color, type: item.type, label: item.label });
                cellIndex++;
            }
        });

        return result;
    }, [payload, maxTokens, totalCells, cols, rows]);

    // Draw
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Clear
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        // Draw grid (subtle)
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= gridWidth; x += blockSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, gridHeight);
            ctx.stroke();
        }
        for (let y = 0; y <= gridHeight; y += blockSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(gridWidth, y);
            ctx.stroke();
        }

        // Draw blocks
        blocks.forEach(block => {
            const x = block.col * blockSize;
            const y = block.row * blockSize;

            // Block fill
            ctx.fillStyle = block.color;
            ctx.fillRect(x + 1, y + 1, blockSize - 2, blockSize - 2);

            // Highlight edge (top-left)
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(x + 1, y + 1, blockSize - 2, 1);
            ctx.fillRect(x + 1, y + 1, 1, blockSize - 2);

            // Shadow edge (bottom-right)
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(x + 1, y + blockSize - 2, blockSize - 2, 1);
            ctx.fillRect(x + blockSize - 2, y + 1, 1, blockSize - 2);
        });

        // Divider line
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(gridWidth, 0);
        ctx.lineTo(gridWidth, height);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Right side - stats
        const statsX = gridWidth + 8;
        ctx.font = '9px monospace';
        ctx.textBaseline = 'top';

        // Title
        ctx.fillStyle = glowColor;
        ctx.fillText('PAYLOAD', statsX, 4);

        // Token count
        ctx.fillStyle = '#888';
        ctx.fillText(`${(totalTokens / 1000).toFixed(1)}K`, statsX, 16);
        ctx.fillStyle = '#555';
        ctx.fillText(`/ ${(maxTokens / 1000).toFixed(0)}K`, statsX + 28, 16);

        // Utilization bar
        const barY = 30;
        const barW = gridWidth - 16;
        const barH = 6;

        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(statsX, barY, barW, barH);

        const fillW = Math.min(barW, barW * utilization);
        const barGradient = ctx.createLinearGradient(statsX, 0, statsX + barW, 0);
        barGradient.addColorStop(0, '#10B981');
        barGradient.addColorStop(0.7, '#F59E0B');
        barGradient.addColorStop(1, '#EF4444');
        ctx.fillStyle = barGradient;
        ctx.fillRect(statsX, barY, fillW, barH);

        // Percentage
        ctx.fillStyle = utilization > 0.9 ? '#EF4444' : utilization > 0.7 ? '#F59E0B' : glowColor;
        ctx.fillText(`${(utilization * 100).toFixed(1)}%`, statsX, barY + 10);

        // Component breakdown (mini legend)
        if (showLabels) {
            const breakdown = {};
            payload.forEach(p => {
                breakdown[p.type] = (breakdown[p.type] || 0) + p.tokens;
            });

            let legendY = 52;
            Object.entries(breakdown).slice(0, 5).forEach(([type, tokens]) => {
                const color = payloadColors[type] || '#888';

                // Color block
                ctx.fillStyle = color;
                ctx.fillRect(statsX, legendY, 6, 6);

                // Label
                ctx.fillStyle = '#666';
                ctx.font = '7px monospace';
                ctx.fillText(`${type.slice(0, 4)} ${(tokens / 1000).toFixed(1)}K`, statsX + 9, legendY);

                legendY += 9;
            });
        }

        // Scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let y = 0; y < height; y += 2) {
            ctx.fillRect(0, y, width, 1);
        }

    }, [blocks, width, height, gridWidth, gridHeight, totalTokens, maxTokens, utilization, glowColor, showLabels, payload]);

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

            {/* CRT vignette */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ boxShadow: 'inset 0 0 25px rgba(0,0,0,0.5)' }}
            />
        </div>
    );
};

// ============================================
// ANIMATED VERSION (blocks drop in)
// ============================================

const TetrisPayloadAnimated = ({
    payload = [],
    maxTokens = 128000,
    width = 200,
    height = 100,
    glowColor = '#00ff00',
    animationSpeed = 50
}) => {
    const canvasRef = useRef();
    const [animatedBlocks, setAnimatedBlocks] = useState([]);
    const animationRef = useRef();

    const gridWidth = Math.floor(width / 2);
    const blockSize = 8;
    const cols = Math.floor(gridWidth / blockSize);
    const rows = Math.floor(height / blockSize);
    const totalCells = cols * rows;

    const totalTokens = payload.reduce((sum, p) => sum + p.tokens, 0);
    const utilization = totalTokens / maxTokens;

    // Generate target blocks
    const targetBlocks = useMemo(() => {
        const result = [];
        let cellIndex = 0;

        payload.forEach(item => {
            const cellsForItem = Math.max(1, Math.round((item.tokens / maxTokens) * totalCells));
            const color = payloadColors[item.type] || '#888';

            for (let i = 0; i < cellsForItem && cellIndex < totalCells; i++) {
                const col = cellIndex % cols;
                const row = rows - 1 - Math.floor(cellIndex / cols);
                result.push({ col, row, color, type: item.type });
                cellIndex++;
            }
        });

        return result;
    }, [payload, maxTokens, totalCells, cols, rows]);

    // Animate blocks dropping
    useEffect(() => {
        setAnimatedBlocks([]);
        let index = 0;

        const addBlock = () => {
            if (index < targetBlocks.length) {
                setAnimatedBlocks(prev => [...prev, { ...targetBlocks[index], dropping: true }]);
                index++;
                animationRef.current = setTimeout(addBlock, animationSpeed);
            }
        };

        addBlock();

        return () => clearTimeout(animationRef.current);
    }, [targetBlocks, animationSpeed]);

    // Draw
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
        animatedBlocks.forEach(block => {
            const x = block.col * blockSize;
            const y = block.row * blockSize;

            ctx.fillStyle = block.color;
            ctx.fillRect(x + 1, y + 1, blockSize - 2, blockSize - 2);

            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(x + 1, y + 1, blockSize - 2, 1);
            ctx.fillRect(x + 1, y + 1, 1, blockSize - 2);

            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(x + 1, y + blockSize - 2, blockSize - 2, 1);
            ctx.fillRect(x + blockSize - 2, y + 1, 1, blockSize - 2);
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
        const currentTokens = (animatedBlocks.length / targetBlocks.length) * totalTokens || 0;
        const currentUtil = currentTokens / maxTokens;

        ctx.font = '9px monospace';
        ctx.fillStyle = glowColor;
        ctx.fillText('PAYLOAD', statsX, 4);

        ctx.fillStyle = '#888';
        ctx.fillText(`${(currentTokens / 1000).toFixed(1)}K`, statsX, 16);
        ctx.fillStyle = '#555';
        ctx.fillText(`/ ${(maxTokens / 1000).toFixed(0)}K`, statsX + 28, 16);

        // Bar
        const barY = 30;
        const barW = gridWidth - 16;
        const barH = 6;

        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(statsX, barY, barW, barH);

        const barGradient = ctx.createLinearGradient(statsX, 0, statsX + barW, 0);
        barGradient.addColorStop(0, '#10B981');
        barGradient.addColorStop(0.7, '#F59E0B');
        barGradient.addColorStop(1, '#EF4444');
        ctx.fillStyle = barGradient;
        ctx.fillRect(statsX, barY, barW * currentUtil, barH);

        ctx.fillStyle = currentUtil > 0.9 ? '#EF4444' : currentUtil > 0.7 ? '#F59E0B' : glowColor;
        ctx.fillText(`${(currentUtil * 100).toFixed(1)}%`, statsX, barY + 10);

        // Legend
        const breakdown = {};
        animatedBlocks.forEach(b => {
            breakdown[b.type] = (breakdown[b.type] || 0) + 1;
        });

        let legendY = 52;
        Object.entries(breakdown).slice(0, 5).forEach(([type, count]) => {
            const tokens = (count / animatedBlocks.length) * currentTokens;
            ctx.fillStyle = payloadColors[type] || '#888';
            ctx.fillRect(statsX, legendY, 6, 6);
            ctx.fillStyle = '#666';
            ctx.font = '7px monospace';
            ctx.fillText(`${type.slice(0, 4)} ${(tokens / 1000).toFixed(1)}K`, statsX + 9, legendY);
            legendY += 9;
        });

        // Scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let y = 0; y < height; y += 2) {
            ctx.fillRect(0, y, width, 1);
        }

    }, [animatedBlocks, width, height, gridWidth, blockSize, glowColor, totalTokens, maxTokens, targetBlocks.length]);

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
// MINI VERSION (just the blocks, no stats)
// ============================================

const TetrisPayloadMini = ({
    payload = [],
    maxTokens = 128000,
    width = 60,
    height = 40,
    glowColor = '#00ff00'
}) => {
    const canvasRef = useRef();
    const blockSize = 4;
    const cols = Math.floor(width / blockSize);
    const rows = Math.floor(height / blockSize);
    const totalCells = cols * rows;

    const blocks = useMemo(() => {
        const result = [];
        let cellIndex = 0;

        payload.forEach(item => {
            const cellsForItem = Math.max(1, Math.round((item.tokens / maxTokens) * totalCells));
            const color = payloadColors[item.type] || '#888';

            for (let i = 0; i < cellsForItem && cellIndex < totalCells; i++) {
                const col = cellIndex % cols;
                const row = rows - 1 - Math.floor(cellIndex / cols);
                result.push({ col, row, color });
                cellIndex++;
            }
        });

        return result;
    }, [payload, maxTokens, totalCells, cols, rows]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        blocks.forEach(block => {
            const x = block.col * blockSize;
            const y = block.row * blockSize;
            ctx.fillStyle = block.color;
            ctx.fillRect(x, y, blockSize - 1, blockSize - 1);
        });

        // Scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        for (let y = 0; y < height; y += 2) {
            ctx.fillRect(0, y, width, 1);
        }
    }, [blocks, width, height, blockSize]);

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
            <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
        </div>
    );
};

// ============================================
// DEMO
// ============================================

const TetrisPayloadDemo = () => {
    const [key, setKey] = useState(0);

    const samplePayload = [
        { type: 'settings', tokens: 100, label: 'Settings' },
        { type: 'model', tokens: 50, label: 'Model' },
        { type: 'system', tokens: 1200, label: 'System Prompt' },
        { type: 'context', tokens: 800, label: 'History' },
        { type: 'user', tokens: 200, label: 'User 1' },
        { type: 'assistant', tokens: 3500, label: 'Assistant 1' },
        { type: 'user', tokens: 150, label: 'User 2' },
        { type: 'assistant', tokens: 2800, label: 'Assistant 2' },
        { type: 'tool', tokens: 600, label: 'Tool Result' },
        { type: 'attachment', tokens: 1500, label: 'File' },
        { type: 'image', tokens: 2000, label: 'Image' },
        { type: 'user', tokens: 300, label: 'Current Input' },
    ];

    const smallPayload = [
        { type: 'system', tokens: 500 },
        { type: 'user', tokens: 100 },
        { type: 'assistant', tokens: 800 },
    ];

    const largePayload = [
        { type: 'system', tokens: 2000 },
        { type: 'context', tokens: 15000 },
        { type: 'assistant', tokens: 45000 },
        { type: 'attachment', tokens: 8000 },
        { type: 'user', tokens: 500 },
    ];

    return (
        <div className="min-h-screen bg-gray-950 p-8">
            <h1 className="text-2xl font-light text-green-400 mb-2 tracking-wider font-mono">TETRIS PAYLOAD</h1>
            <p className="text-gray-500 mb-8 text-sm font-mono">Context window as stacking blocks</p>

            {/* Standard size */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">STANDARD (200×100)</h2>
                <TetrisPayloadMeter
                    payload={samplePayload}
                    maxTokens={128000}
                    width={200}
                    height={100}
                    glowColor="#00ff00"
                />
            </section>

            {/* Animated */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">ANIMATED</h2>
                <div className="flex items-center gap-4">
                    <TetrisPayloadAnimated
                        key={key}
                        payload={samplePayload}
                        maxTokens={128000}
                        width={200}
                        height={100}
                        glowColor="#00ffff"
                        animationSpeed={30}
                    />
                    <button
                        onClick={() => setKey(k => k + 1)}
                        className="px-3 py-1 font-mono text-xs rounded"
                        style={{ background: '#00ffff20', color: '#00ffff', border: '1px solid #00ffff40' }}
                    >
                        REPLAY
                    </button>
                </div>
            </section>

            {/* Different sizes */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">SIZE VARIANTS</h2>
                <div className="flex items-end gap-4">
                    <div>
                        <span className="text-xs text-gray-600 font-mono block mb-2">300×120</span>
                        <TetrisPayloadMeter
                            payload={samplePayload}
                            maxTokens={128000}
                            width={300}
                            height={120}
                            glowColor="#ff00ff"
                        />
                    </div>
                    <div>
                        <span className="text-xs text-gray-600 font-mono block mb-2">160×80</span>
                        <TetrisPayloadMeter
                            payload={samplePayload}
                            maxTokens={128000}
                            width={160}
                            height={80}
                            glowColor="#ffaa00"
                        />
                    </div>
                </div>
            </section>

            {/* Mini versions */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">MINI (blocks only)</h2>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center gap-1">
                        <TetrisPayloadMini payload={smallPayload} maxTokens={8000} glowColor="#10B981" />
                        <span className="text-xs text-gray-600 font-mono">Light</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <TetrisPayloadMini payload={samplePayload} maxTokens={128000} glowColor="#00ffff" />
                        <span className="text-xs text-gray-600 font-mono">Medium</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <TetrisPayloadMini payload={largePayload} maxTokens={128000} glowColor="#F59E0B" />
                        <span className="text-xs text-gray-600 font-mono">Heavy</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <TetrisPayloadMini
                            payload={[...largePayload, { type: 'assistant', tokens: 50000 }]}
                            maxTokens={128000}
                            glowColor="#EF4444"
                        />
                        <span className="text-xs text-gray-600 font-mono">Near limit</span>
                    </div>
                </div>
            </section>

            {/* Inline with text */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">INLINE USE</h2>
                <div
                    className="flex items-center gap-3 p-3 rounded"
                    style={{ background: '#111', border: '1px solid #333' }}
                >
                    <TetrisPayloadMini payload={samplePayload} maxTokens={128000} width={50} height={30} glowColor="#00ff00" />
                    <span className="font-mono text-sm text-gray-400">13.2K / 128K tokens</span>
                    <span className="font-mono text-xs text-gray-600">|</span>
                    <span className="font-mono text-xs text-gray-600">Claude 3.5 Sonnet</span>
                </div>
            </section>

            {/* Color reference */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">BLOCK COLORS</h2>
                <div className="flex flex-wrap gap-3">
                    {Object.entries(payloadColors).map(([type, color]) => (
                        <div key={type} className="flex items-center gap-2">
                            <div className="w-4 h-4" style={{ background: color }} />
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
    TetrisPayloadMeter,
    TetrisPayloadAnimated,
    TetrisPayloadMini,
    payloadColors
};

export default TetrisPayloadDemo;
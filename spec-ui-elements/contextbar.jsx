import React, { useState, useRef, useEffect, useMemo } from 'react';

// ============================================
// TURN COLORS
// ============================================

const turnColors = {
    system: '#4A90D9',
    user: '#10B981',
    assistant: '#F59E0B',
    tool: '#06B6D4',
    image: '#F43F5E',
    attachment: '#EC4899',
};

// ============================================
// EXPERIENCE BAR
// ============================================

const ExperienceBar = ({
    conversation = [],
    width = 600,
    height = 100,
    glowColor = '#00ff00',
    showScale = true,
    onTurnClick
}) => {
    const canvasRef = useRef();
    const [hoveredTurn, setHoveredTurn] = useState(null);
    const [tooltip, setTooltip] = useState(null);

    const totalTokens = conversation.reduce((sum, turn) => sum + turn.tokens, 0);

    // Calculate segments
    const segments = useMemo(() => {
        let x = 0;
        return conversation.map((turn, i) => {
            const segmentWidth = Math.max(2, (turn.tokens / totalTokens) * width);
            const segment = {
                ...turn,
                index: i,
                x,
                width: segmentWidth,
                color: turnColors[turn.role] || '#888'
            };
            x += segmentWidth;
            return segment;
        });
    }, [conversation, totalTokens, width]);

    const handleMouseMove = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Find which segment we're over
        const segment = segments.find(s => x >= s.x && x < s.x + s.width);

        if (segment && y < height - (showScale ? 16 : 0)) {
            setHoveredTurn(segment.index);
            setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, turn: segment });
        } else {
            setHoveredTurn(null);
            setTooltip(null);
        }
    };

    // Draw
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const barHeight = height - (showScale ? 20 : 0);

        // Clear
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        // Draw segments
        segments.forEach((seg, i) => {
            const isHovered = seg.index === hoveredTurn;

            // Main bar
            ctx.fillStyle = seg.color;
            ctx.globalAlpha = isHovered ? 1 : 0.7;
            ctx.fillRect(seg.x, 0, seg.width - 1, barHeight);

            // Top highlight
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(seg.x, 0, seg.width - 1, 2);

            // Bottom shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(seg.x, barHeight - 2, seg.width - 1, 2);

            // Hover glow
            if (isHovered) {
                ctx.shadowColor = seg.color;
                ctx.shadowBlur = 15;
                ctx.fillStyle = seg.color;
                ctx.fillRect(seg.x, 0, seg.width - 1, barHeight);
                ctx.shadowBlur = 0;

                // Border
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeRect(seg.x + 1, 1, seg.width - 3, barHeight - 2);
            }

            ctx.globalAlpha = 1;

            // Turn number if segment is wide enough
            if (seg.width > 20) {
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.font = '9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(i + 1, seg.x + seg.width / 2, barHeight / 2 + 3);
            }
        });

        // Scale bar at bottom
        if (showScale) {
            const scaleY = barHeight + 4;

            // Background
            ctx.fillStyle = '#111';
            ctx.fillRect(0, barHeight, width, 20);

            // Token markers
            ctx.fillStyle = '#444';
            ctx.font = '8px monospace';
            ctx.textAlign = 'left';

            const step = Math.ceil(totalTokens / 5);
            for (let t = 0; t <= totalTokens; t += step) {
                const x = (t / totalTokens) * width;

                // Tick
                ctx.fillStyle = '#333';
                ctx.fillRect(x, barHeight, 1, 4);

                // Label
                ctx.fillStyle = '#555';
                ctx.fillText(`${(t / 1000).toFixed(0)}K`, x + 2, scaleY + 10);
            }

            // Total on right
            ctx.textAlign = 'right';
            ctx.fillStyle = glowColor;
            ctx.fillText(`${(totalTokens / 1000).toFixed(1)}K total`, width - 4, scaleY + 10);
        }

        // Scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        for (let y = 0; y < height; y += 2) {
            ctx.fillRect(0, y, width, 1);
        }

    }, [segments, width, height, hoveredTurn, totalTokens, showScale, glowColor]);

    return (
        <div className="relative" style={{ width, height }}>
            <div
                className="overflow-hidden"
                style={{
                    width,
                    height,
                    borderRadius: 4,
                    border: `1px solid ${glowColor}25`,
                    boxShadow: `inset 0 0 30px rgba(0,0,0,0.5)`
                }}
            >
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    style={{ display: 'block', cursor: hoveredTurn !== null ? 'pointer' : 'default' }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => { setHoveredTurn(null); setTooltip(null); }}
                    onClick={() => hoveredTurn !== null && onTurnClick?.(segments[hoveredTurn])}
                />
            </div>

            {/* Tooltip */}
            {tooltip && (
                <TurnTooltip
                    turn={tooltip.turn}
                    x={tooltip.x}
                    y={tooltip.y}
                    containerWidth={width}
                />
            )}
        </div>
    );
};

// ============================================
// TOOLTIP
// ============================================

const TurnTooltip = ({ turn, x, y, containerWidth }) => {
    const w = 220;
    let left = x + 12;
    let top = y - 80;

    if (left + w > containerWidth) left = x - w - 12;
    if (left < 0) left = 4;
    if (top < 0) top = y + 20;

    const color = turnColors[turn.role] || '#888';

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
                boxShadow: `0 0 15px ${color}40`,
                overflow: 'hidden'
            }}
        >
            {/* Header */}
            <div
                className="px-2 py-1 flex items-center gap-2"
                style={{ background: `${color}15`, borderBottom: `1px solid ${color}30` }}
            >
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="font-mono text-xs font-bold" style={{ color }}>
                    {turn.role.toUpperCase()}
                </span>
                <span className="font-mono text-xs text-gray-500">
                    #{turn.index + 1}
                </span>
                <span className="font-mono text-xs text-gray-600 ml-auto">
                    {turn.tokens.toLocaleString()} tokens
                </span>
            </div>

            {/* Content preview */}
            <div className="p-2">
                <p className="font-mono text-xs text-gray-300 leading-relaxed">
                    {turn.preview?.length > 120 ? turn.preview.slice(0, 120) + '...' : turn.preview}
                </p>
            </div>

            {/* Percentage */}
            <div
                className="px-2 py-1 flex items-center justify-between"
                style={{ background: '#111', borderTop: '1px solid #222' }}
            >
                <span className="font-mono text-xs text-gray-600">
                    {turn.timestamp || ''}
                </span>
                <span className="font-mono text-xs" style={{ color }}>
                    {((turn.width / (turn.x + turn.width + (containerWidth - turn.x - turn.width))) * 100).toFixed(1)}% of context
                </span>
            </div>
        </div>
    );
};

// ============================================
// SLIM VERSION (no scale, minimal height)
// ============================================

const ExperienceBarSlim = ({
    conversation = [],
    width = 600,
    height = 24,
    glowColor = '#00ff00',
    onTurnClick
}) => {
    const canvasRef = useRef();
    const [hoveredTurn, setHoveredTurn] = useState(null);
    const [tooltip, setTooltip] = useState(null);

    const totalTokens = conversation.reduce((sum, turn) => sum + turn.tokens, 0);

    const segments = useMemo(() => {
        let x = 0;
        return conversation.map((turn, i) => {
            const segmentWidth = Math.max(2, (turn.tokens / totalTokens) * width);
            const segment = { ...turn, index: i, x, width: segmentWidth, color: turnColors[turn.role] || '#888' };
            x += segmentWidth;
            return segment;
        });
    }, [conversation, totalTokens, width]);

    const handleMouseMove = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const segment = segments.find(s => x >= s.x && x < s.x + s.width);

        if (segment) {
            setHoveredTurn(segment.index);
            setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, turn: segment });
        } else {
            setHoveredTurn(null);
            setTooltip(null);
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        segments.forEach(seg => {
            const isHovered = seg.index === hoveredTurn;
            ctx.fillStyle = seg.color;
            ctx.globalAlpha = isHovered ? 1 : 0.65;
            ctx.fillRect(seg.x, 0, seg.width - 1, height);

            if (isHovered) {
                ctx.shadowColor = seg.color;
                ctx.shadowBlur = 10;
                ctx.fillRect(seg.x, 0, seg.width - 1, height);
                ctx.shadowBlur = 0;
            }
            ctx.globalAlpha = 1;
        });

        // Scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let y = 0; y < height; y += 2) {
            ctx.fillRect(0, y, width, 1);
        }
    }, [segments, width, height, hoveredTurn]);

    return (
        <div className="relative" style={{ width, height }}>
            <div
                style={{
                    width,
                    height,
                    borderRadius: 3,
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
                    onMouseLeave={() => { setHoveredTurn(null); setTooltip(null); }}
                    onClick={() => hoveredTurn !== null && onTurnClick?.(segments[hoveredTurn])}
                />
            </div>

            {tooltip && (
                <TurnTooltip turn={tooltip.turn} x={tooltip.x} y={tooltip.y} containerWidth={width} />
            )}
        </div>
    );
};

// ============================================
// WITH POSITION MARKER (shows "you are here")
// ============================================

const ExperienceBarWithMarker = ({
    conversation = [],
    currentIndex = null,
    width = 600,
    height = 100,
    glowColor = '#00ff00'
}) => {
    const canvasRef = useRef();
    const [hoveredTurn, setHoveredTurn] = useState(null);
    const [tooltip, setTooltip] = useState(null);

    const totalTokens = conversation.reduce((sum, turn) => sum + turn.tokens, 0);

    const segments = useMemo(() => {
        let x = 0;
        return conversation.map((turn, i) => {
            const segmentWidth = Math.max(2, (turn.tokens / totalTokens) * width);
            const segment = { ...turn, index: i, x, width: segmentWidth, color: turnColors[turn.role] || '#888' };
            x += segmentWidth;
            return segment;
        });
    }, [conversation, totalTokens, width]);

    const handleMouseMove = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const segment = segments.find(s => x >= s.x && x < s.x + s.width);

        if (segment && y < height - 20) {
            setHoveredTurn(segment.index);
            setTooltip({ x, y, turn: segment });
        } else {
            setHoveredTurn(null);
            setTooltip(null);
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const barHeight = height - 24;

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        // Segments
        segments.forEach((seg, i) => {
            const isHovered = seg.index === hoveredTurn;
            const isCurrent = seg.index === currentIndex;
            const isPast = currentIndex !== null && seg.index < currentIndex;

            ctx.fillStyle = seg.color;
            ctx.globalAlpha = isHovered ? 1 : isPast ? 0.5 : 0.75;
            ctx.fillRect(seg.x, 4, seg.width - 1, barHeight - 8);

            if (isHovered || isCurrent) {
                ctx.shadowColor = seg.color;
                ctx.shadowBlur = isCurrent ? 20 : 12;
                ctx.fillRect(seg.x, 4, seg.width - 1, barHeight - 8);
                ctx.shadowBlur = 0;
            }

            ctx.globalAlpha = 1;
        });

        // Current position marker
        if (currentIndex !== null && segments[currentIndex]) {
            const seg = segments[currentIndex];
            const markerX = seg.x + seg.width / 2;

            // Triangle marker above
            ctx.fillStyle = glowColor;
            ctx.beginPath();
            ctx.moveTo(markerX - 6, 0);
            ctx.lineTo(markerX + 6, 0);
            ctx.lineTo(markerX, 6);
            ctx.fill();

            // Line down
            ctx.strokeStyle = glowColor;
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(markerX, 6);
            ctx.lineTo(markerX, barHeight);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Bottom info bar
        ctx.fillStyle = '#111';
        ctx.fillRect(0, barHeight, width, 24);

        ctx.font = '9px monospace';
        ctx.fillStyle = '#555';
        ctx.textAlign = 'left';
        ctx.fillText(`${conversation.length} turns`, 8, barHeight + 14);

        ctx.textAlign = 'center';
        ctx.fillStyle = glowColor;
        ctx.fillText(`${(totalTokens / 1000).toFixed(1)}K tokens`, width / 2, barHeight + 14);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#555';
        if (currentIndex !== null) {
            ctx.fillText(`viewing #${currentIndex + 1}`, width - 8, barHeight + 14);
        }

        // Scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        for (let y = 0; y < height; y += 2) {
            ctx.fillRect(0, y, width, 1);
        }

    }, [segments, width, height, hoveredTurn, currentIndex, totalTokens, conversation.length, glowColor]);

    return (
        <div className="relative" style={{ width, height }}>
            <div
                style={{
                    width,
                    height,
                    borderRadius: 4,
                    border: `1px solid ${glowColor}25`,
                    boxShadow: `inset 0 0 30px rgba(0,0,0,0.5)`,
                    overflow: 'hidden'
                }}
            >
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    style={{ display: 'block', cursor: 'pointer' }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => { setHoveredTurn(null); setTooltip(null); }}
                />
            </div>

            {tooltip && (
                <TurnTooltip turn={tooltip.turn} x={tooltip.x} y={tooltip.y} containerWidth={width} />
            )}
        </div>
    );
};

// ============================================
// DEMO
// ============================================

const ExperienceBarDemo = () => {
    const [currentIndex, setCurrentIndex] = useState(8);

    const sampleConversation = [
        { role: 'system', tokens: 800, preview: 'You are Claude, an AI assistant made by Anthropic...' },
        { role: 'user', tokens: 120, preview: 'Hey can you help me build some React components?', timestamp: '10:30 AM' },
        { role: 'assistant', tokens: 2400, preview: 'Of course! I\'d be happy to help you build React components. What kind of components are you looking to create?', timestamp: '10:30 AM' },
        { role: 'user', tokens: 350, preview: 'I want to build a CRT-style terminal with screensaver effects and animated backgrounds', timestamp: '10:32 AM' },
        { role: 'assistant', tokens: 4200, preview: 'Great idea! Here\'s a CRT terminal component with scanlines, phosphor glow, and multiple screensaver modes...', timestamp: '10:32 AM' },
        { role: 'user', tokens: 80, preview: 'Can you add matrix rain effect?', timestamp: '10:35 AM' },
        { role: 'assistant', tokens: 1800, preview: 'Here\'s the matrix rain screensaver implementation with katakana characters...', timestamp: '10:35 AM' },
        { role: 'tool', tokens: 400, preview: '[Code execution result: Component rendered successfully]', timestamp: '10:36 AM' },
        { role: 'user', tokens: 200, preview: 'Now I need a tetris-style payload visualizer that shows token usage', timestamp: '10:38 AM' },
        { role: 'assistant', tokens: 3800, preview: 'Perfect! Here\'s a compact tetris payload meter with left-side blocks and right-side stats...', timestamp: '10:38 AM' },
        { role: 'user', tokens: 150, preview: 'What about a memory block grid?', timestamp: '10:45 AM' },
        { role: 'assistant', tokens: 2600, preview: 'Here\'s a memory visualization grid where each block represents a stored memory...', timestamp: '10:45 AM' },
        { role: 'image', tokens: 1200, preview: '[Attached image: screenshot.png - 1200x800]', timestamp: '10:48 AM' },
        { role: 'user', tokens: 180, preview: 'Can you make an experience bar that shows the conversation timeline?', timestamp: '10:50 AM' },
        { role: 'assistant', tokens: 3200, preview: 'Here\'s a horizontal experience bar showing token usage per conversation turn...', timestamp: '10:50 AM' },
    ];

    return (
        <div className="min-h-screen bg-gray-950 p-8">
            <h1 className="text-2xl font-light text-green-400 mb-2 tracking-wider font-mono">EXPERIENCE BAR</h1>
            <p className="text-gray-500 mb-8 text-sm font-mono">Conversation context as a horizontal timeline</p>

            {/* Full bar */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">FULL (600×100)</h2>
                <ExperienceBar
                    conversation={sampleConversation}
                    width={600}
                    height={100}
                    glowColor="#00ff00"
                />
            </section>

            {/* Slim bar */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">SLIM (600×24)</h2>
                <ExperienceBarSlim
                    conversation={sampleConversation}
                    width={600}
                    height={24}
                    glowColor="#00ffff"
                />
            </section>

            {/* With position marker */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">WITH POSITION MARKER</h2>
                <ExperienceBarWithMarker
                    conversation={sampleConversation}
                    currentIndex={currentIndex}
                    width={600}
                    height={100}
                    glowColor="#ff00ff"
                />
                <div className="mt-3 flex items-center gap-4">
                    <button
                        onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                        className="px-3 py-1 font-mono text-xs rounded"
                        style={{ background: '#ff00ff20', color: '#ff00ff', border: '1px solid #ff00ff40' }}
                    >
                        ← PREV
                    </button>
                    <span className="font-mono text-xs text-gray-500">Turn {currentIndex + 1} of {sampleConversation.length}</span>
                    <button
                        onClick={() => setCurrentIndex(Math.min(sampleConversation.length - 1, currentIndex + 1))}
                        className="px-3 py-1 font-mono text-xs rounded"
                        style={{ background: '#ff00ff20', color: '#ff00ff', border: '1px solid #ff00ff40' }}
                    >
                        NEXT →
                    </button>
                </div>
            </section>

            {/* Wide example */}
            <section className="mb-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">WIDE (800×80)</h2>
                <ExperienceBar
                    conversation={sampleConversation}
                    width={800}
                    height={80}
                    glowColor="#ffaa00"
                />
            </section>

            {/* Legend */}
            <section className="mt-10">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">TURN TYPES</h2>
                <div className="flex flex-wrap gap-4">
                    {Object.entries(turnColors).map(([role, color]) => (
                        <div key={role} className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ background: color }} />
                            <span className="font-mono text-xs text-gray-500">{role}</span>
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
    ExperienceBar,
    ExperienceBarSlim,
    ExperienceBarWithMarker,
    turnColors
};

export default ExperienceBarDemo;
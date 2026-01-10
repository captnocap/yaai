import React, { useState, useRef, useEffect } from 'react';

// ============================================
// MODEL COLORS & DATA
// ============================================

const modelData = {
    claude: { color: '#D97757', name: 'Claude', logo: 'A' },
    'gpt-4': { color: '#10a37f', name: 'GPT-4', logo: 'G' },
    'gpt-4o': { color: '#10a37f', name: 'GPT-4o', logo: 'G' },
    gemini: { color: '#4285f4', name: 'Gemini', logo: '◆' },
    mistral: { color: '#FA528F', name: 'Mistral', logo: 'M' },
    groq: { color: '#F55036', name: 'Groq', logo: '⚡' },
    llama: { color: '#0467DF', name: 'Llama', logo: '🦙' },
    qwen: { color: '#615CED', name: 'Qwen', logo: 'Q' },
    perplexity: { color: '#22B8CD', name: 'Perplexity', logo: 'P' },
    cohere: { color: '#39594D', name: 'Cohere', logo: 'C' },
    imagen: { color: '#EA4335', name: 'Imagen', logo: 'I' },
};

// ============================================
// CRT EFFECTS UTILITIES
// ============================================

const CRTOverlay = ({ intensity = 1 }) => (
    <>
        <div
            className="absolute inset-0 pointer-events-none z-30"
            style={{
                background: `repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 1px, rgba(0,0,0,${0.3 * intensity}) 1px, rgba(0,0,0,${0.3 * intensity}) 2px)`
            }}
        />
        <div
            className="absolute inset-0 pointer-events-none z-30"
            style={{
                background: `repeating-linear-gradient(90deg, rgba(255,0,0,0.03) 0px, rgba(0,255,0,0.03) 1px, rgba(0,0,255,0.03) 2px, transparent 3px)`,
                backgroundSize: '3px 100%'
            }}
        />
    </>
);

const Scanlines = ({ opacity = 0.3 }) => (
    <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
            background: `repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 1px, rgba(0,0,0,${opacity}) 1px, rgba(0,0,0,${opacity}) 2px)`
        }}
    />
);

// ============================================
// FILE/TEXT PREVIEW POPOVER
// ============================================

const FilePreview = ({
    content,
    filename,
    type = 'text', // text, code, image, json
    width = 200,
    height = 250,
    glowColor = '#00ff00',
    isOpen = false,
    onClose,
    position = { top: 0, left: 0 }
}) => {
    const scrollRef = useRef();

    if (!isOpen) return null;

    const getHighlightedContent = () => {
        if (type === 'json') {
            try {
                return JSON.stringify(JSON.parse(content), null, 2);
            } catch {
                return content;
            }
        }
        return content;
    };

    return (
        <div
            className="fixed z-50 overflow-hidden"
            style={{
                ...position,
                width,
                height,
                background: '#0a0a0a',
                borderRadius: 4,
                border: `1px solid ${glowColor}`,
                boxShadow: `0 0 20px ${glowColor}30, 0 4px 30px rgba(0,0,0,0.8)`
            }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-2 py-1"
                style={{
                    borderBottom: `1px solid ${glowColor}30`,
                    background: `${glowColor}10`
                }}
            >
                <span
                    className="text-xs font-mono truncate"
                    style={{ color: glowColor, maxWidth: width - 40 }}
                >
                    {filename}
                </span>
                <button
                    onClick={onClose}
                    className="text-xs hover:opacity-70"
                    style={{ color: glowColor }}
                >
                    ✕
                </button>
            </div>

            {/* Scrollable content */}
            <div
                ref={scrollRef}
                className="overflow-auto"
                style={{
                    height: height - 30,
                    padding: 8
                }}
            >
                {type === 'image' ? (
                    <img
                        src={content}
                        alt={filename}
                        style={{
                            maxWidth: '100%',
                            filter: 'contrast(1.1) brightness(0.9)',
                            imageRendering: 'pixelated'
                        }}
                    />
                ) : (
                    <pre
                        className="font-mono text-xs whitespace-pre-wrap break-words"
                        style={{
                            color: glowColor,
                            textShadow: `0 0 5px ${glowColor}40`,
                            margin: 0,
                            lineHeight: 1.4
                        }}
                    >
                        {getHighlightedContent()}
                    </pre>
                )}
            </div>

            {/* Scroll indicator */}
            <div
                className="absolute right-1 top-8 bottom-1 w-1 rounded"
                style={{ background: `${glowColor}20` }}
            >
                <div
                    className="w-full rounded"
                    style={{
                        height: '30%',
                        background: glowColor,
                        opacity: 0.5
                    }}
                />
            </div>

            <CRTOverlay intensity={0.5} />
        </div>
    );
};

// Attachment chip that shows preview on hover
const AttachmentChip = ({
    filename,
    content,
    type = 'text',
    glowColor = '#00ffff',
    onRemove
}) => {
    const [showPreview, setShowPreview] = useState(false);
    const [previewPos, setPreviewPos] = useState({ top: 0, left: 0 });
    const chipRef = useRef();

    const handleMouseEnter = () => {
        if (chipRef.current) {
            const rect = chipRef.current.getBoundingClientRect();
            setPreviewPos({
                top: rect.bottom + 8,
                left: rect.left
            });
        }
        setShowPreview(true);
    };

    const getIcon = () => {
        switch (type) {
            case 'code': return '{ }';
            case 'image': return '🖼';
            case 'json': return '{ }';
            default: return '📄';
        }
    };

    return (
        <>
            <div
                ref={chipRef}
                className="relative inline-flex items-center gap-2 px-3 py-1 cursor-pointer"
                style={{
                    background: '#0a0a0a',
                    border: `1px solid ${glowColor}50`,
                    borderRadius: 4,
                    transition: 'all 0.2s'
                }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={() => setShowPreview(false)}
            >
                <span style={{ fontSize: 12 }}>{getIcon()}</span>
                <span
                    className="font-mono text-xs"
                    style={{ color: glowColor }}
                >
                    {filename}
                </span>
                {onRemove && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        className="text-xs opacity-50 hover:opacity-100"
                        style={{ color: glowColor }}
                    >
                        ✕
                    </button>
                )}
                <Scanlines opacity={0.15} />
            </div>

            <FilePreview
                content={content}
                filename={filename}
                type={type}
                glowColor={glowColor}
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                position={previewPos}
            />
        </>
    );
};

// ============================================
// MODEL BADGES - Active/In-Flight indicators
// ============================================

const ModelBadge = ({
    model,
    status = 'idle', // idle, pending, streaming, complete, error
    tokens = null,
    latency = null,
    size = 'medium' // small, medium, large
}) => {
    const data = modelData[model] || { color: '#888', name: model, logo: '?' };

    const sizes = {
        small: { width: 80, height: 28, fontSize: 10, logoSize: 14 },
        medium: { width: 120, height: 36, fontSize: 12, logoSize: 18 },
        large: { width: 160, height: 44, fontSize: 14, logoSize: 22 }
    };

    const s = sizes[size];

    const statusStyles = {
        idle: { opacity: 0.4, animation: 'none' },
        pending: { opacity: 0.7, animation: 'pulse 1s infinite' },
        streaming: { opacity: 1, animation: 'glow 0.5s ease-in-out infinite alternate' },
        complete: { opacity: 1, animation: 'none' },
        error: { opacity: 1, animation: 'none' }
    };

    const style = statusStyles[status];

    return (
        <div
            className="relative overflow-hidden"
            style={{
                width: s.width,
                height: s.height,
                background: '#0a0a0a',
                borderRadius: 4,
                border: `1px solid ${status === 'error' ? '#ff4444' : data.color}`,
                boxShadow: status === 'streaming' ? `0 0 15px ${data.color}50` : 'none',
                opacity: style.opacity,
                transition: 'opacity 0.3s, box-shadow 0.3s'
            }}
        >
            {/* Animated background when streaming */}
            {status === 'streaming' && (
                <div className="absolute inset-0">
                    <StreamingBg color={data.color} width={s.width} height={s.height} />
                </div>
            )}

            {/* Pending pulse */}
            {status === 'pending' && (
                <div
                    className="absolute inset-0"
                    style={{
                        background: `linear-gradient(90deg, transparent, ${data.color}20, transparent)`,
                        animation: 'sweep 1.5s ease-in-out infinite'
                    }}
                />
            )}

            {/* Content */}
            <div className="relative z-10 h-full flex items-center px-2 gap-2">
                {/* Logo circle */}
                <div
                    className="flex items-center justify-center rounded"
                    style={{
                        width: s.logoSize + 4,
                        height: s.logoSize + 4,
                        background: status === 'streaming' ? data.color : `${data.color}30`,
                        color: status === 'streaming' ? '#000' : data.color,
                        fontSize: s.logoSize * 0.7,
                        fontWeight: 'bold',
                        fontFamily: 'monospace',
                        transition: 'all 0.3s'
                    }}
                >
                    {data.logo}
                </div>

                {/* Name and stats */}
                <div className="flex flex-col flex-1 min-w-0">
                    <span
                        className="font-mono truncate"
                        style={{
                            fontSize: s.fontSize,
                            color: data.color,
                            textShadow: status === 'streaming' ? `0 0 8px ${data.color}` : 'none'
                        }}
                    >
                        {data.name}
                    </span>
                    {(tokens !== null || latency !== null) && (
                        <span
                            className="font-mono"
                            style={{ fontSize: s.fontSize - 2, color: '#666' }}
                        >
                            {tokens && `${tokens}tk`}
                            {tokens && latency && ' · '}
                            {latency && `${latency}ms`}
                        </span>
                    )}
                </div>

                {/* Status indicator */}
                <div
                    className="w-2 h-2 rounded-full"
                    style={{
                        background: status === 'error' ? '#ff4444' :
                            status === 'complete' ? '#00ff00' :
                                status === 'streaming' ? data.color : '#444',
                        boxShadow: status === 'streaming' ? `0 0 8px ${data.color}` : 'none',
                        animation: status === 'streaming' ? 'blink 0.5s infinite' : 'none'
                    }}
                />
            </div>

            <Scanlines opacity={0.2} />

            <style>{`
        @keyframes sweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes glow { from { box-shadow: 0 0 10px ${data.color}30; } to { box-shadow: 0 0 20px ${data.color}60; } }
      `}</style>
        </div>
    );
};

// Streaming background animation
const StreamingBg = ({ color, width, height }) => {
    const canvasRef = useRef();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let offset = 0;

        const draw = () => {
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, width, height);

            // Flowing lines
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = 1;

            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                const y = (i / 5) * height + ((offset * (i + 1)) % height);
                ctx.moveTo(0, y % height);
                ctx.lineTo(width, y % height);
                ctx.stroke();
            }

            ctx.globalAlpha = 1;
            offset += 2;
        };

        const interval = setInterval(draw, 50);
        return () => clearInterval(interval);
    }, [color, width, height]);

    return <canvas ref={canvasRef} width={width} height={height} />;
};

// Badge group for parallel responses
const ModelBadgeGroup = ({ models }) => (
    <div className="flex gap-2 flex-wrap">
        {models.map(m => (
            <ModelBadge key={m.model} {...m} />
        ))}
    </div>
);

// ============================================
// CRT DISTORTED MODEL LOGO
// ============================================

const DistortedModelLogo = ({
    model,
    size = 80,
    imageUrl = null, // Optional actual logo image
    animated = true
}) => {
    const canvasRef = useRef();
    const data = modelData[model] || { color: '#888', name: model, logo: '?' };

    useEffect(() => {
        if (!animated) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let frame = 0;

        const draw = () => {
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, size, size);

            // Draw logo text with distortion
            ctx.font = `bold ${size * 0.5}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Chromatic aberration layers
            const offset = Math.sin(frame * 0.1) * 2;

            // Red channel
            ctx.fillStyle = '#ff000080';
            ctx.fillText(data.logo, size / 2 - offset, size / 2);

            // Green channel
            ctx.fillStyle = '#00ff0080';
            ctx.fillText(data.logo, size / 2, size / 2 + offset * 0.5);

            // Blue channel
            ctx.fillStyle = '#0000ff80';
            ctx.fillText(data.logo, size / 2 + offset, size / 2);

            // Main color on top
            ctx.fillStyle = data.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = data.color;
            ctx.fillText(data.logo, size / 2, size / 2);
            ctx.shadowBlur = 0;

            // Random glitch lines
            if (Math.random() > 0.92) {
                const y = Math.random() * size;
                const glitchData = ctx.getImageData(0, y, size, 3);
                ctx.putImageData(glitchData, (Math.random() - 0.5) * 10, y);
            }

            // Scanlines
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            for (let y = 0; y < size; y += 2) {
                ctx.fillRect(0, y, size, 1);
            }

            frame++;
        };

        const interval = setInterval(draw, 50);
        return () => clearInterval(interval);
    }, [model, size, data, animated]);

    return (
        <div
            className="relative overflow-hidden"
            style={{
                width: size,
                height: size,
                borderRadius: 8,
                border: `1px solid ${data.color}50`,
                boxShadow: `0 0 20px ${data.color}20, inset 0 0 30px rgba(0,0,0,0.8)`
            }}
        >
            <canvas
                ref={canvasRef}
                width={size}
                height={size}
                style={{ display: 'block' }}
            />

            {/* Curved screen effect */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)'
                }}
            />
        </div>
    );
};

// Logo with actual image + CRT distortion
const DistortedModelImage = ({
    model,
    imageUrl,
    size = 80
}) => {
    const canvasRef = useRef();
    const imgRef = useRef(new Image());
    const data = modelData[model] || { color: '#888' };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = imgRef.current;

        img.crossOrigin = 'anonymous';
        img.src = imageUrl;

        let frame = 0;
        let loaded = false;

        img.onload = () => { loaded = true; };

        const draw = () => {
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, size, size);

            if (loaded) {
                // Draw image with slight RGB split
                const offset = Math.sin(frame * 0.08) * 1.5;

                // Red channel offset
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.4;
                ctx.drawImage(img, -offset, 0, size, size);

                // Blue channel offset
                ctx.drawImage(img, offset, 0, size, size);

                // Main image
                ctx.globalAlpha = 0.8;
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(img, 0, 0, size, size);
                ctx.globalAlpha = 1;

                // Color tint overlay
                ctx.fillStyle = `${data.color}20`;
                ctx.fillRect(0, 0, size, size);
            }

            // Scanlines
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            for (let y = 0; y < size; y += 2) {
                ctx.fillRect(0, y, size, 1);
            }

            // Random noise
            if (Math.random() > 0.9) {
                ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.1})`;
                ctx.fillRect(0, Math.random() * size, size, 1);
            }

            frame++;
        };

        const interval = setInterval(draw, 50);
        return () => clearInterval(interval);
    }, [imageUrl, size, data.color]);

    return (
        <div
            className="relative overflow-hidden"
            style={{
                width: size,
                height: size,
                borderRadius: 8,
                border: `1px solid ${data.color}50`,
                boxShadow: `inset 0 0 30px rgba(0,0,0,0.8)`
            }}
        >
            <canvas ref={canvasRef} width={size} height={size} style={{ display: 'block' }} />
        </div>
    );
};

// ============================================
// THINKING BLOCK
// ============================================

const ThinkingBlock = ({
    model,
    isExpanded = false,
    onToggle,
    content = '',
    duration = null,
    width = '100%'
}) => {
    const data = modelData[model] || { color: '#888', name: model };
    const [dots, setDots] = useState('');

    // Animated dots when no content
    useEffect(() => {
        if (content) return;
        const interval = setInterval(() => {
            setDots(d => d.length >= 3 ? '' : d + '.');
        }, 400);
        return () => clearInterval(interval);
    }, [content]);

    return (
        <div
            className="relative overflow-hidden"
            style={{
                width,
                background: '#0c0c10',
                borderRadius: 6,
                border: `1px solid ${data.color}30`,
                boxShadow: `inset 0 0 30px rgba(0,0,0,0.5)`
            }}
        >
            {/* Header */}
            <div
                onClick={onToggle}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                style={{ borderBottom: isExpanded ? `1px solid ${data.color}20` : 'none' }}
            >
                {/* Thinking indicator */}
                <div className="relative">
                    <div
                        className="w-4 h-4 rounded-full"
                        style={{
                            background: content ? `${data.color}30` : data.color,
                            animation: content ? 'none' : 'think-pulse 1.5s ease-in-out infinite'
                        }}
                    />
                    {!content && (
                        <div
                            className="absolute inset-0 rounded-full"
                            style={{
                                border: `2px solid ${data.color}`,
                                animation: 'think-ring 1.5s ease-out infinite'
                            }}
                        />
                    )}
                </div>

                <span
                    className="font-mono text-xs"
                    style={{ color: data.color }}
                >
                    {content ? 'REASONING' : `THINKING${dots}`}
                </span>

                {duration && (
                    <span className="font-mono text-xs" style={{ color: '#666' }}>
                        {duration}s
                    </span>
                )}

                <div className="flex-1" />

                {content && (
                    <>
                        <span className="font-mono text-xs" style={{ color: '#666' }}>
                            {isExpanded ? 'COLLAPSE' : 'EXPAND'}
                        </span>
                        <span
                            style={{
                                color: data.color,
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s'
                            }}
                        >
                            ▼
                        </span>
                    </>
                )}
            </div>

            {/* Expandable content */}
            {isExpanded && content && (
                <div
                    className="px-3 py-2 font-mono text-xs overflow-auto"
                    style={{
                        maxHeight: 200,
                        color: '#888',
                        lineHeight: 1.5
                    }}
                >
                    {content}
                </div>
            )}

            {/* Animated background when thinking */}
            {!content && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: `linear-gradient(90deg, transparent, ${data.color}10, transparent)`,
                        animation: 'think-sweep 2s ease-in-out infinite'
                    }}
                />
            )}

            <Scanlines opacity={0.15} />

            <style>{`
        @keyframes think-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
        @keyframes think-ring { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
        @keyframes think-sweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      `}</style>
        </div>
    );
};

// ============================================
// RESPONSE CARD
// ============================================

const ResponseCard = ({
    model,
    content,
    status = 'complete', // streaming, complete, error
    tokens = null,
    latency = null,
    timestamp = null,
    isSelected = false,
    onClick,
    children, // For custom content like code blocks
    width = '100%',
    maxHeight = 400
}) => {
    const data = modelData[model] || { color: '#888', name: model, logo: '?' };
    const contentRef = useRef();

    // Auto-scroll when streaming
    useEffect(() => {
        if (status === 'streaming' && contentRef.current) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [content, status]);

    return (
        <div
            className="relative overflow-hidden"
            onClick={onClick}
            style={{
                width,
                background: '#0a0a0c',
                borderRadius: 8,
                border: `1px solid ${isSelected ? data.color : '#222'}`,
                boxShadow: isSelected ? `0 0 20px ${data.color}30` : '0 2px 10px rgba(0,0,0,0.3)',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
        >
            {/* Header */}
            <div
                className="flex items-center gap-2 px-3 py-2"
                style={{ borderBottom: `1px solid ${data.color}20` }}
            >
                {/* Model indicator */}
                <div
                    className="flex items-center justify-center rounded"
                    style={{
                        width: 24,
                        height: 24,
                        background: `${data.color}20`,
                        color: data.color,
                        fontSize: 12,
                        fontWeight: 'bold',
                        fontFamily: 'monospace'
                    }}
                >
                    {data.logo}
                </div>

                <span
                    className="font-mono text-sm"
                    style={{ color: data.color }}
                >
                    {data.name}
                </span>

                {/* Status indicator */}
                {status === 'streaming' && (
                    <div className="flex items-center gap-1">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{
                                background: data.color,
                                animation: 'blink 0.5s infinite'
                            }}
                        />
                        <span className="font-mono text-xs" style={{ color: data.color }}>
                            streaming
                        </span>
                    </div>
                )}

                <div className="flex-1" />

                {/* Stats */}
                <div className="flex items-center gap-3 font-mono text-xs" style={{ color: '#666' }}>
                    {tokens && <span>{tokens} tokens</span>}
                    {latency && <span>{latency}ms</span>}
                    {timestamp && <span>{timestamp}</span>}
                </div>
            </div>

            {/* Content */}
            <div
                ref={contentRef}
                className="p-3 overflow-auto"
                style={{ maxHeight }}
            >
                {children || (
                    <div
                        className="font-mono text-sm whitespace-pre-wrap"
                        style={{
                            color: '#ccc',
                            lineHeight: 1.6
                        }}
                    >
                        {content}
                        {status === 'streaming' && (
                            <span
                                className="inline-block w-2 h-4 ml-1"
                                style={{
                                    background: data.color,
                                    animation: 'cursor-blink 0.8s infinite'
                                }}
                            />
                        )}
                    </div>
                )}

                {status === 'error' && (
                    <div
                        className="mt-2 p-2 rounded font-mono text-xs"
                        style={{
                            background: '#ff000010',
                            border: '1px solid #ff000030',
                            color: '#ff6666'
                        }}
                    >
                        Error generating response
                    </div>
                )}
            </div>

            {/* Streaming effect */}
            {status === 'streaming' && (
                <div
                    className="absolute bottom-0 left-0 right-0 h-1"
                    style={{ background: data.color, animation: 'stream-bar 1s ease-in-out infinite' }}
                />
            )}

            <Scanlines opacity={0.1} />

            <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes cursor-blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
        @keyframes stream-bar { 0% { transform: scaleX(0); transform-origin: left; } 50% { transform: scaleX(1); } 100% { transform: scaleX(0); transform-origin: right; } }
      `}</style>
        </div>
    );
};

// ============================================
// DEMO
// ============================================

const ComponentsDemo = () => {
    const [attachments] = useState([
        { filename: 'config.json', type: 'json', content: '{\n  "model": "claude-3.5-sonnet",\n  "temperature": 0.7,\n  "max_tokens": 4096,\n  "stream": true\n}' },
        { filename: 'prompt.txt', type: 'text', content: 'You are a helpful assistant that specializes in React development.\n\nPlease help me build a dashboard with the following features:\n- Real-time data updates\n- Multiple chart types\n- Dark mode support\n- Responsive design' },
        { filename: 'code.tsx', type: 'code', content: 'const App = () => {\n  const [data, setData] = useState([]);\n  \n  useEffect(() => {\n    fetchData();\n  }, []);\n  \n  return <Dashboard data={data} />;\n};' }
    ]);

    const [thinkingExpanded, setThinkingExpanded] = useState(false);

    return (
        <div className="min-h-screen bg-gray-950 p-8">
            <h1 className="text-2xl font-light text-green-400 mb-8 tracking-wider font-mono">UI COMPONENTS</h1>

            {/* File Previews */}
            <section className="mb-12">
                <h2 className="text-xs text-gray-500 mb-4 tracking-wider font-mono">FILE ATTACHMENTS (hover for preview)</h2>
                <div className="flex flex-wrap gap-3">
                    {attachments.map((att, i) => (
                        <AttachmentChip
                            key={i}
                            {...att}
                            glowColor="#00ffff"
                            onRemove={() => console.log('remove', att.filename)}
                        />
                    ))}
                </div>
            </section>

            {/* Model Badges */}
            <section className="mb-12">
                <h2 className="text-xs text-gray-500 mb-4 tracking-wider font-mono">MODEL BADGES - STATUS INDICATORS</h2>

                <div className="space-y-4">
                    <div>
                        <span className="text-xs text-gray-600 font-mono block mb-2">Idle</span>
                        <ModelBadgeGroup models={[
                            { model: 'claude', status: 'idle' },
                            { model: 'gpt-4o', status: 'idle' },
                            { model: 'gemini', status: 'idle' }
                        ]} />
                    </div>

                    <div>
                        <span className="text-xs text-gray-600 font-mono block mb-2">Mixed states (parallel request)</span>
                        <ModelBadgeGroup models={[
                            { model: 'claude', status: 'complete', tokens: 127, latency: 234 },
                            { model: 'gpt-4o', status: 'streaming', tokens: 89 },
                            { model: 'gemini', status: 'pending' }
                        ]} />
                    </div>

                    <div>
                        <span className="text-xs text-gray-600 font-mono block mb-2">All streaming</span>
                        <ModelBadgeGroup models={[
                            { model: 'claude', status: 'streaming' },
                            { model: 'mistral', status: 'streaming' },
                            { model: 'groq', status: 'streaming' }
                        ]} />
                    </div>

                    <div>
                        <span className="text-xs text-gray-600 font-mono block mb-2">Large badges</span>
                        <ModelBadgeGroup models={[
                            { model: 'claude', status: 'streaming', tokens: 156, latency: 312, size: 'large' },
                            { model: 'gpt-4o', status: 'complete', tokens: 203, latency: 567, size: 'large' }
                        ]} />
                    </div>
                </div>
            </section>

            {/* Distorted Logos */}
            <section className="mb-12">
                <h2 className="text-xs text-gray-500 mb-4 tracking-wider font-mono">CRT DISTORTED LOGOS</h2>
                <div className="flex flex-wrap gap-4">
                    <DistortedModelLogo model="claude" size={80} />
                    <DistortedModelLogo model="gpt-4o" size={80} />
                    <DistortedModelLogo model="gemini" size={80} />
                    <DistortedModelLogo model="mistral" size={80} />
                    <DistortedModelLogo model="groq" size={80} />
                    <DistortedModelLogo model="qwen" size={80} />
                </div>
            </section>

            {/* Thinking Blocks */}
            <section className="mb-12">
                <h2 className="text-xs text-gray-500 mb-4 tracking-wider font-mono">THINKING BLOCKS</h2>
                <div className="space-y-3" style={{ maxWidth: 500 }}>
                    <ThinkingBlock
                        model="claude"
                        content=""
                    />
                    <ThinkingBlock
                        model="gpt-4o"
                        isExpanded={thinkingExpanded}
                        onToggle={() => setThinkingExpanded(!thinkingExpanded)}
                        content="Let me break down this problem step by step. First, I need to understand the user's requirements for the dashboard. They want real-time updates, which suggests WebSocket or SSE implementation. For charts, I'll recommend Recharts or Victory for React compatibility..."
                        duration={3.2}
                    />
                    <ThinkingBlock
                        model="gemini"
                        content="Analyzing the request for a React dashboard with real-time capabilities. Considering the tech stack options and best practices for responsive design."
                        duration={1.8}
                        isExpanded={true}
                    />
                </div>
            </section>

            {/* Response Cards */}
            <section className="mb-12">
                <h2 className="text-xs text-gray-500 mb-4 tracking-wider font-mono">RESPONSE CARDS</h2>
                <div className="space-y-4" style={{ maxWidth: 600 }}>
                    <ResponseCard
                        model="claude"
                        status="streaming"
                        content="Here's a React component for your dashboard. I'll implement real-time data fetching using WebSocket connections and display the data using Recharts for visualization..."
                        tokens={89}
                    />

                    <ResponseCard
                        model="gpt-4o"
                        status="complete"
                        content="I'll help you create a responsive dashboard with the following structure:\n\n1. **Layout Component** - Uses CSS Grid for responsive design\n2. **DataProvider** - Context for real-time data\n3. **ChartWidgets** - Reusable chart components\n4. **ThemeProvider** - Dark mode support\n\nLet me start with the code..."
                        tokens={203}
                        latency={567}
                        timestamp="2:34 PM"
                    />

                    <ResponseCard
                        model="gemini"
                        status="error"
                        content=""
                        isSelected={false}
                    />
                </div>
            </section>
        </div>
    );
};

// ============================================
// EXPORTS
// ============================================

export {
    FilePreview,
    AttachmentChip,
    ModelBadge,
    ModelBadgeGroup,
    DistortedModelLogo,
    DistortedModelImage,
    ThinkingBlock,
    ResponseCard
};

export default ComponentsDemo;
import React, { useEffect, useState } from 'react';
import { cn } from '../lib/cn';
import { Sparkles } from 'lucide-react';

interface StartupAnimationProps {
    isReady: boolean;
    onComplete: () => void;
}

export function StartupAnimation({ isReady, onComplete }: StartupAnimationProps) {
    const [stage, setStage] = useState<'enter' | 'waiting' | 'exiting' | 'done'>('enter');
    const [showTagline, setShowTagline] = useState(false);

    // Entrance sequence
    useEffect(() => {
        // Start entrance animation
        const t1 = setTimeout(() => {
            setStage('waiting');
        }, 1200); // Allow logo to fade in fully

        const t2 = setTimeout(() => {
            setShowTagline(true);
        }, 800);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, []);

    // Exit sequence
    useEffect(() => {
        if (isReady && stage === 'waiting') {
            // Ensure we show the logo for at least a moment (2s total minimum since mount)
            // But since 'waiting' only happens after 1.2s, we can just add a small delay or proceed.
            // Let's add a small delay to make it feel deliberate, not glitchy.
            const delay = 1500;

            const t = setTimeout(() => {
                setStage('exiting');
                // Actual removal callback after transition finishes
                setTimeout(onComplete, 1000); // 1s fade out duration
            }, delay);

            return () => clearTimeout(t);
        }
    }, [isReady, stage, onComplete]);

    if (stage === 'done') return null;

    return (
        <div
            className={cn(
                "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black transition-opacity duration-1000 ease-in-out cursor-wait",
                stage === 'exiting' ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
        >
            <div className="relative flex flex-col items-center">
                {/* Glow Effect */}
                <div className={cn(
                    "absolute -inset-20 bg-primary/20 blur-[100px] rounded-full transition-all duration-[2000ms]",
                    stage === 'waiting' ? "scale-110 opacity-60" : "scale-50 opacity-0",
                    stage === 'enter' && "scale-90 opacity-0"
                )} />

                {/* Logo Icon */}
                <div className={cn(
                    "relative mb-6 transform transition-all duration-1000 cubic-bezier(0.22, 1, 0.36, 1)",
                    stage === 'enter' ? "translate-y-4 opacity-0 scale-95" : "translate-y-0 opacity-100 scale-100"
                )}>
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-800 to-black border border-white/10 shadow-2xl relative overflow-hidden group">
                        {/* Shimmer line */}
                        <div className="absolute top-0 -left-[100%] w-[50%] h-full bg-linear-to-r from-transparent via-white/10 to-transparent transform skew-x-12 animate-[shimmer_2s_infinite]" />
                        <Sparkles className="w-12 h-12 text-primary animate-pulse" />
                    </div>
                </div>

                {/* App Title */}
                <h1 className={cn(
                    "text-4xl font-bold tracking-tight text-white mb-2 transition-all duration-1000 delay-300",
                    stage === 'enter' ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
                )}>
                    YAAI
                </h1>

                {/* Tagline / Loading Status */}
                <div className={cn(
                    "h-6 overflow-hidden transition-all duration-700 delay-500",
                    showTagline ? "opacity-70 max-h-10" : "opacity-0 max-h-0"
                )}>
                    <p className="text-sm font-medium text-primary/80 tracking-widest uppercase flex items-center gap-2">
                        <span className="block w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                        Initializing Neural Interface
                    </p>
                </div>
            </div>

            {/* Footer loading bar (optional, minimal) */}
            <div className={cn(
                "absolute bottom-12 left-1/2 -translate-x-1/2 w-48 h-1 bg-gray-900 rounded-full overflow-hidden transition-opacity duration-500",
                stage === 'exiting' ? "opacity-0" : "opacity-100"
            )}>
                <div className="h-full bg-primary/50 animate-[loading_2s_ease-in-out_infinite] w-full origin-left" />
            </div>

            {/* Inline styles for custom animations that might not be in tailwind config yet */}
            <style>{`
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 200%; }
        }
        @keyframes loading {
          0% { transform: scaleX(0); transform-origin: left; }
          50% { transform: scaleX(0.5); }
          100% { transform: scaleX(1); transform-origin: right; opacity: 0; }
        }
      `}</style>
        </div>
    );
}

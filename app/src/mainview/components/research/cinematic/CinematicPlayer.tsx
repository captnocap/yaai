// =============================================================================
// CINEMATIC PLAYER
// =============================================================================
// Full cinematic mode player with galaxy background, text reveal, and controls.

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Play, Film } from 'lucide-react';
import type { Report, Source, CinematicScript } from '../../../../shared/research-types';
import { generateCinematicScript, CinematicPlayback } from '../../../lib/research/cinematic-engine';
import { GalaxyCanvas } from '../galaxy/GalaxyCanvas';
import { TextReveal, TitleReveal } from './TextReveal';
import { CinematicControls } from './CinematicControls';
import { TTSToggle, useTTS } from './TTSController';

interface CinematicPlayerProps {
  report: Report;
  sources: Source[];
  galaxyNodes: any[];
  galaxyEdges: any[];
  onClose: () => void;
}

export function CinematicPlayer({
  report,
  sources,
  galaxyNodes,
  galaxyEdges,
  onClose,
}: CinematicPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playbackRef = useRef<CinematicPlayback | null>(null);

  // State
  const [script, setScript] = useState<CinematicScript | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Generate script on mount
  useEffect(() => {
    const cinematicScript = generateCinematicScript(report, sources, {
      wordsPerMinute: 120,
      includeTitles: true,
    });
    setScript(cinematicScript);
    setTotalDuration(cinematicScript.totalDuration);

    // Create playback engine
    const playback = new CinematicPlayback(cinematicScript);
    playbackRef.current = playback;

    // Subscribe to state changes
    const unsubscribe = playback.subscribe((state) => {
      setIsPlaying(state.isPlaying);
      setCurrentTime(state.elapsedTime);
      setCurrentSegmentIndex(state.currentSegmentIndex);
      setCurrentWordIndex(state.currentWordIndex);
      setSpeed(state.speed);
    });

    return () => {
      unsubscribe();
      playback.destroy();
    };
  }, [report, sources]);

  // Get current segment
  const currentSegment = script?.segments[currentSegmentIndex];

  // TTS
  const { isSpeaking } = useTTS({
    text: ttsEnabled && currentSegment ? currentSegment.content : '',
    isPlaying: ttsEnabled && isPlaying,
    rate: speed,
  });

  // Controls
  const handlePlayPause = useCallback(() => {
    playbackRef.current?.toggle();
  }, []);

  const handleSeek = useCallback((time: number) => {
    playbackRef.current?.seek(time);
  }, []);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    playbackRef.current?.setSpeed(newSpeed);
  }, []);

  const handleSkipBack = useCallback(() => {
    const newIndex = Math.max(0, currentSegmentIndex - 1);
    playbackRef.current?.seekToSegment(newIndex);
  }, [currentSegmentIndex]);

  const handleSkipForward = useCallback(() => {
    if (!script) return;
    const newIndex = Math.min(script.segments.length - 1, currentSegmentIndex + 1);
    playbackRef.current?.seekToSegment(newIndex);
  }, [currentSegmentIndex, script]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Hide controls after inactivity
  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      return;
    }

    let timeout: NodeJS.Timeout;
    const showAndHide = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    showAndHide();

    const handleMouseMove = () => showAndHide();
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isPlaying]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          handleSkipBack();
          break;
        case 'ArrowRight':
          handleSkipForward();
          break;
        case 'Escape':
          if (isFullscreen) {
            toggleFullscreen();
          } else {
            onClose();
          }
          break;
        case 'f':
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, handleSkipBack, handleSkipForward, isFullscreen, toggleFullscreen, onClose]);

  if (!script) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="text-center">
          <Film className="w-16 h-16 text-[var(--color-accent)] mx-auto mb-4 animate-pulse" />
          <p className="text-white">Generating cinematic experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black overflow-hidden"
    >
      {/* Galaxy background */}
      <div className="absolute inset-0 opacity-40">
        <GalaxyCanvas
          nodes={galaxyNodes}
          edges={galaxyEdges}
          scouts={[]}
          coreActive={isPlaying}
          viewMode="galaxy"
        />
      </div>

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col">
        {/* Top bar */}
        <div
          className={`flex items-center justify-between p-4 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center gap-3">
            <Film className="w-5 h-5 text-[var(--color-accent)]" />
            <span className="text-sm text-white/80">Cinematic Mode</span>
          </div>
          <div className="flex items-center gap-2">
            <TTSToggle enabled={ttsEnabled} onChange={setTtsEnabled} />
            <button
              onClick={onClose}
              className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-3xl w-full text-center">
            {/* Segment content */}
            {currentSegment && (
              <div className="space-y-8">
                {/* Title segments */}
                {(currentSegment.type === 'title' || currentSegment.type === 'section-title') && (
                  <TitleReveal
                    text={currentSegment.content}
                    visibleWords={currentWordIndex + 1}
                    className={currentSegment.type === 'title' ? 'text-5xl' : 'text-3xl'}
                  />
                )}

                {/* Content segments */}
                {(currentSegment.type === 'summary' || currentSegment.type === 'content') && (
                  <TextReveal
                    text={currentSegment.content}
                    visibleWords={currentWordIndex + 1}
                    className="text-xl text-white/90"
                    highlightColor="#6366f1"
                  />
                )}

                {/* Closing segment */}
                {currentSegment.type === 'closing' && (
                  <TitleReveal
                    text={currentSegment.content}
                    visibleWords={currentWordIndex + 1}
                    className="text-2xl text-white/80"
                  />
                )}
              </div>
            )}

            {/* Start prompt when not playing and at beginning */}
            {!isPlaying && currentTime === 0 && (
              <button
                onClick={handlePlayPause}
                className="mt-8 flex items-center gap-3 mx-auto px-6 py-3 rounded-full bg-[var(--color-accent)] text-white hover:brightness-110 transition-all"
              >
                <Play className="w-6 h-6" />
                <span className="text-lg font-medium">Begin Experience</span>
              </button>
            )}
          </div>
        </div>

        {/* Segment indicator */}
        <div
          className={`flex justify-center gap-2 pb-4 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {script.segments.map((_, index) => (
            <button
              key={index}
              onClick={() => playbackRef.current?.seekToSegment(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSegmentIndex
                  ? 'w-6 bg-[var(--color-accent)]'
                  : index < currentSegmentIndex
                    ? 'bg-white/50'
                    : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Controls */}
        <div
          className={`transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <CinematicControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            totalDuration={totalDuration}
            speed={speed}
            isFullscreen={isFullscreen}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onSpeedChange={handleSpeedChange}
            onToggleFullscreen={toggleFullscreen}
            onSkipBack={handleSkipBack}
            onSkipForward={handleSkipForward}
          />
        </div>
      </div>
    </div>
  );
}

export default CinematicPlayer;

// =============================================================================
// RESEARCH COMPONENTS
// =============================================================================
// Deep Research feature components barrel export.

// Page components
export { ResearchPage, default as ResearchPageDefault } from './page/ResearchPage';
export { ResearchHeader } from './page/ResearchHeader';
export { ResearchStatusBar } from './page/ResearchStatusBar';

// Source components
export { SourceFeed } from './sources/SourceFeed';
export { SourceCard } from './sources/SourceCard';
export { SourceCardSkeleton, SourceCardSkeletonList } from './sources/SourceCardSkeleton';
export { SourceStateIndicator, SourceStateBadge } from './sources/SourceStateIndicator';

// Report components
export { ReportView } from './report/ReportView';
export { ReportSection } from './report/ReportSection';
export { CitationLink, CitationRenderer } from './report/CitationLink';
export { CitationTooltip } from './report/CitationTooltip';
export { ContradictionCallout } from './report/ContradictionCallout';

// Modals
export { ContradictionModal } from './modals/ContradictionModal';
export { SourceDetailModal } from './modals/SourceDetailModal';
export { ExportModal } from './modals/ExportModal';

// Guidance
export { SessionGuidancePanel } from './guidance/SessionGuidancePanel';
export { BlockedDomainList } from './guidance/BlockedDomainList';
export { LearnedPatternList } from './guidance/LearnedPatternList';

// Galaxy 3D visualization
export { GalaxyCanvas } from './galaxy/GalaxyCanvas';
export { GalaxyScene } from './galaxy/GalaxyScene';
export { QueryCore } from './galaxy/QueryCore';
export { SourceNode } from './galaxy/SourceNode';
export { ScoutParticles, ParticleSwarm } from './galaxy/ScoutParticles';
export { ConnectionLines, DataFlow } from './galaxy/ConnectionLines';
export { GalaxyControls, GalaxyControlsFloating } from './galaxy/GalaxyControls';
export { GalaxyOverlay } from './galaxy/GalaxyOverlay';

// Cinematic mode
export { CinematicPlayer } from './cinematic/CinematicPlayer';
export { CinematicControls, CinematicControlsMini } from './cinematic/CinematicControls';
export { TextReveal, TitleReveal, TypewriterReveal, ParagraphReveal } from './cinematic/TextReveal';
export { useTTS, TTSToggle, VoiceSelector } from './cinematic/TTSController';

// Chat embed
export { ResearchEmbed } from './embed/ResearchEmbed';
export { ResearchProgress, CircularProgress, StageIndicator } from './embed/ResearchProgress';

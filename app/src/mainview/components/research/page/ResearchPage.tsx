// =============================================================================
// RESEARCH PAGE
// =============================================================================
// Main page for the Deep Research feature.
// Displays session controls, source feed, report view, and galaxy visualization.

import { useState, useCallback } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Search, Play, Telescope, FileText, Sparkles } from 'lucide-react';
import { useResearch } from '../../../hooks/useResearch';
import { ROUTES } from '../../../router/routes';
import { ResearchHeader } from './ResearchHeader';
import { ResearchStatusBar } from './ResearchStatusBar';
import { SourceFeed } from '../sources/SourceFeed';
import { ReportView } from '../report/ReportView';
import { GalaxyCanvas } from '../galaxy/GalaxyCanvas';
import { CinematicPlayer } from '../cinematic/CinematicPlayer';
import { ContradictionModal } from '../modals/ContradictionModal';
import { SourceDetailModal } from '../modals/SourceDetailModal';
import { ExportModal } from '../modals/ExportModal';
import { SessionGuidancePanel } from '../guidance/SessionGuidancePanel';
import { exportReport } from '../../../lib/research/export-utils';
import type { DepthProfile, Source, Contradiction, ExportFormat } from '../../../../shared/research-types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface ResearchPageProps {
  sessionId?: string;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ResearchPage({ sessionId: propSessionId }: ResearchPageProps) {
  // Route matching
  const [matchSession, paramsSession] = useRoute(ROUTES.RESEARCH_SESSION);
  const [matchNew] = useRoute(ROUTES.RESEARCH);
  const [, navigate] = useLocation();

  const routeSessionId = paramsSession?.id;
  const sessionId = propSessionId || routeSessionId;

  // Research hook
  const {
    session,
    sources,
    report,
    loading,
    error,
    viewMode,
    setViewMode,
    pendingSources,
    approvedSources,
    readingSources,
    completedSources,
    rejectedSources,
    createSession,
    loadSession,
    startSession,
    pauseSession,
    resumeSession,
    approveSource,
    rejectSource,
    approveAll,
    galaxyNodes,
    galaxyEdges,
  } = useResearch(sessionId);

  // Local state for new session creation
  const [query, setQuery] = useState('');
  const [depthProfile, setDepthProfile] = useState<DepthProfile>('general');
  const [isCreating, setIsCreating] = useState(false);

  // Modal states
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [selectedContradiction, setSelectedContradiction] = useState<Contradiction | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCinematic, setShowCinematic] = useState(false);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleCreateSession = useCallback(async () => {
    if (!query.trim()) return;

    setIsCreating(true);
    try {
      const newSession = await createSession(query, depthProfile);
      // Update URL without triggering navigation (preserves subscription)
      window.history.replaceState({}, '', `/research/${newSession.id}`);
      // Start the session immediately
      await startSession();
    } finally {
      setIsCreating(false);
    }
  }, [query, depthProfile, createSession, startSession]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreateSession();
    }
  }, [handleCreateSession]);

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (!report || !session) return;
    await exportReport(format, report, sources, session);
  }, [report, sources, session]);

  const handleSourceClick = useCallback((source: Source) => {
    setSelectedSource(source);
  }, []);

  const handleResolveContradiction = useCallback((contradiction: Contradiction) => {
    setSelectedContradiction(contradiction);
  }, []);

  // ---------------------------------------------------------------------------
  // RENDER: NEW SESSION VIEW
  // ---------------------------------------------------------------------------

  // Show new session form if no session exists
  if (!session && !loading) {
    return (
      <div className="flex flex-col h-full bg-[var(--color-bg)]">
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          <div className="flex items-center gap-2">
            <Telescope className="w-5 h-5 text-[var(--color-accent)]" />
            <span className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
              Deep Research
            </span>
          </div>
        </div>

        {/* New Session Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-2xl space-y-8">
            {/* Title */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-[var(--color-text)]">
                Deep Research
              </h1>
              <p className="text-[var(--color-text-secondary)]">
                Explore any topic with AI-powered multi-source research
              </p>
            </div>

            {/* Query Input */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-tertiary)]" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What would you like to research?"
                  className="w-full h-14 pl-12 pr-4 rounded-xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-colors"
                  autoFocus
                />
              </div>

              {/* Depth Profile Selector */}
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-[var(--color-text-secondary)]">Depth:</span>
                <div className="flex rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] p-1">
                  {(['light', 'general', 'exhaustive'] as const).map((depth) => (
                    <button
                      key={depth}
                      onClick={() => setDepthProfile(depth)}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        depthProfile === depth
                          ? 'bg-[var(--color-accent)] text-white'
                          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      {depth.charAt(0).toUpperCase() + depth.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Depth Info */}
              <div className="text-center text-sm text-[var(--color-text-tertiary)]">
                {depthProfile === 'light' && '~10 sources • ~2 min • ~$0.15'}
                {depthProfile === 'general' && '~30 sources • ~5 min • ~$0.45'}
                {depthProfile === 'exhaustive' && '~100 sources • ~15 min • ~$1.50'}
              </div>

              {/* Start Button */}
              <button
                onClick={handleCreateSession}
                disabled={!query.trim() || isCreating}
                className="w-full h-12 rounded-xl bg-[var(--color-accent)] text-white font-medium flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isCreating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Starting Research...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Start Research
                  </>
                )}
              </button>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-3 gap-4 pt-8">
              <FeatureCard
                icon={<Search className="w-5 h-5" />}
                title="Multi-Source"
                description="Searches across academic papers, news, and documentation"
              />
              <FeatureCard
                icon={<FileText className="w-5 h-5" />}
                title="Synthesis"
                description="Generates comprehensive reports with citations"
              />
              <FeatureCard
                icon={<Sparkles className="w-5 h-5" />}
                title="Interactive"
                description="Approve sources, resolve contradictions, guide research"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: LOADING
  // ---------------------------------------------------------------------------

  if (loading && !session) {
    return (
      <div className="flex flex-col h-full bg-[var(--color-bg)]">
        <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          <div className="flex items-center gap-2">
            <Telescope className="w-5 h-5 text-[var(--color-accent)]" />
            <span className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
              Deep Research
            </span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-[var(--color-accent)]/30 border-t-[var(--color-accent)] rounded-full animate-spin" />
            <span className="text-[var(--color-text-secondary)]">Loading session...</span>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: ACTIVE SESSION
  // ---------------------------------------------------------------------------

  // Get contradictions from report if available
  const contradictions = report?.contradictions || [];

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)]">
      {/* Header */}
      <ResearchHeader
        session={session!}
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          if (mode === 'cinematic' && session?.status === 'completed') {
            setShowCinematic(true);
          } else {
            setViewMode(mode);
          }
        }}
        onPause={pauseSession}
        onResume={resumeSession}
        onExport={() => setShowExportModal(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'list' && (
          <>
            {/* Left Panel - Source Feed */}
            <div className="w-[380px] flex-shrink-0 border-r border-[var(--color-border)] flex flex-col overflow-hidden">
              {/* Guidance Panel (collapsible) */}
              <div className="p-3 border-b border-[var(--color-border)]">
                <SessionGuidancePanel
                  guidance={session!.guidance}
                  onUpdateGuidance={() => {}} // TODO: Wire up updateGuidance
                  disabled={session?.status === 'completed'}
                />
              </div>

              {/* Source Feed */}
              <SourceFeed
                sources={sources}
                loading={loading}
                onApprove={approveSource}
                onReject={rejectSource}
                onSourceClick={handleSourceClick}
              />
            </div>

            {/* Right Panel - Report View */}
            <div className="flex-1 overflow-hidden">
              <ReportView
                report={report}
                sources={sources}
                contradictions={contradictions}
                status={session!.status}
                onSourceClick={handleSourceClick}
                onResolveContradiction={handleResolveContradiction}
              />
            </div>
          </>
        )}

        {viewMode === 'galaxy' && (
          <div className="flex-1 bg-[#050508]">
            <GalaxyCanvas
              nodes={galaxyNodes}
              edges={galaxyEdges}
              scouts={session!.scouts || []}
              coreActive={['scouting', 'reading', 'synthesizing'].includes(session!.status)}
              viewMode="galaxy"
              onNodeClick={(nodeId) => {
                const source = sources.find((s) => s.id === nodeId);
                if (source) setSelectedSource(source);
              }}
            />
          </div>
        )}

        {viewMode === 'cinematic' && !showCinematic && (
          <div className="flex-1 flex items-center justify-center bg-black">
            <div className="text-center space-y-4">
              <Sparkles className="w-16 h-16 mx-auto text-amber-400" />
              <h2 className="text-xl font-semibold text-white">Cinematic Mode</h2>
              <p className="text-gray-400 max-w-md">
                {session?.status === 'completed'
                  ? 'Ready for cinematic presentation'
                  : 'Complete the research to unlock cinematic mode'}
              </p>
              {session?.status === 'completed' && (
                <button
                  onClick={() => setShowCinematic(true)}
                  className="mt-4 px-6 py-3 rounded-lg bg-[var(--color-accent)] text-white font-medium hover:brightness-110 transition-all flex items-center gap-2 mx-auto"
                >
                  <Play className="w-5 h-5" />
                  Begin Experience
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <ResearchStatusBar session={session!} />

      {/* Modals */}
      {selectedSource && (
        <SourceDetailModal
          source={selectedSource}
          citationNumber={sources.indexOf(selectedSource) + 1}
          onClose={() => setSelectedSource(null)}
        />
      )}

      {selectedContradiction && (
        <ContradictionModal
          contradiction={selectedContradiction}
          sources={sources}
          onResolve={(resolution) => {
            // TODO: Wire up resolveContradiction
            setSelectedContradiction(null);
          }}
          onClose={() => setSelectedContradiction(null)}
        />
      )}

      {showExportModal && report && (
        <ExportModal
          report={report}
          sources={sources}
          onExport={handleExport}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showCinematic && report && (
        <CinematicPlayer
          report={report}
          sources={sources}
          galaxyNodes={galaxyNodes}
          galaxyEdges={galaxyEdges}
          onClose={() => setShowCinematic(false)}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS
// -----------------------------------------------------------------------------

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] space-y-2">
      <div className="text-[var(--color-accent)]">{icon}</div>
      <h3 className="font-medium text-[var(--color-text)]">{title}</h3>
      <p className="text-xs text-[var(--color-text-secondary)]">{description}</p>
    </div>
  );
}

export default ResearchPage;

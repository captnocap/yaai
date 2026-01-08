// =============================================================================
// IMAGE GEN PAGE
// =============================================================================
// Main page for image generation. Displays queue, job monitor, reference browser,
// output gallery, and quick generate bar.

import React, { useState, useCallback, useEffect } from 'react';
import { useImageGen, usePrompts, useReferences, useGallery } from '../../hooks';
import { ImageGenHeader } from './header/ImageGenHeader';
import { QueueTable } from './queue/QueueTable';
import { JobMonitor } from './monitor/JobMonitor';
import { PromptBrowser } from './prompt/PromptBrowser';
import { ReferenceBrowser } from './reference/ReferenceBrowser';
import { MediaPanel } from './media/MediaPanel';
import { LogDrawer } from './log/LogDrawer';
import { useWorkspaceInputContext, type ViewInput } from '../../workspace';
import type { QueueEntry, GeneratedImage } from '../../types/image-gen';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ImageGenPageProps {
  className?: string;
}

type MediaTab = 'references' | 'gallery';

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ImageGenPage({ className }: ImageGenPageProps) {
  // Hooks
  const imageGen = useImageGen();
  const prompts = usePrompts();
  const references = useReferences();
  const gallery = useGallery();
  const { registerViewHandler } = useWorkspaceInputContext();

  // Local state
  const [selectedEntry, setSelectedEntry] = useState<QueueEntry | null>(null);
  const [mediaTab, setMediaTab] = useState<MediaTab>('gallery');
  const [logExpanded, setLogExpanded] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<GeneratedImage | null>(null);

  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleEntrySelect = useCallback((entry: QueueEntry | null) => {
    setSelectedEntry(entry);
  }, []);

  const handleImageClick = useCallback((image: GeneratedImage) => {
    setLightboxImage(image);
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setLightboxImage(null);
  }, []);

  // Handle global input
  useEffect(() => {
    const handler = (input: ViewInput) => {
      if (input.type === 'image') {
        imageGen.quickGenerate({
          prompt: input.prompt,
          model: input.settings?.model || imageGen.settings?.defaultModel || '',
          resolution: { type: 'preset', preset: 'auto' },
          imagesPerBatch: 1,
          references: [],
        });
      }
    };
    return registerViewHandler('main', handler);
  }, [registerViewHandler, imageGen.quickGenerate, imageGen.settings?.defaultModel]);

  // ---------------------------------------------------------------------------
  // COMPUTED
  // ---------------------------------------------------------------------------

  const activeJobs = Array.from(imageGen.jobs.values());
  const hasActiveJobs = activeJobs.length > 0;

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div
      className={className}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-bg)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <ImageGenHeader
        pipelineState={imageGen.pipelineState}
        settings={imageGen.settings}
        activeJobCount={activeJobs.length}
        onStart={imageGen.startQueue}
        onStop={imageGen.stopQueue}
        onPause={imageGen.pauseQueue}
        onResume={imageGen.resumeQueue}
      />

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {/* Left sidebar - Prompt browser */}
        <div
          style={{
            width: sidebarCollapsed ? '48px' : '280px',
            borderRight: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-elevated)',
            transition: 'width 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <PromptBrowser
            prompts={prompts.prompts}
            loading={prompts.loading}
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
            onLoadPrompt={prompts.loadPrompt}
            onSavePrompt={prompts.savePrompt}
            onDeletePrompt={prompts.deletePrompt}
            onRenamePrompt={prompts.renamePrompt}
            onRefresh={prompts.refresh}
          />
        </div>

        {/* Center area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Queue table */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              minHeight: '200px',
            }}
          >
            <QueueTable
              groups={imageGen.groups}
              entries={imageGen.entries}
              selectedEntry={selectedEntry}
              onSelectEntry={handleEntrySelect}
              onCreateGroup={imageGen.createGroup}
              onUpdateGroup={imageGen.updateGroup}
              onDeleteGroup={imageGen.deleteGroup}
              onReorderGroups={imageGen.reorderGroups}
              onCreateEntry={imageGen.createEntry}
              onUpdateEntry={imageGen.updateEntry}
              onDeleteEntry={imageGen.deleteEntry}
              onDuplicateEntry={imageGen.duplicateEntry}
              onMoveEntry={imageGen.moveEntry}
              onReorderEntries={imageGen.reorderEntries}
              onEnableEntries={imageGen.enableEntries}
              onDisableEntries={imageGen.disableEntries}
              onDeleteEntries={imageGen.deleteEntries}
            />
          </div>

          {/* Job monitor - shown when there are active jobs */}
          {hasActiveJobs && (
            <div
              style={{
                borderTop: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
              }}
            >
              <JobMonitor
                jobs={activeJobs}
                onPauseJob={imageGen.pauseJob}
                onResumeJob={imageGen.resumeJob}
                onCancelJob={imageGen.cancelJob}
                onUpdateTarget={imageGen.updateJobTarget}
              />
            </div>
          )}

          {/* Log drawer */}
          <LogDrawer
            expanded={logExpanded}
            onExpandedChange={setLogExpanded}
            jobHistory={imageGen.jobHistory}
          />
        </div>

        {/* Right panel - Reference browser & Gallery */}
        <div
          style={{
            width: '360px',
            borderLeft: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-elevated)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Tab bar */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <button
              onClick={() => setMediaTab('references')}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                backgroundColor: mediaTab === 'references'
                  ? 'var(--color-bg)'
                  : 'transparent',
                color: mediaTab === 'references'
                  ? 'var(--color-text)'
                  : 'var(--color-text-secondary)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                borderBottom: mediaTab === 'references'
                  ? '2px solid var(--color-accent)'
                  : '2px solid transparent',
              }}
            >
              References
            </button>
            <button
              onClick={() => setMediaTab('gallery')}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                backgroundColor: mediaTab === 'gallery'
                  ? 'var(--color-bg)'
                  : 'transparent',
                color: mediaTab === 'gallery'
                  ? 'var(--color-text)'
                  : 'var(--color-text-secondary)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                borderBottom: mediaTab === 'gallery'
                  ? '2px solid var(--color-accent)'
                  : '2px solid transparent',
              }}
            >
              Gallery
            </button>
          </div>

          {/* Media content */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {mediaTab === 'references' ? (
              <ReferenceBrowser
                roots={references.roots}
                currentPath={references.currentPath}
                contents={references.contents}
                loading={references.loading}
                onNavigate={references.navigate}
                onGoUp={references.goUp}
                onRefresh={references.refresh}
              />
            ) : (
              <MediaPanel
                images={gallery.images}
                filters={gallery.filters}
                loading={gallery.loading}
                onFiltersChange={gallery.setFilters}
                onImageClick={handleImageClick}
                onRefresh={gallery.refresh}
              />
            )}
          </div>
        </div>
      </div>

      {/* Lightbox overlay */}
      {lightboxImage && (
        <div
          onClick={handleCloseLightbox}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            cursor: 'pointer',
          }}
        >
          <img
            src={`file://${lightboxImage.path}`}
            alt={lightboxImage.prompt}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '8px',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

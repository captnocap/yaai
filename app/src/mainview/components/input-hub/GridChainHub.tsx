// =============================================================================
// GRID CHAIN HUB
// =============================================================================
// Fixed layout component with slots for inserting components.

import React, { useState, useCallback, useRef, lazy, Suspense } from 'react';
import { cn } from '../../lib';

// Lazy load BrainCanvas to prevent Three.js from crashing on init
const BrainCanvas = lazy(() => import('./BrainCanvas/BrainCanvas').then(m => ({ default: m.BrainCanvas })));

// Import InputPanel
import { InputPanel, type InputVariant } from './InputPanel';

// Import AttachmentRow
import { AttachmentRow, MOCK_ATTACHMENTS, type Attachment } from './AttachmentRow';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

// Panel ID type for dynamic slots
export type PanelId = string;

// Panel registry - maps panel IDs to their components
export type PanelRegistry = Record<PanelId, React.ReactNode>;

export interface GridChainHubProps {
  className?: string;

  // ===== STATIC SLOTS (direct ReactNode) =====
  // Top row - Status/Info Bar
  a1?: React.ReactNode;  // Full width top
  b1?: React.ReactNode;  // Row 2, col 1
  b2?: React.ReactNode;  // Row 2, col 2
  b3?: React.ReactNode;  // Row 2, col 3
  c1?: React.ReactNode;  // Row 3, col 1
  c2?: React.ReactNode;  // Row 3, col 2
  c3?: React.ReactNode;  // Row 3, col 3
  d1?: React.ReactNode;  // Left section, left column (200x200 square)

  // ===== DYNAMIC SLOTS (panel IDs, swappable) =====
  // These accept panel IDs that reference the panels registry
  d2?: PanelId;  // Left section, right column (tall)
  e1?: PanelId;  // Middle section (tall, combined)
  f1?: PanelId;  // Right section, top row, col 1
  f2?: PanelId;  // Right section, top row, col 2
  f3?: PanelId;  // Right section, top row, col 3
  g1?: PanelId;  // Right section, bottom row, col 1
  g2?: PanelId;  // Right section, bottom row, col 2
  g3?: PanelId;  // Right section, bottom row, col 3

  // Panel registry - all available panels that can be assigned to dynamic slots
  panels?: PanelRegistry;

  // Callback when user wants to change a slot's panel
  onSlotChange?: (slot: 'd2' | 'e1' | 'f1' | 'f2' | 'f3' | 'g1' | 'g2' | 'g3', panelId: PanelId) => void;

  // Debug mode - shows colored backgrounds and labels
  debug?: boolean;

  // HUD frame styling - makes panels feel docked into a dashboard frame
  hudFrame?: boolean;

  // Accent color for HUD elements (CSS color value)
  accentColor?: string;

  // Input variant for the main input panel (chat, image, code)
  inputVariant?: InputVariant;

  // Thread/project/session ID for draft persistence
  threadId?: string;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

// Helper component for each slot
function Slot({
  id,
  children,
  debug,
  debugBg,
  className,
  style,
  hudFrame = true,
  showLabel = true,
}: {
  id: string;
  children?: React.ReactNode;
  debug?: boolean;
  debugBg: string;
  className?: string;
  style?: React.CSSProperties;
  hudFrame?: boolean;
  showLabel?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center relative',
        'overflow-hidden min-h-0 min-w-0', // Constrain content
        debug && debugBg,
        // HUD frame styling - panels dock into this
        hudFrame && [
          'border border-white/5',
          'bg-black/20',
          // Inner shadow for inset/cutout feel
          'shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]',
        ],
        className
      )}
      style={style}
    >
      {/* HUD corner accents */}
      {hudFrame && (
        <>
          <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20" />
          <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20" />
          <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20" />
          <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20" />
        </>
      )}
      {children}
      {debug && showLabel && (
        <span className="absolute inset-0 flex items-center justify-center text-white/80 text-xs font-mono pointer-events-none z-10">
          {id}
        </span>
      )}
    </div>
  );
}

// Resize handle component
function ResizeHandle({
  onDrag,
}: {
  onDrag: (delta: number) => void;
}) {
  const handleRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastX = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    lastX.current = e.clientX;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - lastX.current;
      lastX.current = e.clientX;
      onDrag(delta);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [onDrag]);

  return (
    <div
      ref={handleRef}
      className={cn(
        'w-1 cursor-col-resize transition-all flex-shrink-0 relative group',
        'bg-gradient-to-b from-transparent via-white/10 to-transparent',
        'hover:via-white/30',
      )}
      onMouseDown={handleMouseDown}
    >
      {/* HUD grip marks */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 opacity-30 group-hover:opacity-60 transition-opacity">
        <span className="w-0.5 h-1 bg-white/50 rounded-full" />
        <span className="w-0.5 h-1 bg-white/50 rounded-full" />
        <span className="w-0.5 h-1 bg-white/50 rounded-full" />
      </div>
    </div>
  );
}

// Dynamic slot type
type DynamicSlotId = 'd2' | 'e1' | 'f1' | 'f2' | 'f3' | 'g1' | 'g2' | 'g3';

export function GridChainHub({
  className,
  a1, b1, b2, b3, c1, c2, c3,
  d1,
  d2, e1, f1, f2, f3, g1, g2, g3,  // These are now PanelIds
  panels = {},
  onSlotChange,
  debug = true,
  hudFrame = true,
  accentColor = 'rgba(255,255,255,0.2)',
  inputVariant = 'chat',
  threadId = 'new',
}: GridChainHubProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to get panel content from registry
  const getPanel = (panelId?: PanelId): React.ReactNode => {
    if (!panelId) return null;
    return panels[panelId] ?? null;
  };

  // Section widths as percentages (D, E, F sections)
  const [sectionWidths, setSectionWidths] = useState({ d: 33.33, e: 33.33, f: 33.33 });

  // Attachments state (demo - in real app, this comes from draft hooks)
  const [attachments, setAttachments] = useState<Attachment[]>(MOCK_ATTACHMENTS);

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  const handleAddAttachment = useCallback(() => {
    // TODO: Open file picker
    console.log('Add attachment clicked');
  }, []);

  // Handle resize between D and E
  const handleResizeDE = useCallback((delta: number) => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;
    const deltaPercent = (delta / containerWidth) * 100;

    setSectionWidths(prev => {
      const newD = Math.max(15, Math.min(70, prev.d + deltaPercent));
      const newE = Math.max(15, Math.min(70, prev.e - deltaPercent));
      return { ...prev, d: newD, e: newE };
    });
  }, []);

  // Handle resize between E and F
  const handleResizeEF = useCallback((delta: number) => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;
    const deltaPercent = (delta / containerWidth) * 100;

    setSectionWidths(prev => {
      const newE = Math.max(15, Math.min(70, prev.e + deltaPercent));
      const newF = Math.max(15, Math.min(70, prev.f - deltaPercent));
      return { ...prev, e: newE, f: newF };
    });
  }, []);

  return (
    <div
      className={cn(
        'grid-chain-hub',
        'w-full h-[300px]',
        'flex flex-col',
        'border-t border-[var(--color-border)]',
        className
      )}
    >
      {/* ========== TOP ROW: Status/Info Bar ========== */}
      <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* A1: Visual border against chat display - shows input/output feedback */}
        <Slot id="A1" debug={debug} debugBg="bg-red-900/50" className="flex-1" hudFrame={hudFrame}>
          {a1 ?? <span className="text-[10px] text-white/50">A1: Visual feedback border (input/output)</span>}
        </Slot>

        {/* Status Row 2 - 3 columns (aligned with D, E, F/G sections) */}
        <div className="flex-1 flex min-h-0">
          <Slot id="B1" debug={debug} debugBg="bg-red-700/50" style={{ width: `${sectionWidths.d}%` }} hudFrame={hudFrame}>{b1}</Slot>
          {/* B2: Attachments row (above input) */}
          <Slot id="B2" debug={debug} debugBg="bg-red-600/50" style={{ width: `${sectionWidths.e}%` }} hudFrame={hudFrame}>
            {b2 ?? (
              <AttachmentRow
                attachments={attachments}
                onRemove={handleRemoveAttachment}
                onAdd={handleAddAttachment}
              />
            )}
          </Slot>
          <Slot id="B3" debug={debug} debugBg="bg-red-500/50" style={{ width: `${sectionWidths.f}%` }} hudFrame={hudFrame}>{b3}</Slot>
        </div>

        {/* Status Row 3 - 3 columns (aligned with D, E, F/G sections) */}
        <div className="flex-1 flex min-h-0">
          <Slot id="C1" debug={debug} debugBg="bg-orange-700/50" style={{ width: `${sectionWidths.d}%` }} hudFrame={hudFrame}>{c1}</Slot>
          {/* C2: Variable resolution (above input) */}
          <Slot id="C2" debug={debug} debugBg="bg-orange-600/50" style={{ width: `${sectionWidths.e}%` }} hudFrame={hudFrame}>
            {c2 ?? <span className="text-[10px] text-white/50">C2: Variable resolution</span>}
          </Slot>
          <Slot id="C3" debug={debug} debugBg="bg-orange-500/50" style={{ width: `${sectionWidths.f}%` }} hudFrame={hudFrame}>{c3}</Slot>
        </div>
      </div>

      {/* ========== BOTTOM ROW: Main Content ========== */}
      <div ref={containerRef} className="w-full flex-[2] flex min-h-0 overflow-hidden">

        {/* --- LEFT SECTION (D): 2 tall columns --- */}
        <div className="flex min-h-0 min-w-0" style={{ width: `${sectionWidths.d}%` }}>
          {/* D1: Brain component (200x200 square) */}
          <Slot id="D1" debug={debug} debugBg="bg-green-900/50" style={{ width: 200, flexShrink: 0 }} hudFrame={hudFrame} showLabel={false}>
            {d1 ?? (
              <Suspense fallback={<span className="text-[10px] text-white/50">Loading Brain...</span>}>
                <BrainCanvas activity="idle" fill frameless />
              </Suspense>
            )}
          </Slot>
          {/* D2: Memory panels / Active sessions (Claude Code) */}
          <Slot id={`D2:${d2 || 'empty'}`} debug={debug} debugBg="bg-blue-900/50" className="flex-1" hudFrame={hudFrame}>
            {getPanel(d2) ?? <span className="text-[10px] text-white/50">D2: Memory / Sessions</span>}
          </Slot>
        </div>

        {/* Resize handle D <-> E */}
        <ResizeHandle onDrag={handleResizeDE} />

        {/* E1: Main input panel (swappable: chat input, pos/neg image, terminal, etc.) */}
        <Slot id={`E1:${e1 || 'empty'}`} debug={debug} debugBg="bg-purple-700/50" style={{ width: `${sectionWidths.e}%` }} hudFrame={hudFrame} showLabel={false}>
          {getPanel(e1) ?? <InputPanel inputVariant={inputVariant} threadId={threadId} />}
        </Slot>

        {/* Resize handle E <-> F */}
        <ResizeHandle onDrag={handleResizeEF} />

        {/* --- RIGHT SECTION (F/G): 2 rows, each with 3 columns --- */}
        <div className="flex flex-col min-h-0 min-w-0 overflow-hidden" style={{ width: `${sectionWidths.f}%` }}>
          {/* Top row - 3 columns */}
          <div className="flex-1 flex min-h-0">
            <Slot id={`F1:${f1 || 'empty'}`} debug={debug} debugBg="bg-green-500/50" className="flex-1" hudFrame={hudFrame}>{getPanel(f1)}</Slot>
            <Slot id={`F2:${f2 || 'empty'}`} debug={debug} debugBg="bg-green-400/50" className="flex-1" hudFrame={hudFrame}>{getPanel(f2)}</Slot>
            <Slot id={`F3:${f3 || 'empty'}`} debug={debug} debugBg="bg-green-300/50" className="flex-1" hudFrame={hudFrame}>{getPanel(f3)}</Slot>
          </div>
          {/* Bottom row - 3 columns */}
          <div className="flex-1 flex min-h-0">
            <Slot id={`G1:${g1 || 'empty'}`} debug={debug} debugBg="bg-blue-500/50" className="flex-1" hudFrame={hudFrame}>{getPanel(g1)}</Slot>
            <Slot id={`G2:${g2 || 'empty'}`} debug={debug} debugBg="bg-blue-400/50" className="flex-1" hudFrame={hudFrame}>{getPanel(g2)}</Slot>
            <Slot id={`G3:${g3 || 'empty'}`} debug={debug} debugBg="bg-blue-300/50" className="flex-1" hudFrame={hudFrame}>{getPanel(g3)}</Slot>
          </div>
        </div>
      </div>
    </div>
  );
}

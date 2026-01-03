// =============================================================================
// CONTRADICTION MODAL
// =============================================================================
// "Courtroom" style modal for resolving conflicting information between sources.

import { useState } from 'react';
import { X, Scale, Check, Merge, ArrowLeft, ArrowRight, ExternalLink, Sparkles } from 'lucide-react';
import type { Contradiction, Source, ContradictionResolution } from '../../../../shared/research-types';

interface ContradictionModalProps {
  contradiction: Contradiction;
  sources: Source[];
  onResolve: (resolution: ContradictionResolution) => void;
  onClose: () => void;
}

type ResolutionChoice = 'A' | 'B' | 'synthesize';

export function ContradictionModal({
  contradiction,
  sources,
  onResolve,
  onClose,
}: ContradictionModalProps) {
  const [choice, setChoice] = useState<ResolutionChoice | null>(null);
  const [synthesis, setSynthesis] = useState('');
  const [reasoning, setReasoning] = useState('');

  const sourceA = sources.find((s) => s.id === contradiction.sourceAId);
  const sourceB = sources.find((s) => s.id === contradiction.sourceBId);

  const handleSubmit = () => {
    if (!choice) return;

    const resolution: ContradictionResolution = {
      chosenClaim: choice === 'synthesize' ? 'A' : choice, // Default to A if synthesizing
      synthesis: choice === 'synthesize' ? synthesis : undefined,
      reasoning: reasoning || undefined,
      resolvedAt: Date.now(),
    };

    onResolve(resolution);
  };

  const canSubmit =
    choice === 'A' ||
    choice === 'B' ||
    (choice === 'synthesize' && synthesis.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-gradient-to-r from-amber-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Scale className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text)]">
                Resolve Contradiction
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {contradiction.topic}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Claims comparison */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Claim A */}
            <ClaimPanel
              label="A"
              claim={contradiction.claimA}
              source={sourceA}
              selected={choice === 'A'}
              onSelect={() => setChoice('A')}
            />

            {/* VS divider */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:flex">
              <div className="w-12 h-12 rounded-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] flex items-center justify-center">
                <span className="text-sm font-bold text-[var(--color-text-tertiary)]">VS</span>
              </div>
            </div>

            {/* Claim B */}
            <ClaimPanel
              label="B"
              claim={contradiction.claimB}
              source={sourceB}
              selected={choice === 'B'}
              onSelect={() => setChoice('B')}
            />
          </div>

          {/* Synthesis option */}
          <div className="mb-6">
            <button
              onClick={() => setChoice('synthesize')}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                choice === 'synthesize'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)] bg-[var(--color-bg-secondary)]'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    choice === 'synthesize'
                      ? 'bg-purple-500 text-white'
                      : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  <Merge className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[var(--color-text)]">
                    Synthesize Both
                  </h4>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Combine insights from both sources into a nuanced understanding
                  </p>
                </div>
                {choice === 'synthesize' && (
                  <Check className="w-5 h-5 text-purple-400 ml-auto" />
                )}
              </div>

              {/* Synthesis input */}
              {choice === 'synthesize' && (
                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                  <textarea
                    value={synthesis}
                    onChange={(e) => setSynthesis(e.target.value)}
                    placeholder="Write your synthesis that reconciles both claims..."
                    className="w-full h-24 px-3 py-2 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:border-purple-500 focus:outline-none resize-none"
                  />
                </div>
              )}
            </button>
          </div>

          {/* Reasoning (optional) */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
              Your reasoning (optional)
            </label>
            <textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Why did you make this choice? This helps improve future research..."
              className="w-full h-20 px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Check className="w-4 h-4" />
            Resolve Contradiction
          </button>
        </footer>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS
// -----------------------------------------------------------------------------

function ClaimPanel({
  label,
  claim,
  source,
  selected,
  onSelect,
}: {
  label: 'A' | 'B';
  claim: string;
  source?: Source;
  selected: boolean;
  onSelect: () => void;
}) {
  const faviconUrl = source
    ? `https://www.google.com/s2/favicons?domain=${source.domain}&sz=32`
    : null;

  const colorClass = label === 'A' ? 'blue' : 'emerald';
  const borderColor = selected
    ? label === 'A'
      ? 'border-blue-500'
      : 'border-emerald-500'
    : 'border-[var(--color-border)]';
  const bgColor = selected
    ? label === 'A'
      ? 'bg-blue-500/10'
      : 'bg-emerald-500/10'
    : 'bg-[var(--color-bg-secondary)]';

  return (
    <button
      onClick={onSelect}
      className={`relative p-4 rounded-lg border-2 transition-all text-left ${borderColor} ${bgColor} hover:border-[var(--color-border-hover)]`}
    >
      {/* Label badge */}
      <div
        className={`absolute -top-3 left-4 px-2 py-0.5 rounded text-xs font-bold ${
          label === 'A'
            ? 'bg-blue-500 text-white'
            : 'bg-emerald-500 text-white'
        }`}
      >
        Claim {label}
      </div>

      {/* Source info */}
      {source && (
        <div className="flex items-center gap-2 mb-3 mt-1">
          {faviconUrl && (
            <img src={faviconUrl} alt="" className="w-4 h-4 rounded" />
          )}
          <span className="text-xs text-[var(--color-text-tertiary)] truncate flex-1">
            {source.domain}
          </span>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Claim text */}
      <p className="text-sm text-[var(--color-text)] leading-relaxed">
        {claim}
      </p>

      {/* Source findings */}
      {source && source.findings.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-1 mb-2">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wide">
              Supporting findings
            </span>
          </div>
          <ul className="space-y-1">
            {source.findings.slice(0, 2).map((finding) => (
              <li
                key={finding.id}
                className="text-xs text-[var(--color-text-secondary)] pl-2 border-l border-amber-500/50"
              >
                {finding.claim}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Selection indicator */}
      {selected && (
        <div
          className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center ${
            label === 'A' ? 'bg-blue-500' : 'bg-emerald-500'
          }`}
        >
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
    </button>
  );
}

export default ContradictionModal;

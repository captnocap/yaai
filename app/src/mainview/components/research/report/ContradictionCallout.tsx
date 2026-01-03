// =============================================================================
// CONTRADICTION CALLOUT
// =============================================================================
// Warning callout showing conflicting information between sources.

import { AlertTriangle, Scale, ArrowRight } from 'lucide-react';
import type { Contradiction, Source } from '../../../../shared/research-types';

interface ContradictionCalloutProps {
  contradiction: Contradiction;
  sources: Source[];
  onResolve?: (contradiction: Contradiction) => void;
}

export function ContradictionCallout({
  contradiction,
  sources,
  onResolve,
}: ContradictionCalloutProps) {
  const sourceA = sources.find((s) => s.id === contradiction.sourceAId);
  const sourceB = sources.find((s) => s.id === contradiction.sourceBId);

  const isResolved = contradiction.resolution !== undefined;

  return (
    <div
      className={`
        rounded-lg border overflow-hidden
        ${isResolved
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-amber-500/30 bg-amber-500/5'
        }
      `}
    >
      {/* Header */}
      <div
        className={`
          flex items-center gap-2 px-3 py-2
          ${isResolved
            ? 'bg-emerald-500/10 border-b border-emerald-500/20'
            : 'bg-amber-500/10 border-b border-amber-500/20'
          }
        `}
      >
        {isResolved ? (
          <Scale className="w-4 h-4 text-emerald-400" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        )}
        <span
          className={`text-xs font-medium ${
            isResolved ? 'text-emerald-400' : 'text-amber-400'
          }`}
        >
          {isResolved ? 'Resolved Contradiction' : 'Conflicting Information'}
        </span>
        <span className="text-xs text-[var(--color-text-tertiary)] ml-auto">
          {contradiction.topic}
        </span>
      </div>

      {/* Claims comparison */}
      <div className="p-3 grid grid-cols-2 gap-3">
        {/* Claim A */}
        <ClaimBox
          claim={contradiction.claimA}
          source={sourceA}
          isWinner={contradiction.resolution?.chosenClaim === 'A'}
          isLoser={contradiction.resolution?.chosenClaim === 'B'}
        />

        {/* VS indicator */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden">
          <div className="w-8 h-8 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
            <span className="text-xs font-bold text-[var(--color-text-tertiary)]">VS</span>
          </div>
        </div>

        {/* Claim B */}
        <ClaimBox
          claim={contradiction.claimB}
          source={sourceB}
          isWinner={contradiction.resolution?.chosenClaim === 'B'}
          isLoser={contradiction.resolution?.chosenClaim === 'A'}
        />
      </div>

      {/* Resolution section */}
      {isResolved && contradiction.resolution ? (
        <div className="px-3 pb-3">
          <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-1 mb-1">
              <Scale className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wide">
                Resolution
              </span>
            </div>
            <p className="text-xs text-[var(--color-text)]">
              {contradiction.resolution.synthesis ||
               `Claim ${contradiction.resolution.chosenClaim} was selected based on source reliability and evidence.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="px-3 pb-3">
          <button
            onClick={() => onResolve?.(contradiction)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors text-sm font-medium"
          >
            <Scale className="w-4 h-4" />
            Resolve Contradiction
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS
// -----------------------------------------------------------------------------

function ClaimBox({
  claim,
  source,
  isWinner,
  isLoser,
}: {
  claim: string;
  source?: Source;
  isWinner?: boolean;
  isLoser?: boolean;
}) {
  const faviconUrl = source
    ? `https://www.google.com/s2/favicons?domain=${source.domain}&sz=32`
    : null;

  return (
    <div
      className={`
        p-2 rounded border transition-all
        ${isWinner
          ? 'border-emerald-500/50 bg-emerald-500/10'
          : isLoser
            ? 'border-gray-500/30 bg-gray-500/5 opacity-60'
            : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)]'
        }
      `}
    >
      {/* Source */}
      {source && (
        <div className="flex items-center gap-1.5 mb-2">
          {faviconUrl && (
            <img src={faviconUrl} alt="" className="w-3 h-3 rounded" />
          )}
          <span className="text-[10px] text-[var(--color-text-tertiary)] truncate">
            {source.domain}
          </span>
          {isWinner && (
            <span className="ml-auto text-[10px] font-medium text-emerald-400">
              ✓ Selected
            </span>
          )}
        </div>
      )}

      {/* Claim text */}
      <p
        className={`text-xs ${
          isLoser ? 'text-[var(--color-text-tertiary)]' : 'text-[var(--color-text)]'
        }`}
      >
        {claim}
      </p>
    </div>
  );
}

export default ContradictionCallout;

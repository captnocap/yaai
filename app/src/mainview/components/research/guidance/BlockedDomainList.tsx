// =============================================================================
// BLOCKED DOMAIN LIST
// =============================================================================
// Manage blocked and preferred domains for research filtering.

import { useState } from 'react';
import { X, Plus, Ban, Star, Globe } from 'lucide-react';
import { Select } from '../../atoms/Select';

interface BlockedDomainListProps {
  blockedDomains: string[];
  preferredDomains?: string[];
  onAddBlocked: (domain: string) => void;
  onRemoveBlocked: (domain: string) => void;
  onAddPreferred?: (domain: string) => void;
  onRemovePreferred?: (domain: string) => void;
  disabled?: boolean;
}

export function BlockedDomainList({
  blockedDomains,
  preferredDomains = [],
  onAddBlocked,
  onRemoveBlocked,
  onAddPreferred,
  onRemovePreferred,
  disabled = false,
}: BlockedDomainListProps) {
  const [newDomain, setNewDomain] = useState('');
  const [mode, setMode] = useState<'block' | 'prefer'>('block');

  const handleAdd = () => {
    const domain = newDomain.trim().toLowerCase();
    if (!domain) return;

    // Basic domain validation
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    if (!domainRegex.test(domain)) {
      // Try to extract domain from URL
      try {
        const url = new URL(domain.startsWith('http') ? domain : `https://${domain}`);
        const extractedDomain = url.hostname.replace('www.', '');
        if (mode === 'block') {
          onAddBlocked(extractedDomain);
        } else {
          onAddPreferred?.(extractedDomain);
        }
        setNewDomain('');
        return;
      } catch {
        // Invalid input
        return;
      }
    }

    if (mode === 'block') {
      if (!blockedDomains.includes(domain)) {
        onAddBlocked(domain);
      }
    } else {
      if (!preferredDomains.includes(domain)) {
        onAddPreferred?.(domain);
      }
    }
    setNewDomain('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-4">
      {/* Add domain input */}
      <div>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">
          Add domain to filter
        </label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="example.com"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
              disabled={disabled}
            />
          </div>
          <Select
            value={mode}
            onChange={(val) => setMode(val as 'block' | 'prefer')}
            options={[
              { value: 'block', label: 'Block' },
              { value: 'prefer', label: 'Prefer' }
            ]}
            disabled={disabled}
            size="md"
          />
          <button
            onClick={handleAdd}
            disabled={disabled || !newDomain.trim()}
            className="p-2 rounded-lg bg-[var(--color-accent)] text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Blocked domains */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Ban className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
            Blocked Domains ({blockedDomains.length})
          </span>
        </div>
        {blockedDomains.length === 0 ? (
          <p className="text-xs text-[var(--color-text-tertiary)] italic py-2">
            No domains blocked. Sources from any domain will be considered.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {blockedDomains.map((domain) => (
              <DomainChip
                key={domain}
                domain={domain}
                type="blocked"
                onRemove={() => onRemoveBlocked(domain)}
                disabled={disabled}
              />
            ))}
          </div>
        )}
      </div>

      {/* Preferred domains */}
      {onAddPreferred && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
              Preferred Domains ({preferredDomains.length})
            </span>
          </div>
          {preferredDomains.length === 0 ? (
            <p className="text-xs text-[var(--color-text-tertiary)] italic py-2">
              No preferred domains. All domains are treated equally.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {preferredDomains.map((domain) => (
                <DomainChip
                  key={domain}
                  domain={domain}
                  type="preferred"
                  onRemove={() => onRemovePreferred?.(domain)}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick suggestions */}
      <div>
        <span className="text-xs text-[var(--color-text-tertiary)]">
          Common filters:
        </span>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {['wikipedia.org', 'reddit.com', 'quora.com', 'medium.com'].map((domain) => {
            const isBlocked = blockedDomains.includes(domain);
            return (
              <button
                key={domain}
                onClick={() => {
                  if (isBlocked) {
                    onRemoveBlocked(domain);
                  } else {
                    onAddBlocked(domain);
                  }
                }}
                disabled={disabled}
                className={`px-2 py-1 rounded text-xs transition-colors ${isBlocked
                  ? 'bg-red-500/20 text-red-400 line-through'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                  }`}
              >
                {domain}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS
// -----------------------------------------------------------------------------

function DomainChip({
  domain,
  type,
  onRemove,
  disabled,
}: {
  domain: string;
  type: 'blocked' | 'preferred';
  onRemove: () => void;
  disabled?: boolean;
}) {
  const colorClasses =
    type === 'blocked'
      ? 'bg-red-500/20 text-red-400 border-red-500/30'
      : 'bg-amber-500/20 text-amber-400 border-amber-500/30';

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border ${colorClasses}`}
    >
      <img
        src={faviconUrl}
        alt=""
        className="w-3 h-3 rounded"
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      {domain}
      <button
        onClick={onRemove}
        disabled={disabled}
        className="p-0.5 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

export default BlockedDomainList;

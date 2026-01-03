// =============================================================================
// SESSION GUIDANCE PANEL
// =============================================================================
// Collapsible panel for providing guidance to the research session.

import { useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquare, Globe, Lightbulb, Plus, Save, X } from 'lucide-react';
import type { SessionGuidance } from '../../../../shared/research-types';
import { BlockedDomainList } from './BlockedDomainList';
import { LearnedPatternList } from './LearnedPatternList';

interface SessionGuidancePanelProps {
  guidance: SessionGuidance;
  onUpdateGuidance: (guidance: Partial<SessionGuidance>) => void;
  disabled?: boolean;
}

export function SessionGuidancePanel({
  guidance,
  onUpdateGuidance,
  disabled = false,
}: SessionGuidancePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'domains' | 'patterns'>('notes');
  const [notes, setNotes] = useState(guidance.userNotes || '');
  const [hasUnsavedNotes, setHasUnsavedNotes] = useState(false);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    setHasUnsavedNotes(value !== (guidance.userNotes || ''));
  };

  const handleSaveNotes = () => {
    onUpdateGuidance({ userNotes: notes });
    setHasUnsavedNotes(false);
  };

  const handleAddBlockedDomain = (domain: string) => {
    const newBlocked = [...guidance.blockedDomains, domain];
    onUpdateGuidance({ blockedDomains: newBlocked });
  };

  const handleRemoveBlockedDomain = (domain: string) => {
    const newBlocked = guidance.blockedDomains.filter((d) => d !== domain);
    onUpdateGuidance({ blockedDomains: newBlocked });
  };

  const tabs = [
    { id: 'notes' as const, label: 'Notes', icon: MessageSquare },
    { id: 'domains' as const, label: 'Domains', icon: Globe, count: guidance.blockedDomains.length },
    { id: 'patterns' as const, label: 'Patterns', icon: Lightbulb, count: guidance.learnedPatterns.length },
  ];

  return (
    <div className="border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--color-bg-tertiary)] transition-colors"
        disabled={disabled}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[var(--color-text-tertiary)]" />
          <span className="text-sm font-medium text-[var(--color-text)]">
            Session Guidance
          </span>
          {(guidance.userNotes || guidance.blockedDomains.length > 0 || guidance.learnedPatterns.length > 0) && (
            <span className="px-1.5 py-0.5 rounded bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-[10px] font-medium">
              Active
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--color-text-tertiary)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--color-text-tertiary)]" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-[var(--color-border)]">
          {/* Tab navigation */}
          <div className="flex border-b border-[var(--color-border)]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                    isActive
                      ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)] -mb-px'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        isActive
                          ? 'bg-[var(--color-accent)]/20'
                          : 'bg-[var(--color-bg-tertiary)]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="p-4">
            {activeTab === 'notes' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">
                    Guide the research with specific instructions
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="E.g., Focus on peer-reviewed sources, prioritize recent publications (2020+), exclude opinion pieces..."
                    className="w-full h-24 px-3 py-2 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:outline-none resize-none"
                    disabled={disabled}
                  />
                </div>
                {hasUnsavedNotes && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveNotes}
                      disabled={disabled}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-accent)] text-white hover:brightness-110 disabled:opacity-50 transition-all"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save Notes
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'domains' && (
              <BlockedDomainList
                blockedDomains={guidance.blockedDomains}
                preferredDomains={guidance.preferredDomains}
                onAddBlocked={handleAddBlockedDomain}
                onRemoveBlocked={handleRemoveBlockedDomain}
                disabled={disabled}
              />
            )}

            {activeTab === 'patterns' && (
              <LearnedPatternList
                patterns={guidance.learnedPatterns}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SessionGuidancePanel;

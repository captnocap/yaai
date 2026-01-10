// =============================================================================
// INPUT PANEL
// =============================================================================
// Main input component with two tabs:
// - Input: Variable content based on app mode (chat, image, code, etc.)
// - Terminal: Persistent terminal view across all modes

import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../../lib';
import { useChatDraft, useImageDraft, useCodeDraft } from './useDraft';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

/** The tab currently visible in the panel */
export type PanelTab = 'input' | 'terminal';

/** The input variant - what the "Input" tab shows based on app mode */
export type InputVariant = 'chat' | 'image' | 'code';

export interface InputPanelProps {
  /** Which tab is active */
  activeTab?: PanelTab;
  /** Callback when tab changes */
  onTabChange?: (tab: PanelTab) => void;
  /** The input variant to show when on Input tab (determined by app mode) */
  inputVariant?: InputVariant;
  /** Thread/project/session ID for draft persistence */
  threadId?: string;
  className?: string;
}

// -----------------------------------------------------------------------------
// TAB CONFIG
// -----------------------------------------------------------------------------

const TABS: { id: PanelTab; label: string }[] = [
  { id: 'input', label: 'Input' },
  { id: 'terminal', label: 'Terminal' },
];

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function InputPanel({
  activeTab: externalTab,
  onTabChange,
  inputVariant = 'chat',
  threadId = 'new',
  className,
}: InputPanelProps) {
  // Internal tab state if not controlled
  const [internalTab, setInternalTab] = useState<PanelTab>('input');

  const activeTab = externalTab ?? internalTab;
  const handleTabChange = (tab: PanelTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  return (
    <div
      className={cn(
        'input-panel',
        'w-full h-full',
        'flex flex-col',
        className
      )}
    >
      {/* Main content area */}
      <div className="flex-1 relative overflow-hidden">
        {activeTab === 'input' && <InputContent variant={inputVariant} threadId={threadId} />}
        {activeTab === 'terminal' && <TerminalContent />}
      </div>

      {/* Tab bar - 35px */}
      <div className="h-[35px] flex items-center px-2 gap-1 bg-black/20 border-t border-white/5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded transition-all',
              activeTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// INPUT CONTENT (variable based on app mode)
// -----------------------------------------------------------------------------

function InputContent({ variant, threadId }: { variant: InputVariant; threadId: string }) {
  switch (variant) {
    case 'chat':
      return <ChatInput threadId={threadId} />;
    case 'image':
      return <ImageInput threadId={threadId} />;
    case 'code':
      return <CodeInput threadId={threadId} />;
    default:
      return <ChatInput threadId={threadId} />;
  }
}

// -----------------------------------------------------------------------------
// INPUT VARIANTS (placeholders)
// -----------------------------------------------------------------------------

function ChatInput({ threadId }: { threadId: string }) {
  const { text, setText } = useChatDraft(threadId);
  const [charCount, setCharCount] = useState(text.length);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle hover on preview to start editing
  const handlePreviewHover = () => {
    setIsEditing(true);
  };

  // Focus textarea when entering edit mode
  const handleTextareaRef = useCallback((el: HTMLTextAreaElement | null) => {
    (textareaRef as any).current = el;
    if (el) {
      el.focus();
      // Move cursor to end
      el.selectionStart = el.selectionEnd = el.value.length;
    }
  }, []);

  // Handle blur - sync value to draft and switch back to preview
  const handleBlur = useCallback(() => {
    if (textareaRef.current) {
      setText(textareaRef.current.value);
    }
    setIsEditing(false);
  }, [setText]);

  // Handle keydown for ESC
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (textareaRef.current) {
        setText(textareaRef.current.value);
      }
      setIsEditing(false);
      textareaRef.current?.blur();
    }
  };

  // Lightweight char count update (no React state for value during typing)
  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    setCharCount(e.currentTarget.value.length);
  }, []);

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden min-h-0 min-w-0">
      {isEditing ? (
        <textarea
          ref={handleTextareaRef}
          defaultValue={text}
          onInput={handleInput}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full h-full resize-none p-3',
            'bg-transparent text-white/90 text-sm',
            'font-mono',
            'outline-none border-none',
            'placeholder:text-white/30',
            'min-h-0 min-w-0'
          )}
          placeholder="Type your message..."
        />
      ) : (
        <div
          className="w-full h-full overflow-auto p-3 cursor-text min-h-0 min-w-0"
          onMouseEnter={handlePreviewHover}
        >
          {text.trim() ? (
            <div className={cn(
              'prose prose-invert prose-sm max-w-none w-full',
              'break-words overflow-hidden',
              '[&_pre]:whitespace-pre-wrap [&_pre]:break-all [&_pre]:overflow-x-auto',
              '[&_code]:break-all',
              '[&_*]:max-w-full'
            )}>
              <ReactMarkdown>{text}</ReactMarkdown>
            </div>
          ) : (
            <span className="text-white/30 text-sm">Hover to type your message...</span>
          )}
        </div>
      )}

      {/* Character count overlay */}
      <div className="absolute bottom-1 right-2 text-[9px] text-white/30 font-mono pointer-events-none">
        {(isEditing ? charCount : text.length) > 0 && `${isEditing ? charCount : text.length} chars`}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// IMAGE INPUT
// -----------------------------------------------------------------------------

type ImageInputMode = 'input' | 'prompts';

interface SavedPrompt {
  id: string;
  name: string;
  positive: string;
  negative?: string;
}

// Mock saved prompts - replace with real data later
const MOCK_PROMPTS: SavedPrompt[] = [
  { id: '1', name: 'Cinematic Portrait', positive: 'cinematic lighting, portrait photography, 8k, detailed', negative: 'blurry, low quality' },
  { id: '2', name: 'Anime Style', positive: 'anime style, vibrant colors, detailed illustration', negative: 'realistic, photograph' },
  { id: '3', name: 'Landscape Epic', positive: 'epic landscape, dramatic sky, golden hour, 4k wallpaper', negative: 'people, text, watermark' },
  { id: '4', name: 'Product Shot', positive: 'product photography, clean background, studio lighting', negative: 'busy background, shadows' },
];

function ImageInput({ threadId }: { threadId: string }) {
  const {
    positivePrompt,
    negativePrompt,
    selectedPromptId,
    setPositivePrompt,
    setNegativePrompt,
    setSelectedPromptId,
  } = useImageDraft(threadId);

  const [mode, setMode] = useState<ImageInputMode>('input');

  // TODO: This should come from model config
  const [hasPosNeg, setHasPosNeg] = useState(true);

  // Find selected prompt from mock list (in real app, this would be from a prompt store)
  const selectedPrompt = selectedPromptId
    ? MOCK_PROMPTS.find(p => p.id === selectedPromptId)
    : null;

  // Handle prompt selection
  const handleSelectPrompt = (prompt: SavedPrompt) => {
    setSelectedPromptId(prompt.id);
    setPositivePrompt(prompt.positive);
    setNegativePrompt(prompt.negative || '');
    setMode('input');
  };

  // Clear prompt and go back to list
  const handleBackToPrompts = () => {
    setSelectedPromptId(undefined);
    setMode('prompts');
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 min-w-0 overflow-hidden">
      {/* Top tabs: Input / Prompts */}
      <div className="h-[28px] flex items-center px-2 gap-1 bg-black/30 border-b border-white/5 flex-shrink-0">
        <button
          onClick={() => setMode('input')}
          className={cn(
            'px-2 py-0.5 text-[10px] font-medium rounded transition-all',
            mode === 'input'
              ? 'bg-white/10 text-white'
              : 'text-white/50 hover:text-white/80 hover:bg-white/5'
          )}
        >
          Input
        </button>
        <button
          onClick={() => setMode('prompts')}
          className={cn(
            'px-2 py-0.5 text-[10px] font-medium rounded transition-all',
            mode === 'prompts'
              ? 'bg-white/10 text-white'
              : 'text-white/50 hover:text-white/80 hover:bg-white/5'
          )}
        >
          Prompts
        </button>

        {/* Show selected prompt name when in input mode */}
        {mode === 'input' && selectedPrompt && (
          <button
            onClick={handleBackToPrompts}
            className="ml-auto px-2 py-0.5 text-[10px] text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-all flex items-center gap-1"
          >
            <span className="text-white/40">Using:</span>
            <span>{selectedPrompt.name}</span>
            <span className="text-white/40">▼</span>
          </button>
        )}

        {/* Toggle pos/neg for testing */}
        <button
          onClick={() => setHasPosNeg(!hasPosNeg)}
          className={cn(
            'ml-auto px-2 py-0.5 text-[10px] rounded transition-all',
            hasPosNeg ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/40'
          )}
          title="Toggle Pos/Neg mode (for testing)"
        >
          ±
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {mode === 'prompts' ? (
          <PromptList prompts={MOCK_PROMPTS} onSelect={handleSelectPrompt} />
        ) : hasPosNeg ? (
          <PosNegInput
            positive={positivePrompt}
            negative={negativePrompt}
            onPositiveChange={setPositivePrompt}
            onNegativeChange={setNegativePrompt}
          />
        ) : (
          <SinglePromptInput
            value={positivePrompt}
            onChange={setPositivePrompt}
          />
        )}
      </div>
    </div>
  );
}

// Prompt list view
function PromptList({
  prompts,
  onSelect
}: {
  prompts: SavedPrompt[];
  onSelect: (prompt: SavedPrompt) => void;
}) {
  return (
    <div className="w-full h-full overflow-auto p-2">
      <div className="space-y-1">
        {prompts.map((prompt) => (
          <button
            key={prompt.id}
            onClick={() => onSelect(prompt)}
            className={cn(
              'w-full text-left p-2 rounded transition-all',
              'bg-white/5 hover:bg-white/10',
              'border border-transparent hover:border-white/10'
            )}
          >
            <div className="text-xs font-medium text-white/90">{prompt.name}</div>
            <div className="text-[10px] text-white/50 truncate mt-0.5">{prompt.positive}</div>
            {prompt.negative && (
              <div className="text-[10px] text-red-400/50 truncate">- {prompt.negative}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Single prompt input (no pos/neg split)
function SinglePromptInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextareaRef = useCallback((el: HTMLTextAreaElement | null) => {
    (textareaRef as any).current = el;
    if (el) {
      el.focus();
      el.selectionStart = el.selectionEnd = el.value.length;
    }
  }, []);

  const handleBlur = useCallback(() => {
    if (textareaRef.current) {
      onChange(textareaRef.current.value);
    }
    setIsEditing(false);
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (textareaRef.current) {
        onChange(textareaRef.current.value);
      }
      setIsEditing(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative min-h-0">
      {isEditing ? (
        <textarea
          ref={handleTextareaRef}
          defaultValue={value}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full h-full resize-none p-3',
            'bg-transparent text-white/90 text-sm',
            'outline-none border-none',
            'placeholder:text-white/30',
            'min-h-0'
          )}
          placeholder="Enter your prompt..."
        />
      ) : (
        <div
          className="w-full h-full overflow-auto p-3 cursor-text"
          onMouseEnter={() => setIsEditing(true)}
        >
          {value.trim() ? (
            <div className="text-sm text-white/90 whitespace-pre-wrap break-words">{value}</div>
          ) : (
            <span className="text-white/30 text-sm">Hover to enter prompt...</span>
          )}
        </div>
      )}
    </div>
  );
}

// Pos/Neg split input
function PosNegInput({
  positive,
  negative,
  onPositiveChange,
  onNegativeChange,
}: {
  positive: string;
  negative: string;
  onPositiveChange: (value: string) => void;
  onNegativeChange: (value: string) => void;
}) {
  return (
    <div className="w-full h-full flex flex-col min-h-0 gap-1 p-1">
      {/* Positive prompt */}
      <div className="flex-1 min-h-0 rounded border-2 border-green-500/30 overflow-hidden">
        <PromptTextarea
          value={positive}
          onChange={onPositiveChange}
          placeholder="Positive prompt..."
          accent="green"
        />
      </div>

      {/* Negative prompt */}
      <div className="flex-1 min-h-0 rounded border-2 border-red-500/30 overflow-hidden">
        <PromptTextarea
          value={negative}
          onChange={onNegativeChange}
          placeholder="Negative prompt..."
          accent="red"
        />
      </div>
    </div>
  );
}

// Reusable prompt textarea with hover-to-edit
function PromptTextarea({
  value,
  onChange,
  placeholder,
  accent,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  accent?: 'green' | 'red';
}) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextareaRef = useCallback((el: HTMLTextAreaElement | null) => {
    (textareaRef as any).current = el;
    if (el) {
      el.focus();
      el.selectionStart = el.selectionEnd = el.value.length;
    }
  }, []);

  const handleBlur = useCallback(() => {
    if (textareaRef.current) {
      onChange(textareaRef.current.value);
    }
    setIsEditing(false);
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (textareaRef.current) {
        onChange(textareaRef.current.value);
      }
      setIsEditing(false);
    }
  };

  const accentClasses = accent === 'green'
    ? 'bg-green-500/5'
    : accent === 'red'
    ? 'bg-red-500/5'
    : '';

  return (
    <div className={cn('w-full h-full flex flex-col relative min-h-0', accentClasses)}>
      {isEditing ? (
        <textarea
          ref={handleTextareaRef}
          defaultValue={value}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full h-full resize-none p-2',
            'bg-transparent text-white/90 text-xs',
            'outline-none border-none',
            'placeholder:text-white/30',
            'min-h-0'
          )}
          placeholder={placeholder}
        />
      ) : (
        <div
          className="w-full h-full overflow-auto p-2 cursor-text"
          onMouseEnter={() => setIsEditing(true)}
        >
          {value.trim() ? (
            <div className="text-xs text-white/90 whitespace-pre-wrap break-words">{value}</div>
          ) : (
            <span className="text-white/30 text-xs">{placeholder}</span>
          )}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// CODE INPUT (Claude Code CLI style)
// -----------------------------------------------------------------------------

type CodePromptType = 'permission' | 'choice' | 'text';

interface CodePromptBase {
  id: string;
  message: string;
  context?: string; // Tool name or additional context
}

interface PermissionPrompt extends CodePromptBase {
  type: 'permission';
}

interface ChoicePrompt extends CodePromptBase {
  type: 'choice';
  options: string[];
  allowCustom?: boolean;
}

interface TextPrompt extends CodePromptBase {
  type: 'text';
  placeholder?: string;
}

type CodePrompt = PermissionPrompt | ChoicePrompt | TextPrompt;

interface CodePromptAnswer {
  promptId: string;
  value: string; // 'y'/'n'/'a' for permission, option index or custom for choice, text for text
}

// Mock prompts for testing - replace with real data later
const MOCK_CODE_PROMPTS: CodePrompt[] = [
  {
    id: '1',
    type: 'permission',
    message: 'Claude wants to run: npm install',
    context: 'Bash',
  },
];

const MOCK_CODE_MULTI_STAGE: CodePrompt[] = [
  {
    id: '1',
    type: 'choice',
    message: 'Which testing framework would you like to use?',
    options: ['Jest', 'Vitest', 'Mocha', 'Other'],
    allowCustom: true,
  },
  {
    id: '2',
    type: 'choice',
    message: 'Include TypeScript support?',
    options: ['Yes', 'No'],
  },
  {
    id: '3',
    type: 'text',
    message: 'Any additional packages to install?',
    placeholder: 'e.g., lodash, axios (optional)',
  },
];

function CodeInput({ threadId }: { threadId: string }) {
  const {
    text,
    setText,
    pendingAnswers,
    setPendingAnswer,
    clearPendingAnswers,
  } = useCodeDraft(threadId);

  // Current mode: default input or responding to prompts
  const [activePrompts, setActivePrompts] = useState<CodePrompt[] | null>(null);
  const [currentStage, setCurrentStage] = useState(0);

  // For testing - toggle between modes
  const [testMode, setTestMode] = useState<'default' | 'permission' | 'multi'>('default');

  // Simulate receiving prompts
  useEffect(() => {
    if (testMode === 'permission') {
      setActivePrompts(MOCK_CODE_PROMPTS);
      setCurrentStage(0);
      clearPendingAnswers();
    } else if (testMode === 'multi') {
      setActivePrompts(MOCK_CODE_MULTI_STAGE);
      setCurrentStage(0);
      clearPendingAnswers();
    } else {
      setActivePrompts(null);
    }
  }, [testMode, clearPendingAnswers]);

  // Handle answer for current prompt
  const handleAnswer = useCallback((value: string) => {
    if (!activePrompts) return;

    const currentPrompt = activePrompts[currentStage];
    setPendingAnswer(currentPrompt.id, value);

    // Auto-advance for permission prompts
    if (currentPrompt.type === 'permission') {
      if (currentStage < activePrompts.length - 1) {
        setCurrentStage(s => s + 1);
      } else {
        // Submit all answers
        console.log('Submit answers:', { ...pendingAnswers, [currentPrompt.id]: value });
        setActivePrompts(null);
        setTestMode('default');
        clearPendingAnswers();
      }
    }
  }, [activePrompts, currentStage, pendingAnswers, setPendingAnswer, clearPendingAnswers]);

  // Handle submit (for choice/text that need explicit submit)
  const handleSubmit = useCallback(() => {
    if (!activePrompts) return;

    if (currentStage < activePrompts.length - 1) {
      setCurrentStage(s => s + 1);
    } else {
      // Submit all answers
      console.log('Submit answers:', pendingAnswers);
      setActivePrompts(null);
      setTestMode('default');
      clearPendingAnswers();
    }
  }, [activePrompts, currentStage, pendingAnswers, clearPendingAnswers]);

  // Handle going back to previous stage
  const handleBack = useCallback(() => {
    if (currentStage > 0) {
      setCurrentStage(s => s - 1);
    }
  }, [currentStage]);

  // Default input mode
  if (!activePrompts) {
    return (
      <div className="w-full h-full flex flex-col min-h-0 min-w-0 overflow-hidden">
        {/* Test mode buttons */}
        <div className="h-[28px] flex items-center px-2 gap-1 bg-black/30 border-b border-white/5 flex-shrink-0">
          <span className="text-[10px] text-white/40 mr-2">Test:</span>
          <button
            onClick={() => setTestMode('permission')}
            className="px-2 py-0.5 text-[10px] text-white/50 hover:text-white hover:bg-white/10 rounded"
          >
            Permission
          </button>
          <button
            onClick={() => setTestMode('multi')}
            className="px-2 py-0.5 text-[10px] text-white/50 hover:text-white hover:bg-white/10 rounded"
          >
            Multi-stage
          </button>
        </div>

        {/* Default text input */}
        <div className="flex-1 min-h-0">
          <DefaultCodeInput value={text} onChange={setText} />
        </div>
      </div>
    );
  }

  const currentPrompt = activePrompts[currentStage];
  const currentAnswer = pendingAnswers[currentPrompt.id];

  return (
    <div className="w-full h-full flex flex-col min-h-0 min-w-0 overflow-hidden">
      {/* Stage tabs (when multiple prompts) */}
      {activePrompts.length > 1 && (
        <div className="h-[28px] flex items-center px-2 gap-1 bg-black/30 border-b border-white/5 flex-shrink-0 overflow-x-auto">
          {activePrompts.map((prompt, index) => {
            const isAnswered = pendingAnswers[prompt.id] !== undefined;
            const isCurrent = index === currentStage;
            return (
              <button
                key={prompt.id}
                onClick={() => setCurrentStage(index)}
                className={cn(
                  'px-2 py-0.5 text-[10px] font-medium rounded transition-all flex items-center gap-1 flex-shrink-0',
                  isCurrent
                    ? 'bg-white/10 text-white'
                    : isAnswered
                    ? 'bg-green-500/20 text-green-400'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                )}
              >
                <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px]">
                  {isAnswered ? '✓' : index + 1}
                </span>
                <span className="truncate max-w-[100px]">
                  {prompt.type === 'permission' ? 'Permission' :
                   prompt.type === 'choice' ? 'Choice' : 'Input'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Prompt content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {currentPrompt.type === 'permission' && (
          <PermissionPromptUI
            prompt={currentPrompt}
            onAnswer={handleAnswer}
          />
        )}
        {currentPrompt.type === 'choice' && (
          <ChoicePromptUI
            prompt={currentPrompt}
            value={currentAnswer}
            onChange={(v) => setPendingAnswer(currentPrompt.id, v)}
            onSubmit={handleSubmit}
          />
        )}
        {currentPrompt.type === 'text' && (
          <TextPromptUI
            prompt={currentPrompt}
            value={currentAnswer || ''}
            onChange={(v) => setPendingAnswer(currentPrompt.id, v)}
            onSubmit={handleSubmit}
            onBack={currentStage > 0 ? handleBack : undefined}
            isLast={currentStage === activePrompts.length - 1}
          />
        )}
      </div>
    </div>
  );
}

// Default text input for code
function DefaultCodeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextareaRef = useCallback((el: HTMLTextAreaElement | null) => {
    (textareaRef as any).current = el;
    if (el) {
      el.focus();
      el.selectionStart = el.selectionEnd = el.value.length;
    }
  }, []);

  const handleBlur = useCallback(() => {
    if (textareaRef.current) {
      onChange(textareaRef.current.value);
    }
    setIsEditing(false);
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (textareaRef.current) {
        onChange(textareaRef.current.value);
      }
      setIsEditing(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative min-h-0">
      {isEditing ? (
        <textarea
          ref={handleTextareaRef}
          defaultValue={value}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full h-full resize-none p-3',
            'bg-transparent text-white/90 text-sm font-mono',
            'outline-none border-none',
            'placeholder:text-white/30',
            'min-h-0'
          )}
          placeholder="Enter command or message..."
        />
      ) : (
        <div
          className="w-full h-full overflow-auto p-3 cursor-text"
          onMouseEnter={() => setIsEditing(true)}
        >
          {value.trim() ? (
            <div className="text-sm text-white/90 font-mono whitespace-pre-wrap break-words">{value}</div>
          ) : (
            <span className="text-white/30 text-sm font-mono">Hover to enter command...</span>
          )}
        </div>
      )}
    </div>
  );
}

// Permission prompt (y/n/a)
function PermissionPromptUI({
  prompt,
  onAnswer,
}: {
  prompt: PermissionPrompt;
  onAnswer: (value: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'y' || e.key === 'Y') {
        onAnswer('y');
      } else if (e.key === 'n' || e.key === 'N') {
        onAnswer('n');
      } else if (e.key === 'a' || e.key === 'A') {
        onAnswer('a');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAnswer]);

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col p-3 gap-3">
      {/* Context badge */}
      {prompt.context && (
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-400 rounded font-mono">
            {prompt.context}
          </span>
        </div>
      )}

      {/* Message */}
      <div className="text-sm text-white/90 font-mono">{prompt.message}</div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-auto">
        <button
          onClick={() => onAnswer('y')}
          className={cn(
            'flex-1 py-2 px-3 rounded transition-all',
            'bg-green-500/20 hover:bg-green-500/30 border border-green-500/30',
            'text-green-400 text-sm font-medium',
            'flex items-center justify-center gap-2'
          )}
        >
          <span>Yes</span>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-black/30 rounded">Y</kbd>
        </button>
        <button
          onClick={() => onAnswer('n')}
          className={cn(
            'flex-1 py-2 px-3 rounded transition-all',
            'bg-red-500/20 hover:bg-red-500/30 border border-red-500/30',
            'text-red-400 text-sm font-medium',
            'flex items-center justify-center gap-2'
          )}
        >
          <span>No</span>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-black/30 rounded">N</kbd>
        </button>
        <button
          onClick={() => onAnswer('a')}
          className={cn(
            'flex-1 py-2 px-3 rounded transition-all',
            'bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30',
            'text-blue-400 text-sm font-medium',
            'flex items-center justify-center gap-2'
          )}
        >
          <span>Always</span>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-black/30 rounded">A</kbd>
        </button>
      </div>
    </div>
  );
}

// Choice prompt (numbered options)
function ChoicePromptUI({
  prompt,
  value,
  onChange,
  onSubmit,
}: {
  prompt: ChoicePrompt;
  value?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const [customValue, setCustomValue] = useState('');
  const isCustom = value === 'custom';

  // Handle keyboard shortcuts for number selection and Enter to advance
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= prompt.options.length) {
        onChange(String(num - 1)); // 0-indexed
      } else if (e.key === 'Enter' && (value !== undefined || isCustom)) {
        onSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onChange, onSubmit, prompt.options.length, value, isCustom]);

  return (
    <div className="w-full h-full flex flex-col p-3 gap-2 min-h-0 overflow-y-auto">
      {/* Message */}
      <div className="text-sm text-white/90">{prompt.message}</div>

      {/* Options */}
      {prompt.options.map((option, index) => (
        <button
          key={index}
          onClick={() => {
            onChange(String(index));
            // Auto-submit on click
            setTimeout(() => onSubmit(), 100);
          }}
          className={cn(
            'w-full py-2 px-3 rounded transition-all text-left flex-shrink-0',
            'flex items-center gap-2',
            value === String(index)
              ? 'bg-white/20 border border-white/30 text-white'
              : 'bg-white/5 hover:bg-white/10 border border-transparent text-white/70 hover:text-white'
          )}
        >
          <kbd className="w-5 h-5 flex items-center justify-center text-[10px] bg-black/30 rounded">
            {index + 1}
          </kbd>
          <span className="text-sm">{option}</span>
        </button>
      ))}

      {prompt.allowCustom && (
        <div className={cn(
          'w-full py-2 px-3 rounded transition-all flex-shrink-0',
          'flex items-center gap-2',
          isCustom
            ? 'bg-white/20 border border-white/30'
            : 'bg-white/5 border border-transparent'
        )}>
          <input
            type="text"
            value={customValue}
            onChange={(e) => {
              setCustomValue(e.target.value);
              onChange('custom');
            }}
            onFocus={() => onChange('custom')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                onSubmit();
              }
            }}
            placeholder="Or type custom... (Enter to submit)"
            className="flex-1 bg-transparent text-sm text-white/90 outline-none placeholder:text-white/30"
          />
        </div>
      )}

      {/* Hint */}
      <div className="text-[10px] text-white/30 mt-auto flex-shrink-0">
        Press 1-{prompt.options.length} to select, Enter to continue
      </div>
    </div>
  );
}

// Text prompt (open-ended)
function TextPromptUI({
  prompt,
  value,
  onChange,
  onSubmit,
  onBack,
  isLast,
}: {
  prompt: TextPrompt;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onBack?: () => void;
  isLast: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle Ctrl+Enter to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      onSubmit();
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-3 gap-3">
      {/* Message */}
      <div className="text-sm text-white/90">{prompt.message}</div>

      {/* Text input */}
      <div className="flex-1 min-h-0">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={prompt.placeholder || 'Type your response...'}
          className={cn(
            'w-full h-full resize-none p-2 rounded',
            'bg-white/5 border border-white/10 text-white/90 text-sm',
            'outline-none focus:border-white/30',
            'placeholder:text-white/30',
            'min-h-0'
          )}
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="px-3 py-1.5 text-sm text-white/50 hover:text-white hover:bg-white/10 rounded transition-all"
          >
            ← Back
          </button>
        )}
        <span className="text-[10px] text-white/30 ml-auto mr-2">
          {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to submit
        </span>
        <button
          onClick={onSubmit}
          className={cn(
            'px-4 py-1.5 rounded transition-all text-sm font-medium',
            'bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400'
          )}
        >
          {isLast ? 'Submit' : 'Next →'}
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// TERMINAL CONTENT (persistent)
// -----------------------------------------------------------------------------

function TerminalContent() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <span className="text-[10px] text-white/30">Terminal (persistent)</span>
    </div>
  );
}

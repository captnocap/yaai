import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';

// Layout
import { WorkspaceShell, NavigationLayer, useWorkspaceLayoutContext } from './components/layout';
import type { OverlayConfig } from './components/layout';

// Components
import { MessageContainer } from './components/message/MessageContainer';
import { InputContainer } from './components/input/InputContainer';
import { MoodProvider } from './components/effects/MoodProvider';
import { ArtifactList } from './components/artifact';
import type { ArtifactWithStatus } from './components/artifact';
import type { Message, FileObject, FileUpload, Memory, ToolConfig, ModelInfo, ArtifactManifest } from './types';

// Mock data
const mockModels: ModelInfo[] = [
  { id: 'claude-3', name: 'Claude 3 Opus', provider: 'anthropic', contextWindow: 200000 },
  { id: 'gpt-4', name: 'GPT-4 Turbo', provider: 'openai', contextWindow: 128000 },
  { id: 'gemini', name: 'Gemini Pro', provider: 'google', contextWindow: 32000 },
];

const mockMessages: Message[] = [
  {
    id: '1',
    chatId: 'demo',
    role: 'user',
    content: [{ type: 'text', value: "Hey! Can you help me build something **amazing** today? I'm really excited to get started!" }],
    timestamp: new Date(Date.now() - 300000),
    model: 'user',
  },
  {
    id: '2',
    chatId: 'demo',
    role: 'assistant',
    content: [{
      type: 'text',
      value: `Absolutely! I'd love to help you build something amazing!

Here's what we could create together:

1. **A reactive chat interface** with mood-based themes
2. **Dynamic text effects** that respond to emotions
3. **Beautiful ambient backgrounds** with floating orbs

Let me show you some code:

\`\`\`typescript
const amazing = () => {
  return "Let's build something incredible!";
};
\`\`\`

What sounds most interesting to you?`
    }],
    timestamp: new Date(Date.now() - 240000),
    model: 'claude-3',
    tokenCount: 156,
    generationTime: 2340,
  },
  {
    id: '3',
    chatId: 'demo',
    role: 'user',
    content: [{ type: 'text', value: "The mood-based themes sound really cool! How does the mood detection work?" }],
    timestamp: new Date(Date.now() - 180000),
    model: 'user',
  },
  {
    id: '4',
    chatId: 'demo',
    role: 'assistant',
    content: [{
      type: 'text',
      value: `Great choice! The mood detection system analyzes your messages for:

- **Keywords** like "excited", "worried", "thinking"
- **Emojis** that indicate emotions
- **Punctuation patterns** (exclamation marks = excitement!)
- **Code blocks** → focused/technical mood

The UI then adapts with:
- Different background gradients
- Ambient floating orbs
- Text effects on certain words
- Color theme shifts

It's all about making the interface feel *alive* and responsive to the conversation!`
    }],
    timestamp: new Date(Date.now() - 120000),
    model: 'claude-3',
    tokenCount: 203,
    generationTime: 3120,
    isLiked: true,
  },
];

const mockTools: ToolConfig[] = [
  { id: 'web', name: 'Web Search', icon: 'globe', enabled: true },
  { id: 'code', name: 'Code Exec', icon: 'terminal', enabled: false },
  { id: 'browser', name: 'Browser', icon: 'chrome', enabled: false },
];

const mockMemories: Memory[] = [];

// Mock artifacts
const mockArtifacts: ArtifactWithStatus[] = [
  {
    manifest: {
      id: 'github-issues',
      name: 'GitHub Issues',
      description: 'Fetch and manage GitHub issues from any repository. Supports filtering, labeling, and commenting.',
      type: 'tool',
      version: '1.2.0',
      entry: 'handler.ts',
      apis: ['github'],
      tags: ['github', 'issues', 'project-management'],
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      createdBy: { type: 'chat', ref: 'chat-123' },
      icon: '🐙',
    },
    status: 'installed',
  },
  {
    manifest: {
      id: 'code-preview',
      name: 'Code Preview',
      description: 'Renders React/HTML code in a sandboxed iframe with hot reload support.',
      type: 'view',
      version: '2.0.0',
      entry: 'handler.ts',
      ui: 'index.tsx',
      tags: ['preview', 'react', 'html'],
      createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      createdBy: { type: 'builtin' },
      icon: '👁',
    },
    status: 'installed',
  },
  {
    manifest: {
      id: 'notion-sync',
      name: 'Notion Sync',
      description: 'Synchronizes conversation context with Notion pages and databases.',
      type: 'service',
      version: '0.9.0',
      entry: 'handler.ts',
      apis: ['notion'],
      artifacts: ['context-extractor'],
      tags: ['notion', 'sync', 'knowledge-base'],
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      createdBy: { type: 'import', ref: 'https://artifacts.yaai.dev/notion-sync' },
    },
    status: 'running',
  },
  {
    manifest: {
      id: 'code-review-prompt',
      name: 'Code Review',
      description: 'Structured prompt for thorough code review with security and performance analysis.',
      type: 'prompt',
      version: '1.0.0',
      entry: 'handler.ts',
      tags: ['code-review', 'security', 'best-practices'],
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      createdBy: { type: 'manual' },
      icon: '📝',
    },
    status: 'installed',
  },
  {
    manifest: {
      id: 'web-scraper',
      name: 'Web Scraper',
      description: 'Extract structured data from web pages using CSS selectors or AI-powered parsing.',
      type: 'tool',
      version: '1.0.0',
      entry: 'handler.ts',
      tags: ['web', 'scraping', 'data'],
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 8).toISOString(),
      createdBy: { type: 'chat', ref: 'chat-456' },
      enabled: false,
    },
    status: 'disabled',
  },
];

// Artifact Panel Component
function ArtifactPanel() {
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [artifacts, setArtifacts] = useState(mockArtifacts);

  const handleToggleEnabled = (id: string, enabled: boolean) => {
    setArtifacts(prev => prev.map(a =>
      a.manifest.id === id
        ? {
            ...a,
            manifest: { ...a.manifest, enabled },
            status: enabled ? 'installed' : 'disabled'
          } as ArtifactWithStatus
        : a
    ));
  };

  return (
    <ArtifactList
      artifacts={artifacts}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onInvoke={(id) => console.log('Invoke:', id)}
      onEdit={(id) => console.log('Edit:', id)}
      onDelete={(id) => console.log('Delete:', id)}
      onToggleEnabled={handleToggleEnabled}
    />
  );
}

// Settings Panel Component (for overlay demo)
function SettingsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>
          Settings
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            color: 'var(--color-text-tertiary)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <section style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '12px' }}>
            Providers
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['OpenAI', 'Anthropic', 'Google'].map(provider => (
              <div key={provider} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}>
                <span style={{ fontSize: '14px', color: 'var(--color-text)' }}>{provider}</span>
                <span style={{
                  fontSize: '12px',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-success-subtle)',
                  color: 'var(--color-success)',
                }}>
                  Connected
                </span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '12px' }}>
            Proxy Settings
          </h3>
          <div style={{
            padding: '12px',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--color-text)' }}>
              <input type="checkbox" />
              Enable proxy
            </label>
          </div>
        </section>

        <section>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '12px' }}>
            Appearance
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['Dark', 'Light', 'System'].map(theme => (
              <button key={theme} style={{
                flex: 1,
                padding: '10px',
                border: theme === 'Dark' ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: theme === 'Dark' ? 'var(--color-accent-subtle)' : 'var(--color-bg-secondary)',
                color: theme === 'Dark' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
              }}>
                {theme}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// Settings button that uses the overlay system
function SettingsButton() {
  const { actions } = useWorkspaceLayoutContext();

  const openSettings = () => {
    actions.openOverlay(
      {
        id: 'settings',
        variant: 'slide-right',
        backdrop: 'dim',
        dismissible: true,
        width: 420,
      },
      <SettingsPanel onClose={() => actions.closeOverlay('settings')} />
    );
  };

  return (
    <button
      onClick={openSettings}
      style={{
        padding: '6px 12px',
        backgroundColor: 'var(--color-bg-tertiary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--color-text-secondary)',
        fontSize: '13px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      ⚙ Settings
    </button>
  );
}

const App = () => {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [selectedModels, setSelectedModels] = useState<ModelInfo[]>([mockModels[0]]);
  const [attachments, setAttachments] = useState<FileObject[]>([]);
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [tools, setTools] = useState<ToolConfig[]>(mockTools);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeNav, setActiveNav] = useState('chats');

  const handleSend = (input: { content: string; models: string[]; tools: string[]; memoryIds: string[] }) => {
    const newUserMessage: Message = {
      id: String(Date.now()),
      chatId: 'demo',
      role: 'user',
      content: [{ type: 'text', value: input.content }],
      timestamp: new Date(),
      model: 'user',
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsStreaming(true);

    // Simulate assistant response after a delay
    setTimeout(() => {
      const newAssistantMessage: Message = {
        id: String(Date.now() + 1),
        chatId: 'demo',
        role: 'assistant',
        content: [{ type: 'text', value: "This is a **mock response**! In the real app, this would come from the AI. The mood system would analyze your message and adapt the UI accordingly." }],
        timestamp: new Date(),
        model: selectedModels[0]?.id || 'claude-3',
        tokenCount: Math.floor(Math.random() * 200) + 50,
        generationTime: Math.floor(Math.random() * 3000) + 1000,
      };
      setMessages(prev => [...prev, newAssistantMessage]);
      setIsStreaming(false);
    }, 1500);
  };

  const handleToolToggle = (toolId: string, enabled: boolean) => {
    setTools(prev => prev.map(t => t.id === toolId ? { ...t, enabled } : t));
  };

  return (
    <MoodProvider initialSettings={{ enabled: false }}>
      <WorkspaceShell
        initialNavExpanded={false}
        initialArtifactDock="right"
        navigation={
          <NavigationLayer
            activeId={activeNav}
            onItemClick={setActiveNav}
            onNewChat={() => console.log('New chat')}
          />
        }
        artifact={<ArtifactPanel />}
      >
        {/* Main Content Area (Chat) */}
        <div style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-bg)',
        }}>
          {/* Header */}
          <header style={{
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-elevated)',
            padding: '12px 16px',
            flexShrink: 0,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h1 style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--color-text)',
                margin: 0,
              }}>Project Phoenix - Brainstorm</h1>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
              }}>
                <span style={{
                  padding: '4px 8px',
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-secondary)',
                  borderRadius: '9999px',
                  fontSize: '11px',
                }}>
                  Multi-Model
                </span>
                <SettingsButton />
              </div>
            </div>
          </header>

          {/* Messages */}
          <main className="custom-scrollbar" style={{
            flex: 1,
            overflowY: 'auto',
          }}>
            {messages.map((message, index) => (
              <MessageContainer
                key={message.id}
                message={message}
                isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
                user={{ name: 'You' }}
                moodEnabled={false}
                onCopy={() => console.log('Copy')}
                onEdit={() => console.log('Edit')}
                onRegenerate={() => console.log('Regenerate')}
                onLike={() => console.log('Like')}
                onSaveToMemory={() => console.log('Save to memory')}
                onDelete={() => console.log('Delete')}
                onBranch={() => console.log('Branch')}
                onExport={() => console.log('Export')}
              />
            ))}

            {/* Streaming indicator */}
            {isStreaming && (
              <div style={{
                padding: '16px',
                backgroundColor: 'var(--color-bg-secondary)',
              }}>
                <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    color: 'var(--color-text-secondary)',
                  }}>
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      backgroundColor: 'var(--color-accent)',
                      borderRadius: '50%',
                      animation: 'pulse 1.5s infinite',
                    }} />
                    Claude is thinking...
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Input */}
          <InputContainer
            onSend={handleSend}
            models={mockModels}
            selectedModels={selectedModels}
            onModelsChange={setSelectedModels}
            attachments={attachments}
            uploads={uploads}
            onAttach={(files) => console.log('Attach:', files)}
            onRemoveAttachment={(id) => setAttachments(prev => prev.filter(f => f.id !== id))}
            onCancelUpload={(index) => setUploads(prev => prev.filter((_, i) => i !== index))}
            memories={mockMemories}
            onRemoveMemory={(id) => console.log('Remove memory:', id)}
            tools={tools}
            onToolToggle={handleToolToggle}
            tokenEstimate={42}
            tokenTotal={1847}
            tokenLimit={200000}
            isLoading={isStreaming}
            moodEnabled={false}
          />
        </div>
      </WorkspaceShell>
    </MoodProvider>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

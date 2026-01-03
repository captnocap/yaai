# Parallel Model Responses — Specification

> Version: 1.0.0
> Last Updated: 2026-01-02

Complete implementation spec for parallel multi-model requests with response selection, configurable display layouts, and context-aware winner tracking.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Model](#2-data-model)
3. [Input Parsing](#3-input-parsing)
4. [Component Architecture](#4-component-architecture)
5. [Display Modes](#5-display-modes)
6. [Selection Flow & Animation](#6-selection-flow--animation)
7. [Backend Integration](#7-backend-integration)
8. [Settings](#8-settings)
9. [Critical Files](#9-critical-files)

---

## 1. Overview

### 1.1 Feature Summary

Users can send a single message to multiple AI models simultaneously using inline syntax (`+model_name`). Responses stream in parallel and are displayed in a grouped container with configurable layouts. The user selects their preferred response ("like"), which becomes the canonical context for subsequent messages. Unselected responses collapse to a minimal "X rejected alternatives" indicator.

### 1.2 User Flow

```
1. User types: "+claude +gpt-4 What is the capital of France?"
2. System parses → extracts models [claude, gpt-4], cleaned content "What is the capital of France?"
3. User message appears in chat
4. ResponseGroupContainer renders below with parallel response cards
5. Both models stream responses simultaneously
6. User reads both, clicks "like" on preferred response
7. Selected response "blooms" to full width, unselected collapses
8. User continues conversation → only selected response in context
9. User can click "2 rejected alternatives" to expand and change selection
```

### 1.3 Auto-Selection

If user sends next message without selecting a winner:
- First model with a complete response is auto-selected
- Visual indicator: "Auto-selected (first to respond)"

---

## 2. Data Model

### 2.1 ResponseGroup Type

```typescript
// /app/src/mainview/types/response-group.ts

export interface ResponseGroup {
  id: string;
  userMessageId: string;
  chatId: string;
  responses: ParallelResponse[];
  selectedResponseId?: string;
  createdAt: Date;
  autoSelectedAt?: Date;
}

export interface ParallelResponse {
  id: string;                      // Same as Message.id
  modelId: string;
  modelName: string;
  provider: string;
  status: 'pending' | 'streaming' | 'complete' | 'error';
  content: MessageContent[];
  tokenCount?: { input: number; output: number };
  generationTime?: number;
  error?: string;
  isSelected: boolean;
}

export type ResponseDisplayMode = 'horizontal' | 'vertical' | 'grid' | 'single';
```

### 2.2 Message Extension

```typescript
// Additions to /app/src/mainview/types/message.ts

export interface Message {
  // ... existing fields ...

  responseGroupId?: string;        // Links to ResponseGroup
  isParallelResponse?: boolean;    // True if part of parallel set

  // Enhanced token tracking
  tokenCount?: {
    input?: number;
    output?: number;
  } | number;                      // Backward compatible
}
```

### 2.3 Database Schema

```sql
-- migrations/parallel/001_response_groups.sql

CREATE TABLE IF NOT EXISTS response_groups (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_message_id TEXT NOT NULL REFERENCES messages(id),
  selected_response_id TEXT REFERENCES messages(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  auto_selected_at TEXT
);

CREATE INDEX idx_response_groups_chat_id ON response_groups(chat_id);
CREATE INDEX idx_response_groups_user_message ON response_groups(user_message_id);

-- Add to messages table
ALTER TABLE messages ADD COLUMN response_group_id TEXT REFERENCES response_groups(id);
ALTER TABLE messages ADD COLUMN is_parallel_response INTEGER DEFAULT 0;

CREATE INDEX idx_messages_response_group ON messages(response_group_id);
```

---

## 3. Input Parsing

### 3.1 Model Syntax Parser

```typescript
// /app/src/mainview/lib/model-syntax-parser.ts

export interface ParseResult {
  cleanedContent: string;
  targetModels: ParsedModelTarget[];
  errors: ParseError[];
}

export interface ParsedModelTarget {
  modelId: string;
  modelName: string;
  provider: string;
  raw: string;
}

export function parseModelSyntax(
  input: string,
  availableModels: ModelInfo[],
  prefix: string = '+'
): ParseResult {
  // Pattern: +model_name at start or after whitespace
  // Avoids: c++ (programming), a+b (math)
  const pattern = new RegExp(`(?:^|\\s)\\${prefix}([a-zA-Z][a-zA-Z0-9-_]*)`, 'g');

  const matches: Array<{ raw: string; name: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input)) !== null) {
    matches.push({ raw: match[0].trim(), name: match[1] });
  }

  const targetModels: ParsedModelTarget[] = [];
  const errors: ParseError[] = [];

  for (const m of matches) {
    const found = findModelByAlias(m.name, availableModels);
    if (found) {
      targetModels.push({
        modelId: found.id,
        modelName: found.name,
        provider: found.provider,
        raw: m.raw,
      });
    } else {
      errors.push({ raw: m.raw, reason: 'unknown_model' });
    }
  }

  // Remove model syntax from content
  let cleanedContent = input;
  for (const m of matches) {
    cleanedContent = cleanedContent.replace(m.raw, '');
  }

  return {
    cleanedContent: cleanedContent.trim().replace(/\s+/g, ' '),
    targetModels,
    errors,
  };
}
```

### 3.2 Model Alias Matching

```typescript
function findModelByAlias(alias: string, models: ModelInfo[]): ModelInfo | undefined {
  const lower = alias.toLowerCase();

  // Exact ID match
  let found = models.find(m => m.id.toLowerCase() === lower);
  if (found) return found;

  // Name contains
  found = models.find(m => m.name.toLowerCase().includes(lower));
  if (found) return found;

  // Common aliases
  const aliases: Record<string, string[]> = {
    'claude': ['claude-3', 'anthropic'],
    'opus': ['claude-3-opus'],
    'sonnet': ['claude-3-5-sonnet'],
    'haiku': ['claude-3-5-haiku'],
    'gpt': ['gpt-4', 'openai'],
    'gemini': ['gemini-1.5', 'google'],
  };

  for (const [key, patterns] of Object.entries(aliases)) {
    if (lower === key || lower.includes(key)) {
      return models.find(m => patterns.some(p => m.id.includes(p)));
    }
  }

  return undefined;
}
```

---

## 4. Component Architecture

### 4.1 New Components

```
/app/src/mainview/components/parallel/
├── index.ts
├── ResponseGroupContainer.tsx    # Main container, handles layout switching
├── ResponseCard.tsx              # Individual response card
├── ResponseCardHeader.tsx        # Model icon + name + status
├── ResponseCardFooter.tsx        # Tokens + generation time
├── CollapsedAlternatives.tsx     # "X rejected alternatives" button
├── ResponseNavigator.tsx         # Prev/next arrows for single mode
└── styles.css                    # Layout + animation styles
```

### 4.2 ResponseGroupContainer

```typescript
export interface ResponseGroupContainerProps {
  group: ResponseGroup;
  displayMode: ResponseDisplayMode;
  onSelectResponse: (responseId: string) => void;
  streamingStates: Record<string, StreamingState>;
  isCollapsed?: boolean;
  onExpandAlternatives?: () => void;
}

export interface StreamingState {
  isStreaming: boolean;
  content: string;
}
```

### 4.3 ResponseCard

```typescript
export interface ResponseCardProps {
  response: ParallelResponse;
  isSelected: boolean;
  isStreaming: boolean;
  streamingContent?: string;
  onSelect: () => void;
  onCopy: () => void;
  layout: 'compact' | 'expanded';
}
```

### 4.4 Component Composition

```
ChatView
├── MessageContainer (user message)
├── ResponseGroupContainer
│   ├── [Layout wrapper based on displayMode]
│   │   └── ResponseCard[] (when !isCollapsed)
│   │       ├── ResponseCardHeader (icon, name, status badge)
│   │       ├── MessageBody (reused, content rendering)
│   │       └── ResponseCardFooter (tokens, time, actions)
│   └── CollapsedAlternatives (when isCollapsed, shows rejected count)
└── MessageContainer (next message)
```

### 4.5 ResponseCardHeader Details

Per Cherry Studios reference:
- Model provider icon (lucide or simple-icons)
- Model name + provider label
- "api" badge or similar
- Timestamp
- "Deeply thought (X.X seconds)" for reasoning models
- Collapse/expand chevron

### 4.6 ResponseCardFooter Details

- Token meter: `Tokens: 1564 · 1008 · 514` (input/output/context)
- Copy button
- Like/select button (heart or thumbs up)
- Regenerate button
- More actions dropdown

---

## 5. Display Modes

### 5.1 Horizontal (Default)

```css
.response-group--horizontal {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: 16px 0;
}

.response-group--horizontal .response-card {
  flex: 0 0 auto;
  width: min(400px, 80vw);
  scroll-snap-align: start;
}
```

### 5.2 Vertical

```css
.response-group--vertical {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.response-group--vertical .response-card {
  width: 100%;
}
```

### 5.3 Grid (2xN)

```css
.response-group--grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

@media (max-width: 768px) {
  .response-group--grid {
    grid-template-columns: 1fr;
  }
}
```

### 5.4 Single with Arrows

```css
.response-group--single {
  position: relative;
  padding: 0 48px;
}

.response-navigator {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-bg-elevated);
}

.response-navigator--prev { left: 0; }
.response-navigator--next { right: 0; }
```

Plus pagination dots below for current position indicator.

---

## 6. Selection Flow & Animation

### 6.1 Selection States

```
[Before Selection]
┌─────────────────────────────────────────────────┐
│ ResponseGroupContainer                          │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐      │
│ │ Claude    │ │ GPT-4     │ │ Gemini    │      │
│ │ response  │ │ response  │ │ response  │      │
│ │           │ │     ♡     │ │           │      │
│ └───────────┘ └───────────┘ └───────────┘      │
└─────────────────────────────────────────────────┘

[User clicks heart on GPT-4]

[After Selection - Animated Transition]
┌─────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────┐ │
│ │ GPT-4 ✓ Selected                            │ │
│ │                                             │ │
│ │ [Full response content at normal width]     │ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ 📁 2 rejected alternatives          [Show] │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 6.2 Bloom Animation (Selected)

```css
@keyframes cardBloom {
  0% {
    transform: scale(1);
    box-shadow: none;
  }
  30% {
    transform: scale(1.02);
    box-shadow: 0 0 20px var(--color-accent-glow);
  }
  100% {
    transform: scale(1);
    width: 100%;
  }
}

.response-card--selected {
  animation: cardBloom 0.4s var(--ease-spring) forwards;
}
```

### 6.3 Collapse Animation (Unselected)

```css
@keyframes cardCollapse {
  0% {
    opacity: 1;
    max-height: 500px;
  }
  100% {
    opacity: 0;
    max-height: 0;
    padding: 0;
    margin: 0;
  }
}

.response-card--unselected {
  animation: cardCollapse 0.3s var(--ease-out) forwards;
}
```

### 6.4 CollapsedAlternatives Component

```typescript
interface CollapsedAlternativesProps {
  count: number;
  onExpand: () => void;
}

// Renders as:
// ┌──────────────────────────────────────┐
// │ 📁 2 rejected alternatives    [Show] │
// └──────────────────────────────────────┘
```

On expand, unselected cards animate back in and user can change selection.

---

## 7. Backend Integration

### 7.1 New WebSocket Events

```typescript
// Request: Start parallel streaming
'ai:parallel-chat-stream' → {
  chatId: string;
  userMessageId: string;
  content: string;
  models: Array<{ id: string; provider: string }>;
  systemPrompt?: string;
  maxTokens?: number;
}

// Response
→ { groupId: string; requestIds: Record<modelId, requestId> }

// Events (server → client)
'ai:parallel-stream-start'    → { groupId, modelId, requestId, messageId }
'ai:parallel-stream-chunk'    → { groupId, modelId, requestId, chunk }
'ai:parallel-stream-complete' → { groupId, modelId, requestId, response }
'ai:parallel-stream-error'    → { groupId, modelId, requestId, error }

// Request: Select winner
'parallel:select-response' → { groupId: string; responseId: string }

// Event
'parallel:response-selected' → { groupId, responseId }
```

### 7.2 ResponseGroupStore

```typescript
// /app/src/bun/stores/response-group-store.ts

export class ResponseGroupStore {
  create(input: CreateInput): Result<ResponseGroup>
  getByUserMessage(messageId: string): Result<ResponseGroup | null>
  selectResponse(groupId: string, responseId: string): Result<void>
  autoSelectFirst(groupId: string): Result<string>  // Returns selected ID
  getResponsesForGroup(groupId: string): Result<ParallelResponse[]>
}
```

### 7.3 Context Building

When building context for subsequent messages, only include selected response:

```typescript
function buildContext(messages: Message[], groups: Map<string, ResponseGroup>): ChatMessage[] {
  return messages.filter(msg => {
    if (!msg.isParallelResponse) return true;

    const group = groups.get(msg.responseGroupId!);
    return group?.selectedResponseId === msg.id;
  });
}
```

---

## 8. Settings

### 8.1 Settings Schema

```typescript
// Extension to AppSettings

export interface ParallelResponseSettings {
  enabled: boolean;                        // Default: true
  defaultDisplayMode: ResponseDisplayMode; // Default: 'horizontal'
  modelSyntaxPrefix: string;               // Default: '+'
  autoSelectFirst: boolean;                // Default: true
  maxConcurrentRequests: number;           // Default: 4, range: 2-6
}
```

### 8.2 Settings UI Location

Add section to Settings page under "Chat" or as its own "Parallel Responses" section:

- Toggle: Enable parallel model responses
- Select: Default display mode (Horizontal/Vertical/Grid/Single)
- Input: Model syntax prefix (single character, default +)
- Toggle: Auto-select first response when sending next message
- Slider: Max concurrent requests (2-6)

---

## 9. Critical Files

### Files to Create

| File | Purpose |
|------|---------|
| `/app/src/mainview/types/response-group.ts` | ResponseGroup, ParallelResponse types |
| `/app/src/mainview/lib/model-syntax-parser.ts` | Parse +model syntax from input |
| `/app/src/mainview/hooks/useParallelResponses.ts` | State management for parallel requests |
| `/app/src/mainview/components/parallel/ResponseGroupContainer.tsx` | Main container component |
| `/app/src/mainview/components/parallel/ResponseCard.tsx` | Individual response card |
| `/app/src/mainview/components/parallel/ResponseCardHeader.tsx` | Model icon, name, status |
| `/app/src/mainview/components/parallel/ResponseCardFooter.tsx` | Tokens, time, actions |
| `/app/src/mainview/components/parallel/CollapsedAlternatives.tsx` | Rejected alternatives indicator |
| `/app/src/mainview/components/parallel/ResponseNavigator.tsx` | Arrows for single mode |
| `/app/src/mainview/components/parallel/styles.css` | Layout + animations |
| `/app/src/bun/stores/response-group-store.ts` | Backend store for groups |

### Files to Modify

| File | Changes |
|------|---------|
| `/app/src/mainview/types/message.ts` | Add responseGroupId, isParallelResponse |
| `/app/src/mainview/components/input/InputContainer.tsx` | Parse model syntax, show detected models |
| `/app/src/mainview/components/chat/ChatView.tsx` | Render ResponseGroupContainer for parallel |
| `/app/src/mainview/hooks/useAI.ts` | Add parallel streaming support |
| `/app/src/mainview/hooks/useSettings.ts` | Add parallelResponses settings |
| `/app/src/bun/index.ts` | Add parallel WebSocket handlers |
| `/app/src/bun/lib/chat-store.ts` | Add response_group_id queries |

---

## 10. Implementation Order

1. **Types**: Create response-group.ts, extend message.ts
2. **Parser**: Create model-syntax-parser.ts
3. **Database**: Add migration for response_groups table
4. **Backend Store**: Create response-group-store.ts
5. **WebSocket Handlers**: Add parallel streaming handlers
6. **Components**: ResponseCard → ResponseGroupContainer → CollapsedAlternatives
7. **Animations**: CSS for bloom/collapse transitions
8. **Hook**: Create useParallelResponses
9. **Integration**: Modify ChatView, InputContainer
10. **Settings**: Add parallel response settings

---

*End of Parallel Model Responses specification.*

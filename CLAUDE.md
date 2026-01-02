# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YAAI (Yet Another AI Interface) - A desktop AI chat application built with Electrobun (Bun-based Electron alternative). Features a layered workspace layout system, comprehensive artifact/plugin architecture, and 70+ production-grade React components with heavy CSS animations.

## Commands

```bash
# From /app directory:
bun install              # Install dependencies
bun run start            # CSS build + electrobun dev (hot reload)
bun run build            # CSS build + electrobun build (production)
bun run css              # One-time Tailwind build
bun run css:watch        # Tailwind watch mode
```

Note: Kill CEF processes before rebuilding: `pkill -f electrobun`

## Architecture

### Process Model

```mermaid
flowchart TB
    subgraph BUN["Bun Main Process (src/bun/index.ts)"]
        direction TB
        subgraph Artifact["Artifact System"]
            Registry["Registry<br/>CRUD & Storage"]
            Loader["Loader<br/>Timeout/Retry/Cache"]
            Watcher["File Watcher<br/>Hot Reload"]
        end
        subgraph Stores["Data Stores"]
            ChatStore["ChatStore"]
            SettingsStore["SettingsStore"]
            CredentialStore["CredentialStore"]
        end
        subgraph AI["AI Integration"]
            AIProvider["AIProvider"]
            Streaming["Stream Handler"]
        end
        WS["WebSocket Handlers<br/>artifact:* | chat:* | settings:* | ai:*"]
    end

    subgraph RENDERER["Mainview Renderer (src/mainview/)"]
        direction TB
        Router["Router (wouter)<br/>/ | /chat/:id | /settings/*"]
        Hooks["Hooks<br/>useArtifacts | useAI | useSettings"]
        Components["Component Library<br/>70+ Components"]
        Layout["WorkspaceShell<br/>4-Layer Z-Index"]
    end

    BUN <-->|"WebSocket (port 3001)"| RENDERER
    Registry --> Loader
    Watcher --> Registry
    AIProvider --> Streaming
```

### Data Storage

```mermaid
flowchart LR
    subgraph YAAI["~/.yaai/"]
        artifacts["artifacts/<br/>manifest.json + handler.ts + ui/"]
        credentials["credentials/<br/>Encrypted API keys"]
        chats["chats/<br/>JSON history"]
        settings["settings.json"]
        cache["cache/"]
    end
```

### Tech Stack
- **Runtime**: Electrobun (Bun + CEF)
- **UI**: React 19, Radix UI primitives, Tailwind CSS
- **Routing**: wouter
- **Markdown**: react-markdown + rehype-highlight + remark-gfm
- **Icons**: lucide-react, simple-icons

## Workspace Layout System

```mermaid
flowchart TB
    subgraph Shell["WorkspaceShell"]
        direction TB
        z4["z-4: Overlay Layer<br/>Modals, Settings, Dialogs"]
        z3["z-3: Artifact Layer<br/>Dockable (L/R/T/B) or Floating"]
        z2["z-2: Content Layer<br/>Chat Area, Main Views"]
        z1["z-1: Navigation Layer<br/>Collapsible Sidebar"]
    end

    z4 --> z3 --> z2 --> z1

    subgraph Nav["NavigationLayer"]
        Logo
        NavItems["Nav Items"]
        ChatList["Chat List"]
        Collapse["Expand/Collapse"]
    end

    subgraph Content["Content Area"]
        ChatView
        SettingsPage
    end

    subgraph ArtifactPanel["Artifact Panel"]
        ArtifactManager
        ArtifactRenderer["Sandboxed Renderer"]
    end

    z1 --- Nav
    z2 --- Content
    z3 --- ArtifactPanel
```

## Component Architecture

```mermaid
flowchart TB
    subgraph Atoms["atoms/"]
        Avatar
        Badge
        Chip
        Counter
        IconButton
        Indicator
        Spinner
        Toggle
        Tooltip
    end

    subgraph Molecules["molecules/"]
        ActionBar
        ChipList
        ModelBadge
        TokenMeter
        StatusLine
    end

    subgraph Domain["Domain Components"]
        subgraph Text["text/"]
            CodeBlock
            MarkdownBlock
            MathBlock
        end
        subgraph File["file/"]
            FileCard
            FileThumbnail
            UploadZone
        end
        subgraph Message["message/"]
            MessageContainer
            MessageBody
            MessageActions
        end
        subgraph Input["input/"]
            InputContainer
            AutoTextArea
            SendButton
        end
    end

    subgraph Assemblies["Page Assemblies"]
        ChatView["chat/ChatView"]
        SettingsPage["settings/SettingsPage"]
        ArtifactManager["artifact/ArtifactManager"]
    end

    Atoms --> Molecules
    Atoms --> Domain
    Molecules --> Domain
    Domain --> Assemblies
```

## Artifact System

```mermaid
flowchart TB
    subgraph Frontend["Renderer Process"]
        useArtifacts["useArtifacts()"]
        ArtifactUI["ArtifactManager<br/>ArtifactList<br/>ArtifactCard"]
        ArtifactRenderer["ArtifactRenderer<br/>(Sandboxed iframe)"]
    end

    subgraph WS["WebSocket Layer"]
        install["artifact:install"]
        invoke["artifact:invoke"]
        list["artifact:list"]
        events["Events:<br/>installed | updated | progress"]
    end

    subgraph Backend["Bun Main Process"]
        Registry["ArtifactRegistry<br/>~/.yaai/artifacts/"]
        Loader["ArtifactLoader"]
        Context["ExecutionContext<br/>apis | storage | logger"]
        Handler["handler.ts<br/>execute()"]
    end

    useArtifacts --> install & invoke & list
    install --> Registry
    invoke --> Loader
    list --> Registry
    Loader --> Context --> Handler
    Registry --> events --> useArtifacts
    Handler -->|"Result"| Loader -->|"WS Response"| useArtifacts
```

### Artifact Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Installing: install()
    Installing --> Installed: Success
    Installing --> Error: Failed
    Installed --> Running: invoke()
    Running --> Installed: Complete
    Running --> Error: Failed
    Installed --> Disabled: disable()
    Disabled --> Installed: enable()
    Installed --> [*]: uninstall()
    Error --> Installed: Retry
```

### Handler Interface

```typescript
interface ArtifactHandler<TInput, TOutput> {
  execute(input: TInput, context: ExecutionContext): Promise<TOutput>;
  onInstall?(context): Promise<void>;
  onUninstall?(context): Promise<void>;
  validate?(input: TInput): ValidationResult;
}

interface ExecutionContext {
  apis: Record<string, AuthenticatedClient>;  // Pre-authenticated API clients
  artifacts: ArtifactInvoker;                 // Invoke other artifacts
  storage: ArtifactStorage;                   // Key-value storage
  logger: ArtifactLogger;
  signal: AbortSignal;
}
```

## AI Chat Flow

```mermaid
sequenceDiagram
    participant UI as ChatView
    participant Hook as useAI()
    participant WS as WebSocket
    participant Provider as AIProvider
    participant LLM as External LLM

    UI->>Hook: sendMessage(content)
    Hook->>WS: ai:chat-stream
    WS->>Provider: chat(request)
    Provider->>LLM: API Request

    loop Streaming
        LLM-->>Provider: chunk
        Provider-->>WS: emit(ai:stream-chunk)
        WS-->>Hook: onChunk(chunk)
        Hook-->>UI: Update message
    end

    LLM-->>Provider: Complete
    Provider-->>WS: emit(ai:stream-complete)
    WS-->>Hook: onComplete(response)
    Hook-->>UI: Final render
```

## Effects System (Disabled by Default)

```mermaid
flowchart LR
    subgraph Detection["Mood Detection"]
        Text["Message Text"]
        Keywords["Keyword Analysis"]
        Emojis["Emoji Detection"]
        Patterns["Pattern Matching"]
    end

    subgraph MoodProvider["MoodProvider Context"]
        Mood["Current Mood<br/>happy | excited | calm | focused | ..."]
        Theme["MoodTheme<br/>colors | gradients | speed"]
        Rules["TextRules"]
    end

    subgraph Effects["Visual Effects"]
        Ambient["AmbientBackground<br/>Gradients | Orbs | Particles"]
        StyledText["StyledText<br/>glow | shake | rainbow | wave"]
    end

    Text --> Keywords & Emojis & Patterns
    Keywords & Emojis & Patterns --> Mood
    Mood --> Theme --> Ambient
    Mood --> Rules --> StyledText
```

## Hooks

- `useArtifacts()` - Artifact CRUD and invocation
- `useAI()` - AI provider, streaming, model selection
- `useSettings()` - Settings persistence
- `useChatHistory()` - Chat loading/saving
- `useEffectsSettings()` - Mood/effects settings

## WebSocket Channels

```mermaid
flowchart LR
    subgraph Renderer
        Hooks
    end

    subgraph Channels["WebSocket Channels"]
        artifact["artifact:*<br/>list | get | install | invoke | enable | disable"]
        chat["chat:*<br/>list | create | get-messages | add-message | delete"]
        ai["ai:*<br/>chat | chat-stream | cancel | models"]
        settings["settings:*<br/>get-all | get | update | set | reset"]
    end

    subgraph Main["Main Process"]
        Handlers["WS Handlers"]
    end

    Hooks <--> artifact & chat & ai & settings <--> Handlers
```

### Communication Protocol

All frontend-backend communication uses WebSocket (port 3001 by default, configurable via `WS_PORT` env var).

**Request/Response Pattern:**
```typescript
// Frontend sends request
sendMessage('chat:list') // Returns Promise<ChatMetadata[]>

// Backend handles request
wsServer.onRequest('chat:list', async () => chatStore.list())
```

**Event Pattern (Server → Client):**
```typescript
// Backend emits event
wsServer.emit('ai:stream-chunk', { requestId, chunk })

// Frontend subscribes
onMessage('ai:stream-chunk', (data) => handleChunk(data))
```

## UI Design Philosophy

Heavy CSS animations for polish - transitions, microinteractions, engaging visual feedback. Prioritize perceived performance and delightful interactions. Small components enable surgical animation control.

## Development Notes

- User runs Electron (the Electrobun app), Claude runs mock API for development/testing
- Effects/mood system disabled in demo to prevent render loops
- Actual AI integration and streaming are defined but not fully wired to UI

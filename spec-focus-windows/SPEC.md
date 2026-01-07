# Focus Windows — Specification

> Folder: spec-focus-windows
> Version: 1.0.0
> Last Updated: 2026-01-06

This feature introduces "Focus Windows"—lightweight, scoped, auxiliary windows for specific tasks like isolated chats ("popouts") or quick inputs. It enables users to spawn independent windows that can be pinned "always-on-top" and integrated into their OS workflow alongside other applications, supported by a robust multi-window management backend.

---

## Table of Contents

1. [Architecture & Flow](#1-architecture--flow)
2. [Data Model & Schema](#2-data-model--schema)
3. [Component Implementation](#3-component-implementation)
4. [Workflows & UI](#4-workflows--ui)
5. [API & Protocol](#5-api--protocol)
6. [Error Handling](#6-error-handling)
7. [Security & Performance](#7-security--performance)

---

## 1. Architecture & Flow

### 1.1 Logical Flow

```
[Main Window UI]
↓
[User Clicks "Pop Out Chat"]
↓
[WebSocket Request: window:spawn]
↓
[Main Process (Bun)]
1. Generates unique Window ID
2. Instantiates new BrowserWindow
3. Loads URL with Hash & Mode Param (e.g. #/chat/123?mode=popout)
4. Registers window in WindowRegistry
5. Applies OS-specific hints (Always-On-Top, Frameless)
↓
[New Window Spawned]
```

### 1.2 Module Structure

```
app/src/bun/lib/
├── windows/
│   ├── window-manager.ts          # Central registry and factory for all windows
│   └── platform-linux.ts          # Linux-specific xdotool/wmctrl helpers
└── ws/
    └── handlers/
        └── window-handlers.ts     # RPC handlers for window management
```

---

## 2. Data Model & Schema

### 2.1 Types & Interfaces

```typescript
// app/src/bun/lib/windows/types.ts

export type WindowType = 'main' | 'popout' | 'quick-input';

export interface WindowConfig {
  id: string;
  type: WindowType;
  title: string;
  url: string; // Full view URL including hash
  parentId?: string; // If spawned from another window
  dimensions?: {
    width: number;
    height: number;
    x?: number;
    y?: number;
  };
  alwaysOnTop?: boolean;
}

export interface WindowState {
  id: string;
  nativeWindowId?: number; // OS window ID (X11/Cocoa)
  isFocused: boolean;
  isMinimized: boolean;
}
```

### 2.2 Database Schema

*N/A - Window state is ephemeral and lives in memory for the duration of the application runtime. Persistence of window positions across restarts is a future consideration.*

---

## 3. Component Implementation

### 3.1 WindowManager

**Path**: `app/src/bun/lib/windows/window-manager.ts`

```typescript
import { BrowserWindow } from "electrobun/bun";
import { Result, AppError } from '../core';

export class WindowManager {
  private windows: Map<string, BrowserWindow<any>> = new Map();

  constructor() {}

  /**
   * Spawns a new independent window
   */
  async spawn(config: WindowConfig): Promise<Result<string>> {
    try {
      const window = new BrowserWindow({
        title: config.title,
        url: config.url,
        frame: {
          width: config.dimensions?.width ?? 800,
          height: config.dimensions?.height ?? 600,
          x: config.dimensions?.x ?? 0,
          y: config.dimensions?.y ?? 0,
        },
        styleMask: {
           // On macOS this handles frameless + transparency
           // On Linux we heavily rely on the platform-linux.ts helpers
           Borderless: true 
        }
      });

      this.windows.set(config.id, window);
      
      // Post-spawn setup (Linux specific hacks, etc.)
      await this.applyPlatformHints(window, config);

      return Result.ok(config.id);
    } catch (error) {
      return Result.err(new AppError({ code: 'WINDOW_SPAWN_FAILED', message: error.message }));
    }
  }

  get(id: string): BrowserWindow<any> | undefined {
    return this.windows.get(id);
  }

  close(id: string): void {
    const win = this.windows.get(id);
    if (win) {
      win.close();
      this.windows.delete(id);
    }
  }
}
```

### 3.2 Main View Adaptation

**Path**: `app/src/mainview/components/layout/WorkspaceShell.tsx`

The `WorkspaceShell` needs to support a `minimal` mode that hides the navigation sidebar and non-essential chrome.

```typescript
// Logic to detect mode from URL params
const isMinimal = new URLSearchParams(window.location.search).get('mode') === 'popout';

return (
  <div className={cn("workspace-shell", isMinimal && "mode-minimal")}>
     {!isMinimal && <NavigationLayer ... />}
     <ContentLayer ... />
     {/* Custom window controls for popout are rendered here if isMinimal */}
  </div>
);
```

---

## 4. Workflows & UI

### 4.1 Pop Out Chat Workflow

**UI Component**: `ChatHeader.tsx` (Add "Pop Out" button)

```
┌─────────────────────────────────────────────────────────────┐
│  Chat: Project Alpha                                [↗] [X] │  <-- New "Pop Out" Icon [↗]
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [User] How do I...                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Interaction Logic

1.  **User Action**: User clicks the "Pop Out" icon in the chat header.
2.  **Frontend Logic**:
    *   Captures current `chatId`.
    *   Sends `window:spawn` RPC with `url: "views://mainview/index.html#/chat/{chatId}?mode=popout"`.
    *   (Optional) Redirects current view to home or shows placeholder "Chat open in another window".
3.  **Backend Logic**: Spawns new window.
4.  **Result**: A new frameless window appears containing *only* the chat interface. It has its own close/minimize controls.

### 4.3 Quick Input Workflow

**Global Shortcut**: `Alt + Space` (Future implementation via global hotkey listener)

1.  User presses hotkey.
2.  App spawns `WindowType('quick-input')` centered on screen.
3.  Window stays "Always on Top".
4.  Submitting a message expands the window into a standard chat "popout".

---

## 5. API & Protocol

### 5.1 WebSocket Handlers

**Path**: `app/src/bun/lib/ws/handlers/window-handlers.ts`

```typescript
export const windowHandlers = {
  /**
   * window:spawn - Create a new window
   */
  'window:spawn': async (req: WSRequest): Promise<WSResponse> => {
    const { type, url, title, alwaysOnTop } = req.payload; 
    const id = `win_${Date.now()}`;
    
    await windowManager.spawn({
      id,
      type,
      title: title || 'YAAI Popout',
      url,
      alwaysOnTop
    });

    return { type: 'response', id: req.id, payload: { windowId: id } };
  },

  /**
   * window:set-top - Toggle always-on-top
   */
  'window:set-top': async (req: WSRequest): Promise<WSResponse> => {
    // Platform specific implementation
  }
}
```

### 5.2 Channel Registry

| Channel | Direction | Payload | Response | Description |
| --- | --- | --- | --- | --- |
| `window:spawn` | Request | `{ type: string, url: string, ... }` | `{ windowId: string }` | Spawns new window |
| `window:close` | Request | `{ windowId: string }` | `void` | Closes specific window |
| `window:focus` | Request | `{ windowId: string }` | `void` | Brings window to front |

---

## 6. Error Handling

### 6.1 Common Errors

| Situation | Error Code | User Message | Recovery |
| --- | --- | --- | --- |
| Spawn Failed | `WIN_SPAWN_ERR` | "Failed to open new window" | Log error, keep content in main window |
| Linux WM Missing | `LINUX_WM_ERR` | "Window management features unavailable" | Disable advanced window controls (pinning) |

---

## 7. Security & Performance

### 7.1 Security Considerations

*   **URL Validation**: `window:spawn` url must be validated to ensure it only loads internal `views://` schemas, preventing open redirect vulnerabilities.
*   **Isolation**: Popout windows share the same renderer process/origin in current Electrobun implementation (or separate processes depending on CEF config), but share the same WebSocket connection/authentication.

### 7.2 Performance Strategy

*   **Resource Usage**: Each `BrowserWindow` spawns a heavy CEF instance. Users should be discouraged (via UI design) from spawning dozens of windows.
*   **Connection Reuse**: All windows connect to the *same* WebSocket server port. The server must handle multiple connections from the "same" user (client ID management needs to handle multi-tab/multi-window scenarios correctly).

---

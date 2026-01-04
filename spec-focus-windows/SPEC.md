# Focus Windows Specification

## 1. Overview
This specification defines the architecture and behavior for "Focus Windows"—a set of lightweight, auxiliary windows designed to extend the application's functionality into the user's OS workflow without the overhead of the full main application window.

These windows are "scoped" interactions: simple, effective, and feature-lean. They are designed for speed and specific utility, primarily chat and quick capture.

## 2. Core Architecture
The implementation relies on a highly flexible **Window Container** that can adapt its OS-level presentation based on the intended use case.

### 2.1 The Container Spec
The spawning mechanism must support a reusable container component that accepts specific props to control its frame and behavior.

**Key Props:**
- `windowType`: Defines the mode (e.g., `'POPOUT_CHAT'`, `'QUICK_INPUT'`).
- `windowType`: Defines the mode (e.g., `'POPOUT_CHAT'`, `'QUICK_INPUT'`).
- `frameless`: **Always True**. To guarantee smooth animations between "Input" and "Window" modes, we cannot rely on native OS window decorations, which handle resizing/toggling poorly.
    - All Focus Windows are spawned as frameless operating system windows.
    - Window controls (Close, Minimize, Drag Region) must be drawn by the application itself via a **Custom Toolbar** component.

**Common Functionality:**
- **Custom Toolbar**: A React component that simulates the native title bar but allows for CSS-driven transitions (opacity, height, color).
- **Pinning**: Capability to toggle "Always on Top" to float above other applications.
- **Carousel Display**: Due to limited screen real estate, these windows must handle parallel/branching messages via a **Carousel** UI pattern rather than split panes or complex grids.
- **Core Chat**:
    - Send messages.
    - Scroll message history.
    - Switch between parallel message nodes (Carousel).

---

## 3. Window Variants

### 3.1 Variant A: Popout Chats
*The "Sidecar" experience.*

- **Purpose**: dedicated window for a specific, ongoing conversation.
- **Visuals**: Frameless window with a **Visible Custom Toolbar** (mimics OS window).
- **Behavior**:
    - Spawns from the main application (e.g., "Pop out this chat").
    - Persistent until closed.
    - Supports full chat history traversal.
- **UX Goal**: Allow the user to keep a specific context open alongside their work (e.g., coding assistance, reading notes) without the full app UI clutter.

### 3.2 Variant B: Quick Inputs
*The "Spotlight" experience.*

- **Purpose**: Immediate, ephemeral access to AI assistance.
- **Invocation**: Global System Shortcut (Default: `Alt + Space`).
- **Visuals**:
    - **Invisible Toolbar**: The Custom Toolbar is rendered but with `opacity: 0` or `height: 0` (hidden).
    - Must look like a native overlay or modal widget.
    - Minimalist aesthetics.
- **Session Logic (The "15-Minute Rule")**:
    - **Fresh vs. Recent**: The window intelligently decides whether to resume a session or start a new one based on the time since it was last closed/despawned.
    - **< 15 Minutes**: Resumes the *most recent* chat session. Context is preserved.
    - **> 15 Minutes**: Resets to a **Brand New Chat**. The slate is wiped clean for a new task.
- **Use Case**:
    - Hitting a shortcut to ask a quick question.
    - Pasting code/text for a quick summary.
    - "Fire and forget" interactions.

---

## 4. Configuration & Preferences
The user must have control over the Quick Input behaviors given its intrusion into global workflows.

**Settings Requirements:**
- **Global Shortcut**: Configurable keybinding (default `Alt + Space`).
- **Reset Timer**: Configurable duration for the session reset logic (default `15 minutes`).
- **Window Positioning**: Preferences for default spawn location (Center, Top-Center, etc.).

---

## 5. Interaction & Motion Design
*Critical for the "Quick Input" experience.*

### 5.1 The "Input-to-Window" Morph
When a user submits a message via the Quick Input overlay, the transition to the chat interface must be seamless and fluid. It is not a hard "close input, open window" swap; it is a metamorphosis.

**The Sequence:**
1.  **Stage 1: The Input (Start)**
    - The window is a compact, single-line (or small multi-line) input bar.
    - Floating, no decorations, minimalist.
2.  **Stage 2: The Shift & Grow (Submission)**
    - Upon hitting `Enter`, the input bar does not disappear.
    - **Vertical Expansion**: The container immediately grows in height to accommodate the incoming chat history/response area.
    - **Horizontal Expansion**: Simultaneously (or slightly staggered), the container widens to a comfortable reading width (e.g., from 600px input -> 900px chat window).
3.  **Stage 3: The Content Morph (Mid-Transition)**
    - While expanding, the internal UI elements cross-fade:
        - The large "Input" font scales down to become the "Chat Input" at the bottom.
        - The empty space above fills with the loading state/response of the AI.
4.  **Stage 4: The Chat Window (End)**
    - The expansion settles into the final dimensions.
    - If configured as a "Popout" in preferences, window decorations (toolbar) fade in at this final stage.
    - If configured as "Overlay", it remains borderless but fully interactive.

**Technical Note**: This requires the window manager/renderer to handle smooth layout animations (e.g., `framer-motion` layout projection or CSS transitions) on the OS window bounds itself, or simulating the effect by having a transparent max-size window where only the inner container resizes.

### 5.2 State Transition Logic
Crucially, the React component's state must promote the window type mid-interaction.

1.  **Initial State**:
    - `windowType = 'QUICK_INPUT'`
    - `hideOsToolbar = true`
2.  **Trigger Event**:
    - User executes `SUBMIT_MESSAGE`
3.  **Transition**:
    - Animation sequence begins (Stage 2).
    - **State Update**: `setWindowType('POPOUT_CHAT')`.
    - **Prop Propagation**: The `CustomToolbar` component receives the new type and **animates in** (fade-in + slide-down).
4.  **Final State**:
    - The window appears standard, but is technically still a frameless window with a rendered toolbar.

# Deep Research Interface - UI Specification

> **Purpose:** Comprehensive visual specification for generating high-fidelity mockups
> **Design Philosophy:** Dense but scannable, real-time feedback, professional research tool aesthetic

---

## 1. Global Design System

### 1.1 Color Palette

```
BACKGROUNDS
├─ Primary Background:     #0F0F12 (near-black with slight blue)
├─ Secondary Background:   #1A1A1F (elevated surfaces, cards)
├─ Tertiary Background:    #252529 (hover states, selected items)
└─ Border Color:           #2E2E35 (subtle dividers)

ACCENT COLORS
├─ Primary Accent:         #6366F1 (indigo - primary actions)
├─ Secondary Accent:       #8B5CF6 (purple - links, highlights)
└─ Success Accent:         #10B981 (emerald - completed states)

STATUS COLORS
├─ Pending:                #F59E0B (amber)
├─ Active/Processing:      #3B82F6 (blue)
├─ Success:                #10B981 (emerald)
├─ Warning:                #F97316 (orange)
├─ Error:                  #EF4444 (red)
└─ Neutral/Skipped:        #6B7280 (gray)

BIAS INDICATOR COLORS
├─ Left:                   #3B82F6 (blue)
├─ Center-Left:            #60A5FA (light blue)
├─ Center:                 #9CA3AF (neutral gray)
├─ Center-Right:           #F87171 (light red)
├─ Right:                  #EF4444 (red)
└─ Unknown:                #6B7280 (gray, dashed border)

TEXT COLORS
├─ Primary Text:           #F9FAFB (near-white)
├─ Secondary Text:         #9CA3AF (muted gray)
├─ Tertiary Text:          #6B7280 (very muted)
└─ Link Text:              #818CF8 (indigo-300)
```

### 1.2 Typography

```
FONT FAMILY
├─ Primary:                Inter (UI elements, body)
├─ Monospace:              JetBrains Mono (code, URLs, technical)
└─ Display:                Inter (headings, with tighter tracking)

FONT SIZES
├─ xs:                     11px (labels, metadata)
├─ sm:                     13px (secondary text, captions)
├─ base:                   14px (body text, UI elements)
├─ lg:                     16px (section headers, important text)
├─ xl:                     18px (card titles, sub-headings)
├─ 2xl:                    24px (page titles)
└─ 3xl:                    32px (hero elements, report title)

LINE HEIGHTS
├─ Tight:                  1.25 (headings)
├─ Normal:                 1.5 (body)
└─ Relaxed:                1.75 (long-form reading)
```

### 1.3 Spacing System

```
SPACING SCALE (in pixels)
├─ 4   (xs)   - tight padding, icon margins
├─ 8   (sm)   - compact spacing
├─ 12  (md)   - standard gaps
├─ 16  (lg)   - section padding
├─ 24  (xl)   - major section gaps
├─ 32  (2xl)  - panel margins
└─ 48  (3xl)  - page-level spacing
```

### 1.4 Border Radius

```
├─ sm:     4px  (buttons, inputs, small cards)
├─ md:     8px  (cards, panels)
├─ lg:     12px (modals, large containers)
└─ full:   9999px (pills, avatars, circular buttons)
```

### 1.5 Shadows

```
├─ sm:     0 1px 2px rgba(0,0,0,0.3)
├─ md:     0 4px 6px rgba(0,0,0,0.4)
├─ lg:     0 10px 15px rgba(0,0,0,0.5)
└─ glow:   0 0 20px rgba(99,102,241,0.3) (accent glow for active states)
```

---

## 2. Overall Layout Structure

### 2.1 Research Session View (Main Interface)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HEADER BAR (h: 56px, fixed)                                                │
├───────────────────────────────┬─────────────────────────────────────────────┤
│                               │                                             │
│  LEFT PANEL                   │  MAIN CONTENT AREA                          │
│  (w: 380px, resizable)        │  (flex: 1)                                  │
│                               │                                             │
│  ┌─────────────────────────┐  │  ┌─────────────────────────────────────┐   │
│  │ Session Controls        │  │  │                                     │   │
│  ├─────────────────────────┤  │  │  REPORT VIEW                        │   │
│  │                         │  │  │  (scrollable)                       │   │
│  │ Source Feed             │  │  │                                     │   │
│  │ (scrollable list)       │  │  │  - Progressive sections             │   │
│  │                         │  │  │  - Inline citations                 │   │
│  │                         │  │  │  - Contradiction callouts           │   │
│  │                         │  │  │                                     │   │
│  │                         │  │  │                                     │   │
│  │                         │  │  │                                     │   │
│  ├─────────────────────────┤  │  │                                     │   │
│  │ Session Guidance        │  │  │                                     │   │
│  │ (collapsible)           │  │  │                                     │   │
│  └─────────────────────────┘  │  └─────────────────────────────────────┘   │
│                               │                                             │
├───────────────────────────────┴─────────────────────────────────────────────┤
│  STATUS BAR (h: 32px, fixed)                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Responsive Breakpoints

```
DESKTOP (1440px+)
├─ Full layout as shown above
├─ Left panel: 380px default, resizable 280-500px
└─ Report view: centered, max-width 800px content

LAPTOP (1024px - 1439px)  
├─ Left panel: 320px fixed
├─ Report view: fills remaining space
└─ Some metadata collapses to icons

TABLET (768px - 1023px)
├─ Left panel: collapsible drawer (slides in from left)
├─ Toggle button in header
└─ Report view: full width

MOBILE (< 768px)
├─ Tab-based navigation (Sources | Report | Guidance)
├─ Bottom sheet for source actions
└─ Simplified source cards
```

---

## 3. Header Bar

### 3.1 Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [← Back]   Deep Research                           [?] [⚙️] [Export ▼]    │
│             "Current state of solid-state batteries"                        │
└─────────────────────────────────────────────────────────────────────────────┘

Height: 56px
Background: #1A1A1F
Border-bottom: 1px solid #2E2E35
```

### 3.2 Elements

**Back Button:**
```
- Icon: ← (arrow-left)
- Size: 20px icon, 32px touch target
- Color: #9CA3AF, hover: #F9FAFB
- Position: left-aligned, 16px from edge
```

**Title Section:**
```
- "Deep Research" label: 11px, #6B7280, uppercase, letter-spacing: 0.05em
- Query text: 16px, #F9FAFB, font-weight: 500
- Truncate with ellipsis if > 60 characters
- Position: 16px after back button
```

**Right Actions:**
```
- Help button [?]: 32px circle, ghost style
- Settings [⚙️]: 32px circle, ghost style
- Export dropdown: "Export ▼" button, 80px width
  └─ Dropdown options: "Markdown", "PDF", "JSON", "Copy Link"
- Gap between buttons: 8px
- Position: right-aligned, 16px from edge
```

---

## 4. Left Panel - Session Controls

### 4.1 Header Section

```
┌─────────────────────────────────────────────────────────────────┐
│  Research Progress                                    [⏸ Pause] │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 67%    │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ 🔍 47    │ │ 📄 23    │ │ ✅ 18    │ │ ⏱️ 3:42  │           │
│  │ Searched │ │ Queued   │ │ Extracted│ │ Elapsed  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

**Progress Bar:**
```
- Height: 4px
- Background (track): #2E2E35
- Fill (progress): gradient from #6366F1 to #8B5CF6
- Border-radius: 2px (full)
- Animation: smooth transition on width change (300ms ease-out)
- When actively searching: subtle pulse animation on fill
```

**Stats Grid:**
```
- 4 columns, equal width
- Each stat box:
  ├─ Background: #252529
  ├─ Border-radius: 6px
  ├─ Padding: 8px
  ├─ Icon: 16px, color matches stat type
  ├─ Value: 18px, #F9FAFB, font-weight: 600
  └─ Label: 11px, #6B7280
  
- Icon colors:
  ├─ Searched (🔍): #3B82F6
  ├─ Queued (📄): #F59E0B  
  ├─ Extracted (✅): #10B981
  └─ Elapsed (⏱️): #9CA3AF
```

**Pause Button:**
```
- Size: 32px height, auto width with padding 12px
- Style: ghost button with border
- Icon: ⏸ (pause) or ▶ (play) based on state
- Text: "Pause" or "Resume"
- Border: 1px solid #2E2E35
- Hover: background #252529
```

### 4.2 Depth Profile Selector

```
┌─────────────────────────────────────────────────────────────────┐
│  Depth Profile                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ○ Light    ◉ General    ○ Exhaustive                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ~30 queries • 5 min • ~$0.45 estimated                        │
└─────────────────────────────────────────────────────────────────┘
```

**Segmented Control:**
```
- Background: #1A1A1F
- Border: 1px solid #2E2E35
- Border-radius: 6px
- Each segment: equal width (33.33%)
- Selected segment:
  ├─ Background: #6366F1
  ├─ Text: #FFFFFF
  └─ Subtle shadow: 0 2px 4px rgba(0,0,0,0.3)
- Unselected:
  ├─ Background: transparent
  └─ Text: #9CA3AF
- Hover (unselected): text #F9FAFB
- Transition: 200ms ease
```

**Estimate Text:**
```
- Font: 12px, #6B7280
- Dot separator: #4B5563
- Updates dynamically when profile changes
```

---

## 5. Left Panel - Source Feed

### 5.1 Feed Header

```
┌─────────────────────────────────────────────────────────────────┐
│  Sources                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ All (47) │ Pending (12) │ Reading (3) │ Done (32)       │   │
│  └─────────────────────────────────────────────────────────┘   │
│  [Sort: Relevance ▼]                              [🔍 Filter]   │
└─────────────────────────────────────────────────────────────────┘
```

**Tab Bar:**
```
- Style: underline tabs
- Active tab: text #F9FAFB, 2px bottom border #6366F1
- Inactive tab: text #6B7280, no border
- Count badge: inline, slightly muted from tab text
- Spacing between tabs: 24px
```

**Controls Row:**
```
- Sort dropdown: 120px width, left-aligned
- Filter button: icon button with tooltip, right-aligned
- Gap: 8px between elements
```

### 5.2 Source Card - Standard

```
┌─────────────────────────────────────────────────────────────────┐
│  🟡 PENDING                                           Scout A   │
│  ─────────────────────────────────────────────────────────────  │
│  nature.com                                                     │
│  /articles/solid-state-battery-breakthrough-2024                │
│                                                                 │
│  "Researchers at Stanford demonstrate 99% capacity retention   │
│  after 1000 cycles using novel sulfide electrolyte..."         │
│                                                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                  │
│  │ Rel: 94    │ │ Bias: ━━━  │ │ 📅 Nov '24 │                  │
│  └────────────┘ └────────────┘ └────────────┘                  │
│                                                                 │
│  [✓ Approve]  [✗ Reject]  [💬 Comment]  [🔍 Preview]           │
└─────────────────────────────────────────────────────────────────┘
```

**Card Container:**
```
- Background: #1A1A1F
- Border: 1px solid #2E2E35
- Border-radius: 8px
- Padding: 12px
- Margin-bottom: 8px
- Hover: border-color #3E3E45, subtle shadow
- Transition: 150ms ease
```

**Status Badge:**
```
Position: top-left
Size: auto width, 20px height
Padding: 4px 8px
Border-radius: 4px
Font: 10px, uppercase, letter-spacing 0.05em, font-weight 600

States:
├─ PENDING:   bg #422006, text #FCD34D, icon 🟡
├─ APPROVED:  bg #064E3B, text #6EE7B7, icon 🟢  
├─ READING:   bg #1E3A5F, text #60A5FA, icon 🔵 (with pulse animation)
├─ COMPLETE:  bg #064E3B, text #6EE7B7, icon ✅
├─ REJECTED:  bg #450A0A, text #FCA5A5, icon 🔴
└─ FAILED:    bg #451A03, text #FDBA74, icon ⚠️
```

**Scout Attribution:**
```
- Position: top-right, same line as status
- Font: 11px, #6B7280
- Format: "Scout A" or "Reader B"
```

**Domain Display:**
```
- Font: 13px, #F9FAFB, font-weight: 500
- Color: white for recognized domains, #818CF8 for links
```

**Path Display:**
```
- Font: 12px, #6B7280, font-family: monospace
- Truncate with ellipsis if > 50 characters
- Show full path on hover (tooltip)
```

**Snippet:**
```
- Font: 13px, #9CA3AF, line-height: 1.5
- Max lines: 3 (with line-clamp)
- Quotes: use actual quotation marks, slightly lighter color
- Overflow: fade-out gradient at bottom if truncated
```

**Metadata Pills:**
```
- Layout: horizontal row, gap 8px
- Each pill:
  ├─ Background: #252529
  ├─ Border-radius: 4px
  ├─ Padding: 4px 8px
  ├─ Font: 11px
  └─ Icon + text format

- Relevance pill:
  ├─ "Rel: 94" format
  ├─ Color coding: 80+: #10B981, 60-79: #F59E0B, <60: #EF4444
  
- Bias pill:
  ├─ Visual: 5-segment bar (━━━━━)
  ├─ Filled segments indicate position
  ├─ Or text: "Left", "Center", "Right", "Unknown"
  ├─ Color matches bias indicator palette

- Date pill:
  ├─ Icon: 📅
  ├─ Format: "Nov '24" or "2 days ago"
  ├─ Color: #6B7280 for older, #10B981 for recent (< 30 days)
```

**Action Buttons:**
```
Layout: horizontal row, gap 8px, margin-top 12px

Button style:
├─ Height: 28px
├─ Padding: 0 10px
├─ Border-radius: 4px
├─ Font: 12px, font-weight: 500
├─ Transition: 150ms ease

Approve button:
├─ Background: transparent
├─ Border: 1px solid #10B981
├─ Text: #10B981
├─ Icon: ✓ (checkmark)
├─ Hover: background #10B981/20

Reject button:
├─ Background: transparent
├─ Border: 1px solid #EF4444
├─ Text: #EF4444
├─ Icon: ✗ (x-mark)
├─ Hover: background #EF4444/20

Comment button:
├─ Background: transparent
├─ Border: 1px solid #6B7280
├─ Text: #9CA3AF
├─ Icon: 💬
├─ Hover: border #9CA3AF, text #F9FAFB

Preview button:
├─ Background: transparent
├─ Border: 1px solid #6B7280
├─ Text: #9CA3AF
├─ Icon: 🔍
├─ Hover: border #9CA3AF, text #F9FAFB
```

### 5.3 Source Card - Expanded State

When user clicks "Comment" or expands card:

```
┌─────────────────────────────────────────────────────────────────┐
│  [Standard card content...]                                     │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  💬 Add Comment                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ This seems like a primary source, extract methodology   │   │
│  │ section carefully...                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                     [Submit]    │
│                                                                 │
│  Quick Actions:                                                 │
│  [📌 Priority] [🚫 Block Domain] [🔗 Find Similar]              │
└─────────────────────────────────────────────────────────────────┘
```

**Comment Input:**
```
- Textarea: 3 rows default, auto-expand
- Background: #252529
- Border: 1px solid #2E2E35, focus: #6366F1
- Border-radius: 6px
- Placeholder: "Add guidance for this source..."
- Font: 13px
```

**Quick Actions:**
```
- Pill buttons, smaller than main actions
- Height: 24px
- Background: #252529
- On click: immediate action with toast confirmation
```

### 5.4 Source Card - Rejected State

```
┌─────────────────────────────────────────────────────────────────┐
│  🔴 REJECTED                                                    │
│  batteryuniversity.com/article/solid-state-basics               │
│                                                                 │
│  Your reason: "Outdated, this is from 2019"                     │
│                                                                 │
│  [↩ Undo Rejection]                                             │
└─────────────────────────────────────────────────────────────────┘
```

**Rejected Card:**
```
- Background: #1A1A1F with 50% opacity
- Border: 1px solid #450A0A (muted red)
- All text muted to 60% opacity
- Strikethrough on domain/path (optional)
- Compact height (collapsed)
- Single undo action available
```

### 5.5 Source Card - Reading State

```
┌─────────────────────────────────────────────────────────────────┐
│  🔵 READING                                          Reader A   │
│  arxiv.org/abs/2401.00123                                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░  Extracting findings...        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Stage: Parsing content (2/4)                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Reading Progress:**
```
- Mini progress bar inside card
- Stages: Fetching → Parsing → Extracting → Complete
- Current stage highlighted
- Subtle pulse/shimmer animation on active stage
```

### 5.6 Source Card - Complete State

```
┌─────────────────────────────────────────────────────────────────┐
│  ✅ COMPLETE                                         Reader B   │
│  nature.com/articles/solid-state-battery-breakthrough           │
│                                                                 │
│  Extracted: 7 findings                                          │
│  ├─ 3 statistics                                                │
│  ├─ 2 claims                                                    │
│  ├─ 1 quote                                                     │
│  └─ 1 definition                                                │
│                                                                 │
│  [View Findings]                                                │
└─────────────────────────────────────────────────────────────────┘
```

**Findings Summary:**
```
- Collapsible tree structure
- Each finding type has icon + count
- "View Findings" opens side panel or modal with full details
```

---

## 6. Left Panel - Session Guidance

### 6.1 Collapsed State

```
┌─────────────────────────────────────────────────────────────────┐
│  Session Guidance                                    [▼ Expand] │
│  3 notes • 2 blocked domains                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Expanded State

```
┌─────────────────────────────────────────────────────────────────┐
│  Session Guidance                                  [▲ Collapse] │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Your Notes                                          [+ Add]    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Focus more on manufacturing challenges, less on hype  │   │
│  │                                                    [✕]  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ • Prioritize sources from 2024                          │   │
│  │                                                    [✕]  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ • Include both optimistic and skeptical viewpoints      │   │
│  │                                                    [✕]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Blocked Domains                                     [+ Add]    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🚫 quantumscape.com                              [✕]   │   │
│  │  🚫 seekingalpha.com                              [✕]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Learned Patterns (auto)                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ⚡ Avoiding: SEO-heavy content                         │   │
│  │  ⚡ Avoiding: Content older than 2022                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Notes List:**
```
- Each note: pill with delete button
- Background: #252529
- Border-left: 3px solid #6366F1
- Padding: 8px 12px
- Delete button: appears on hover, right-aligned
- Add button: opens inline input field
```

**Blocked Domains:**
```
- Each domain: pill with 🚫 prefix
- Red-tinted background: #1F1315
- Delete button to unblock
```

**Learned Patterns:**
```
- Read-only display
- Muted styling, informational
- Shows what the system has inferred from rejections
```

---

## 7. Main Content - Report View

### 7.1 Report Header

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                    Current State of Solid-State Batteries                   │
│                                                                             │
│                    Deep Research Report • January 2025                      │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  📊 47 sources searched  •  23 analyzed  •  18 cited              │    │
│  │  ⏱️ 4 min 32 sec  •  Depth: General  •  Est. cost: $0.42          │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Table of Contents                                                          │
│  ─────────────────                                                          │
│  1. Executive Summary ............................................. ✅     │
│  2. Technology Overview ........................................... ✅     │
│  3. Major Players ................................................. ✅     │
│  4. Challenges & Barriers ......................................... ⏳     │
│  5. Timeline & Predictions ........................................ ⬜     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Title:**
```
- Font: 32px, #F9FAFB, font-weight: 700
- Centered
- Letter-spacing: -0.02em
```

**Subtitle:**
```
- Font: 14px, #6B7280
- Format: "Deep Research Report • {Month} {Year}"
- Centered, below title with 8px gap
```

**Stats Bar:**
```
- Background: #1A1A1F
- Border: 1px solid #2E2E35
- Border-radius: 8px
- Centered, max-width: 600px
- Padding: 12px 20px
- Items separated by bullet (•)
- Font: 13px, #9CA3AF
- Icons have slight color tint
```

**Table of Contents:**
```
- Left-aligned
- Each item: section number + title + dot leader + status icon
- Status icons:
  ├─ ✅ Complete (green)
  ├─ ⏳ Writing (amber, subtle pulse)
  └─ ⬜ Pending (gray outline)
- Clickable: scrolls to section
- Hover: text becomes #F9FAFB
```

### 7.2 Report Section - Complete

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  1. Executive Summary                                                       │
│  ═══════════════════                                                        │
│                                                                             │
│  Solid-state batteries represent a significant paradigm shift in energy     │
│  storage technology. Unlike conventional lithium-ion batteries that use     │
│  liquid electrolytes, solid-state variants employ solid electrolytes,       │
│  offering potential improvements in energy density, safety, and             │
│  longevity [1][2].                                                          │
│                                                                             │
│  Major automotive manufacturers have announced production targets           │
│  between 2027 and 2030 [3], though industry analysts note that              │
│  manufacturing scalability remains the primary challenge [4][5].            │
│  Recent breakthroughs at Stanford University demonstrated 99% capacity      │
│  retention after 1,000 cycles using novel sulfide electrolytes [6],         │
│  suggesting that technical barriers are being systematically addressed.     │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  ⚠️ Note: Sources disagree on current energy density figures.      │    │
│  │  Range reported: 280-400 Wh/kg. See Contradiction #1 below.        │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Section Header:**
```
- Font: 24px, #F9FAFB, font-weight: 600
- Underline: 2px solid #6366F1, width 60px (not full width)
- Margin-bottom: 24px
```

**Body Text:**
```
- Font: 15px, #D1D5DB, line-height: 1.8
- Max-width: 700px
- Paragraph spacing: 16px
- First-line indent: none (modern style)
```

**Inline Citations:**
```
[1][2] format:
├─ Display: inline
├─ Font: 13px, font-weight: 600
├─ Color: #818CF8 (link color)
├─ Background: #1E1E2E (very subtle)
├─ Border-radius: 3px
├─ Padding: 1px 4px
├─ Cursor: pointer

Hover state:
├─ Background: #2E2E4E
├─ Tooltip appears with:
    ├─ Source title
    ├─ Domain
    ├─ Relevant quote snippet
    └─ "Click to view source"
```

**Contradiction Callout:**
```
- Background: #1F1A0A (amber-tinted dark)
- Border: 1px solid #78350F
- Border-left: 4px solid #F59E0B
- Border-radius: 6px
- Padding: 12px 16px
- Icon: ⚠️ in amber
- "See Contradiction #1" is a link
```

### 7.3 Report Section - In Progress

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  4. Challenges & Barriers                                                   │
│  ════════════════════════                                                   │
│                                                                             │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                               │
│                                                                             │
│  ⏳ Writing section... (analyzing 12 findings)                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Skeleton Loading:**
```
- Animated shimmer effect (left-to-right gradient sweep)
- 3-4 lines of "text" blocks
- Variable widths: 100%, 100%, 85%, 60%
- Color: #252529 base with #2E2E35 shimmer highlight
- Animation: 1.5s ease-in-out infinite
```

**Progress Indicator:**
```
- Centered below skeleton
- Icon: ⏳ with subtle rotation animation
- Text: "Writing section... (analyzing X findings)"
- Font: 13px, #6B7280
```

### 7.4 Report Section - Pending

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  5. Timeline & Predictions                                                  │
│  ═════════════════════════                                                  │
│                                                                             │
│                        ⬜ Waiting for previous section                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Pending State:**
```
- Section title visible but muted (#6B7280)
- Centered placeholder text
- Empty box icon
- Much shorter height than complete sections
```

---

## 8. Contradiction Courtroom Modal

### 8.1 Modal Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                    [✕]     │
│                         ⚖️ Contradiction Detected                          │
│                                                                             │
│  Topic: Solid-state battery energy density vs lithium-ion                  │
│  ───────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  ┌─────────────────────────────┐   VS   ┌─────────────────────────────┐   │
│  │                             │        │                             │   │
│  │  SOURCE A                   │        │  SOURCE B                   │   │
│  │  ─────────────────────────  │        │  ─────────────────────────  │   │
│  │                             │        │                             │   │
│  │  🔗 nature.com              │        │  🔗 electrek.co             │   │
│  │     /articles/ss-battery... │        │     /2024/solid-state-hype  │   │
│  │                             │        │                             │   │
│  │  ┌───────────────────────┐  │        │  ┌───────────────────────┐  │   │
│  │  │ "Solid-state          │  │        │  │ "Current solid-state  │  │   │
│  │  │ batteries achieve     │  │        │  │ prototypes only reach │  │   │
│  │  │ 400 Wh/kg, double     │  │        │  │ 280 Wh/kg, barely     │  │   │
│  │  │ the density of        │  │        │  │ exceeding Li-ion"     │  │   │
│  │  │ conventional Li-ion"  │  │        │  │                       │  │   │
│  │  └───────────────────────┘  │        │  └───────────────────────┘  │   │
│  │                             │        │                             │   │
│  │  ┌──────┐ ┌──────┐ ┌─────┐ │        │  ┌──────┐ ┌──────┐ ┌─────┐ │   │
│  │  │Center│ │Nov'24│ │ 1°  │ │        │  │ Tech │ │Aug'24│ │ 2°  │ │   │
│  │  │      │ │      │ │Src  │ │        │  │ Blog │ │      │ │Src  │ │   │
│  │  └──────┘ └──────┘ └─────┘ │        │  └──────┘ └──────┘ └─────┘ │   │
│  │                             │        │                             │   │
│  │     [ 👍 Trust This ]       │        │     [ 👍 Trust This ]       │   │
│  │                             │        │                             │   │
│  └─────────────────────────────┘        └─────────────────────────────┘   │
│                                                                             │
│  ───────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  [ 🤝 Use Both - Note Disagreement ]        [ 🔍 Find Tiebreaker Source ]  │
│                                                                             │
│                              [ Dismiss - Let AI Decide ]                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Modal Styling

**Container:**
```
- Width: 800px (or 90vw on smaller screens)
- Max-height: 80vh
- Background: #1A1A1F
- Border: 1px solid #2E2E35
- Border-radius: 12px
- Box-shadow: 0 25px 50px rgba(0,0,0,0.5)
- Backdrop: #0F0F12 at 80% opacity
```

**Header:**
```
- Title: 24px, centered, with ⚖️ icon
- Topic subtitle: 14px, #9CA3AF
- Close button: top-right, 32px, ghost style
```

**Source Cards (within modal):**
```
- Width: 340px each
- Background: #252529
- Border: 1px solid #2E2E35
- Border-radius: 8px
- Padding: 16px

When selected/trusted:
- Border: 2px solid #10B981
- Background: #0D2818 (green tint)
```

**VS Divider:**
```
- Centered between cards
- Text: "VS" in 16px, #6B7280, font-weight: 600
- Optional: subtle vertical line above and below
```

**Quote Block:**
```
- Background: #1A1A1F
- Border-left: 3px solid #6366F1
- Padding: 12px
- Font: 14px, italic, #D1D5DB
- Border-radius: 4px
```

**Metadata Pills:**
```
- Row of 3 pills below quote
- Bias | Date | Source Type
- Same styling as source cards
```

**Action Buttons:**
```
Primary actions (Trust This):
├─ Width: full width of card
├─ Height: 40px
├─ Background: transparent
├─ Border: 1px solid #10B981
├─ Text: #10B981, 14px, font-weight: 500
├─ Hover: background #10B981/20

Secondary actions (bottom row):
├─ "Use Both": outlined, neutral
├─ "Find Tiebreaker": outlined, with 🔍 icon
├─ "Dismiss": ghost/text-only, muted

Button spacing: 12px gap
```

---

## 9. Hover States & Tooltips

### 9.1 Citation Hover Tooltip

```
┌─────────────────────────────────────────────────────────────────┐
│  📄 nature.com                                                  │
│  "Solid-State Battery Breakthrough..."                         │
│  ─────────────────────────────────────────────────────────────  │
│  "...demonstrated 99% capacity retention after 1,000           │
│  charge cycles using a novel sulfide electrolyte..."           │
│  ─────────────────────────────────────────────────────────────  │
│  Click to view full source                                      │
└─────────────────────────────────────────────────────────────────┘
```

**Tooltip Styling:**
```
- Width: 320px
- Background: #252529
- Border: 1px solid #3E3E45
- Border-radius: 8px
- Box-shadow: 0 10px 25px rgba(0,0,0,0.4)
- Padding: 12px
- Animation: fade in + slight slide up (150ms)
- Position: above the citation, centered

Arrow:
- 8px triangle pointing down
- Same background color as tooltip
```

### 9.2 Button Hover States

```
All buttons:
- Transition: all 150ms ease
- Cursor: pointer

Ghost buttons:
- Hover: background-color at 10% opacity of border color

Solid buttons:
- Hover: brightness 110%
- Active: brightness 90%

Icon buttons:
- Hover: icon color lightens, subtle background appears
```

---

## 10. Status Bar (Bottom)

### 10.1 Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🟢 Scouts: 3 active  │  📖 Readers: 2 active  │  💰 Cost: $0.38  │  🔗 API │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Container:**
```
- Height: 32px
- Background: #0F0F12
- Border-top: 1px solid #2E2E35
- Padding: 0 16px
- Display: flex, space-between
```

**Status Items:**
```
- Font: 12px, #6B7280
- Icon + text format
- Separated by vertical dividers (|)
- Active counts pulse green when non-zero
```

**API Status Indicator:**
```
- Right-aligned
- 🔗 icon + "API" text
- Green dot for connected, red for issues
- Hover: shows connection details
```

---

## 11. Toast Notifications

### 11.1 Toast Types

```
SUCCESS:
┌──────────────────────────────────────────────┐
│  ✅  Source approved and queued for reading  │
└──────────────────────────────────────────────┘
Background: #064E3B
Border-left: 4px solid #10B981
Icon: ✅ (green)

ERROR:
┌──────────────────────────────────────────────┐
│  ❌  Failed to fetch source: timeout         │
└──────────────────────────────────────────────┘
Background: #450A0A
Border-left: 4px solid #EF4444
Icon: ❌ (red)

WARNING:
┌──────────────────────────────────────────────┐
│  ⚠️  Domain added to blocklist               │
└──────────────────────────────────────────────┘
Background: #451A03
Border-left: 4px solid #F59E0B
Icon: ⚠️ (amber)

INFO:
┌──────────────────────────────────────────────┐
│  ℹ️  Contradiction detected - review needed  │
└──────────────────────────────────────────────┘
Background: #1E3A5F
Border-left: 4px solid #3B82F6
Icon: ℹ️ (blue)
```

**Toast Styling:**
```
- Position: bottom-right, 24px from edges
- Width: auto, max 400px
- Padding: 12px 16px
- Border-radius: 6px
- Box-shadow: 0 4px 12px rgba(0,0,0,0.3)
- Font: 13px, #F9FAFB
- Animation: slide in from right + fade (200ms)
- Auto-dismiss: 4 seconds
- Stack: newer toasts above older ones, max 3 visible
```

---

## 12. Loading & Empty States

### 12.1 Initial Loading

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                                                                             │
│                              ┌─────────────┐                                │
│                              │   🔬       │                                │
│                              │             │                                │
│                              └─────────────┘                                │
│                                                                             │
│                          Initializing Research                              │
│                                                                             │
│                    Breaking down query into sub-questions...                │
│                                                                             │
│                         ━━━━━━━━━━━━━━━━━━━━━━                              │
│                                                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Loading Animation:**
```
- Centered icon: 🔬 or custom research icon
- Icon animation: subtle scale pulse (1.0 → 1.1 → 1.0)
- Text: 18px, #F9FAFB
- Subtext: 14px, #6B7280, cycles through stages:
  ├─ "Breaking down query into sub-questions..."
  ├─ "Dispatching scouts..."
  ├─ "Searching sources..."
  └─ "Processing results..."
- Progress bar: indeterminate, animated gradient sweep
```

### 12.2 Empty Source Feed

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                         📭                                      │
│                                                                 │
│                  No sources found yet                           │
│                                                                 │
│           Scouts are searching... this may take a moment.       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 12.3 All Sources Rejected

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                         🚫                                      │
│                                                                 │
│              All sources have been rejected                     │
│                                                                 │
│       Consider adjusting your guidance or trying again.         │
│                                                                 │
│                    [ 🔄 Retry Search ]                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 13. Animations & Transitions

### 13.1 Animation Specifications

```
MICRO-INTERACTIONS:
├─ Button hover:         150ms ease
├─ Card hover:           150ms ease
├─ Tooltip appear:       150ms ease-out (fade + translate-y -4px)
├─ Toast enter:          200ms ease-out (translate-x from 20px)
├─ Toast exit:           150ms ease-in (translate-x to 20px + fade)
├─ Modal enter:          200ms ease-out (scale from 0.95 + fade)
├─ Modal exit:           150ms ease-in (scale to 0.95 + fade)
└─ Dropdown open:        150ms ease-out (translate-y from -8px + fade)

STATE CHANGES:
├─ Progress bar:         300ms ease-out
├─ Section completion:   400ms ease (slide down + fade in)
├─ Status badge change:  200ms ease
├─ Card expand/collapse: 200ms ease-in-out
└─ Tab switch:           150ms ease

LOOPING:
├─ Skeleton shimmer:     1.5s ease-in-out infinite
├─ Active status pulse:  2s ease-in-out infinite
├─ Loading spinner:      1s linear infinite
└─ Writing indicator:    1s ease-in-out infinite (dots)
```

### 13.2 New Source Appearance

When a new source card appears in the feed:

```
1. Card slides in from top (translate-y from -20px)
2. Simultaneously fades in (opacity 0 → 1)
3. Slight scale (0.98 → 1.0)
4. Duration: 250ms ease-out
5. If user scrolled down, show "New sources ↑" sticky banner
```

### 13.3 Section Completion Animation

When a report section finishes writing:

```
1. Skeleton fades out (150ms)
2. Content fades in from below (translate-y 10px → 0)
3. Staggered paragraph entrance (50ms delay per paragraph)
4. TOC checkbox animates to green check (200ms with slight bounce)
```

---

## 14. Keyboard Shortcuts

### 14.1 Global Shortcuts

```
NAVIGATION:
├─ ⌘/Ctrl + 1       Focus source feed
├─ ⌘/Ctrl + 2       Focus report view
├─ ⌘/Ctrl + G       Open session guidance
├─ Esc              Close modal/dropdown
└─ ?                Show keyboard shortcuts help

ACTIONS:
├─ ⌘/Ctrl + Enter   Start/Resume research
├─ ⌘/Ctrl + P       Pause research
├─ ⌘/Ctrl + E       Export report
└─ ⌘/Ctrl + S       Save session
```

### 14.2 Source Feed Shortcuts (when focused)

```
├─ ↑/↓              Navigate sources
├─ Enter            Expand selected source
├─ A                Approve selected source
├─ R                Reject selected source
├─ C                Add comment to selected source
└─ B                Block domain of selected source
```

---

## 15. Accessibility Notes

### 15.1 Requirements

```
CONTRAST:
├─ All text meets WCAG AA (4.5:1 for normal, 3:1 for large)
├─ Interactive elements have visible focus states
└─ Status colors paired with icons (not color-only)

SCREEN READERS:
├─ All images/icons have aria-labels
├─ Dynamic content updates announced via aria-live
├─ Modal focus trapping implemented
└─ Semantic HTML structure (headings, lists, etc.)

MOTION:
├─ Respect prefers-reduced-motion
├─ Essential animations only when reduced motion enabled
└─ No auto-playing videos or infinite loops that distract
```

---

## 16. Responsive Adaptations

### 16.1 Tablet (768px - 1023px)

```
LAYOUT CHANGES:
├─ Left panel becomes slide-out drawer
├─ Toggle button in header (hamburger icon)
├─ Report view takes full width
├─ Floating action button for quick approve/reject
└─ Bottom sheet for source details instead of expand-in-place

COMPONENT CHANGES:
├─ Source cards: slightly larger touch targets
├─ Action buttons: icon-only with tooltips
├─ Stats grid: 2x2 instead of 1x4
└─ Courtroom modal: stacked cards instead of side-by-side
```

### 16.2 Mobile (< 768px)

```
LAYOUT CHANGES:
├─ Tab-based navigation (Sources | Report | Settings)
├─ No simultaneous view of feed and report
├─ Full-screen modals
└─ Bottom navigation bar

COMPONENT CHANGES:
├─ Source cards: full width, larger
├─ Actions: swipe gestures (left = reject, right = approve)
├─ Courtroom: one source at a time with swipe to compare
├─ Report: larger text, single column
└─ Progress: simplified, shown in header
```

---

## 17. Example Screen States

### 17.1 State: Research In Progress (Primary View)

```
HEADER:
- Back button visible
- Query displayed
- Export dropdown active

LEFT PANEL:
- Progress at 45%
- Stats showing: 23 searched, 8 queued, 6 extracted, 1:34 elapsed
- Depth: "General" selected
- Source feed showing mix of:
  - 2 PENDING cards at top
  - 1 READING card with progress
  - 3 COMPLETE cards
  - 1 REJECTED card (collapsed)
- Session guidance collapsed, showing "2 notes"

MAIN CONTENT:
- Report header with stats
- TOC showing: 2 complete ✅, 1 writing ⏳, 2 pending ⬜
- Section 1 fully rendered with citations
- Section 2 fully rendered with one contradiction callout
- Section 3 showing skeleton loader
- Sections 4-5 showing pending state

STATUS BAR:
- "Scouts: 2 active"
- "Readers: 1 active"
- "Cost: $0.28"
- API connected (green)
```

### 17.2 State: Contradiction Detected (Modal Open)

```
BACKGROUND:
- Main interface visible but dimmed (80% dark overlay)

MODAL:
- Centered, 800px wide
- Two source cards side by side
- Source A (nature.com) with quote about 400 Wh/kg
- Source B (electrek.co) with quote about 280 Wh/kg
- Source A metadata: Center bias, Nov 2024, Primary source
- Source B metadata: Tech Blog bias, Aug 2024, Secondary source
- Four action buttons at bottom
- Close X in top right
```

### 17.3 State: Research Complete

```
HEADER:
- Export dropdown prominent

LEFT PANEL:
- Progress at 100% (solid green bar)
- Stats finalized: 47 searched, 23 queued, 18 extracted, 4:32 elapsed
- All source cards showing COMPLETE or REJECTED
- Session guidance showing learning summary

MAIN CONTENT:
- Report header with final stats
- TOC showing all 5 sections complete ✅
- All sections fully rendered
- Citations all interactive
- Contradiction callouts resolved or flagged

STATUS BAR:
- "Research complete"
- Final cost displayed
- "Download report" prompt

TOAST:
- Success toast: "Research complete! 18 sources cited."
```

---

## 18. Model Configuration

The Deep Research system uses configurable AI models for different roles. See **SPEC_DEFAULT_MODELS.md** for full settings specification.

### 18.1 Agent Roles and Models

| Agent | Purpose | Default Model | Requirements |
|-------|---------|---------------|--------------|
| **Orchestrator** | Coordinates research, synthesizes findings | claude-sonnet-4-20250514 | Strong reasoning, long context |
| **Runners (Scouts)** | Parallel source discovery | claude-3-5-haiku-20241022 | Fast, cost-effective |
| **Reader** | Content extraction and analysis | claude-sonnet-4-20250514 | Detailed comprehension |

### 18.2 Configuration Interface

```typescript
interface ResearchModelsConfig {
  orchestrator: ModelReference
  runners: RunnerConfig
  reader: ModelReference
}

interface RunnerConfig {
  count: number           // 1-10 parallel runners
  mode: 'uniform' | 'individual'
  uniformModel?: ModelReference
  individualModels?: ModelReference[]
}
```

### 18.3 Session Initialization

When starting a research session, models are resolved from settings:

```typescript
async function initializeResearchSession(
  query: string,
  depthProfile: DepthProfile
): Promise<ResearchSession> {
  const config = settingsStore.getResearchModels()

  // Initialize orchestrator
  const orchestrator = await createResearchAgent({
    role: 'orchestrator',
    model: config.orchestrator,
    systemPrompt: ORCHESTRATOR_SYSTEM_PROMPT
  })

  // Initialize runners based on configuration
  const runnerModels = settingsStore.getRunnerModels()
  const runners = await Promise.all(
    runnerModels.map((model, index) =>
      createResearchAgent({
        role: 'runner',
        id: `scout-${String.fromCharCode(65 + index)}`, // Scout A, B, C...
        model,
        systemPrompt: RUNNER_SYSTEM_PROMPT
      })
    )
  )

  // Initialize reader
  const reader = await createResearchAgent({
    role: 'reader',
    model: config.reader,
    systemPrompt: READER_SYSTEM_PROMPT
  })

  return {
    id: generateSessionId(),
    query,
    depthProfile,
    orchestrator,
    runners,
    reader,
    status: 'initializing'
  }
}
```

### 18.4 Dynamic Runner Scaling

The runner count can be adjusted during research based on depth profile:

| Depth Profile | Default Runner Count | Max Queries |
|---------------|---------------------|-------------|
| Light | 2 | ~30 |
| General | 3 | ~50 |
| Exhaustive | 5 | ~100+ |

```typescript
function getEffectiveRunnerCount(
  configured: number,
  depthProfile: DepthProfile
): number {
  const profileDefaults = {
    light: 2,
    general: 3,
    exhaustive: 5
  }

  // Use configured count, but cap based on depth profile
  return Math.min(configured, profileDefaults[depthProfile] + 2)
}
```

### 18.5 Model Diversity for Runners

When using individual model assignment, different providers can reduce bias:

```typescript
// Example individual runner configuration
const diverseRunners: ModelReference[] = [
  { provider: 'anthropic', modelId: 'claude-3-5-haiku-20241022' },
  { provider: 'openai', modelId: 'gpt-4o-mini' },
  { provider: 'google', modelId: 'gemini-2.0-flash' }
]
```

Benefits of model diversity:
- Different models may surface different sources
- Reduces single-provider bias in search strategies
- Provides redundancy if one provider has issues

### 18.6 Cost Estimation

Research session cost depends on model selection and depth:

```typescript
function estimateResearchCost(
  config: ResearchModelsConfig,
  depthProfile: DepthProfile
): CostEstimate {
  const estimates = {
    light: { queries: 30, readPages: 10 },
    general: { queries: 50, readPages: 20 },
    exhaustive: { queries: 100, readPages: 40 }
  }

  const { queries, readPages } = estimates[depthProfile]

  // Runner cost (search queries)
  const runnerTokensPerQuery = 500  // avg input + output
  const runnerCost = queries * runnerTokensPerQuery * getTokenCost(config.runners)

  // Reader cost (page analysis)
  const readerTokensPerPage = 4000  // avg for detailed extraction
  const readerCost = readPages * readerTokensPerPage * getTokenCost(config.reader)

  // Orchestrator cost (synthesis)
  const orchestratorTokens = 10000  // for final report
  const orchestratorCost = orchestratorTokens * getTokenCost(config.orchestrator)

  return {
    total: runnerCost + readerCost + orchestratorCost,
    breakdown: { runnerCost, readerCost, orchestratorCost }
  }
}
```

---

*End of UI Specification*
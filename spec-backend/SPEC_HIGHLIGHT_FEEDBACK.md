# Highlight Feedback & Markdown Style Profiles — Specification

> Version: 1.0.0
> Last Updated: 2026-01-04

User-driven markdown style learning system. Users highlight text they like/dislike in AI responses, and the system infers markdown formatting preferences over time. Styles are toggled at runtime and inject formatting guidelines into the system prompt without modifying personality or behavior.

---

## Table of Contents

1. [Overview & Philosophy](#1-overview--philosophy)
2. [Data Model](#2-data-model)
3. [Database Schema](#3-database-schema)
4. [Style Management](#4-style-management)
5. [Highlighting & Feedback](#5-highlighting--feedback)
6. [Analysis Engine](#6-analysis-engine)
7. [Settings UI](#7-settings-ui)
8. [Chat Integration](#8-chat-integration)
9. [Prompt Injection](#9-prompt-injection)
10. [Error Handling](#10-error-handling)

---

## 1. Overview & Philosophy

### 1.1 What Styles Are (and Are Not)

**Styles ARE:** Markdown formatting and writing mechanics preferences
- Bullet vs numbered lists
- Code block vs inline code usage
- Emphasis markers (`**`, `__`, `~~`, etc.)
- Heading hierarchy and structure
- Quote formatting
- Link formatting
- Paragraph length preferences
- Sentence structure patterns
- Punctuation choices (Oxford comma, em-dashes, etc.)

**Styles ARE NOT:** Behavioral or personality overrides
- Tone or voice direction
- System-level instructions
- Personality traits or characteristics
- Capabilities or feature enablement
- Character role or persona
- Priority or focus instructions

### 1.2 How Styles Work

```
1. User creates a style (manually define rules OR let system learn)
2. User highlights text in responses they like/dislike while style is active
3. Highlights accumulate over time, tagged to that style
4. Analysis agent periodically examines highlights (if new data exists)
5. Agent infers markdown formatting patterns ("user prefers bullets over dashes")
6. At send time, if style is enabled → inject rules into system prompt
7. Model formats responses according to rules
8. User can edit/refine rules manually anytime
```

### 1.3 Runtime Toggling

- Styles are **not** conversation settings
- User can **enable/disable any style at any point** while chatting
- Whichever style is active when a message is sent → that style's rules get injected
- User can switch between styles mid-conversation
- Highlights made while a style is active belong to that style
- Disabling all styles = no style injection

---

## 2. Data Model

### 2.1 Style Type

```typescript
// lib/core/types.ts (add to existing)

export type StyleId = Brand<string, 'StyleId'>

export interface Style {
  id: StyleId
  name: string                  // User-friendly name
  description?: string          // What this style is for
  isEnabled: boolean            // Show in chat UI dropdown
  manualRules?: string          // User-written markdown guidelines
  inferredRules?: string        // Auto-generated from analysis
  analysisFrequency: AnalysisFrequency
  lastAnalyzed?: string         // ISO 8601 timestamp
  highlightCount: number        // Total highlights for this style
  createdAt: string
  updatedAt: string
}

export type AnalysisFrequency = 'manual' | 'per-message' | 'hourly' | 'daily' | 'weekly'

export interface Highlight {
  id: string
  messageId: string             // Message this was highlighted from
  chatId: string                // Chat context
  styleId: StyleId              // Which style was active
  selectedText: string          // The actual text highlighted
  startChar: number             // Position in message
  endChar: number               // Position in message
  sentiment: 'like' | 'dislike' // User's judgment
  userNote?: string             // Optional user explanation
  createdAt: string
}

export interface AnalysisJob {
  styleId: StyleId
  lastRun: string               // ISO 8601 timestamp
  nextRun: string               // ISO 8601 timestamp (calculated from frequency)
  newHighlightsCount: number    // How many new highlights since last run
  isRunning: boolean
}

export interface AnalysisResult {
  styleId: StyleId
  rules: string                 // Generated markdown style guide
  highlights: {
    liked: Highlight[]
    disliked: Highlight[]
  }
  patterns: {
    description: string
    examples: string[]
  }[]
  timestamp: string
}
```

### 2.2 Markdown Style Rules Format

Rules are human-readable text that gets injected into the system prompt:

```
MARKDOWN STYLE RULES:

Lists:
- Use bullet points (•) for unordered lists in narrative sections
- Use numbered (1. 2. 3.) for step-by-step instructions
- Avoid dashes (-) for lists

Code:
- Use `inline code` for single functions, variables, or short code
- Use triple-backtick code blocks only for multi-line examples
- Avoid inline code blocks for proper nouns or names

Emphasis:
- Use **bold** for important terms
- Use *italics* for emphasis or asides
- Do NOT use both bold and italic on same text
- Avoid ~~strikethrough~~

Headings:
- Use # for main section (max 1 per response unless very long)
- Use ## for subsections
- Avoid ### and deeper

Paragraphs:
- Keep paragraphs under 4 sentences
- Use em-dashes (—) to connect related clauses
- Include examples after abstract explanations

Links:
- Use [text](url) format
- Keep link text under 5 words
```

---

## 3. Database Schema

### 3.1 Styles Table

Add migration: `app/src/bun/migrations/app/005_create_styles.sql`

```sql
CREATE TABLE IF NOT EXISTS styles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  manual_rules TEXT,
  inferred_rules TEXT,
  analysis_frequency TEXT NOT NULL DEFAULT 'daily',
  last_analyzed TEXT,
  highlight_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_styles_enabled ON styles(is_enabled);
```

### 3.2 Highlights Table

Add migration: `app/src/bun/migrations/app/006_create_highlights.sql`

```sql
CREATE TABLE IF NOT EXISTS highlights (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  style_id TEXT NOT NULL,
  selected_text TEXT NOT NULL,
  start_char INTEGER NOT NULL,
  end_char INTEGER NOT NULL,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('like', 'dislike')),
  user_note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (style_id) REFERENCES styles(id) ON DELETE CASCADE,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

CREATE INDEX idx_highlights_style ON highlights(style_id, created_at DESC);
CREATE INDEX idx_highlights_chat ON highlights(chat_id);
CREATE INDEX idx_highlights_message ON highlights(message_id);
CREATE INDEX idx_highlights_sentiment ON highlights(style_id, sentiment);
```

### 3.3 Analysis Jobs Table

Optional, for tracking scheduled analysis:

```sql
CREATE TABLE IF NOT EXISTS analysis_jobs (
  id TEXT PRIMARY KEY,
  style_id TEXT NOT NULL UNIQUE,
  last_run TEXT,
  next_run TEXT NOT NULL,
  new_highlights_count INTEGER DEFAULT 0,
  is_running INTEGER DEFAULT 0,
  FOREIGN KEY (style_id) REFERENCES styles(id) ON DELETE CASCADE
);

CREATE INDEX idx_analysis_jobs_next_run ON analysis_jobs(next_run);
```

---

## 4. Style Management

### 4.1 StyleStore Class

```typescript
// lib/stores/style-store.ts

import { Database } from 'bun:sqlite'
import { Result, AppError, logger, Errors } from '../core'
import type { Style, StyleId, Highlight, AnalysisFrequency } from '../core/types'
import { generateId } from '../core/types'

export class StyleStore {
  constructor(private db: Database) {}

  /**
   * List all styles
   */
  async listStyles(): Promise<Style[]> {
    try {
      const rows = this.db.query(`
        SELECT * FROM styles ORDER BY updated_at DESC
      `).all() as any[]

      return rows.map(row => this.rowToStyle(row))
    } catch (error) {
      logger.error('Failed to list styles', error as Error)
      throw Errors.db.queryFailed('SELECT * FROM styles', error as Error)
    }
  }

  /**
   * Get style by ID
   */
  async getStyle(id: StyleId): Promise<Result<Style>> {
    try {
      const row = this.db.query(
        'SELECT * FROM styles WHERE id = ?'
      ).get(id) as any

      if (!row) {
        return Result.err(Errors.db.notFound('styles', id))
      }

      return Result.ok(this.rowToStyle(row))
    } catch (error) {
      return Result.err(Errors.db.queryFailed('SELECT * FROM styles WHERE id = ?', error as Error))
    }
  }

  /**
   * Create new style
   */
  async createStyle(data: {
    name: string
    description?: string
    manualRules?: string
    analysisFrequency?: AnalysisFrequency
  }): Promise<Result<Style>> {
    if (!data.name || data.name.trim() === '') {
      return Result.err(Errors.validation.required('name'))
    }

    try {
      const id = generateId() as StyleId
      const now = new Date().toISOString()

      this.db.query(`
        INSERT INTO styles (id, name, description, manual_rules, analysis_frequency, is_enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.name,
        data.description || null,
        data.manualRules || null,
        data.analysisFrequency || 'daily',
        1,
        now,
        now
      )

      return Result.ok({
        id,
        name: data.name,
        description: data.description,
        isEnabled: true,
        manualRules: data.manualRules,
        analysisFrequency: data.analysisFrequency || 'daily',
        highlightCount: 0,
        createdAt: now,
        updatedAt: now
      } as Style)
    } catch (error) {
      return Result.err(Errors.db.queryFailed('INSERT INTO styles', error as Error))
    }
  }

  /**
   * Update style
   */
  async updateStyle(
    id: StyleId,
    updates: Partial<Style>
  ): Promise<Result<Style>> {
    try {
      const now = new Date().toISOString()
      const setClauses: string[] = []
      const values: unknown[] = []

      for (const [key, value] of Object.entries(updates)) {
        if (['id', 'createdAt'].includes(key)) continue

        const colName = this.camelToSnake(key)
        setClauses.push(`${colName} = ?`)
        values.push(value)
      }

      setClauses.push('updated_at = ?')
      values.push(now)
      values.push(id)

      const query = `UPDATE styles SET ${setClauses.join(', ')} WHERE id = ?`
      this.db.query(query).run(...values)

      const result = await this.getStyle(id)
      return result
    } catch (error) {
      return Result.err(Errors.db.queryFailed('UPDATE styles', error as Error))
    }
  }

  /**
   * Delete style
   */
  async deleteStyle(id: StyleId): Promise<Result<boolean>> {
    try {
      this.db.query('DELETE FROM styles WHERE id = ?').run(id)
      return Result.ok(true)
    } catch (error) {
      return Result.err(Errors.db.queryFailed('DELETE FROM styles', error as Error))
    }
  }

  /**
   * Toggle style visibility
   */
  async toggleStyle(id: StyleId): Promise<Result<Style>> {
    try {
      const style = await this.getStyle(id)
      if (!style.ok) return style

      return this.updateStyle(id, { isEnabled: !style.value.isEnabled } as any)
    } catch (error) {
      return Result.err(Errors.db.queryFailed('UPDATE styles', error as Error))
    }
  }

  /**
   * Create highlight
   */
  async createHighlight(data: {
    messageId: string
    chatId: string
    styleId: StyleId
    selectedText: string
    startChar: number
    endChar: number
    sentiment: 'like' | 'dislike'
    userNote?: string
  }): Promise<Result<Highlight>> {
    try {
      const id = generateId()
      const now = new Date().toISOString()

      this.db.query(`
        INSERT INTO highlights (
          id, message_id, chat_id, style_id, selected_text,
          start_char, end_char, sentiment, user_note, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.messageId,
        data.chatId,
        data.styleId,
        data.selectedText,
        data.startChar,
        data.endChar,
        data.sentiment,
        data.userNote || null,
        now
      )

      // Increment style highlight count
      this.db.query(`
        UPDATE styles SET highlight_count = highlight_count + 1 WHERE id = ?
      `).run(data.styleId)

      return Result.ok({
        id,
        messageId: data.messageId,
        chatId: data.chatId,
        styleId: data.styleId,
        selectedText: data.selectedText,
        startChar: data.startChar,
        endChar: data.endChar,
        sentiment: data.sentiment,
        userNote: data.userNote,
        createdAt: now
      } as Highlight)
    } catch (error) {
      return Result.err(Errors.db.queryFailed('INSERT INTO highlights', error as Error))
    }
  }

  /**
   * Get highlights for a style
   */
  async getStyleHighlights(styleId: StyleId): Promise<Highlight[]> {
    try {
      const rows = this.db.query(`
        SELECT * FROM highlights WHERE style_id = ? ORDER BY created_at DESC
      `).all(styleId) as any[]

      return rows.map(row => this.rowToHighlight(row))
    } catch (error) {
      logger.error('Failed to get highlights', error as Error)
      return []
    }
  }

  /**
   * Get highlights added since last analysis
   */
  async getNewHighlights(styleId: StyleId, since: string): Promise<Highlight[]> {
    try {
      const rows = this.db.query(`
        SELECT * FROM highlights
        WHERE style_id = ? AND created_at > ?
        ORDER BY created_at DESC
      `).all(styleId, since) as any[]

      return rows.map(row => this.rowToHighlight(row))
    } catch (error) {
      logger.error('Failed to get new highlights', error as Error)
      return []
    }
  }

  /**
   * Delete highlight
   */
  async deleteHighlight(id: string): Promise<Result<boolean>> {
    try {
      // Get highlight first to decrement style count
      const row = this.db.query('SELECT style_id FROM highlights WHERE id = ?').get(id) as any
      if (row) {
        this.db.query('UPDATE styles SET highlight_count = highlight_count - 1 WHERE id = ?').run(row.style_id)
      }

      this.db.query('DELETE FROM highlights WHERE id = ?').run(id)
      return Result.ok(true)
    } catch (error) {
      return Result.err(Errors.db.queryFailed('DELETE FROM highlights', error as Error))
    }
  }

  private rowToStyle(row: any): Style {
    return {
      id: row.id as StyleId,
      name: row.name,
      description: row.description,
      isEnabled: !!row.is_enabled,
      manualRules: row.manual_rules,
      inferredRules: row.inferred_rules,
      analysisFrequency: row.analysis_frequency as AnalysisFrequency,
      lastAnalyzed: row.last_analyzed,
      highlightCount: row.highlight_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private rowToHighlight(row: any): Highlight {
    return {
      id: row.id,
      messageId: row.message_id,
      chatId: row.chat_id,
      styleId: row.style_id as StyleId,
      selectedText: row.selected_text,
      startChar: row.start_char,
      endChar: row.end_char,
      sentiment: row.sentiment,
      userNote: row.user_note,
      createdAt: row.created_at
    }
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
  }
}
```

---

## 5. Highlighting & Feedback

### 5.1 Highlight Detection in Message Display

**Component**: `src/mainview/components/message/MessageBody.tsx` (modified)

When highlighting is enabled globally:
- User selects text in a message response
- Context menu or inline UI appears: "Like" | "Dislike" | [optional note field]
- Quick feedback submission → highlight stored with active style

```typescript
interface MessageBodyProps {
  content: string
  messageId: string
  chatId: string
  highlightingEnabled: boolean
  activeStyle?: Style
}

export const MessageBody: React.FC<MessageBodyProps> = ({
  content,
  messageId,
  chatId,
  highlightingEnabled,
  activeStyle
}) => {
  const [selectedText, setSelectedText] = useState<{
    text: string
    startChar: number
    endChar: number
  } | null>(null)

  const handleTextSelection = () => {
    if (!highlightingEnabled || !activeStyle) return

    const selection = window.getSelection()
    if (!selection || selection.toString().length === 0) return

    const range = selection.getRangeAt(0)
    const preCaretRange = range.cloneRange()
    preCaretRange.selectNodeContents(document.currentScript?.parentElement || document.body)
    preCaretRange.setEnd(range.endContainer, range.endOffset)

    const startChar = preCaretRange.toString().length - selection.toString().length
    const endChar = startChar + selection.toString().length

    setSelectedText({
      text: selection.toString(),
      startChar,
      endChar
    })
  }

  const handleFeedback = async (sentiment: 'like' | 'dislike', note?: string) => {
    if (!selectedText || !activeStyle) return

    const result = await commBridge.createHighlight({
      messageId,
      chatId,
      styleId: activeStyle.id,
      selectedText: selectedText.text,
      startChar: selectedText.startChar,
      endChar: selectedText.endChar,
      sentiment,
      userNote: note
    })

    if (result.ok) {
      setSelectedText(null)
      showFeedback('Feedback saved')
    }
  }

  return (
    <div
      className="message-body"
      onMouseUp={handleTextSelection}
      onTouchEnd={handleTextSelection}
    >
      {content}

      {selectedText && (
        <HighlightFeedbackPopup
          text={selectedText.text}
          style={activeStyle}
          onLike={(note) => handleFeedback('like', note)}
          onDislike={(note) => handleFeedback('dislike', note)}
          onCancel={() => setSelectedText(null)}
        />
      )}
    </div>
  )
}
```

### 5.2 Feedback Popup Component

**Component**: `src/mainview/components/message/HighlightFeedbackPopup.tsx`

```
┌─────────────────────────────────────────┐
│ Selected text preview...                 │
├─────────────────────────────────────────┤
│                                         │
│ Adding feedback to: {{style-name}}      │
│                                         │
│ [👍 Like]  [👎 Dislike]  [Cancel]      │
│                                         │
│ Optional note:                          │
│ ┌─────────────────────────────────────┐│
│ │ (why you liked/disliked it)         ││
│ └─────────────────────────────────────┘│
│                                         │
│              [Save Feedback]            │
│                                         │
└─────────────────────────────────────────┘
```

---

## 6. Analysis Engine

### 6.1 Highlight Analysis

```typescript
// lib/highlights/analyzer.ts

import { logger } from '../core'
import { StyleStore } from '../stores/style-store'
import { httpClient } from '../core/http-client'
import type { Highlight, AnalysisResult } from '../core/types'

export class HighlightAnalyzer {
  constructor(private styleStore: StyleStore) {}

  /**
   * Analyze highlights for a style and generate markdown rules
   */
  async analyzeStyle(styleId: string): Promise<AnalysisResult> {
    try {
      const highlights = await this.styleStore.getStyleHighlights(styleId as any)

      if (highlights.length === 0) {
        return {
          styleId: styleId as any,
          rules: '(No highlights yet to analyze)',
          highlights: { liked: [], disliked: [] },
          patterns: [],
          timestamp: new Date().toISOString()
        }
      }

      // Separate liked and disliked
      const liked = highlights.filter(h => h.sentiment === 'like')
      const disliked = highlights.filter(h => h.sentiment === 'dislike')

      // Analyze patterns using Claude
      const patterns = await this.identifyPatterns(liked, disliked)

      // Generate markdown style guide from patterns
      const rules = this.generateStyleGuide(patterns)

      // Update style with inferred rules
      await this.styleStore.updateStyle(styleId as any, {
        inferredRules: rules,
        lastAnalyzed: new Date().toISOString()
      } as any)

      return {
        styleId: styleId as any,
        rules,
        highlights: { liked, disliked },
        patterns,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      logger.error(`Failed to analyze style: ${styleId}`, error as Error)
      throw error
    }
  }

  /**
   * Use AI to identify patterns in highlights
   */
  private async identifyPatterns(
    liked: Highlight[],
    disliked: Highlight[]
  ): Promise<Array<{ description: string; examples: string[] }>> {
    // Group highlights by theme (markdown formatting categories)
    const themes = this.categorizeHighlights(liked, disliked)

    return themes.map(theme => ({
      description: theme.name,
      examples: theme.examples
    }))
  }

  /**
   * Categorize highlights by markdown formatting theme
   */
  private categorizeHighlights(
    liked: Highlight[],
    disliked: Highlight[]
  ): Array<{ name: string; examples: string[] }> {
    const themes: Map<string, string[]> = new Map()

    // Analyze liked highlights for patterns
    for (const highlight of liked) {
      const theme = this.detectTheme(highlight.selectedText)
      if (theme) {
        if (!themes.has(theme)) themes.set(theme, [])
        themes.get(theme)!.push(`✓ ${highlight.selectedText.slice(0, 50)}`)
      }
    }

    // Analyze disliked highlights for anti-patterns
    for (const highlight of disliked) {
      const theme = this.detectTheme(highlight.selectedText)
      if (theme) {
        if (!themes.has(theme)) themes.set(theme, [])
        themes.get(theme)!.push(`✗ ${highlight.selectedText.slice(0, 50)}`)
      }
    }

    return Array.from(themes.entries()).map(([name, examples]) => ({
      name,
      examples
    }))
  }

  /**
   * Detect markdown formatting theme in text
   */
  private detectTheme(text: string): string | null {
    if (text.includes('**') || text.includes('__')) return 'Bold emphasis'
    if (text.includes('*') || text.includes('_')) return 'Italic emphasis'
    if (text.includes('```')) return 'Code blocks'
    if (text.includes('`')) return 'Inline code'
    if (text.includes('- ') || text.includes('• ')) return 'Bullet lists'
    if (text.match(/^\d+\. /)) return 'Numbered lists'
    if (text.includes('# ')) return 'Headings'
    if (text.includes('[')) return 'Links'
    if (text.includes('> ')) return 'Quotes'
    return null
  }

  /**
   * Generate markdown style guide from patterns
   */
  private generateStyleGuide(
    patterns: Array<{ description: string; examples: string[] }>
  ): string {
    if (patterns.length === 0) {
      return 'MARKDOWN STYLE RULES:\n(Not enough data yet. Keep highlighting examples!)'
    }

    let guide = 'MARKDOWN STYLE RULES:\n\n'

    for (const pattern of patterns) {
      guide += `${pattern.description}:\n`
      for (const example of pattern.examples.slice(0, 3)) {
        guide += `  ${example}\n`
      }
      guide += '\n'
    }

    return guide
  }
}
```

### 6.2 Analysis Scheduling

```typescript
// lib/highlights/analysis-scheduler.ts

import { logger } from '../core'
import { StyleStore } from '../stores/style-store'
import { HighlightAnalyzer } from './analyzer'
import type { AnalysisFrequency } from '../core/types'

export class AnalysisScheduler {
  private timers: Map<string, NodeJS.Timer> = new Map()

  constructor(
    private styleStore: StyleStore,
    private analyzer: HighlightAnalyzer
  ) {}

  /**
   * Start analysis scheduler
   */
  async startScheduler(): Promise<void> {
    const styles = await this.styleStore.listStyles()

    for (const style of styles) {
      this.scheduleStyle(style.id)
    }

    logger.info('Analysis scheduler started', { styles: styles.length })
  }

  /**
   * Schedule analysis for a style based on frequency
   */
  scheduleStyle(styleId: string): void {
    // Clear existing timer if any
    const existingTimer = this.timers.get(styleId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Calculate next run time
    const nextRun = this.calculateNextRun(styleId)
    const delayMs = Math.max(0, nextRun.getTime() - Date.now())

    // Schedule analysis
    const timer = setTimeout(async () => {
      const styleResult = await this.styleStore.getStyle(styleId as any)
      if (!styleResult.ok) {
        logger.warn(`Style not found: ${styleId}`)
        return
      }

      const style = styleResult.value

      // Check if there are new highlights since last analysis
      if (!style.lastAnalyzed) {
        // Never analyzed, run it
        await this.runAnalysis(styleId)
      } else {
        const newHighlights = await this.styleStore.getNewHighlights(
          styleId as any,
          style.lastAnalyzed
        )

        if (newHighlights.length > 0) {
          await this.runAnalysis(styleId)
        } else {
          logger.debug(`No new highlights for style: ${styleId}, skipping analysis`)
        }
      }

      // Reschedule
      this.scheduleStyle(styleId)
    }, delayMs)

    this.timers.set(styleId, timer)
  }

  /**
   * Run analysis immediately
   */
  async runAnalysis(styleId: string): Promise<void> {
    try {
      logger.info(`Running analysis for style: ${styleId}`)
      await this.analyzer.analyzeStyle(styleId)
    } catch (error) {
      logger.error(`Analysis failed for style: ${styleId}`, error as Error)
    }
  }

  /**
   * Calculate next run time based on frequency
   */
  private calculateNextRun(styleId: string): Date {
    // This would fetch the frequency from the style
    // and calculate accordingly
    const now = new Date()

    // For now, default to 24h
    return new Date(now.getTime() + 24 * 60 * 60 * 1000)
  }

  /**
   * Stop scheduler
   */
  stopScheduler(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.timers.clear()
  }
}
```

---

## 7. Settings UI

### 7.1 Styles Settings Page

**Component**: `src/mainview/components/settings/StylesTab.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│ Settings > Markdown Styles                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ What are Markdown Styles?                                   │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Styles teach the AI your preferred markdown formatting.  ││
│ │ You highlight text you like or dislike, and over time    ││
│ │ the system learns your preferences for:                  ││
│ │ - Lists (bullets vs numbers vs dashes)                   ││
│ │ - Code formatting (inline vs blocks)                     ││
│ │ - Emphasis markers (bold, italic, etc)                   ││
│ │ - Heading structure, paragraph length, and more          ││
│ │                                                           ││
│ │ Styles do NOT change personality or behavior.            ││
│ │ They only affect how the AI formats its response.        ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ [+ Create New Style]                                        │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ GLOBAL SETTINGS                                          ││
│ ├──────────────────────────────────────────────────────────┤│
│ │ ☑ Enable highlighting in chat                            ││
│ │   (ability to like/dislike text in responses)            ││
│ │                                                           ││
│ │ Auto-inject active style into system prompt:             ││
│ │ ☑ Enabled                                                ││
│ │   (disable if you want to review rules before using)     ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ MY STYLES                                                ││
│ ├──────────────────────────────────────────────────────────┤│
│ │                                                           ││
│ │ [☑] RP Style                     [v]                     ││
│ │     10 highlights collected                              ││
│ │     [View] [Edit] [Analyze] [Delete]                    ││
│ │                                                           ││
│ │ [☑] Technical Writing            [v]                     ││
│ │     24 highlights collected                              ││
│ │     [View] [Edit] [Analyze] [Delete]                    ││
│ │                                                           ││
│ │ [☐] Old Style (archived)         [v]                     ││
│ │     Disabled - hidden from chat dropdown                 ││
│ │     [View] [Edit] [Enable] [Delete]                     ││
│ │                                                           ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Style Detail View

**Component**: `src/mainview/components/settings/StyleDetail.tsx`

```
┌──────────────────────────────────────────────────────────────┐
│ RP Style                                           [<] [X]   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ Description:                                                  │
│ ┌────────────────────────────────────────────────────────────┐│
│ │ Guidelines for roleplaying responses                       ││
│ └────────────────────────────────────────────────────────────┘│
│                                                               │
│ MANUAL RULES (Edit these directly)                            │
│ ┌────────────────────────────────────────────────────────────┐│
│ │ MARKDOWN STYLE RULES:                                       ││
│ │                                                             ││
│ │ Lists:                                                      ││
│ │ - Use bullet points for dialogue options                   ││
│ │ - Avoid dashes in narrative sections                       ││
│ │                                                             ││
│ │ Code:                                                       ││
│ │ - Use `inline code` sparingly in RP                        ││
│ │ - No code blocks unless absolutely necessary               ││
│ │                                                             ││
│ │ Emphasis:                                                   ││
│ │ - Use italics for thoughts (*like this*)                   ││
│ │ - Use bold for important actions                           ││
│ │ - Avoid nested emphasis                                    ││
│ │                                                             ││
│ │ [Save Manual Rules]                                        ││
│ └────────────────────────────────────────────────────────────┘│
│                                                               │
│ INFERRED RULES (Auto-generated from your highlights)         │
│ ┌────────────────────────────────────────────────────────────┐│
│ │ Last analyzed: 2 hours ago                                 ││
│ │                                                             ││
│ │ MARKDOWN STYLE RULES:                                       ││
│ │                                                             ││
│ │ Bold emphasis:                                              ││
│ │   ✓ **important action**                                   ││
│ │   ✗ **every other word**                                   ││
│ │                                                             ││
│ │ Italic emphasis:                                            ││
│ │   ✓ *character thought*                                    ││
│ │   ✓ *emotional reaction*                                   ││
│ │                                                             ││
│ │ Lists:                                                      ││
│ │   ✓ - Option 1                                             ││
│ │   ✗ 1. Numbered lists                                      ││
│ │                                                             ││
│ │                                                             ││
│ │              [Force Re-analyze Now]                        ││
│ └────────────────────────────────────────────────────────────┘│
│                                                               │
│ ANALYSIS SETTINGS                                             │
│ Frequency: [Daily v]                                         │
│            (check for new highlights every 24h)             │
│                                                               │
│ ☑ Auto-analyze when new highlights added                     │
│   (only re-analyze if new data since last run)              │
│                                                               │
│ [Analyze Now]                                                │
│                                                               │
│ HIGHLIGHTS COLLECTED                                          │
│ 10 total  (8 liked, 2 disliked)                              │
│                                                               │
│ [View All Highlights]                                        │
│                                                               │
│                           [Save] [Delete Style]              │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 7.3 Create New Style Dialog

```
┌────────────────────────────────────────────────────────┐
│ Create New Markdown Style                      [X]     │
├────────────────────────────────────────────────────────┤
│                                                         │
│ Style Name                                             │
│ ┌─────────────────────────────────────────────────────┐│
│ │ RP Style                                            ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Description (optional)                                 │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Guidelines for roleplaying and narrative responses  ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ How to define rules?                                   │
│ ◉ Start with examples (highlight as I chat)           │
│   (recommended: collect 5-10 examples first)           │
│                                                         │
│ ○ Write manual rules now                              │
│   (paste or type markdown style guide)                │
│   ┌─────────────────────────────────────────────────┐│
│   │                                                 ││
│   │ (manual rules text)                             ││
│   │                                                 ││
│   └─────────────────────────────────────────────────┘│
│                                                         │
│ Analysis Frequency                                     │
│ [Per-message v]  (analyze after each message)         │
│                  (good for fast iteration)            │
│                                                         │
│                       [Cancel] [Create Style]         │
│                                                         │
└────────────────────────────────────────────────────────┘
```

---

## 8. Chat Integration

### 8.1 Style Selection in Chat

**Component**: `src/mainview/components/chat/ChatView.tsx` (modified)

Add style selector similar to Reasoning toggle:

```
┌─────────────────────────────────┐
│ Style: [Off ▼]                  │
│        [RP Style]               │
│        [Technical]              │
│        [Off] ← current          │
└─────────────────────────────────┘
```

Or as toggle buttons:

```
┌──────────────────────────────────────────┐
│ [RP Style] [Technical] [Off - Active] [⚙] │
└──────────────────────────────────────────┘
```

### 8.2 Active Style Display

Show user which style is active:

```
User is chatting with "Claude"
Active style: RP Style
(markdown formatting will follow RP Style guidelines)
```

---

## 9. Prompt Injection

### 9.1 System Prompt Modification

When a user sends a message with a style enabled:

```typescript
// In chat send handler

async function sendMessage(
  content: string,
  activeStyle?: Style
): Promise<void> {
  // Base system prompt (unchanged)
  let systemPrompt = DEFAULT_SYSTEM_PROMPT

  // Inject active style if enabled
  if (activeStyle && autoInjectEnabled) {
    const stylRules = activeStyle.inferredRules || activeStyle.manualRules

    if (styleRules) {
      systemPrompt += `\n\n${styleRules}`
    }
  }

  // Send message with injected system prompt
  const response = await commBridge.chatStream({
    messages: [...previousMessages, { role: 'user', content }],
    systemPrompt,
    model,
    // ... other options
  })
}
```

### 9.2 Example Injection

Before:
```
You are Claude, a helpful AI assistant.
...
```

After (with RP Style enabled):
```
You are Claude, a helpful AI assistant.
...

MARKDOWN STYLE RULES:

Lists:
- Use bullet points (•) for unordered lists in narrative sections
- Use numbered (1. 2. 3.) for step-by-step instructions
- Avoid dashes (-) for lists

[... rest of rules ...]
```

---

## 10. Error Handling

### 10.1 Common Errors

- **Style not found**: Return 404, handle gracefully
- **Analysis failed**: Log error, keep previous rules, notify user
- **Highlight creation failed**: Show error, allow retry
- **No highlights to analyze**: Return friendly message ("Keep highlighting examples")

### 10.2 User Feedback

- "Feedback saved" when highlight created
- "Style updated" when rules analyzed
- "No new highlights since last run, skipping analysis" when appropriate
- "Analysis in progress..." when running

---

## 11. WebSocket Handlers

### 11.1 Style Handlers

```typescript
// lib/ws/handlers/style.ts

export const styleHandlers = {
  'style:list': async (req: WSRequest): Promise<WSResponse> => {
    // Get all styles
  },

  'style:create': async (req: WSRequest): Promise<WSResponse> => {
    // Create new style
  },

  'style:update': async (req: WSRequest): Promise<WSResponse> => {
    // Update style rules or settings
  },

  'style:delete': async (req: WSRequest): Promise<WSResponse> => {
    // Delete style
  },

  'style:toggle': async (req: WSRequest): Promise<WSResponse> => {
    // Enable/disable style (show/hide in UI)
  },

  'highlight:create': async (req: WSRequest): Promise<WSResponse> => {
    // Create highlight from chat
  },

  'highlight:delete': async (req: WSRequest): Promise<WSResponse> => {
    // Delete a highlight
  },

  'style:analyze': async (req: WSRequest): Promise<WSResponse> => {
    // Manually trigger analysis for a style
  },

  'style:highlights': async (req: WSRequest): Promise<WSResponse> => {
    // Get all highlights for a style (for viewing/reviewing)
  }
}
```

---

*End of Highlight Feedback & Markdown Style Profiles specification.*

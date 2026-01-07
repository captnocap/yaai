-- Up

-- =============================================================================
-- RESEARCH SESSIONS
-- =============================================================================
-- Main research session table storing query, config, stats, and status

CREATE TABLE IF NOT EXISTS research_sessions (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  depth_profile TEXT NOT NULL CHECK (depth_profile IN ('light', 'general', 'exhaustive')),
  status TEXT NOT NULL DEFAULT 'idle'
    CHECK (status IN ('idle', 'initializing', 'scouting', 'reading', 'synthesizing', 'paused', 'completed', 'failed')),

  -- JSON fields
  config TEXT NOT NULL,      -- ResearchConfig JSON
  guidance TEXT NOT NULL DEFAULT '{"userNotes":[],"blockedDomains":[],"preferredDomains":[],"learnedPatterns":[]}',
  stats TEXT NOT NULL,       -- ResearchStats JSON

  -- Chat integration (optional)
  chat_id TEXT REFERENCES chats(id) ON DELETE SET NULL,
  message_id TEXT,

  -- Error info
  error TEXT,

  -- Timestamps (ISO 8601 strings)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_research_sessions_status ON research_sessions(status);
CREATE INDEX IF NOT EXISTS idx_research_sessions_chat_id ON research_sessions(chat_id);
CREATE INDEX IF NOT EXISTS idx_research_sessions_created_at ON research_sessions(created_at DESC);

-- =============================================================================
-- RESEARCH SOURCES
-- =============================================================================
-- Discovered sources (URLs) with state, scores, and content

CREATE TABLE IF NOT EXISTS research_sources (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,

  -- Basic info
  url TEXT NOT NULL,
  title TEXT,
  domain TEXT NOT NULL,
  path TEXT,
  favicon TEXT,
  thumbnail TEXT,
  snippet TEXT,

  -- Metadata
  source_type TEXT DEFAULT 'unknown'
    CHECK (source_type IN ('article', 'paper', 'documentation', 'forum', 'news', 'blog', 'video', 'unknown')),
  published_at TEXT,
  author TEXT,
  bias TEXT DEFAULT 'unknown'
    CHECK (bias IN ('left', 'center-left', 'center', 'center-right', 'right', 'unknown')),

  -- State
  state TEXT NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'approved', 'reading', 'complete', 'rejected', 'failed')),
  state_changed_at TEXT NOT NULL DEFAULT (datetime('now')),

  -- Attribution
  discovered_by TEXT,
  read_by TEXT,

  -- Provider info (for multi-provider search)
  providers TEXT DEFAULT '[]',  -- JSON array: ['linkup'], ['tavily'], ['linkup', 'tavily']

  -- Scoring (0-1 scale)
  relevance_score REAL DEFAULT 0.5,
  credibility_score REAL DEFAULT 0.5,
  freshness_score REAL DEFAULT 0.5,
  provider_boost REAL DEFAULT 0.0,  -- Boost if found by multiple providers

  -- Reading progress
  read_progress REAL DEFAULT 0,
  read_stage TEXT CHECK (read_stage IS NULL OR read_stage IN ('fetching', 'parsing', 'extracting', 'complete')),

  -- Results
  content TEXT,               -- Scraped content (markdown)
  read_time_ms INTEGER,
  token_count INTEGER,

  -- User feedback
  user_comment TEXT,
  rejection_reason TEXT,

  -- Error
  error TEXT,

  -- Timestamps
  discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_research_sources_session_id ON research_sources(session_id);
CREATE INDEX IF NOT EXISTS idx_research_sources_state ON research_sources(state);
CREATE INDEX IF NOT EXISTS idx_research_sources_domain ON research_sources(domain);
CREATE INDEX IF NOT EXISTS idx_research_sources_url ON research_sources(url);

-- =============================================================================
-- RESEARCH FINDINGS
-- =============================================================================
-- Extracted claims/facts from sources

CREATE TABLE IF NOT EXISTS research_findings (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES research_sources(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,

  -- Content
  content TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN ('statistic', 'claim', 'quote', 'definition', 'methodology', 'conclusion', 'background', 'example')),

  -- Quality (0-1 scale)
  confidence REAL DEFAULT 0.5,
  importance REAL DEFAULT 0.5,

  -- Source reference
  page_number INTEGER,
  paragraph INTEGER,
  original_text TEXT,

  -- Timestamp
  extracted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_research_findings_source_id ON research_findings(source_id);
CREATE INDEX IF NOT EXISTS idx_research_findings_session_id ON research_findings(session_id);
CREATE INDEX IF NOT EXISTS idx_research_findings_category ON research_findings(category);

-- =============================================================================
-- RESEARCH CONTRADICTIONS
-- =============================================================================
-- Detected conflicts between findings

CREATE TABLE IF NOT EXISTS research_contradictions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,

  -- Claims (JSON with findingId, sourceId, text, sourceTitle, etc.)
  claim_a TEXT NOT NULL,
  claim_b TEXT NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'unresolved'
    CHECK (status IN ('unresolved', 'resolved', 'dismissed')),

  -- Resolution (JSON if resolved)
  resolution TEXT,

  -- Metadata
  topic TEXT,
  severity TEXT DEFAULT 'moderate' CHECK (severity IN ('minor', 'moderate', 'major')),

  -- Timestamp
  detected_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_research_contradictions_session_id ON research_contradictions(session_id);
CREATE INDEX IF NOT EXISTS idx_research_contradictions_status ON research_contradictions(status);

-- =============================================================================
-- RESEARCH REPORTS
-- =============================================================================
-- Final synthesized reports

CREATE TABLE IF NOT EXISTS research_reports (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE REFERENCES research_sessions(id) ON DELETE CASCADE,

  -- Header
  title TEXT NOT NULL,
  subtitle TEXT,
  summary TEXT,

  -- Table of contents (JSON array)
  table_of_contents TEXT DEFAULT '[]',

  -- Stats
  total_word_count INTEGER DEFAULT 0,
  total_citations INTEGER DEFAULT 0,
  total_contradictions INTEGER DEFAULT 0,

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_research_reports_session_id ON research_reports(session_id);

-- =============================================================================
-- RESEARCH REPORT SECTIONS
-- =============================================================================
-- Individual sections of the report

CREATE TABLE IF NOT EXISTS research_report_sections (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES research_reports(id) ON DELETE CASCADE,

  -- Structure
  section_order INTEGER NOT NULL,
  level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 3),
  title TEXT NOT NULL,

  -- Content
  content TEXT,
  summary TEXT,

  -- References (JSON arrays)
  citations TEXT DEFAULT '[]',
  contradictions TEXT DEFAULT '[]',

  -- Stats
  word_count INTEGER DEFAULT 0,
  findings_used INTEGER DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'complete')),

  -- Timestamp
  generated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_research_report_sections_report_id ON research_report_sections(report_id);
CREATE INDEX IF NOT EXISTS idx_research_report_sections_order ON research_report_sections(report_id, section_order);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update session timestamp when session is modified
CREATE TRIGGER IF NOT EXISTS research_session_updated
AFTER UPDATE ON research_sessions
BEGIN
  UPDATE research_sessions SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Update report timestamp when report is modified
CREATE TRIGGER IF NOT EXISTS research_report_updated
AFTER UPDATE ON research_reports
BEGIN
  UPDATE research_reports SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Down

DROP TRIGGER IF EXISTS research_report_updated;
DROP TRIGGER IF EXISTS research_session_updated;

DROP INDEX IF EXISTS idx_research_report_sections_order;
DROP INDEX IF EXISTS idx_research_report_sections_report_id;
DROP TABLE IF EXISTS research_report_sections;

DROP INDEX IF EXISTS idx_research_reports_session_id;
DROP TABLE IF EXISTS research_reports;

DROP INDEX IF EXISTS idx_research_contradictions_status;
DROP INDEX IF EXISTS idx_research_contradictions_session_id;
DROP TABLE IF EXISTS research_contradictions;

DROP INDEX IF EXISTS idx_research_findings_category;
DROP INDEX IF EXISTS idx_research_findings_session_id;
DROP INDEX IF EXISTS idx_research_findings_source_id;
DROP TABLE IF EXISTS research_findings;

DROP INDEX IF EXISTS idx_research_sources_url;
DROP INDEX IF EXISTS idx_research_sources_domain;
DROP INDEX IF EXISTS idx_research_sources_state;
DROP INDEX IF EXISTS idx_research_sources_session_id;
DROP TABLE IF EXISTS research_sources;

DROP INDEX IF EXISTS idx_research_sessions_created_at;
DROP INDEX IF EXISTS idx_research_sessions_chat_id;
DROP INDEX IF EXISTS idx_research_sessions_status;
DROP TABLE IF EXISTS research_sessions;

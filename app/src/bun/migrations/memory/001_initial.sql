-- Up

-- =============================================================================
-- L1: RIVER - Sliding window buffer (persisted for recovery)
-- =============================================================================
CREATE TABLE IF NOT EXISTS l1_river (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  evicted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_l1_chat_id ON l1_river(chat_id);
CREATE INDEX IF NOT EXISTS idx_l1_timestamp ON l1_river(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_l1_evicted ON l1_river(evicted_at);
CREATE INDEX IF NOT EXISTS idx_l1_message_id ON l1_river(message_id);

-- =============================================================================
-- L2: FEELING - Affective state index
-- =============================================================================
CREATE TABLE IF NOT EXISTS l2_affect (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  affect_category TEXT NOT NULL
    CHECK (affect_category IN ('FRUSTRATED', 'CONFUSED', 'CURIOUS', 'SATISFIED', 'URGENT', 'REFLECTIVE')),
  intensity REAL NOT NULL CHECK (intensity >= 0.0 AND intensity <= 1.0),
  reasoning TEXT,
  decay_factor REAL NOT NULL DEFAULT 1.0,
  is_muted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_accessed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_l2_chat_id ON l2_affect(chat_id);
CREATE INDEX IF NOT EXISTS idx_l2_category ON l2_affect(affect_category);
CREATE INDEX IF NOT EXISTS idx_l2_intensity ON l2_affect(intensity DESC);
CREATE INDEX IF NOT EXISTS idx_l2_decay ON l2_affect(decay_factor);
CREATE INDEX IF NOT EXISTS idx_l2_message_id ON l2_affect(message_id);
CREATE INDEX IF NOT EXISTS idx_l2_muted ON l2_affect(is_muted);

-- =============================================================================
-- L3: ECHO - Redundant encoding (vector + lexical + graph)
-- =============================================================================

-- L3.1 - Vector embeddings
CREATE TABLE IF NOT EXISTS l3_vectors (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  embedding_blob BLOB NOT NULL,
  embedding_model TEXT NOT NULL,
  dimensions INTEGER NOT NULL,
  boost_factor REAL NOT NULL DEFAULT 1.0,
  is_muted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_l3_vectors_chat_id ON l3_vectors(chat_id);
CREATE INDEX IF NOT EXISTS idx_l3_vectors_message_id ON l3_vectors(message_id);
CREATE INDEX IF NOT EXISTS idx_l3_vectors_model ON l3_vectors(embedding_model);
CREATE INDEX IF NOT EXISTS idx_l3_vectors_content_hash ON l3_vectors(content_hash);
CREATE INDEX IF NOT EXISTS idx_l3_vectors_muted ON l3_vectors(is_muted);

-- L3.2 - Lexical FTS5
CREATE VIRTUAL TABLE IF NOT EXISTS l3_lexical_fts USING fts5(
  content,
  chat_id UNINDEXED,
  message_id UNINDEXED,
  tokenize='porter unicode61'
);

-- L3.2b - Lexical metadata (for muting/boosting)
CREATE TABLE IF NOT EXISTS l3_lexical_meta (
  message_id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  boost_factor REAL NOT NULL DEFAULT 1.0,
  is_muted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_l3_lexical_meta_chat_id ON l3_lexical_meta(chat_id);
CREATE INDEX IF NOT EXISTS idx_l3_lexical_meta_muted ON l3_lexical_meta(is_muted);

-- L3.3 - Entity-relation graph
CREATE TABLE IF NOT EXISTS l3_entities (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('PERSON', 'CONCEPT', 'TOOL', 'LOCATION', 'FILE', 'TECHNOLOGY', 'OTHER')),
  entity_value TEXT NOT NULL,
  canonical_form TEXT,
  chat_id TEXT,
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(entity_type, entity_value, chat_id)
);

CREATE TABLE IF NOT EXISTS l3_relations (
  id TEXT PRIMARY KEY,
  source_entity_id TEXT NOT NULL REFERENCES l3_entities(id) ON DELETE CASCADE,
  target_entity_id TEXT NOT NULL REFERENCES l3_entities(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('USES', 'PART_OF', 'RELATED_TO', 'MENTIONED_WITH', 'DEPENDS_ON')),
  context_message_id TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 1.0,
  is_muted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_l3_entities_type ON l3_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_l3_entities_value ON l3_entities(entity_value);
CREATE INDEX IF NOT EXISTS idx_l3_entities_chat ON l3_entities(chat_id);
CREATE INDEX IF NOT EXISTS idx_l3_relations_source ON l3_relations(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_l3_relations_target ON l3_relations(target_entity_id);
CREATE INDEX IF NOT EXISTS idx_l3_relations_message ON l3_relations(context_message_id);
CREATE INDEX IF NOT EXISTS idx_l3_relations_muted ON l3_relations(is_muted);

-- =============================================================================
-- L4: WOUND - Salience marker store
-- =============================================================================
CREATE TABLE IF NOT EXISTS l4_salience (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  message_id TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  salience_score REAL NOT NULL CHECK (salience_score >= 0.0 AND salience_score <= 1.0),
  prediction_error REAL,
  user_pinned INTEGER NOT NULL DEFAULT 0,
  retention_priority INTEGER NOT NULL DEFAULT 0,
  is_muted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_accessed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_l4_chat_id ON l4_salience(chat_id);
CREATE INDEX IF NOT EXISTS idx_l4_salience_score ON l4_salience(salience_score DESC);
CREATE INDEX IF NOT EXISTS idx_l4_user_pinned ON l4_salience(user_pinned);
CREATE INDEX IF NOT EXISTS idx_l4_retention ON l4_salience(retention_priority DESC);
CREATE INDEX IF NOT EXISTS idx_l4_message_id ON l4_salience(message_id);
CREATE INDEX IF NOT EXISTS idx_l4_muted ON l4_salience(is_muted);

-- =============================================================================
-- L5: COMPANION - Co-occurrence graph
-- =============================================================================
CREATE TABLE IF NOT EXISTS l5_nodes (
  id TEXT PRIMARY KEY,
  node_type TEXT NOT NULL CHECK (node_type IN ('CONCEPT', 'TOPIC', 'ENTITY')),
  node_value TEXT NOT NULL,
  chat_id TEXT,
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(node_type, node_value, chat_id)
);

CREATE TABLE IF NOT EXISTS l5_edges (
  id TEXT PRIMARY KEY,
  source_node_id TEXT NOT NULL REFERENCES l5_nodes(id) ON DELETE CASCADE,
  target_node_id TEXT NOT NULL REFERENCES l5_nodes(id) ON DELETE CASCADE,
  weight REAL NOT NULL DEFAULT 1.0,
  temporal_decay REAL NOT NULL DEFAULT 1.0,
  last_reinforced_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(source_node_id, target_node_id)
);

CREATE INDEX IF NOT EXISTS idx_l5_nodes_type ON l5_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_l5_nodes_chat ON l5_nodes(chat_id);
CREATE INDEX IF NOT EXISTS idx_l5_nodes_value ON l5_nodes(node_value);
CREATE INDEX IF NOT EXISTS idx_l5_edges_source ON l5_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_l5_edges_target ON l5_edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_l5_edges_weight ON l5_edges(weight DESC);

-- =============================================================================
-- CONSOLIDATION TRACKING
-- =============================================================================
CREATE TABLE IF NOT EXISTS consolidation_runs (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('overflow', 'scheduled', 'manual')),
  items_processed INTEGER NOT NULL DEFAULT 0,
  summaries_created INTEGER NOT NULL DEFAULT 0,
  conflicts_detected INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_consolidation_chat ON consolidation_runs(chat_id);
CREATE INDEX IF NOT EXISTS idx_consolidation_started ON consolidation_runs(started_at DESC);

-- =============================================================================
-- METADATA & CONFIG
-- =============================================================================
CREATE TABLE IF NOT EXISTS memory_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert default config
INSERT OR IGNORE INTO memory_config (key, value) VALUES
  ('l1_max_tokens', '8000'),
  ('l1_overflow_callback', 'consolidate'),
  ('l2_affect_threshold', '0.3'),
  ('l2_decay_rate', '0.95'),
  ('l3_embedding_model', 'openai:text-embedding-3-small'),
  ('l4_salience_threshold', '0.7'),
  ('l5_temporal_decay_rate', '0.98'),
  ('consolidation_schedule', '3600'),
  ('memory_enabled', 'true');

-- =============================================================================
-- EMBEDDING CACHE (to avoid re-embedding same content)
-- =============================================================================
CREATE TABLE IF NOT EXISTS embedding_cache (
  content_hash TEXT PRIMARY KEY,
  embedding_blob BLOB NOT NULL,
  embedding_model TEXT NOT NULL,
  dimensions INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_accessed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_embedding_cache_model ON embedding_cache(embedding_model);

-- Migrations tracking table
CREATE TABLE IF NOT EXISTS _migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Down

DROP TABLE IF EXISTS _migrations;
DROP TABLE IF EXISTS embedding_cache;
DROP TABLE IF EXISTS memory_config;
DROP TABLE IF EXISTS consolidation_runs;
DROP TABLE IF EXISTS l5_edges;
DROP TABLE IF EXISTS l5_nodes;
DROP TABLE IF EXISTS l4_salience;
DROP TABLE IF EXISTS l3_relations;
DROP TABLE IF EXISTS l3_entities;
DROP TABLE IF EXISTS l3_lexical_meta;
DROP TABLE IF EXISTS l3_lexical_fts;
DROP TABLE IF EXISTS l3_vectors;
DROP TABLE IF EXISTS l2_affect;
DROP TABLE IF EXISTS l1_river;

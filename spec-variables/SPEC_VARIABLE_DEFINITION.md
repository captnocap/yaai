# Variable Definition & Management — Specification

> Version: 1.0.0
> Last Updated: 2026-01-04

Settings interface for creating, editing, testing, and managing variable definitions. Covers all variable types: system (built-in), app-level (user-defined), wildcard strings, REST APIs, and JavaScript functions.

---

## Table of Contents

1. [Data Model](#1-data-model)
2. [Database Schema](#2-database-schema)
3. [Variable Definition Workflows](#3-variable-definition-workflows)
4. [REST API Variable Builder](#4-rest-api-variable-builder)
5. [Settings Page UI](#5-settings-page-ui)
6. [WebSocket Handlers](#6-websocket-handlers)
7. [Error Handling](#7-error-handling)
8. [Security & Encryption](#8-security--encryption)

---

## 1. Data Model

### 1.1 Variable Types

```typescript
// lib/core/types.ts (add to existing)

export type VariableId = Brand<string, 'VariableId'>
export type VariableType = 'system' | 'app-level' | 'wildcard' | 'rest-api' | 'javascript'
export type VariableScope = 'system' | 'app' | 'chat'

// Base variable interface
export interface Variable {
  id: VariableId
  name: string                    // {{name}} - must be valid identifier
  type: VariableType
  scope: VariableScope            // system (read-only), app (user), chat (per-chat)
  description?: string
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

// System variables (read-only, built-in)
export interface SystemVariable extends Variable {
  type: 'system'
  scope: 'system'
  computeFn: 'time' | 'date' | 'datetime' | 'timestamp' | 'system-info' | 'user-info'
}

// App-level variables (user-defined, persistent)
export interface AppLevelVariable extends Variable {
  type: 'app-level'
  scope: 'app'
  value: string                   // Static text value
}

// Wildcard string variables (array of options)
export interface WildcardVariable extends Variable {
  type: 'wildcard'
  scope: 'app'
  options: string[]               // Array of text options
  allowDuplicates?: boolean       // Can same option be selected twice in a row
  cacheDuration?: number          // ms to cache selection (null = no cache, reroll each time)
}

// REST API variables
export interface RestApiVariable extends Variable {
  type: 'rest-api'
  scope: 'app'
  requestConfig: RestRequestConfig
  responseParser: ResponseParser
  timeout?: number                // ms, default 10000
  retries?: number                // default 1
  cacheEnabled?: boolean
  cacheDuration?: number           // ms
}

// JavaScript variables
export interface JavaScriptVariable extends Variable {
  type: 'javascript'
  scope: 'app'
  code: string                    // Code that returns string
  timeout?: number                // ms, default 5000
}

// REST request configuration
export interface RestRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string                     // Can contain {{other-var}} for interpolation
  headers?: Record<string, string>
  body?: unknown                  // JSON or form data
  authentication?: {
    type: 'bearer' | 'basic' | 'api-key'
    value: string                 // Encrypted in database
    keyName?: string              // For api-key type (e.g., 'X-API-Key')
  }
}

// Response field selector
export interface ResponseParser {
  type: 'text' | 'json-path' | 'regex'
  selector: string                // Path (e.g., 'data.message') or regex pattern
  defaultValue?: string           // If selector doesn't match
}

// Variable test result
export interface VariableTestResult {
  success: boolean
  data?: string                   // Resolved value
  error?: string
  duration: number                // ms
  timestamp: string
}
```

### 1.2 System Variables (Built-in)

```typescript
// Predefined system variables that are always available

export const SYSTEM_VARIABLES: Record<string, SystemVariable> = {
  time: {
    id: 'sys_time' as VariableId,
    name: 'time',
    type: 'system',
    scope: 'system',
    description: 'Current time (HH:MM:SS)',
    isEnabled: true,
    computeFn: 'time',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  date: {
    id: 'sys_date' as VariableId,
    name: 'date',
    type: 'system',
    scope: 'system',
    description: 'Current date (YYYY-MM-DD)',
    isEnabled: true,
    computeFn: 'date',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  datetime: {
    id: 'sys_datetime' as VariableId,
    name: 'datetime',
    type: 'system',
    scope: 'system',
    description: 'Current date and time (ISO 8601)',
    isEnabled: true,
    computeFn: 'datetime',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  timestamp: {
    id: 'sys_timestamp' as VariableId,
    name: 'timestamp',
    type: 'system',
    scope: 'system',
    description: 'Unix timestamp (milliseconds)',
    isEnabled: true,
    computeFn: 'timestamp',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  'user-name': {
    id: 'sys_user_name' as VariableId,
    name: 'user-name',
    type: 'system',
    scope: 'system',
    description: 'System username',
    isEnabled: true,
    computeFn: 'user-info',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  }
}
```

---

## 2. Database Schema

### 2.1 Variables Table

Add migration: `app/src/bun/migrations/app/004_create_variables.sql`

```sql
CREATE TABLE IF NOT EXISTS variables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('system', 'app-level', 'wildcard', 'rest-api', 'javascript')),
  scope TEXT NOT NULL CHECK (scope IN ('system', 'app', 'chat')),
  description TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  -- App-level specific
  value TEXT,

  -- Wildcard specific
  wildcard_options TEXT,         -- JSON array
  wildcard_allow_duplicates INTEGER,
  wildcard_cache_duration INTEGER,

  -- REST API specific
  rest_method TEXT,
  rest_url TEXT,
  rest_headers TEXT,              -- JSON object, encrypted
  rest_body TEXT,                 -- JSON, encrypted
  rest_auth_type TEXT,
  rest_auth_value TEXT,            -- Encrypted
  rest_auth_key_name TEXT,
  rest_timeout INTEGER DEFAULT 10000,
  rest_retries INTEGER DEFAULT 1,
  rest_cache_enabled INTEGER DEFAULT 0,
  rest_cache_duration INTEGER,
  rest_response_parser_type TEXT,
  rest_response_parser_selector TEXT,
  rest_response_parser_default TEXT,

  -- JavaScript specific
  js_code TEXT,                   -- Encrypted
  js_timeout INTEGER DEFAULT 5000
);

CREATE INDEX idx_variables_name ON variables(name);
CREATE INDEX idx_variables_type ON variables(type);
CREATE INDEX idx_variables_scope ON variables(scope);
CREATE INDEX idx_variables_enabled ON variables(is_enabled);
```

### 2.2 Variable Test History Table (Optional)

For tracking test results:

```sql
CREATE TABLE IF NOT EXISTS variable_tests (
  id TEXT PRIMARY KEY,
  variable_id TEXT NOT NULL,
  success INTEGER NOT NULL,
  data TEXT,
  error TEXT,
  duration INTEGER,
  tested_at TEXT NOT NULL,
  FOREIGN KEY (variable_id) REFERENCES variables(id) ON DELETE CASCADE
);

CREATE INDEX idx_variable_tests_var ON variable_tests(variable_id, tested_at DESC);
```

---

## 3. Variable Definition Workflows

### 3.1 System Variable Display (Read-only)

**UI Component**: `src/mainview/components/settings/variables/SystemVariablesList.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM VARIABLES (Built-in, Always Available)              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  {{time}}              Current time (HH:MM:SS)              │
│  {{date}}              Current date (YYYY-MM-DD)            │
│  {{datetime}}          Current date and time (ISO 8601)     │
│  {{timestamp}}         Unix timestamp (milliseconds)        │
│  {{user-name}}         System username                      │
│                                                              │
│  [Examples of output]                                        │
│  > {{time}} → "14:30:45"                                    │
│  > {{date}} → "2026-01-04"                                  │
│  > {{datetime}} → "2026-01-04T14:30:45Z"                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 App-Level Variable Creation Workflow

**UI Component**: `src/mainview/components/settings/variables/CreateAppVariableModal.tsx`

```
┌──────────────────────────────────────────────────────────────┐
│  Create App-Level Variable                          [X]      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Variable Name (for use as {{name}})                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ greetings                                              │ │
│  └────────────────────────────────────────────────────────┘ │
│  ℹ Alphanumeric and hyphens only, no spaces                │
│                                                               │
│  Value                                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Hello! How can I help you today?                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  Description (optional)                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ A greeting message to start conversations             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│                                                               │
│  [Cancel]                              [Create Variable]     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 Wildcard Variable Creation Workflow

**UI Component**: `src/mainview/components/settings/variables/CreateWildcardVariableModal.tsx`

```
┌──────────────────────────────────────────────────────────────┐
│  Create Wildcard Variable                          [X]       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Variable Name (for use as {{name}})                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ greeting-variants                                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  Options (one per line, will be randomly selected)           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Hello there!                                           │ │
│  │ Hey! Nice to see you.                                  │ │
│  │ Greetings! Ready to work?                              │ │
│  │ What's up! Let's get started.                          │ │
│  │ Good to see you again.                                 │ │
│  │                                                         │ │
│  │ (add more)                                              │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ☐ Allow duplicate selections (can select same option twice) │
│                                                               │
│  Cache Duration (how long to use same selection):            │
│  ◉ Never cache (new random pick each time)                   │
│  ○ Cache for: [    5    ] minutes                            │
│  ○ Cache for: [      ] custom (minutes)                      │
│                                                               │
│  [Cancel]                              [Create Variable]     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 3.4 REST API Variable Creation Workflow

See [REST API Variable Builder](#4-rest-api-variable-builder) for detailed workflow.

---

## 4. REST API Variable Builder

### 4.1 Overall Workflow

```
Step 1: Request Configuration
  - Set method (GET/POST/etc)
  - Enter URL
  - Add headers
  - Add request body
  - Set authentication (Bearer/Basic/API Key)

Step 2: Test Request
  - Send test request
  - See raw response
  - See response preview (JSON/text formatted)

Step 3: Field Selection
  - If JSON object, show field picker (tree/path selector)
  - If text, show regex builder
  - Preview selected field value

Step 4: Confirm
  - Review all settings
  - Set cache duration
  - Set timeout
  - Save variable
```

### 4.2 Request Configuration UI

**Component**: `src/mainview/components/settings/variables/RestApiBuilder/RequestConfig.tsx`

```
┌──────────────────────────────────────────────────────────────┐
│  REST API Variable Builder - Step 1: Request Config [X]      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Variable Name                                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ weather-info                                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  HTTP Method                                                 │
│  [GET▼] [POST] [PUT] [PATCH] [DELETE]                       │
│                                                               │
│  URL                                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ https://api.openweathermap.org/data/2.5/weather      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  Query Parameters (optional)                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ q      = New York                                     │ │
│  │ units  = metric                                        │ │
│  │ [+ Add Parameter]                                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  Headers (optional)                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ User-Agent  = MyApp/1.0                               │ │
│  │ [+ Add Header]                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  Request Body (optional, for POST/PUT/PATCH)                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ {                                                      │ │
│  │   "action": "create",                                 │ │
│  │   "data": {}                                           │ │
│  │ }                                                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  Authentication (optional)                                   │
│  ☐ No authentication                                         │
│  ◉ Bearer Token                                              │
│  │ Token: [________________________ ]  (encrypted)           │
│  │                                                           │
│  ○ Basic Auth                                                │
│  │ Username: [___________]  Password: [___________]          │
│  │                                                           │
│  ○ API Key                                                   │
│  │ Key Name: [X-API-Key   ]  Value: [_____________]          │
│                                                               │
│                                                               │
│ [Cancel]                           [Test Request →]          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 Test Request & Response UI

**Component**: `src/mainview/components/settings/variables/RestApiBuilder/TestResponse.tsx`

```
┌──────────────────────────────────────────────────────────────┐
│  REST API Variable Builder - Step 2: Test Response  [X]      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Request Status: ✓ 200 OK (145ms)                            │
│                                                               │
│  Raw Response (tab)     | Formatted (tab)                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ {                                                      │ │
│  │   "coord": { "lon": -74.006, "lat": 40.7143 },       │ │
│  │   "weather": [{ "id": 800, "main": "Clear" }],       │ │
│  │   "main": {                                            │ │
│  │     "temp": 22.5,                                      │ │
│  │     "feels_like": 21.8,                                │ │
│  │     "humidity": 65                                     │ │
│  │   },                                                   │ │
│  │   "wind": { "speed": 3.5 },                           │ │
│  │   "name": "New York"                                   │ │
│  │ }                                                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  [← Back to Config]                    [Select Field →]     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 4.4 Field Selection UI

**Component**: `src/mainview/components/settings/variables/RestApiBuilder/FieldSelector.tsx`

For JSON responses, show an interactive tree picker:

```
┌──────────────────────────────────────────────────────────────┐
│  REST API Variable Builder - Step 3: Select Field [X]        │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Response fields (click to select):                           │
│                                                               │
│  ▼ root                                                       │
│    ▼ coord                                                    │
│      ○ lon: -74.006                                           │
│      ○ lat: 40.7143                                           │
│    ▼ weather                                                  │
│      ▼ [0]                                                    │
│        ○ id: 800                                              │
│        ○ main: "Clear"                                        │
│      ▼ [1]                                                    │
│        ...                                                    │
│    ▼ main                                                     │
│      ○ temp: 22.5                                             │
│      ○ feels_like: 21.8                                       │
│      ○ humidity: 65                                           │
│    ▼ wind                                                     │
│      ○ speed: 3.5                                             │
│    ○ name: "New York"                                         │
│                                                               │
│  Selected Field:                                              │
│  Path: main.temp                                              │
│  Preview: 22.5                                                │
│                                                               │
│  ← (Or use JSON Path) [data.main.temp]                       │
│                                                               │
│  [← Back]                                    [Confirm →]     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

For text responses or manual entry, show a regex builder:

```
┌──────────────────────────────────────────────────────────────┐
│  REST API Variable Builder - Step 3: Parse Text Response     │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Response is text. Extract using regex:                      │
│                                                               │
│  Regex Pattern                                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ <temperature>(\d+\.?\d*)</temperature>                │ │
│  └────────────────────────────────────────────────────────┘ │
│  ℹ Capture group 1 will be extracted                        │
│                                                               │
│  Sample Response Preview:                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ <temperature>22.5</temperature>                        │ │
│  │                                                         │ │
│  │ Matched: "22.5"  ✓                                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  Default Value (if no match):                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ N/A                                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  [← Back]                                    [Confirm →]     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 4.5 Confirmation & Save

**Component**: `src/mainview/components/settings/variables/RestApiBuilder/Confirmation.tsx`

```
┌──────────────────────────────────────────────────────────────┐
│  REST API Variable Builder - Step 4: Confirm & Save [X]      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Variable Name: weather-info                                 │
│                                                               │
│  Request Summary:                                             │
│  GET https://api.openweathermap.org/data/2.5/weather        │
│  Parameters: q=New York, units=metric                        │
│  Auth: Bearer Token (****)                                   │
│                                                               │
│  Response Extraction:                                         │
│  Path: main.temp                                              │
│  Sample Output: 22.5                                          │
│                                                               │
│  Settings:                                                    │
│  Timeout: 10 seconds                                          │
│  Retries: 1                                                   │
│  Cache: ☐ Enabled (cache for [    ] seconds)                │
│                                                               │
│  [← Back]                                    [Save Variable]  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Settings Page UI

### 5.1 Settings Page Layout

**Component**: `src/mainview/components/settings/VariablesTab.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings > Variables                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ [← Back to Settings]                                            │
│                                                                 │
│ VARIABLES                                                        │
│ Create and manage dynamic variables for use in messages         │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Global Settings                                             ││
│ ├─────────────────────────────────────────────────────────────┤│
│ │ ☑ Enable variables ({{var}} syntax)                         ││
│ │                                                              ││
│ │ Default Expansion Mode:                                     ││
│ │ ◉ Live Preview (preview variables before sending)           ││
│ │ ○ Runtime (expand only at send time)                        ││
│ │                                                              ││
│ │ Default Wildcard Cache:                                     ││
│ │ ◉ Never cache (new selection each time)                     ││
│ │ ○ Cache for: [    5    ] minutes                            ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ System Variables (Built-in)              [show/hide details]││
│ ├─────────────────────────────────────────────────────────────┤│
│ │ {{time}}           Current time (HH:MM:SS)                  ││
│ │ {{date}}           Current date (YYYY-MM-DD)                ││
│ │ {{datetime}}       Current date/time (ISO)                  ││
│ │ {{timestamp}}      Unix timestamp (ms)                      ││
│ │ {{user-name}}      System username                          ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Custom Variables                 [+ Create New Variable ▼]  ││
│ ├─────────────────────────────────────────────────────────────┤│
│ │                                                              ││
│ │ ☑ greeting-variants        [Wildcard] [Edit] [Delete]      ││
│ │    5 options                                                 ││
│ │                                                              ││
│ │ ☑ weather-info              [REST API] [Edit] [Delete]     ││
│ │    GET openweathermap.org → main.temp                       ││
│ │    Last executed: 2 hours ago, Cache: 5 min                 ││
│ │                                                              ││
│ │ ☑ todos                     [App-Level] [Edit] [Delete]     ││
│ │    "Buy milk, finish project"                               ││
│ │                                                              ││
│ │ ☐ old-weather               [REST API] [Edit] [Delete]     ││
│ │    (disabled)                                                ││
│ │                                                              ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Variable List Item Component

**Component**: `src/mainview/components/settings/variables/VariableListItem.tsx`

Shows each variable with:
- Enabled/disabled toggle
- Variable name and type badge
- Description/details
- Last execution time (for REST API)
- Cache status (if applicable)
- Edit and Delete buttons

---

## 6. WebSocket Handlers

### 6.1 Variable Management Handlers

Create: `app/src/bun/lib/ws/handlers/variable.ts`

```typescript
import { Result, AppError, logger } from '../../core'
import { VariableStore } from '../../stores/variable-store'
import type { WSRequest, WSResponse } from '../protocol'
import type {
  Variable,
  RestApiVariable,
  WildcardVariable,
  VariableTestResult
} from '../../core/types'

const variableStore = new VariableStore()

export const variableHandlers = {
  /**
   * variable:list - Get all variables
   */
  'variable:list': async (req: WSRequest): Promise<WSResponse> => {
    try {
      const variables = await variableStore.listVariables()
      return {
        type: 'response',
        id: req.id,
        channel: 'variable:list',
        payload: variables,
        timestamp: Date.now()
      }
    } catch (error) {
      return errorResponse(req, error)
    }
  },

  /**
   * variable:create-app - Create app-level variable
   */
  'variable:create-app': async (req: WSRequest): Promise<WSResponse> => {
    try {
      const { name, value, description } = req.payload as any
      const result = await variableStore.createAppLevelVariable({
        name,
        value,
        description
      })

      if (!result.ok) {
        return {
          type: 'response',
          id: req.id,
          channel: 'variable:create-app',
          error: { code: result.error.code, message: result.error.message },
          timestamp: Date.now()
        }
      }

      return {
        type: 'response',
        id: req.id,
        channel: 'variable:create-app',
        payload: result.value,
        timestamp: Date.now()
      }
    } catch (error) {
      return errorResponse(req, error)
    }
  },

  /**
   * variable:create-wildcard - Create wildcard variable
   */
  'variable:create-wildcard': async (req: WSRequest): Promise<WSResponse> => {
    try {
      const { name, options, allowDuplicates, cacheDuration, description } = req.payload as any
      const result = await variableStore.createWildcardVariable({
        name,
        options,
        allowDuplicates,
        cacheDuration,
        description
      })

      if (!result.ok) {
        return {
          type: 'response',
          id: req.id,
          channel: 'variable:create-wildcard',
          error: { code: result.error.code, message: result.error.message },
          timestamp: Date.now()
        }
      }

      return {
        type: 'response',
        id: req.id,
        channel: 'variable:create-wildcard',
        payload: result.value,
        timestamp: Date.now()
      }
    } catch (error) {
      return errorResponse(req, error)
    }
  },

  /**
   * variable:create-rest-api - Create REST API variable
   */
  'variable:create-rest-api': async (req: WSRequest): Promise<WSResponse> => {
    try {
      const { name, requestConfig, responseParser, timeout, retries, cacheEnabled, cacheDuration, description } = req.payload as any
      const result = await variableStore.createRestApiVariable({
        name,
        requestConfig,
        responseParser,
        timeout,
        retries,
        cacheEnabled,
        cacheDuration,
        description
      })

      if (!result.ok) {
        return {
          type: 'response',
          id: req.id,
          channel: 'variable:create-rest-api',
          error: { code: result.error.code, message: result.error.message },
          timestamp: Date.now()
        }
      }

      return {
        type: 'response',
        id: req.id,
        channel: 'variable:create-rest-api',
        payload: result.value,
        timestamp: Date.now()
      }
    } catch (error) {
      return errorResponse(req, error)
    }
  },

  /**
   * variable:test-rest-api - Test a REST API request and show response
   */
  'variable:test-rest-api': async (req: WSRequest): Promise<WSResponse> => {
    try {
      const { requestConfig } = req.payload as any
      const result = await variableStore.testRestApiRequest(requestConfig)

      if (!result.ok) {
        return {
          type: 'response',
          id: req.id,
          channel: 'variable:test-rest-api',
          error: { code: result.error.code, message: result.error.message },
          timestamp: Date.now()
        }
      }

      return {
        type: 'response',
        id: req.id,
        channel: 'variable:test-rest-api',
        payload: result.value,
        timestamp: Date.now()
      }
    } catch (error) {
      return errorResponse(req, error)
    }
  },

  /**
   * variable:delete - Delete a variable
   */
  'variable:delete': async (req: WSRequest): Promise<WSResponse> => {
    try {
      const { id } = req.payload as { id: string }
      const result = await variableStore.deleteVariable(id as any)

      if (!result.ok) {
        return {
          type: 'response',
          id: req.id,
          channel: 'variable:delete',
          error: { code: result.error.code, message: result.error.message },
          timestamp: Date.now()
        }
      }

      return {
        type: 'response',
        id: req.id,
        channel: 'variable:delete',
        payload: true,
        timestamp: Date.now()
      }
    } catch (error) {
      return errorResponse(req, error)
    }
  },

  /**
   * variable:update - Update a variable
   */
  'variable:update': async (req: WSRequest): Promise<WSResponse> => {
    try {
      const { id, ...updates } = req.payload as any
      const result = await variableStore.updateVariable(id as any, updates)

      if (!result.ok) {
        return {
          type: 'response',
          id: req.id,
          channel: 'variable:update',
          error: { code: result.error.code, message: result.error.message },
          timestamp: Date.now()
        }
      }

      return {
        type: 'response',
        id: req.id,
        channel: 'variable:update',
        payload: result.value,
        timestamp: Date.now()
      }
    } catch (error) {
      return errorResponse(req, error)
    }
  }
}

function errorResponse(req: WSRequest, error: unknown): WSResponse {
  return {
    type: 'response',
    id: req.id,
    channel: req.channel,
    error: {
      code: 'HANDLER_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    },
    timestamp: Date.now()
  }
}
```

### 6.2 Channel Registry Addition

| Channel | Direction | Payload | Response | Description |
|---------|-----------|---------|----------|-------------|
| `variable:list` | Request | `{}` | `Variable[]` | List all variables |
| `variable:create-app` | Request | `{ name, value, description? }` | `AppLevelVariable` | Create app variable |
| `variable:create-wildcard` | Request | `{ name, options[], allowDuplicates?, cacheDuration?, description? }` | `WildcardVariable` | Create wildcard variable |
| `variable:create-rest-api` | Request | `{ name, requestConfig, responseParser, timeout?, retries?, cacheEnabled?, cacheDuration?, description? }` | `RestApiVariable` | Create REST API variable |
| `variable:test-rest-api` | Request | `{ requestConfig }` | `{ statusCode, body, headers }` | Test REST request |
| `variable:update` | Request | `{ id, ...updates }` | `Variable` | Update variable |
| `variable:delete` | Request | `{ id }` | `boolean` | Delete variable |

---

## 7. Error Handling

### 7.1 Error Codes

Add to `ErrorCode` type:

```typescript
// Variable errors (8xxx)
| 'VARIABLE_NOT_FOUND'           // 8001
| 'VARIABLE_NAME_CONFLICT'       // 8002
| 'VARIABLE_INVALID_NAME'        // 8003
| 'VARIABLE_INVALID_TYPE'        // 8004
| 'VARIABLE_REST_REQUEST_FAILED' // 8005
| 'VARIABLE_PARSE_FAILED'        // 8006
| 'VARIABLE_INVALID_CONFIG'      // 8007
| 'VARIABLE_TIMEOUT'             // 8008
```

### 7.2 Error Factories

```typescript
variable: {
  notFound: (id: string) => new AppError({
    code: 'VARIABLE_NOT_FOUND',
    message: `Variable with id ${id} not found`,
    context: { id }
  }),

  nameConflict: (name: string) => new AppError({
    code: 'VARIABLE_NAME_CONFLICT',
    message: `Variable name "${name}" already exists`,
    context: { name }
  }),

  invalidName: (name: string, reason: string) => new AppError({
    code: 'VARIABLE_INVALID_NAME',
    message: `Invalid variable name "${name}": ${reason}`,
    context: { name, reason }
  }),

  restRequestFailed: (url: string, statusCode: number, cause?: Error) => new AppError({
    code: 'VARIABLE_REST_REQUEST_FAILED',
    message: `REST API request to ${url} returned ${statusCode}`,
    cause,
    context: { url, statusCode },
    recoverable: true
  }),

  parseFailed: (selector: string, reason: string) => new AppError({
    code: 'VARIABLE_PARSE_FAILED',
    message: `Failed to parse response with selector "${selector}": ${reason}`,
    context: { selector, reason },
    recoverable: true
  })
}
```

---

## 8. Security & Encryption

### 8.1 Sensitive Data

Fields that must be encrypted in database:
- REST API request headers (may contain API keys)
- REST API request body (may contain sensitive data)
- REST API authentication values (Bearer tokens, API keys, passwords)
- JavaScript variable code (less critical, but for user privacy)

### 8.2 Encryption Implementation

```typescript
// lib/core/encryption.ts

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-key'
const ALGORITHM = 'aes-256-gcm'

export function encrypt(data: string): { encrypted: string; iv: string; authTag: string } {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv)

  let encrypted = cipher.update(data, 'utf-8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  }
}

export function decrypt(encrypted: string, iv: string, authTag: string): string {
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), Buffer.from(iv, 'hex'))
  decipher.setAuthTag(Buffer.from(authTag, 'hex'))

  let decrypted = decipher.update(encrypted, 'hex', 'utf-8')
  decrypted += decipher.final('utf-8')

  return decrypted
}
```

### 8.3 Storage Pattern

In database, store encrypted fields as JSON:

```
rest_auth_value: {
  "encrypted": "a1b2c3d4...",
  "iv": "f1e2d3c4b5...",
  "authTag": "xyz123..."
}
```

When loading from database, decrypt before use. Never log sensitive values.

---

## 9. Variable Naming Rules

- Alphanumeric (a-z, A-Z, 0-9) and hyphens (-)
- Must start with letter or underscore
- No spaces or special characters
- Case-insensitive ({{MyVar}} = {{myvar}})
- Max 50 characters
- Cannot conflict with system variables
- Cannot contain {{}} or other variable syntax

---

*End of Variable Definition & Management specification.*

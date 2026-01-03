// =============================================================================
// APP STORE
// =============================================================================
// SQLite-backed storage for user models and provider configurations.

import { db } from '../db'
import {
  Result,
  Errors,
  logger,
  generateId,
  type ProviderType,
  type ModelInfo,
  type UserModel,
  isProviderType
} from '../core'

const log = logger.child({ module: 'app-store' })

interface UserModelRow {
  id: string
  provider: string
  model_id: string
  display_name: string
  context_window: number | null
  max_output: number | null
  supports_vision: number
  supports_tools: number
  input_price: number | null
  output_price: number | null
  is_default: number
  enabled: number
  sort_order: number
  created_at: string
  updated_at: string
}

interface ProviderConfigRow {
  id: string
  enabled: number
  default_model: string | null
  base_url: string | null
  created_at: string
  updated_at: string
}

function rowToUserModel(row: UserModelRow): UserModel {
  return {
    id: row.model_id,
    provider: row.provider as ProviderType,
    displayName: row.display_name,
    contextWindow: row.context_window ?? 0,
    maxOutput: row.max_output ?? 0,
    supportsVision: row.supports_vision === 1,
    supportsTools: row.supports_tools === 1,
    inputPrice: row.input_price ?? undefined,
    outputPrice: row.output_price ?? undefined,
    isDefault: row.is_default === 1,
    enabled: row.enabled === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const AppStore = {
  // ---------------------------------------------------------------------------
  // USER MODELS
  // ---------------------------------------------------------------------------

  /**
   * Add a model to the user's list
   */
  addUserModel(model: ModelInfo): Result<UserModel> {
    if (!isProviderType(model.provider)) {
      return Result.err(Errors.validation.invalid('provider', `Invalid provider: ${model.provider}`))
    }

    try {
      const id = generateId()
      const now = new Date().toISOString()

      // Check if model already exists for this provider
      const existing = db.app
        .prepare('SELECT 1 FROM user_models WHERE provider = ? AND model_id = ?')
        .get(model.provider, model.id)

      if (existing) {
        return Result.err(Errors.store.duplicate('model', `${model.provider}/${model.id}`))
      }

      // Get current max sort_order
      const maxOrder = db.app
        .prepare('SELECT MAX(sort_order) as max FROM user_models WHERE provider = ?')
        .get(model.provider) as { max: number | null } | null

      const sortOrder = (maxOrder?.max ?? -1) + 1

      db.app.prepare(`
        INSERT INTO user_models (
          id, provider, model_id, display_name, context_window, max_output,
          supports_vision, supports_tools, input_price, output_price,
          is_default, enabled, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        model.provider,
        model.id,
        model.displayName,
        model.contextWindow,
        model.maxOutput,
        model.supportsVision ? 1 : 0,
        model.supportsTools ? 1 : 0,
        model.inputPrice ?? null,
        model.outputPrice ?? null,
        0, // is_default
        1, // enabled
        sortOrder,
        now,
        now
      )

      log.info('User model added', { provider: model.provider, modelId: model.id })

      return Result.ok({
        ...model,
        isDefault: false,
        enabled: true,
        sortOrder,
        createdAt: now,
        updatedAt: now,
      })
    } catch (error) {
      log.error('Failed to add user model', error instanceof Error ? error : undefined)
      return Result.err(Errors.db.queryFailed('INSERT user_models', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Remove a model from the user's list
   */
  removeUserModel(provider: string, modelId: string): Result<void> {
    try {
      db.app
        .prepare('DELETE FROM user_models WHERE provider = ? AND model_id = ?')
        .run(provider, modelId)

      log.info('User model removed', { provider, modelId })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to remove user model', error instanceof Error ? error : undefined)
      return Result.err(Errors.db.queryFailed('DELETE user_models', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Get all user models, optionally filtered by provider
   */
  getUserModels(provider?: string): UserModel[] {
    try {
      let rows: UserModelRow[]

      if (provider) {
        rows = db.app
          .prepare('SELECT * FROM user_models WHERE provider = ? ORDER BY sort_order')
          .all(provider) as UserModelRow[]
      } else {
        rows = db.app
          .prepare('SELECT * FROM user_models ORDER BY provider, sort_order')
          .all() as UserModelRow[]
      }

      return rows.map(rowToUserModel)
    } catch (error) {
      log.error('Failed to get user models', error instanceof Error ? error : undefined)
      return []
    }
  },

  /**
   * Get enabled user models for a provider
   */
  getEnabledModels(provider: string): UserModel[] {
    try {
      const rows = db.app
        .prepare('SELECT * FROM user_models WHERE provider = ? AND enabled = 1 ORDER BY sort_order')
        .all(provider) as UserModelRow[]

      return rows.map(rowToUserModel)
    } catch {
      return []
    }
  },

  /**
   * Set default model for a provider
   */
  setDefaultModel(provider: string, modelId: string): Result<void> {
    try {
      const now = new Date().toISOString()

      // Clear existing default for this provider
      db.app
        .prepare('UPDATE user_models SET is_default = 0, updated_at = ? WHERE provider = ?')
        .run(now, provider)

      // Set new default
      const result = db.app
        .prepare('UPDATE user_models SET is_default = 1, updated_at = ? WHERE provider = ? AND model_id = ?')
        .run(now, provider, modelId)

      if (result.changes === 0) {
        return Result.err(Errors.store.notFound('model', `${provider}/${modelId}`))
      }

      log.info('Default model set', { provider, modelId })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to set default model', error instanceof Error ? error : undefined)
      return Result.err(Errors.db.queryFailed('UPDATE user_models', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Get default model for a provider
   */
  getDefaultModel(provider: string): UserModel | null {
    try {
      const row = db.app
        .prepare('SELECT * FROM user_models WHERE provider = ? AND is_default = 1')
        .get(provider) as UserModelRow | null

      return row ? rowToUserModel(row) : null
    } catch {
      return null
    }
  },

  /**
   * Toggle model enabled state
   */
  toggleModelEnabled(provider: string, modelId: string, enabled: boolean): Result<void> {
    try {
      const now = new Date().toISOString()

      const result = db.app
        .prepare('UPDATE user_models SET enabled = ?, updated_at = ? WHERE provider = ? AND model_id = ?')
        .run(enabled ? 1 : 0, now, provider, modelId)

      if (result.changes === 0) {
        return Result.err(Errors.store.notFound('model', `${provider}/${modelId}`))
      }

      log.info('Model enabled toggled', { provider, modelId, enabled })
      return Result.ok(undefined)
    } catch (error) {
      return Result.err(Errors.db.queryFailed('UPDATE user_models', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Check if user has any models for a provider
   */
  hasModelsForProvider(provider: string): boolean {
    try {
      const row = db.app
        .prepare('SELECT 1 FROM user_models WHERE provider = ? LIMIT 1')
        .get(provider)
      return row !== null
    } catch {
      return false
    }
  },

  // ---------------------------------------------------------------------------
  // PROVIDER CONFIGS
  // ---------------------------------------------------------------------------

  /**
   * Get provider config
   */
  getProviderConfig(provider: string): { enabled: boolean; defaultModel: string | null; baseUrl: string | null } | null {
    try {
      const row = db.app
        .prepare('SELECT * FROM provider_configs WHERE id = ?')
        .get(provider) as ProviderConfigRow | null

      if (!row) return null

      return {
        enabled: row.enabled === 1,
        defaultModel: row.default_model,
        baseUrl: row.base_url,
      }
    } catch {
      return null
    }
  },

  /**
   * Set provider enabled state
   */
  setProviderEnabled(provider: string, enabled: boolean): Result<void> {
    try {
      const now = new Date().toISOString()

      db.app.prepare(`
        INSERT INTO provider_configs (id, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at
      `).run(provider, enabled ? 1 : 0, now, now)

      log.info('Provider enabled state set', { provider, enabled })
      return Result.ok(undefined)
    } catch (error) {
      return Result.err(Errors.db.queryFailed('UPSERT provider_configs', error instanceof Error ? error : undefined))
    }
  },
}

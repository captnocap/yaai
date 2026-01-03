// =============================================================================
// RESULT TYPE
// =============================================================================
// Explicit Result<T, E> type for operations that can fail.
// Use this instead of throwing errors.

import { AppError } from './errors'

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E }

export const Result = {
  ok<T>(value: T): Result<T, never> {
    return { ok: true, value }
  },

  err<E>(error: E): Result<never, E> {
    return { ok: false, error }
  },

  // Map over success value
  map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
    if (result.ok) {
      return Result.ok(fn(result.value))
    }
    return result
  },

  // Map over error
  mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
    if (!result.ok) {
      return Result.err(fn(result.error))
    }
    return result
  },

  // Chain operations
  flatMap<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> {
    if (result.ok) {
      return fn(result.value)
    }
    return result
  },

  // Unwrap with default
  unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    if (result.ok) {
      return result.value
    }
    return defaultValue
  },

  // Unwrap or throw
  unwrap<T, E>(result: Result<T, E>): T {
    if (result.ok) {
      return result.value
    }
    throw result.error
  },

  // Check if ok
  isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
    return result.ok
  },

  // Check if error
  isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
    return !result.ok
  },

  // Convert Promise<T> to Promise<Result<T, E>>
  async fromPromise<T, E = AppError>(
    promise: Promise<T>,
    mapError?: (error: unknown) => E
  ): Promise<Result<T, E>> {
    try {
      const value = await promise
      return Result.ok(value)
    } catch (error) {
      if (mapError) {
        return Result.err(mapError(error))
      }
      if (error instanceof AppError) {
        return Result.err(error as E)
      }
      return Result.err(new AppError({
        code: 'VALIDATION_FAILED',
        message: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? error : undefined
      }) as E)
    }
  },

  // Wrap a function that might throw into one that returns Result
  tryCatch<T, E = AppError>(
    fn: () => T,
    mapError?: (error: unknown) => E
  ): Result<T, E> {
    try {
      return Result.ok(fn())
    } catch (error) {
      if (mapError) {
        return Result.err(mapError(error))
      }
      if (error instanceof AppError) {
        return Result.err(error as E)
      }
      return Result.err(new AppError({
        code: 'VALIDATION_FAILED',
        message: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? error : undefined
      }) as E)
    }
  },

  // Combine multiple results - returns first error or all values
  all<T extends readonly Result<unknown, unknown>[]>(
    results: T
  ): Result<
    { [K in keyof T]: T[K] extends Result<infer U, unknown> ? U : never },
    T[number] extends Result<unknown, infer E> ? E : never
  > {
    const values: unknown[] = []
    for (const result of results) {
      if (!result.ok) {
        return result as any
      }
      values.push(result.value)
    }
    return Result.ok(values as any)
  },

  // Collect all results - returns all errors or all values
  collect<T, E>(results: Result<T, E>[]): Result<T[], E[]> {
    const values: T[] = []
    const errors: E[] = []

    for (const result of results) {
      if (result.ok) {
        values.push(result.value)
      } else {
        errors.push(result.error)
      }
    }

    if (errors.length > 0) {
      return Result.err(errors)
    }
    return Result.ok(values)
  }
}

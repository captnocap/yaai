import { AppError, Errors, Result, logger, paths, newChatId, type ProviderType } from './src/bun/lib/core'

  // Test AppError
  const err = Errors.ai.invalidCredentials('anthropic')
  console.log('AppError:', err.code, err.message)

  // Test Result
  const okResult = Result.ok({ name: 'test' })
  const errResult = Result.err(err)
  console.log('Result ok:', okResult.ok, Result.unwrapOr(okResult, { name: 'default' }))
  console.log('Result err:', errResult.ok)

  // Test branded ID
  const chatId = newChatId()
  console.log('ChatId:', chatId)

  // Test paths
  console.log('DB path:', paths.db.app)

  // Test logger
  logger.info('Test log entry', { test: true })

  console.log('\n✓ All core modules working')

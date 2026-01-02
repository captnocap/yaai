// =============================================================================
// HELLO WORLD ARTIFACT HANDLER
// =============================================================================
// A simple example artifact demonstrating the handler interface.

import type { ArtifactHandler, ExecutionContext, ValidationResult } from '../../src/mainview/types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface HelloInput {
  name?: string;
}

interface HelloOutput {
  message: string;
  timestamp: string;
  executedBy: string;
}

// -----------------------------------------------------------------------------
// HANDLER
// -----------------------------------------------------------------------------

const handler: ArtifactHandler<HelloInput, HelloOutput> = {
  /**
   * Main execution function
   */
  async execute(input: HelloInput, context: ExecutionContext): Promise<HelloOutput> {
    const name = input.name || 'World';

    // Use the logger from context
    context.logger.info(`Greeting ${name}`);

    // Demonstrate storage usage
    const greetCount = await context.storage.get<number>('greet-count') || 0;
    await context.storage.set('greet-count', greetCount + 1);

    context.logger.debug(`This is greeting #${greetCount + 1}`);

    return {
      message: `Hello, ${name}!`,
      timestamp: new Date().toISOString(),
      executedBy: context.manifest.name,
    };
  },

  /**
   * Called after artifact is installed
   */
  async onInstall(context): Promise<void> {
    context.logger.info('Hello World artifact installed!');
    await context.storage.set('installed-at', new Date().toISOString());
  },

  /**
   * Called before artifact is uninstalled
   */
  async onUninstall(context): Promise<void> {
    context.logger.info('Hello World artifact uninstalling...');
    await context.storage.clear();
  },

  /**
   * Custom input validation
   */
  validate(input: HelloInput): ValidationResult {
    if (input.name && typeof input.name !== 'string') {
      return {
        valid: false,
        errors: [{ path: 'name', message: 'Name must be a string' }],
      };
    }

    if (input.name && input.name.length > 100) {
      return {
        valid: false,
        errors: [{ path: 'name', message: 'Name must be 100 characters or less' }],
      };
    }

    return { valid: true };
  },
};

export default handler;

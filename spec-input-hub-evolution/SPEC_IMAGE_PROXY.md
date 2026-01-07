# AI Image Model Proxy — Specification

> Folder: spec-input-hub-evolution
> Version: 1.0.0
> Last Updated: 2026-01-07

The AI Image Model Proxy is a crossover tool that enables text-base LLMs to interact directly with the application's image generation engine. It allows models to "draw" their thoughts or illustrate concepts inline within a chat transcript by generating images based on derived prompts.

---

## 1. Architecture & Flow

### 1.1 Tool Execution Flow

```
[Assistant] → [Tool Call: generate_image] → [Artifact Execution]
     ↓                                         ↓
[Prompt Builder] ← [Image Gen Store] ← [Proxy Handler]
     ↓                                         ↓
[Generate Job] → [Storage/Compression] → [Result UI]
```

1. **Assistant**: Claude (or any text model) decides to generate an image based on user request or current context.
2. **Proxy Handler**: Receives the `generate_image` tool input (e.g., prompt, aspect ratio, style).
3. **Artifact Execution**: The `ImageGenArtifact` is invoked within the sandboxed Bun Worker.
4. **Storage & UI**: The resulting image is saved, compressed, and its metadata is returned to the assistant, while a visual preview is injected into the chat.

### 1.2 Module Structure

```
app/src/bun/lib/
├── ai/
│   └── tools/
│       └── imageProxy.ts          # AI tool definition & handler
└── image-gen/
    └── image-gen-store.ts         # Hook for proxy-initiated jobs
```

---

## 2. Data Model & Schema

### 2.1 Tool Definition

```typescript
// app/src/bun/lib/ai-provider.ts

export const IMAGE_GENERATION_TOOL: ToolDefinition = {
  name: 'generate_image',
  description: 'Generates a high-quality image based on a descriptive prompt.',
  inputSchema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Detailed, descriptive prompt for the image model.'
      },
      aspectRatio: {
        type: 'string',
        enum: ['1:1', '16:9', '4:5', '9:16'],
        default: '1:1'
      },
      stylePreferences: {
        type: 'string',
        description: 'Optional style cues (e.g., cinematic, anime, oil painting).'
      }
    },
    required: ['prompt']
  }
};
```

### 2.2 Result Metadata

```typescript
interface ImageProxyResult {
  jobId: string;
  outputPath: string;
  thumbnailBase64: string;
  isCompressed: boolean;
  modelUsed: string;
}
```

---

## 3. Component Implementation

### 3.1 ImageProxy Handler

**Path**: `app/src/bun/lib/ai/tools/imageProxy.ts`

```typescript
import { Result, logger } from '../../core'
import { getImageGenStore } from '../../image-gen'

/**
 * Handles the generate_image tool call.
 * Bridges the AI Provider to the ImageGenStore.
 */
export async function handleImageProxy(input: ImageProxyInput): Promise<Result<ImageProxyResult>> {
  try {
    const store = getImageGenStore();
    
    // Create a new generation job
    const job = await store.quickGenerate({
      prompt: input.prompt,
      aspectRatio: input.aspectRatio,
      // Automatically enhance prompts if requested by user settings
    });

    return Result.ok({
      jobId: job.id,
      outputPath: job.outputFile,
      thumbnailBase64: job.thumb,
      isCompressed: true,
      modelUsed: job.model
    });
  } catch (error) {
    logger.error('Image Proxy tool failed', error as Error);
    return Result.err(Errors.ai.toolExecutionFailed('image_gen', error as Error));
  }
}
```

---

## 4. Workflows & UI

### 4.1 Inline Rendering Workflow

1. **AI Output**: Model emits a tool call.
2. **Transcript Rendering**: The `MessageBody` component detects the `tool_use` in the message blocks.
3. **Tool Card**: A `ToolCallCard` is rendered showing "Generating Image..." with a small spinner.
4. **Completion**: Once the tool returns, the card morphs into a full `ImagePreviewComponent` with zoom and "Add to References" actions.

---

## 5. API & Protocol

### 5.1 Artifact Invocation

The `ImageProxy` handler uses the `ArtifactLoader` to safely execute the generation logic.

| Channel | Direction | Payload | Description |
| --- | --- | --- | --- |
| `image-gen:quick-generate` | Request | `QuickGenerateRequest` | Direct API for tool-based gen |
| `image-gen:job-complete` | Push | `ImageProxyResult` | For real-time UI updates |

---

## 6. Error Handling

### 6.1 Common Errors

| Situation | Error Code | Recovery |
| --- | --- | --- |
| Provider Rate Limit | `ERR_PROXY_429` | Wait and retry job automatically |
| Content Moderation | `ERR_PROXY_NSFW` | Inform user of blocked prompt |

---

## 7. Security & Performance

### 7.1 Performance Strategy

* **Priority Queueing**: Jobs initiated by the AI Proxy are given `NORMAL` priority, allowing user-initiated manual jobs to "interrupt" or take precedence if queue depth is high.
* **Auto-Resizing**: Proxy images are automatically resized to a max dimension of 1024px for chat display to save memory and disk space.

---

*End of AI Image Model Proxy specification.*

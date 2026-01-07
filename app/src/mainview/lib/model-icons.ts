// =============================================================================
// MODEL ICONS
// =============================================================================
// Icon matching logic for model icons based on model ID patterns.
// Provides auto-detection of model families and path resolution for icons.

// -----------------------------------------------------------------------------
// ICON PATTERNS
// -----------------------------------------------------------------------------

// Model family patterns mapped to icon filenames (without .png extension)
// Order matters - more specific patterns should come first
const MODEL_ICON_PATTERNS: [RegExp, string][] = [
  // Anthropic
  [/claude/i, 'claude-color'],

  // OpenAI
  [/gpt|chatgpt|o1|o3|davinci|curie|babbage|ada/i, 'openai'],
  [/dall-?e/i, 'dalle-color'],

  // Google
  [/gemini/i, 'gemini-color'],
  [/gemma/i, 'gemma-color'],

  // Meta / Llama
  [/llama|codellama/i, 'meta-color'],

  // Mistral
  [/mixtral|mistral/i, 'mistral-color'],

  // Alibaba / Qwen
  [/qwen/i, 'qwen-color'],

  // DeepSeek
  [/deepseek/i, 'deepseek-color'],

  // xAI / Grok
  [/grok/i, 'grok'],

  // ByteDance / Doubao
  [/doubao/i, 'doubao-color'],

  // Groq (the inference provider)
  [/groq/i, 'groq'],

  // Ollama
  [/ollama/i, 'ollama'],

  // OpenRouter
  [/openrouter/i, 'openrouter'],

  // Flux
  [/flux/i, 'flux'],

  // Midjourney
  [/midjourney|mj/i, 'midjourney'],

  // Kling
  [/kling/i, 'kling-color'],

  // Kimi / Moonshot
  [/kimi|moonshot/i, 'kimi-color'],

  // MiniMax
  [/minimax/i, 'minimax-color'],

  // HuggingFace
  [/huggingface|hf/i, 'huggingface-color'],
];

// Available built-in icons (for the picker) - these are the actual filenames without .png
export const BUILT_IN_ICONS = [
  'claude-color',
  'openai',
  'anthropic',
  'gemini-color',
  'google-color',
  'meta-color',
  'mistral-color',
  'qwen-color',
  'deepseek-color',
  'grok',
  'groq',
  'ollama',
  'openrouter',
  'huggingface-color',
  'midjourney',
  'flux',
  'dalle-color',
  'kling-color',
  'kimi-color',
  'minimax-color',
  'doubao-color',
  'alibaba-color',
  'baidu-color',
  'tencent-color',
  'microsoft-color',
  'apple',
  'xai',
] as const;

export type BuiltInIconName = typeof BUILT_IN_ICONS[number];

// -----------------------------------------------------------------------------
// FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Get the icon name for a model based on its ID.
 * Returns 'default' if no pattern matches.
 */
export function getModelIconName(modelId: string): string {
  for (const [pattern, iconName] of MODEL_ICON_PATTERNS) {
    if (pattern.test(modelId)) {
      return iconName;
    }
  }
  return 'default';
}

/**
 * Get the full path to a model icon.
 * If customIcon is provided, returns that (assumed to be a data URL or path).
 * Otherwise, auto-detects based on modelId.
 */
export function getModelIconPath(modelId: string, customIcon?: string | null): string {
  if (customIcon) {
    return customIcon;
  }
  const iconName = getModelIconName(modelId);
  // Serve via HTTP from the WS server's static file handler
  return `http://localhost:3001/assets/model-icons/${iconName}.png`;
}

/**
 * Check if an icon exists in the built-in library
 */
export function isBuiltInIcon(iconName: string): iconName is BuiltInIconName {
  return BUILT_IN_ICONS.includes(iconName as BuiltInIconName);
}

/**
 * Get display-friendly name for a built-in icon
 */
export function getIconDisplayName(iconName: string): string {
  // Strip -color suffix for display
  const baseName = iconName.replace(/-color$/, '');
  const displayNames: Record<string, string> = {
    claude: 'Claude',
    anthropic: 'Anthropic',
    openai: 'OpenAI',
    gemini: 'Gemini',
    google: 'Google',
    meta: 'Meta/Llama',
    mistral: 'Mistral',
    qwen: 'Qwen',
    deepseek: 'DeepSeek',
    grok: 'Grok',
    groq: 'Groq',
    ollama: 'Ollama',
    openrouter: 'OpenRouter',
    huggingface: 'HuggingFace',
    midjourney: 'Midjourney',
    flux: 'Flux',
    dalle: 'DALL-E',
    kling: 'Kling',
    kimi: 'Kimi',
    minimax: 'MiniMax',
    doubao: 'Doubao',
    alibaba: 'Alibaba',
    baidu: 'Baidu',
    tencent: 'Tencent',
    microsoft: 'Microsoft',
    apple: 'Apple',
    xai: 'xAI',
    default: 'Default',
  };
  return displayNames[baseName] || baseName;
}

/**
 * Convert an image file to a base64 data URL
 * Used for custom icon uploads
 */
export async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as base64'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Resize an image to a maximum dimension while maintaining aspect ratio.
 * Returns a base64 data URL of the resized image.
 */
export async function resizeImage(
  dataUrl: string,
  maxSize: number = 64
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Calculate new dimensions
      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Use better image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Process an uploaded image file for use as a model icon.
 * Validates file type, resizes to appropriate size, and returns base64.
 */
export async function processIconUpload(file: File): Promise<string> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size (max 1MB)
  if (file.size > 1024 * 1024) {
    throw new Error('Image must be smaller than 1MB');
  }

  // Convert to base64
  const base64 = await imageToBase64(file);

  // Resize to 64x64 max
  const resized = await resizeImage(base64, 64);

  return resized;
}

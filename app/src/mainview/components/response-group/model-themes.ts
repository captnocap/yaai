/**
 * Model/Provider theming for visual distinction
 * Each provider gets a unique glow color for identification
 */

export interface ProviderTheme {
  /** Initial letter for avatar */
  initial: string
  /** RGB values for glow color (e.g., "59, 130, 246") */
  glow: string
  /** Tailwind color class for accents */
  accent: string
}

const providerThemes: Record<string, ProviderTheme> = {
  anthropic: {
    initial: 'A',
    glow: '251, 146, 60',    // orange-400
    accent: 'orange',
  },
  openai: {
    initial: 'O',
    glow: '52, 211, 153',    // emerald-400
    accent: 'emerald',
  },
  google: {
    initial: 'G',
    glow: '96, 165, 250',    // blue-400
    accent: 'blue',
  },
  meta: {
    initial: 'M',
    glow: '167, 139, 250',   // violet-400
    accent: 'violet',
  },
  mistral: {
    initial: 'M',
    glow: '251, 113, 133',   // rose-400
    accent: 'rose',
  },
  cohere: {
    initial: 'C',
    glow: '34, 211, 238',    // cyan-400
    accent: 'cyan',
  },
  deepmind: {
    initial: 'D',
    glow: '192, 132, 252',   // purple-400
    accent: 'purple',
  },
}

// Alias mapping
const providerAliases: Record<string, string> = {
  claude: 'anthropic',
  gpt: 'openai',
  chatgpt: 'openai',
  gemini: 'google',
  llama: 'meta',
  mixtral: 'mistral',
  command: 'cohere',
  imagen: 'deepmind',
}

const defaultTheme: ProviderTheme = {
  initial: '?',
  glow: '156, 163, 175',     // gray-400
  accent: 'gray',
}

/**
 * Get the theme for a provider
 */
export function getProviderTheme(provider: string): ProviderTheme {
  const normalized = provider.toLowerCase().trim()

  // Direct match
  if (providerThemes[normalized]) {
    return providerThemes[normalized]
  }

  // Alias match
  const aliasKey = providerAliases[normalized]
  if (aliasKey && providerThemes[aliasKey]) {
    return providerThemes[aliasKey]
  }

  // Partial match in provider name
  for (const [key, theme] of Object.entries(providerThemes)) {
    if (normalized.includes(key)) {
      return theme
    }
  }

  // Partial match in aliases
  for (const [alias, key] of Object.entries(providerAliases)) {
    if (normalized.includes(alias) && providerThemes[key]) {
      return providerThemes[key]
    }
  }

  return { ...defaultTheme, initial: provider[0]?.toUpperCase() || '?' }
}

/**
 * Get just the initial for a provider
 */
export function getProviderInitial(provider: string): string {
  return getProviderTheme(provider).initial
}

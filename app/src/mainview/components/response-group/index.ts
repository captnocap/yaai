// Response Group Components
// For displaying parallel AI responses with layout modes and selection

export { ResponseCard } from './ResponseCard'
export type { ResponseCardProps } from './ResponseCard'

export { ResponseGroupContainer } from './ResponseGroupContainer'
export type { ResponseGroupContainerProps } from './ResponseGroupContainer'
export type { LayoutMode } from './ParallelLayoutContext'

export { ParallelLayoutProvider, useParallelLayout } from './ParallelLayoutContext'

export { ThinkingBlock, getThinkingTheme } from './ThinkingBlock'
export type { ThinkingBlockProps } from './ThinkingBlock'

export { getProviderTheme, getProviderInitial } from './model-themes'
export type { ProviderTheme } from './model-themes'

// Chat Display Settings
export { ChatDisplayProvider, useChatDisplay, useChatDisplayOptional } from './ChatDisplayContext'
export type { ChatDisplaySettings, ChatDisplayContextValue, FontSize, FontFamily, LineHeight } from './ChatDisplayContext'

export { ChatDisplayPopover } from './ChatDisplayPopover'

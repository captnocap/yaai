import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

// ============================================
// Types
// ============================================

export type FontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type FontFamily = 'system' | 'mono' | 'serif'
export type LineHeight = 'compact' | 'normal' | 'relaxed'

export interface ChatDisplaySettings {
  fontSize: FontSize
  fontFamily: FontFamily
  lineHeight: LineHeight
}

export interface ChatDisplayContextValue {
  settings: ChatDisplaySettings
  setFontSize: (size: FontSize) => void
  setFontFamily: (family: FontFamily) => void
  setLineHeight: (height: LineHeight) => void
  resetSettings: () => void
}

// ============================================
// Defaults & Storage
// ============================================

const STORAGE_KEY = 'yaai-chat-display-settings'

const DEFAULT_SETTINGS: ChatDisplaySettings = {
  fontSize: 'md',
  fontFamily: 'system',
  lineHeight: 'normal',
}

function loadSettings(): ChatDisplaySettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        fontSize: parsed.fontSize || DEFAULT_SETTINGS.fontSize,
        fontFamily: parsed.fontFamily || DEFAULT_SETTINGS.fontFamily,
        lineHeight: parsed.lineHeight || DEFAULT_SETTINGS.lineHeight,
      }
    }
  } catch (e) {
    console.warn('Failed to load chat display settings:', e)
  }
  return DEFAULT_SETTINGS
}

function saveSettings(settings: ChatDisplaySettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.warn('Failed to save chat display settings:', e)
  }
}

// ============================================
// Context
// ============================================

const ChatDisplayContext = createContext<ChatDisplayContextValue | null>(null)

export function useChatDisplay(): ChatDisplayContextValue {
  const context = useContext(ChatDisplayContext)
  if (!context) {
    throw new Error('useChatDisplay must be used within a ChatDisplayProvider')
  }
  return context
}

// Optional hook that doesn't throw if outside provider
export function useChatDisplayOptional(): ChatDisplayContextValue | null {
  return useContext(ChatDisplayContext)
}

// ============================================
// Provider
// ============================================

interface ChatDisplayProviderProps {
  children: ReactNode
}

export function ChatDisplayProvider({ children }: ChatDisplayProviderProps) {
  const [settings, setSettings] = useState<ChatDisplaySettings>(loadSettings)

  // Apply CSS data attributes to document root
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-chat-size', settings.fontSize)
    root.setAttribute('data-chat-font', settings.fontFamily)
    root.setAttribute('data-chat-line', settings.lineHeight)
  }, [settings])

  // Persist on change
  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const setFontSize = useCallback((fontSize: FontSize) => {
    setSettings(prev => ({ ...prev, fontSize }))
  }, [])

  const setFontFamily = useCallback((fontFamily: FontFamily) => {
    setSettings(prev => ({ ...prev, fontFamily }))
  }, [])

  const setLineHeight = useCallback((lineHeight: LineHeight) => {
    setSettings(prev => ({ ...prev, lineHeight }))
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [])

  const value: ChatDisplayContextValue = {
    settings,
    setFontSize,
    setFontFamily,
    setLineHeight,
    resetSettings,
  }

  return (
    <ChatDisplayContext.Provider value={value}>
      {children}
    </ChatDisplayContext.Provider>
  )
}

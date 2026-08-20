import { describe, expect, it } from 'vitest'
import { INTERFACE_MODE_STORAGE_KEY, parseInterfaceMode } from './interfaceMode'

describe('interface mode preferences', () => {
  it('keeps each supported interface mode', () => {
    expect(parseInterfaceMode('codex')).toBe('codex')
    expect(parseInterfaceMode('reader')).toBe('reader')
  })

  it('falls back to the Codex skin for missing or invalid values', () => {
    expect(parseInterfaceMode(null)).toBe('codex')
    expect(parseInterfaceMode('dark')).toBe('codex')
  })

  it('uses a product-specific persistence key', () => {
    expect(INTERFACE_MODE_STORAGE_KEY).toBe('codex-reader-interface-mode')
  })
})

import { describe, expect, it } from 'vitest'
import {
  INTERFACE_MODE_STORAGE_KEY,
  parseInterfaceMode,
  readInterfaceMode,
  writeInterfaceMode,
} from './interfaceMode'

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

  it('reads and writes the interface mode through the storage boundary', () => {
    const values = new Map<string, string>([[INTERFACE_MODE_STORAGE_KEY, 'reader']])
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }

    expect(readInterfaceMode(storage)).toBe('reader')
    writeInterfaceMode(storage, 'codex')
    expect(values.get(INTERFACE_MODE_STORAGE_KEY)).toBe('codex')
  })
})

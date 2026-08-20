export type InterfaceMode = 'codex' | 'reader'

export const INTERFACE_MODE_STORAGE_KEY = 'codex-reader-interface-mode'

interface InterfaceModeStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): unknown
}

export function parseInterfaceMode(value: string | null): InterfaceMode {
  return value === 'reader' ? 'reader' : 'codex'
}

export function readInterfaceMode(storage: InterfaceModeStorage): InterfaceMode {
  return parseInterfaceMode(storage.getItem(INTERFACE_MODE_STORAGE_KEY))
}

export function writeInterfaceMode(storage: InterfaceModeStorage, mode: InterfaceMode) {
  storage.setItem(INTERFACE_MODE_STORAGE_KEY, mode)
}

export type InterfaceMode = 'codex' | 'reader'

export const INTERFACE_MODE_STORAGE_KEY = 'codex-reader-interface-mode'

export function parseInterfaceMode(value: string | null): InterfaceMode {
  return value === 'reader' ? 'reader' : 'codex'
}

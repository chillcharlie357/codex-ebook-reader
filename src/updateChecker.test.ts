import { describe, expect, it } from 'vitest'
import { checkForUpdate, compareVersions } from './updateChecker'

describe('GitHub release update checker', () => {
  it('compares semantic release versions numerically', () => {
    expect(compareVersions('0.2.10', '0.2.9')).toBeGreaterThan(0)
    expect(compareVersions('v1.0.0', '1.0.0')).toBe(0)
    expect(compareVersions('0.2.1', '0.3.0')).toBeLessThan(0)
  })

  it('reports a newer published GitHub release', async () => {
    const result = await checkForUpdate('0.2.1', async () => new Response(JSON.stringify({
      tag_name: 'v0.2.2',
      html_url: 'https://github.com/chillcharlie357/codex-ebook-reader/releases/tag/v0.2.2',
      name: 'Codex Reader v0.2.2',
    }), { status: 200 }))

    expect(result).toEqual({
      currentVersion: '0.2.1',
      latestVersion: '0.2.2',
      releaseUrl: 'https://github.com/chillcharlie357/codex-ebook-reader/releases/tag/v0.2.2',
      updateAvailable: true,
    })
  })

  it('rejects an unavailable GitHub release response', async () => {
    await expect(checkForUpdate('0.2.1', async () => new Response('', { status: 503 })))
      .rejects.toThrow('GitHub release request failed: 503')
  })
})

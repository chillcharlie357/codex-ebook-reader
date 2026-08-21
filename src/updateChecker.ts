declare const __APP_VERSION__: string

const LATEST_RELEASE_URL = 'https://api.github.com/repos/chillcharlie357/codex-ebook-reader/releases/latest'

interface GitHubRelease {
  tag_name?: string
  html_url?: string
}

export const CURRENT_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.2.1'

function normalizeVersion(version: string) {
  return version.trim().replace(/^v/i, '').split('-')[0]
}

export function compareVersions(left: string, right: string) {
  const leftParts = normalizeVersion(left).split('.').map(Number)
  const rightParts = normalizeVersion(right).split('.').map(Number)
  const length = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] || 0) - (rightParts[index] || 0)
    if (difference) return difference
  }

  return 0
}

export async function checkForUpdate(currentVersion: string, request: typeof fetch = fetch) {
  const response = await request(LATEST_RELEASE_URL, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!response.ok) throw new Error(`GitHub release request failed: ${response.status}`)

  const release = await response.json() as GitHubRelease
  if (!release.tag_name || !release.html_url) throw new Error('GitHub release response is incomplete')
  const latestVersion = normalizeVersion(release.tag_name)

  return {
    currentVersion,
    latestVersion,
    releaseUrl: release.html_url,
    updateAvailable: compareVersions(latestVersion, currentVersion) > 0,
  }
}

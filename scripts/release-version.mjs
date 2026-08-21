import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

function assertVersion(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Invalid release version: ${version}`)
}

export function nextPatchVersion(latestTag) {
  if (!latestTag) return '0.1.0'
  const version = latestTag.replace(/^v/, '')
  assertVersion(version)
  const [major, minor, patch] = version.split('.').map(Number)
  return `${major}.${minor}.${patch + 1}`
}

export function updateJsonVersion(contents, version) {
  assertVersion(version)
  const manifest = JSON.parse(contents)
  manifest.version = version
  if (manifest.packages?.['']) manifest.packages[''].version = version
  return `${JSON.stringify(manifest, null, 2)}\n`
}

export function updateCargoVersion(contents, version) {
  assertVersion(version)
  const updated = contents.replace(/(\[package\][\s\S]*?\nversion\s*=\s*")[^"]+("?)/, `$1${version}$2`)
  if (updated === contents) throw new Error('Cargo package version was not found')
  return updated
}

export async function setManifestVersions(root, version) {
  const jsonFiles = ['package.json', 'package-lock.json', 'src-tauri/tauri.conf.json']
  await Promise.all(jsonFiles.map(async (relativePath) => {
    const path = resolve(root, relativePath)
    await writeFile(path, updateJsonVersion(await readFile(path, 'utf8'), version))
  }))

  const cargoPath = resolve(root, 'src-tauri/Cargo.toml')
  await writeFile(cargoPath, updateCargoVersion(await readFile(cargoPath, 'utf8'), version))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , command, value] = process.argv
  if (command === 'next') {
    console.log(nextPatchVersion(value || ''))
  } else if (command === 'set' && value) {
    await setManifestVersions(process.cwd(), value)
  } else {
    throw new Error('Usage: release-version.mjs next [latest-tag] | set <version>')
  }
}

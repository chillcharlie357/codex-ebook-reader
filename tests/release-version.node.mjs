import assert from 'node:assert/strict'
import test from 'node:test'
import { nextPatchVersion, updateCargoVersion, updateJsonVersion } from '../scripts/release-version.mjs'

test('increments the latest stable release patch', () => {
  assert.equal(nextPatchVersion('v0.2.1'), '0.2.2')
  assert.equal(nextPatchVersion(''), '0.1.0')
})

test('updates JSON and Cargo manifest versions', () => {
  assert.equal(JSON.parse(updateJsonVersion('{"version":"0.2.1"}', '0.2.2')).version, '0.2.2')
  const lock = JSON.parse(updateJsonVersion('{"version":"0.2.1","packages":{"":{"version":"0.2.1"}}}', '0.2.2'))
  assert.equal(lock.packages[''].version, '0.2.2')
  assert.match(updateCargoVersion('[package]\nname = "reader"\nversion = "0.2.1"\n', '0.2.2'), /version = "0\.2\.2"/)
})

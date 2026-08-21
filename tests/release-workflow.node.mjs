import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const workflow = await readFile(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8')

test('publishes after a pull request is merged into main', () => {
  assert.match(workflow, /pull_request:\s*\n\s*types: \[closed\]\s*\n\s*branches: \[main\]/)
  assert.match(workflow, /github\.event\.pull_request\.merged == true/)
  assert.match(workflow, /workflow_dispatch:/)
})

test('prepares one release version for every platform build', () => {
  assert.match(workflow, /needs: prepare/)
  assert.match(workflow, /node scripts\/release-version\.mjs set/)
  assert.match(workflow, /tagName: \$\{\{ needs\.prepare\.outputs\.tag \}\}/)
})

import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))

async function unusedPort() {
  const socket = createServer().listen(0, '127.0.0.1')
  await once(socket, 'listening')
  const port = socket.address().port
  await new Promise((resolve) => socket.close(resolve))
  return port
}

async function startApp(directory, port) {
  const base = 'http://127.0.0.1:' + port
  const child = spawn(process.execPath, [
    path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next'),
    'start', '--hostname', '127.0.0.1', '--port', String(port),
  ], {
    cwd: root,
    env: { ...process.env, MELNYOS_DATA_DIR: directory, NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'ignore', 'inherit'],
  })
  const exited = once(child, 'exit')
  async function stop() {
    if (child.exitCode === null && child.signalCode === null) child.kill()
    await exited
  }
  for (let attempt = 0; attempt < 150 && child.exitCode === null; attempt++) {
    const response = await fetch(base + '/api/review').catch(() => undefined)
    if (response?.ok) return { base, stop }
    await delay(100)
  }
  await stop()
  throw new Error('The test server did not start.')
}

test('a separate install starts empty, saves to disk and rejects stale edits', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'melnyos-crm-test-'))
  const port = await unusedPort()
  let app
  t.after(async () => {
    if (app) await app.stop()
    await rm(directory, { recursive: true, force: true })
  })
  app = await startApp(directory, port)
  const { base } = app
  async function change(route, method, body) {
    return fetch(base + route, {
      method, headers: { 'Content-Type': 'application/json', Origin: base },
      body: JSON.stringify(body),
    })
  }
  const home = await fetch(base)
  assert.equal(new URL(home.url).pathname, '/admin/dashboard')
  assert.equal(home.status, 200)
  const initial = await fetch(base + '/api/review')
  assert.deepEqual(await initial.json(), { revision: 0, state: null })
  const state = { version: 2, scriptPairs: [], businesses: [], events: [], approvals: [] }
  const save = { expectedRevision: 0, state }
  assert.equal((await change('/api/review', 'PUT', save)).status, 200)
  assert.equal((await change('/api/review', 'PUT', save)).status, 409)
  for (const collection of ['finance', 'submissions', 'blog', 'events']) {
    const list = await fetch(base + '/api/records/' + collection)
    assert.deepEqual(await list.json(), { records: [] })
  }
  const ledgerEntry = { type: 'income', amountCents: 2500, date: '2026-01-15', description: 'Test entry' }
  const created = await change('/api/records/finance', 'POST', ledgerEntry)
  assert.equal(created.status, 201)
  const { record } = await created.json()
  await app.stop()
  app = undefined
  app = await startApp(directory, port)
  assert.deepEqual(await (await fetch(base + '/api/review')).json(), { revision: 1, state })
  const afterRestart = await fetch(base + '/api/records/finance')
  assert.deepEqual((await afterRestart.json()).records, [record])
  const endpoint = '/api/records/finance/' + record.id
  const updated = await change(endpoint, 'PUT', { ...ledgerEntry, amountCents: 2000, expectedRevision: record.revision })
  assert.equal(updated.status, 200)
  assert.equal((await change(endpoint, 'DELETE', { expectedRevision: record.revision })).status, 409)
  const latest = (await updated.json()).record
  assert.equal(latest.amountCents, 2000)
  assert.ok((await change(endpoint, 'DELETE', { expectedRevision: latest.revision })).ok)
  assert.deepEqual((await (await fetch(base + '/api/records/finance')).json()).records, [])
})

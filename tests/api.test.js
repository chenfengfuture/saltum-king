import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createHandler } from '../backend/app.js'
import { createLocalStore } from '../scripts/local-store.js'
import { readUser } from '../backend/lib/auth.js'

const origin = 'https://saltum.test'
const adminPassword = 'Test-admin-password-39!'
const memberPassword = 'Test-member-password-48!'
async function setup(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'saltum-api-test-'))
  t.after(async () => {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep + 'saltum-api-test-'))
    await rm(root, { recursive: true, force: true })
  })
  const store = createLocalStore(root)
  const env = { SALTUM_ADMIN_USERNAME: 'admin', SALTUM_ADMIN_PASSWORD: adminPassword, SALTUM_APP_ORIGIN: origin }
  const handler = createHandler({ storeFactory: () => store })
  function client() {
    let cookie = ''
    return {
      get cookie() { return cookie },
      async call(url, method = 'GET', body, overrides = {}) {
        const headers = { ...(cookie ? { cookie } : {}), ...(method !== 'GET' ? { origin } : {}),
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...overrides }
        for (const key of Object.keys(headers)) if (headers[key] === null) delete headers[key]
        const response = await handler({ request: new Request(origin + '/api/v1' + url, {
          method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        }), env, clientIp: '192.0.2.4' })
        const setCookie = response.headers.get('set-cookie')
        if (setCookie) cookie = setCookie.split(';')[0]
        const data = await response.json()
        return { status: response.status, data: data.data, envelope: data, headers: response.headers }
      },
      login: function(username = 'admin', password = adminPassword) { return this.call('/auth/login', 'POST', { username, password }) },
    }
  }
  const admin = client()
  return { store, env, handler, client, admin }
}
const product = { sku: 'J566', name: '网球裙', category: '裙装', colors: [{ color: '奶白', image: 'products/J566/white.jpg' }] }
const look = { title: '周末日常', anchor_sku: 'J566', narrative: '日常', items: [{ sku: 'J566', color: '奶白', role: '主款' }] }

test('health is public; every data endpoint requires a server session', async (t) => {
  const { admin } = await setup(t)
  assert.equal((await admin.call('/health')).status, 200)
  for (const endpoint of ['/looks', '/catalog', '/members', '/image-jobs', '/image-products']) {
    assert.equal((await admin.call(endpoint)).status, 401)
  }
  assert.deepEqual((await admin.call('/auth/me')).data, { user: null })
  const result = await admin.call('/looks', 'GET', undefined, { authorization: 'Bearer ignored' })
  assert.equal(result.status, 401)
  assert.equal(result.headers.get('cache-control'), 'no-store')
})

test('login hashes stored credentials and only returns user metadata plus an HttpOnly cookie', async (t) => {
  const { admin, store } = await setup(t)
  assert.equal((await admin.login('admin', 'wrong-password')).status, 401)
  const result = await admin.login()
  assert.equal(result.status, 200)
  assert.equal(result.data.user.role, 'admin')
  const cookie = result.headers.get('set-cookie')
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/']) assert.ok(cookie.includes(flag))
  assert.equal(Object.hasOwn(result.data.user, 'passwordHash'), false)
  const user = await readUser(store, 'admin')
  assert.ok(user.passwordHash.startsWith('scrypt:'))
  assert.ok(!JSON.stringify(user).includes(adminPassword))
  assert.equal((await admin.call('/auth/me')).data.user.username, 'admin')
})

test('concurrent member creation cannot overwrite the existing account or escalate roles', async (t) => {
  const { admin, store } = await setup(t)
  await admin.login()
  const body = { username: 'Member1', displayName: '成员甲', password: memberPassword, role: 'admin' }
  const results = await Promise.all([admin.call('/members', 'POST', body), admin.call('/members', 'POST', body)])
  assert.ok(results.every((r) => [201, 409].includes(r.status)))
  assert.ok(results.filter((r) => r.status === 201).length <= 1)
  if (!results.some((r) => r.status === 201)) assert.equal((await admin.call('/members', 'POST', body)).status, 201)
  assert.equal((await readUser(store, 'member1')).role, 'member')
  const listed = await admin.call('/members')
  assert.equal(listed.data.length, 2)
  assert.ok(!JSON.stringify(listed.data).includes('passwordHash'))
})

test('member permissions are enforced by the API and record ownership', async (t) => {
  const { admin, client } = await setup(t)
  await admin.login()
  await admin.call('/catalog', 'POST', product)
  for (const username of ['alice', 'bob']) await admin.call('/members', 'POST', { username, displayName: username, password: memberPassword })
  const alice = client(), bob = client()
  await alice.login('alice', memberPassword); await bob.login('bob', memberPassword)
  assert.equal((await alice.call('/members')).status, 403)
  assert.equal((await alice.call('/members', 'POST', { username: 'new-user' })).status, 403)
  assert.equal((await alice.call('/catalog', 'POST', { ...product, sku: 'J567' })).status, 403)
  const created = await alice.call('/looks', 'POST', look)
  assert.equal(created.status, 201)
  assert.equal((await bob.call('/looks/' + created.data.id, 'DELETE')).status, 403)
  assert.equal((await bob.call('/looks/' + created.data.id, 'PUT', { ...look, title: '被覆盖' })).status, 403)
  assert.equal((await admin.call('/looks/' + created.data.id, 'DELETE')).status, 200)
})

test('disable, re-enable and password reset revoke prior member sessions', async (t) => {
  const { admin, client } = await setup(t)
  await admin.login()
  await admin.call('/members', 'POST', { username: 'alice', displayName: 'Alice', password: memberPassword })
  const alice = client()
  await alice.login('alice', memberPassword)
  await admin.call('/members/alice', 'PATCH', { active: false })
  assert.equal((await alice.call('/looks')).status, 401)
  assert.equal((await alice.login('alice', memberPassword)).status, 401)
  await admin.call('/members/alice', 'PATCH', { active: true })
  assert.equal((await alice.call('/looks')).status, 401)
  await alice.login('alice', memberPassword)
  await admin.call('/members/alice', 'PATCH', { password: 'A-new-member-password-92' })
  assert.equal((await alice.call('/looks')).status, 401)
  assert.equal((await alice.login('alice', memberPassword)).status, 401)
  assert.equal((await alice.login('alice', 'A-new-member-password-92')).status, 200)
})

test('logout and password change invalidate sessions across requests and instances', async (t) => {
  const { admin, client, handler, env } = await setup(t)
  await admin.login()
  const savedCookie = admin.cookie
  await admin.call('/auth/logout', 'POST', {})
  const old = await handler({ request: new Request(origin + '/api/v1/looks', { headers: { cookie: savedCookie } }), env })
  assert.equal(old.status, 401)
  await admin.login()
  const second = client()
  await second.login()
  assert.equal((await admin.call('/auth/password', 'POST', { currentPassword: adminPassword, newPassword: 'Updated-admin-password-32' })).status, 200)
  assert.equal((await second.call('/looks')).status, 401)
  assert.equal((await admin.login()).status, 401)
  assert.equal((await admin.login('admin', 'Updated-admin-password-32')).status, 200)
})

test('expired sessions cannot access data', async (t) => {
  const { admin, store } = await setup(t)
  await admin.login()
  const { blobs } = await store.list({ prefix: 'sessions/' })
  const row = await store.get(blobs[0].key, { type: 'json' })
  await store.setJSON(blobs[0].key, { ...row, expiresAt: Date.now() - 1 })
  assert.equal((await admin.call('/looks')).status, 401)
  assert.equal(await store.get(blobs[0].key), null)
})

test('unsafe origins, non-JSON bodies, oversized payloads and traversal are rejected', async (t) => {
  const { admin } = await setup(t)
  const body = { username: 'admin', password: adminPassword }
  assert.equal((await admin.call('/auth/login', 'POST', body, { origin: 'https://other.test' })).status, 403)
  assert.equal((await admin.call('/auth/login', 'POST', body, { origin: null })).status, 403)
  assert.equal((await admin.call('/auth/login', 'POST', body, { 'Content-Type': 'text/plain' })).status, 415)
  await admin.login()
  assert.equal((await admin.call('/catalog', 'POST', { ...product, name: 'x'.repeat(300000) })).status, 413)
  assert.equal((await admin.call('/catalog', 'POST', { ...product, sku: '../escape' })).status, 400)
  assert.equal((await admin.call('/catalog', 'POST', { ...product, colors: [{ color: '绿', image: 'data:image/png;base64,abc' }] })).status, 400)
  assert.equal((await admin.call('/catalog/J566%2F..%2Fadmin')).status, 400)
})

test('catalog and looks persist across handler restarts; referenced products cannot be deleted', async (t) => {
  const { admin, store, env } = await setup(t)
  await admin.login()
  assert.equal((await admin.call('/catalog', 'POST', product)).status, 201)
  assert.equal((await admin.call('/catalog', 'POST', product)).status, 409)
  const created = await admin.call('/looks', 'POST', look)
  assert.equal(created.status, 201)
  assert.equal((await admin.call('/catalog/J566', 'DELETE')).status, 409)
  const secondHandler = createHandler({ storeFactory: () => store })
  const response = await secondHandler({ request: new Request(origin + '/api/v1/looks', { headers: { cookie: admin.cookie } }), env })
  assert.equal((await response.json()).data[0].title, '周末日常')
  await admin.call('/looks/' + created.data.id, 'PUT', { ...look, title: '更新后的搭配' })
  assert.equal((await admin.call('/looks')).data[0].title, '更新后的搭配')
  await admin.call('/looks/' + created.data.id, 'DELETE')
  assert.equal((await admin.call('/catalog/J566', 'DELETE')).status, 200)
  assert.equal((await admin.call('/catalog')).data.length, 0)
})

test('image jobs are metadata-only drafts and do not pretend to generate images', async (t) => {
  const { admin, store } = await setup(t)
  await admin.login()
  const result = await admin.call('/image-jobs', 'POST', { sku: 'J566', title: '三视图', quality: 'high', status: 'completed' })
  assert.equal(result.status, 201)
  assert.equal(result.data.status, 'draft')
  assert.deepEqual((await admin.call('/image-products')).data, [])
  assert.equal((await store.list({ prefix: 'images/' })).blobs.length, 0)
})

test('login rate limit persists across requests using independent attempt records', async (t) => {
  const { admin } = await setup(t)
  for (let n = 0; n < 20; n++) assert.equal((await admin.login('unknown-user', 'wrong-password')).status, 401)
  const blocked = await admin.login()
  assert.equal(blocked.status, 429)
  assert.equal(blocked.headers.get('retry-after'), '900')
})

test('no public registration or API for modifying the administrator; bootstrap settings can be removed', async (t) => {
  const { admin, env } = await setup(t)
  await admin.login()
  assert.equal((await admin.call('/members/admin', 'PATCH', { active: false })).status, 403)
  assert.equal((await admin.call('/auth/register', 'POST', {})).status, 404)
  delete env.SALTUM_ADMIN_PASSWORD
  assert.equal((await admin.login()).status, 200)
})

test('an administrator cannot be initialized without explicit server-side configuration', async (t) => {
  const { admin, env, store } = await setup(t)
  delete env.SALTUM_ADMIN_PASSWORD
  assert.equal((await admin.login()).status, 401)
  assert.equal((await store.list({ prefix: 'users/' })).blobs.length, 0)
})

test('concurrent password reset cannot reactivate a disabled member', async (t) => {
  const { admin, client } = await setup(t)
  await admin.login()
  await admin.call('/members', 'POST', { username: 'alice', displayName: 'Alice', password: memberPassword })
  const alice = client()
  await alice.login('alice', memberPassword)
  const results = await Promise.all([
    admin.call('/members/alice', 'PATCH', { active: false }),
    admin.call('/members/alice', 'PATCH', { password: 'Concurrent-reset-password-28' }),
  ])
  assert.ok(results.every((result) => result.status === 200))
  assert.equal((await admin.call('/members')).data.find((user) => user.username === 'alice').active, false)
  assert.equal((await alice.call('/looks')).status, 401)
  assert.equal((await alice.login('alice', 'Concurrent-reset-password-28')).status, 401)
  await admin.call('/members/alice', 'PATCH', { active: true })
  assert.equal((await alice.login('alice', 'Concurrent-reset-password-28')).status, 200)
})

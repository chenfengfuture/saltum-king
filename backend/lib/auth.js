import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { AppError, requireCondition } from './errors.js'
import { accountName, password, text } from './validation.js'
import { createUniqueRecord, readUniqueRecord, readRecord, listKeys, listRecords } from './storage.js'

const scrypt = promisify(scryptCallback)
const COOKIE = 'saltum_session'
const digest = (value) => createHash('sha256').update(value).digest('hex')
const userPrefix = (name) => 'users/' + name + '/'

export function publicUser(user) {
  return { username: user.username, displayName: user.displayName, role: user.role,
    active: user.active, created_at: user.created_at }
}

export async function hashPassword(value) {
  const salt = randomBytes(16).toString('hex')
  const derived = await scrypt(value, salt, 64)
  return 'scrypt:' + salt + ':' + derived.toString('hex')
}

export async function matchesPassword(value, encoded) {
  const [, salt, expected] = (encoded || '').split(':')
  if (!salt || !expected || !/^[a-f0-9]{128}$/.test(expected)) return false
  const actual = await scrypt(value, salt, 64)
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'))
}

// Separate status/password documents: resetting a password never re-enables a
// concurrently disabled account. Both revisions are checked on every request.
export async function readUser(store, username) {
  const base = await readUniqueRecord(store, userPrefix(username))
  if (!base) return null
  const [state, credential, profile] = await Promise.all([
    readRecord(store, 'user-state/' + base.id + '.json'),
    readRecord(store, 'user-passwords/' + base.id + '.json'),
    readRecord(store, 'user-profiles/' + base.id + '.json'),
  ])
  return { ...base, active: state?.active ?? true,
    passwordHash: credential?.passwordHash || base.passwordHash,
    displayName: profile?.displayName || base.displayName,
    authVersion: base.id + ':' + (state?.version || 'initial') + ':' + (credential?.version || 'initial') }
}

function sessionId(request) {
  const matches = (request.headers.get('cookie') || '').split(';')
    .map((part) => part.trim()).filter((part) => part.startsWith(COOKIE + '='))
  if (matches.length !== 1) return null
  const value = matches[0].slice(COOKIE.length + 1)
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null
}

function cookie(request, env, value, maxAge) {
  const secure = new URL(env.SALTUM_APP_ORIGIN || request.url).protocol === 'https:'
  return COOKIE + '=' + value + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + maxAge + (secure ? '; Secure' : '')
}

export async function currentUser(store, request) {
  const sid = sessionId(request)
  if (!sid) return null
  const key = 'sessions/' + digest(sid) + '.json'
  const session = await readRecord(store, key)
  if (!session) return null
  if (session.expiresAt <= Date.now()) { await store.delete(key); return null }
  const user = await readUser(store, session.username)
  if (!user?.active || session.authVersion !== user.authVersion) {
    await store.delete(key)
    return null
  }
  return user
}

export function requireUser(user, admin = false) {
  if (!user) throw new AppError(401, '请先登录')
  if (admin && user.role !== 'admin') throw new AppError(403, '此操作仅限管理员')
}

async function reserveLoginAttempt(store, clientIp) {
  const now = Date.now()
  const window = Math.floor(now / (15 * 60 * 1000))
  const base = 'login-attempts/' + digest(clientIp || 'unknown') + '/'
  const prefix = base + window + '/'
  const keys = await listKeys(store, base)
  await Promise.all(keys.filter((key) => !key.startsWith(prefix)).slice(0, 60).map((key) => store.delete(key)))
  const blocked = () => new AppError(429, '登录尝试过于频繁，请 15 分钟后重试', 4290, { 'Retry-After': '900' })
  if (keys.filter((key) => key.startsWith(prefix)).length >= 20) throw blocked()
  await store.setJSON(prefix + randomUUID() + '.json', { createdAt: now }, { cacheControl: 'no-store' })
  // Independent append records avoid a read-modify-write counter or unsupported lock.
  if ((await listKeys(store, prefix)).length > 20) throw blocked()
}

async function bootstrapAdmin(store, env, username, suppliedPassword) {
  if (!env.SALTUM_ADMIN_USERNAME || !env.SALTUM_ADMIN_PASSWORD) return null
  const configured = accountName(env.SALTUM_ADMIN_USERNAME)
  if (username !== configured) return null
  password(env.SALTUM_ADMIN_PASSWORD)
  if (!timingSafeEqual(Buffer.from(digest(suppliedPassword)), Buffer.from(digest(env.SALTUM_ADMIN_PASSWORD)))) return null
  const user = { id: randomUUID(), username: configured,
    displayName: text(env.SALTUM_ADMIN_NAME || '管理员', '姓名', { max: 60 }),
    role: 'admin', passwordHash: await hashPassword(suppliedPassword), created_at: new Date().toISOString() }
  if (!await createUniqueRecord(store, userPrefix(configured), user)) {
    const existing = await readUser(store, configured)
    if (!existing) throw new AppError(409, '管理员账号正在初始化，请重试')
    return existing
  }
  return readUser(store, configured)
}

export async function login(store, context, body) {
  const username = accountName(body.username)
  requireCondition(typeof body.password === 'string' && body.password.length > 0 && body.password.length <= 128, '请输入有效密码')
  await reserveLoginAttempt(store, context.clientIp)
  let user = await readUser(store, username)
  if (!user) user = await bootstrapAdmin(store, context.env, username, body.password)
  const valid = user ? await matchesPassword(body.password, user.passwordHash) : (await scrypt(body.password, 'saltum-login-padding', 64), false)
  if (!user?.active || !valid) throw new AppError(401, '账号或密码不正确，或账号已停用')
  const oldId = sessionId(context.request)
  if (oldId) await store.delete('sessions/' + digest(oldId) + '.json')
  const sid = randomBytes(32).toString('base64url')
  const hours = Number(context.env.SALTUM_SESSION_HOURS || 12)
  const ttl = Math.min(168, Math.max(1, Number.isFinite(hours) ? hours : 12)) * 3600
  await store.setJSON('sessions/' + digest(sid) + '.json', {
    username, authVersion: user.authVersion, createdAt: Date.now(), expiresAt: Date.now() + ttl * 1000,
  }, { cacheControl: 'no-store' })
  return { user: publicUser(user), cookie: cookie(context.request, context.env, sid, ttl) }
}

export async function logout(store, context) {
  const sid = sessionId(context.request)
  if (sid) await store.delete('sessions/' + digest(sid) + '.json')
  return cookie(context.request, context.env, '', 0)
}

export async function createMember(store, body, env) {
  const username = accountName(body.username)
  if (env.SALTUM_ADMIN_USERNAME && username === accountName(env.SALTUM_ADMIN_USERNAME)) throw new AppError(409, '该账号为预留管理员账号')
  const user = { id: randomUUID(), username, displayName: text(body.displayName, '姓名', { max: 60, required: true }),
    role: 'member', passwordHash: await hashPassword(password(body.password)), created_at: new Date().toISOString() }
  if (!await createUniqueRecord(store, userPrefix(username), user)) throw new AppError(409, '该账号已存在或正在创建，请刷新后重试')
  return publicUser({ ...user, active: true })
}

export async function updateMember(store, name, body) {
  const username = accountName(name)
  const user = await readUser(store, username)
  if (!user) throw new AppError(404, '账号不存在')
  requireCondition(user.role !== 'admin', '不能通过成员管理修改管理员账号', 403)
  // Validate all fields before the first write.
  if (body.active !== undefined) requireCondition(typeof body.active === 'boolean', '账号状态格式不正确')
  const displayName = body.displayName === undefined ? undefined : text(body.displayName, '姓名', { max: 60, required: true })
  const passwordHash = body.password === undefined ? undefined : await hashPassword(password(body.password))
  if (body.active !== undefined) await store.setJSON('user-state/' + user.id + '.json', { active: body.active, version: randomUUID() }, { cacheControl: 'no-store' })
  if (passwordHash) await store.setJSON('user-passwords/' + user.id + '.json', { passwordHash, version: randomUUID() }, { cacheControl: 'no-store' })
  if (displayName !== undefined) await store.setJSON('user-profiles/' + user.id + '.json', { displayName }, { cacheControl: 'no-store' })
  return publicUser(await readUser(store, username))
}

export async function changePassword(store, user, body) {
  requireCondition(typeof body.currentPassword === 'string' && body.currentPassword.length <= 128, '请输入当前密码')
  if (!await matchesPassword(body.currentPassword, user.passwordHash)) throw new AppError(400, '当前密码不正确')
  await store.setJSON('user-passwords/' + user.id + '.json', {
    passwordHash: await hashPassword(password(body.newPassword)), version: randomUUID(),
  }, { cacheControl: 'no-store' })
}

export async function members(store) {
  const names = [...new Set((await listRecords(store, 'users/')).map((row) => row.username))]
  const users = []
  for (const name of names) { const user = await readUser(store, name); if (user) users.push(publicUser(user)) }
  return users
}

export async function cleanupSessions(store) {
  let removed = 0
  for (const key of await listKeys(store, 'sessions/')) {
    const session = await readRecord(store, key)
    if (session && session.expiresAt <= Date.now()) { await store.delete(key); removed++ }
  }
  return { removed }
}

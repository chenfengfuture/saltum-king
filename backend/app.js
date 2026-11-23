import { AppError } from './lib/errors.js'
import { checkOrigin, errorResponse, jsonResponse, readJson, requestId } from './lib/http.js'
import { openStore } from './lib/storage.js'
import { login, logout, currentUser, requireUser, publicUser, members, createMember, updateMember, changePassword, cleanupSessions, authDisabled, offlineAdmin } from './lib/auth.js'
import { collection, createItem, getItem, updateItem, deleteItem } from './lib/records.js'

export function createHandler({ storeFactory = openStore } = {}) {
  return async function handle(context) {
    const id = requestId()
    context = { ...context, env: context.env || {} }
    try {
      const { request, env } = context
      const path = new URL(request.url).pathname.replace(/\/+$/, '')
      const method = request.method
      checkOrigin(request, env)
      if (path === '/api/v1/health' && method === 'GET') {
        return jsonResponse({ app: 'saltum', runtime: 'cloud-functions', storage: 'blob', images: 'oss-pending' }, id)
      }
      const store = storeFactory(env)
      if (path === '/api/v1/auth/login' && method === 'POST') {
        const result = await login(store, context, await readJson(request, 4096))
        return jsonResponse({ user: result.user }, id, 200, { 'Set-Cookie': result.cookie })
      }
      if (path === '/api/v1/auth/logout' && method === 'POST') {
        return jsonResponse(null, id, 200, { 'Set-Cookie': await logout(store, context) })
      }
      const sessionUser = await currentUser(store, request)
      const user = sessionUser || (authDisabled(env) ? offlineAdmin(env) : null)
      if (path === '/api/v1/auth/me' && method === 'GET') return jsonResponse({ user: user ? publicUser(user) : null, authDisabled: authDisabled(env) }, id)
      requireUser(user)
      if (path === '/api/v1/auth/password' && method === 'POST') {
        await changePassword(store, user, await readJson(request, 4096))
        return jsonResponse(null, id, 200, { 'Set-Cookie': await logout(store, context) })
      }
      if (path === '/api/v1/members') {
        requireUser(user, true)
        if (method === 'GET') return jsonResponse(await members(store), id)
        if (method === 'POST') return jsonResponse(await createMember(store, await readJson(request, 4096), env), id, 201)
        throw new AppError(405, '不支持的请求方法')
      }
      const memberMatch = path.match(/^\/api\/v1\/members\/([^/]+)$/)
      if (memberMatch) {
        requireUser(user, true)
        if (method !== 'PATCH') throw new AppError(405, '不支持的请求方法')
        return jsonResponse(await updateMember(store, decodeURIComponent(memberMatch[1]), await readJson(request, 4096)), id)
      }
      if (path === '/api/v1/maintenance/cleanup' && method === 'POST') {
        requireUser(user, true)
        return jsonResponse(await cleanupSessions(store), id)
      }
      if (path === '/api/v1/image-products' && method === 'GET') return jsonResponse(await collection(store, 'image-products'), id)
      const recordMatch = path.match(/^\/api\/v1\/(catalog|looks|image-jobs)(?:\/([^/]+))?$/)
      if (!recordMatch) throw new AppError(404, '接口不存在')
      const [, name, encodedId] = recordMatch
      const recordId = encodedId ? decodeURIComponent(encodedId) : null
      if (!recordId) {
        if (method === 'GET') return jsonResponse(await collection(store, name), id)
        if (method === 'POST') return jsonResponse(await createItem(store, name, await readJson(request), user), id, 201)
      } else {
        if (method === 'GET') return jsonResponse(await getItem(store, name, recordId), id)
        if (method === 'PUT' && name !== 'image-jobs') return jsonResponse(await updateItem(store, name, recordId, await readJson(request), user), id)
        if (method === 'DELETE') { await deleteItem(store, name, recordId, user); return jsonResponse(null, id) }
      }
      throw new AppError(405, '不支持的请求方法')
    } catch (error) {
      if (error instanceof URIError) error = new AppError(400, '地址格式不正确')
      return errorResponse(error, id)
    }
  }
}

export const handleRequest = createHandler()

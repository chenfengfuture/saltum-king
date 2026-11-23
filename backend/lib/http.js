import { randomUUID } from 'node:crypto'
import { AppError } from './errors.js'

export function requestId() { return randomUUID() }

export function jsonResponse(data, id, status = 200, headers = {}) {
  return Response.json({ code: 0, message: 'ok', data, request_id: id }, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Request-Id': id, ...headers },
  })
}

export function errorResponse(error, id) {
  const known = error instanceof AppError
  if (!known) console.error('[saltum]', id, error?.name || 'UnknownError')
  return Response.json({
    code: known ? error.code : 5000,
    message: known ? error.message : '服务暂时不可用，请稍后重试',
    data: null,
    request_id: id,
  }, {
    status: known ? error.status : 500,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Request-Id': id, ...(known ? error.headers : {}) },
  })
}

// Cookie authentication requires same-origin state-changing requests.
export function checkOrigin(request, env) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return
  const expected = new URL(env.SALTUM_APP_ORIGIN || request.url).origin
  const actual = request.headers.get('origin')
  if (actual !== expected || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new AppError(403, '请求来源不被允许')
  }
}

export async function readJson(request, limit = 256 * 1024) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) {
    throw new AppError(415, '请使用 JSON 格式提交')
  }
  if (Number(request.headers.get('content-length')) > limit) throw new AppError(413, '提交内容过大')
  const reader = request.body?.getReader()
  if (!reader) throw new AppError(400, '请求内容不能为空')
  const chunks = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) {
        await reader.cancel()
        throw new AppError(413, '提交内容过大')
      }
      chunks.push(value)
    }
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error('object required')
    return data
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError(400, 'JSON 格式不正确')
  } finally {
    reader.releaseLock()
  }
}

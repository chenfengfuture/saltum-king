const BASE_URL = '/api/v1'

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

async function request(path, init = {}) {
  let response
  try {
    response = await fetch(BASE_URL + path, {
      ...init, credentials: 'same-origin',
      headers: { ...init.headers, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    })
  } catch { throw new ApiError('无法连接服务，请检查网络后重试', 0) }
  let envelope
  try { envelope = await response.json() }
  catch { throw new ApiError('服务没有返回有效数据，请检查后端是否启动', response.status) }
  if (!response.ok || envelope.code !== 0) {
    if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('saltum:unauthorized'))
    throw new ApiError(envelope.message || '请求失败', response.status)
  }
  return envelope.data
}

export const http = {
  get: (path) => request(path),
  post: (path, body = {}) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
}

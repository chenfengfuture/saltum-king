import { getStore } from '@edgeone/pages-blob'
import { AppError } from './errors.js'

// Platform-injected credentials only; never supplied by the application frontend.
export function openStore(env = {}) {
  return getStore({ name: env.SALTUM_BLOB_STORE || 'saltum-data', consistency: 'strong' })
}

export async function readRecord(store, key) { return store.get(key, { type: 'json' }) }

export async function listKeys(store, prefix) {
  const { blobs } = await store.list({ prefix })
  return blobs.map((row) => row.key)
}

// The SDK's onlyIfNew option is NOT enforced by storage. Do not use it as a lock.
// Each contender writes its own UUID record. On conflict it removes ONLY its own
// uncommitted record. Existing records are never overwritten by a create operation.
// Under simultaneous first creates both may fail; the caller can safely retry.
export async function createUniqueRecord(store, prefix, value) {
  if ((await listKeys(store, prefix)).length) return false
  const key = prefix + value.id + '.json'
  await store.setJSON(key, value, { cacheControl: 'no-store' })
  if ((await listKeys(store, prefix)).some((other) => other !== key)) {
    await store.delete(key)
    return false
  }
  return true
}

export async function readUniqueRecord(store, prefix) {
  const keys = await listKeys(store, prefix)
  if (keys.length > 1) throw new AppError(409, '记录正在并发创建，请稍后重试或联系管理员检查冲突')
  return keys.length ? readRecord(store, keys[0]) : null
}

export async function listRecords(store, prefix) {
  const keys = await listKeys(store, prefix)
  const records = []
  for (let start = 0; start < keys.length; start += 12) {
    const rows = await Promise.all(keys.slice(start, start + 12).map((key) => readRecord(store, key)))
    records.push(...rows.filter(Boolean))
  }
  return records
}

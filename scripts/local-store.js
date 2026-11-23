// Explicit offline development/test adapter. Never imported by Cloud Functions.
import { mkdir, readFile, writeFile, readdir, unlink, rename } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export function createLocalStore(root) {
  function filename(key) {
    const target = path.resolve(root, key)
    if (!target.startsWith(path.resolve(root) + path.sep)) throw new Error('Invalid storage key')
    return target
  }
  async function scan(directory, prefix = '') {
    const rows = await readdir(directory, { withFileTypes: true }).catch((error) => {
      if (error.code === 'ENOENT') return []
      throw error
    })
    const keys = []
    for (const row of rows) {
      const key = prefix + row.name
      if (row.isDirectory()) keys.push(...await scan(path.join(directory, row.name), key + '/'))
      else if (!row.name.endsWith('.tmp')) keys.push(key)
    }
    return keys
  }
  return {
    async get(key, options = {}) {
      try { const raw = await readFile(filename(key), 'utf8'); return options.type === 'json' ? JSON.parse(raw) : raw }
      catch (error) { if (error.code === 'ENOENT') return null; throw error }
    },
    async setJSON(key, value) {
      const file = filename(key)
      await mkdir(path.dirname(file), { recursive: true })
      const temporary = file + '.' + randomUUID() + '.tmp'
      try {
        await writeFile(temporary, JSON.stringify(value), { mode: 0o600 })
        await rename(temporary, file)
      } finally { await unlink(temporary).catch((error) => { if (error.code !== 'ENOENT') throw error }) }
    },
    async delete(key) { await unlink(filename(key)).catch((error) => { if (error.code !== 'ENOENT') throw error }) },
    async list({ prefix = '' } = {}) {
      return { blobs: (await scan(root)).filter((key) => key.startsWith(prefix)).sort().map((key) => ({ key })) }
    },
  }
}

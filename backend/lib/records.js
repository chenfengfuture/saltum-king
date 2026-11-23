import { randomUUID } from 'node:crypto'
import { AppError, requireCondition } from './errors.js'
import { createUniqueRecord, readUniqueRecord, readRecord, listRecords } from './storage.js'
import { productInput, lookInput, jobInput, identifier } from './validation.js'

const definitions = {
  catalog: { prefix: 'catalog/', validate: productInput, key: (row) => row.sku, admin: true },
  looks: { prefix: 'looks/', validate: lookInput, key: (row) => row.id },
  'image-jobs': { prefix: 'image-jobs/', validate: jobInput, key: (row) => row.id },
}

export async function collection(store, name) {
  const prefix = name === 'image-products' ? 'image-products/' : definitions[name].prefix
  const rows = await listRecords(store, prefix)
  return rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

function requireWrite(def, user, row) {
  if (def.admin && user.role !== 'admin') throw new AppError(403, '商品目录由管理员维护')
  if (row && !def.admin && user.role !== 'admin' && row.created_by !== user.username) {
    throw new AppError(403, '只能修改自己创建的记录')
  }
}

async function checkLookProducts(store, row) {
  const skus = [...new Set([row.anchor_sku, ...row.items.map((item) => item.sku)])]
  for (const sku of skus) {
    if (!await readUniqueRecord(store, 'catalog/' + sku + '/')) throw new AppError(400, '商品目录中不存在货号：' + sku)
  }
}

export async function createItem(store, name, body, user) {
  const def = definitions[name]
  requireWrite(def, user)
  const row = def.validate(body)
  if (name === 'looks') await checkLookProducts(store, row)
  const now = new Date().toISOString()
  Object.assign(row, { created_at: now, updated_at: now, created_by: user.username })
  row.id = randomUUID()
  if (name === 'image-jobs') row.status = 'draft'
  if (name === 'catalog') {
    if (!await createUniqueRecord(store, 'catalog/' + row.sku + '/', row)) throw new AppError(409, '该货号已存在或正在创建')
  } else await store.setJSON(def.prefix + row.id + '.json', row)
  return row
}

export async function getItem(store, name, id) {
  const def = definitions[name]
  const key = def.prefix + identifier(id) + '.json'
  const row = name === 'catalog' ? await readUniqueRecord(store, 'catalog/' + identifier(id) + '/') : await readRecord(store, key)
  if (!row) throw new AppError(404, '记录不存在')
  return row
}

export async function updateItem(store, name, id, body, user) {
  const def = definitions[name]
  const old = await getItem(store, name, id)
  requireWrite(def, user, old)
  const data = def.validate(body)
  if (name === 'catalog') requireCondition(data.sku === id, '编辑时不能更改货号')
  if (name === 'looks') await checkLookProducts(store, data)
  const row = { ...old, ...data, updated_at: new Date().toISOString() }
  const key = name === 'catalog' ? 'catalog/' + row.sku + '/' + row.id + '.json' : def.prefix + row.id + '.json'
  await store.setJSON(key, row)
  return row
}

export async function deleteItem(store, name, id, user) {
  const def = definitions[name]
  const row = await getItem(store, name, id)
  requireWrite(def, user, row)
  if (name === 'catalog') {
    const looks = await collection(store, 'looks')
    if (looks.some((look) => look.anchor_sku === id || look.items.some((item) => item.sku === id))) {
      throw new AppError(409, '这个商品仍被搭配记录使用，请先修改相关搭配')
    }
  }
  const key = name === 'catalog' ? 'catalog/' + row.sku + '/' + row.id + '.json' : def.prefix + row.id + '.json'
  await store.delete(key)
}

import { requireCondition } from './errors.js'

export function text(value, label, { max = 200, required = false } = {}) {
  requireCondition(value === undefined || typeof value === 'string', label + '必须是文字')
  const result = (value || '').trim()
  requireCondition(result.length <= max && (!required || result.length > 0), label + '长度不符合要求')
  return result
}

export function accountName(value) {
  const result = text(value, '账号', { max: 64, required: true }).toLowerCase()
  requireCondition(/^[a-z0-9][a-z0-9_.@+-]{2,63}$/.test(result), '账号需为 3–64 位字母、数字或 . _ @ + -')
  return result
}

export function password(value, { min = 10 } = {}) {
  requireCondition(typeof value === 'string' && value.length >= min && value.length <= 128, '密码需为 ' + min + '–128 位')
  return value
}

export function identifier(value, label = '编号') {
  const result = text(value, label, { max: 80, required: true })
  requireCondition(/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(result) && !result.includes('..'), label + '格式不正确')
  return result
}

export function enumValue(value, choices, fallback, label) {
  const result = value ?? fallback
  requireCondition(choices.includes(result), label + '不在允许范围内')
  return result
}

function array(value, label, max = 40) {
  requireCondition(value === undefined || Array.isArray(value), label + '必须是列表')
  const result = value || []
  requireCondition(result.length <= max, label + '数量过多')
  return result
}

function imageKey(value) {
  const result = text(value, '图片路径', { max: 500 })
  requireCondition(!result || (!/^(?:[a-z]+:|[\\/])/i.test(result) && !result.split(/[\\/]/).includes('..')), '图片请填写 OSS 相对对象路径')
  return result.replaceAll('\\', '/')
}

export function productInput(body) {
  const sku = identifier(body.sku, '货号')
  const colors = array(body.colors, '配色').map((row) => {
    requireCondition(row && typeof row === 'object' && !Array.isArray(row), '配色格式不正确')
    return {
      sku, color: text(row.color, '颜色', { max: 60, required: true }),
      variant: text(row.variant, '款式', { max: 60 }), image: imageKey(row.image),
      family: text(row.family, '色系', { max: 60 }),
    }
  })
  requireCondition(new Set(colors.map((row) => row.color)).size === colors.length, '配色名称不能重复')
  return { sku, name: text(body.name, '品名', { required: true, max: 120 }),
    category: text(body.category, '品类', { max: 60 }), kind: text(body.kind, '类型', { max: 60 }), colors }
}

export function lookInput(body) {
  const details = body.details || {}
  requireCondition(typeof details === 'object' && !Array.isArray(details) && Object.keys(details).length <= 20, '搭配详情格式不正确')
  const items = array(body.items, '搭配单品', 20).map((row) => {
    requireCondition(row && typeof row === 'object' && !Array.isArray(row), '搭配单品格式不正确')
    return { role: text(row.role, '单品角色', { max: 40 }), sku: identifier(row.sku, '单品货号'),
      color: text(row.color, '单品颜色', { max: 60 }), image: imageKey(row.image), optional: row.optional === true }
  })
  const detailRows = Object.entries(details).map(([key, value]) => [text(key, '详情名', { max: 50 }), text(value, '详情内容', { max: 1000 })])
  return {
    title: text(body.title, '搭配名称', { required: true, max: 120 }),
    anchor_sku: identifier(body.anchor_sku, '主款货号'),
    anchor_color: text(body.anchor_color, '主款颜色', { max: 60 }),
    narrative: enumValue(body.narrative, ['日常', '网球'], '日常', '叙事'),
    review_status: enumValue(body.review_status, ['规则候选', '已看图选配'], '规则候选', '复核状态'),
    session: text(body.session, '批次', { max: 80 }), selection: text(body.selection, '选配', { max: 80 }),
    subscene: text(body.subscene, '子场景', { max: 80 }),
    scene: array(body.scene, '场景', 10).map((s) => text(s, '场景', { max: 80 })),
    summary: text(body.summary, '搭配说明', { max: 2000 }),
    source: text(body.source, '来源', { max: 200 }),
    details: Object.fromEntries(detailRows), items,
  }
}

export function jobInput(body) {
  return { sku: identifier(body.sku, '货号'), title: text(body.title, '名称', { max: 120 }),
    category: text(body.category, '品类', { max: 60 }),
    quality: enumValue(body.quality, ['high', 'medium', 'low'], 'high', '画质'),
    note: text(body.note, '备注', { max: 1000 }) }
}

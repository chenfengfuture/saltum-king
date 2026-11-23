import test from 'node:test'
import assert from 'node:assert/strict'
import { filterLooks } from '../frontend/src/utils/filters.js'
import { resolveImageUrl } from '../frontend/src/utils/image.js'

const rows = [
  { id: '1', title: '网球搭配', anchor_sku: 'A01', anchor_color: '绿', narrative: '网球', review_status: '规则候选', items: [{ sku: 'B02', color: '白' }] },
  { id: '2', title: '日常搭配', anchor_sku: 'B02', anchor_color: '白', narrative: '日常', review_status: '已看图选配', items: [{ sku: 'A01', color: '蓝' }] },
]
test('hero, used, all and color filters respect the actual product relation', () => {
  const ids = (filters) => filterLooks(rows, filters).map((row) => row.id)
  assert.deepEqual(ids({ sku: 'A01', view: 'hero' }), ['1'])
  assert.deepEqual(ids({ sku: 'A01', view: 'used' }), ['2'])
  assert.deepEqual(ids({ sku: 'A01', view: 'all' }), ['1', '2'])
  assert.deepEqual(ids({ sku: 'A01', view: 'all', color: '蓝' }), ['2'])
  assert.deepEqual(ids({ line: '网球', query: 'b02' }), ['1'])
  assert.deepEqual(ids({ review: '已看图选配' }), ['2'])
  assert.deepEqual(ids({ query: '  蓝  ' }), ['2'])
})

test('image URLs stay empty until OSS is configured, and unsafe paths never render', () => {
  assert.equal(resolveImageUrl('products/绿.jpg', ''), '')
  assert.equal(resolveImageUrl('products/绿.jpg', 'https://cdn.example.test'), 'https://cdn.example.test/products/%E7%BB%BF.jpg')
  for (const key of ['../secret', 'javascript:alert(1)', '//evil.test/image', '/absolute.jpg', 'data:image/png;base64,abc']) {
    assert.equal(resolveImageUrl(key, 'https://cdn.example.test'), '')
  }
  assert.equal(resolveImageUrl('image.jpg', 'http://cdn.example.test'), '')
  assert.equal(resolveImageUrl('image.jpg', 'https://user:password@cdn.example.test'), '')
})

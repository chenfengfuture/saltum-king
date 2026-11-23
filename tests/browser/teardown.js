import { rm } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
export default async function teardown(config) {
  const root = path.resolve(config.metadata.localData)
  const expected = path.resolve(os.tmpdir()) + path.sep + 'saltum-browser-test-'
  if (!root.startsWith(expected)) throw new Error('Refusing to remove unexpected test path')
  await rm(root, { recursive: true, force: true })
}

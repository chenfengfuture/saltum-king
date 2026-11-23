import { defineConfig } from '@playwright/test'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const localData = path.join(os.tmpdir(), 'saltum-browser-test-' + randomUUID())
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  retries: 0,
  reporter: 'list',
  outputDir: 'test-results/browser',
  metadata: { localData },
  globalTeardown: './tests/browser/teardown.js',
  use: {
    baseURL: 'http://127.0.0.1:5189',
    channel: process.platform === 'win32' ? 'chrome' : undefined,
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/dev-local.js',
    url: 'http://127.0.0.1:5189/api/v1/health',
    reuseExistingServer: false,
    timeout: 30000,
    env: {
      PORT: '5189', SALTUM_LOCAL_DATA_DIR: localData,
      SALTUM_ADMIN_USERNAME: 'test-admin', SALTUM_ADMIN_PASSWORD: 'Browser-test-password-47!',
      SALTUM_ADMIN_NAME: '测试管理员', SALTUM_APP_ORIGIN: 'http://127.0.0.1:5189',
    },
  },
})

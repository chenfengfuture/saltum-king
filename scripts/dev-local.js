import { createServer, loadEnv } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHandler } from '../backend/app.js'
import { createLocalStore } from './local-store.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const env = { ...loadEnv('development', root, ''), ...process.env }
const port = Number(env.PORT || 5180)
const store = createLocalStore(env.SALTUM_LOCAL_DATA_DIR || path.join(root, '.local-data'))
const handler = createHandler({ storeFactory: () => store })
const server = await createServer({
  configFile: path.join(root, 'frontend/vite.config.js'),
  server: { host: '127.0.0.1', port, strictPort: true },
  plugins: [{
    name: 'saltum-offline-api',
    configureServer(vite) {
      vite.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        try {
          // 用浏览器实际访问的 Host 构造请求地址，这样 localhost 与 127.0.0.1
          // 两种写法都能通过 checkOrigin 的同源校验。
          const origin = 'http://' + (req.headers.host || '127.0.0.1:' + port)
          const headers = new Headers()
          for (const [key, value] of Object.entries(req.headers)) {
            if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
          }
          const options = { method: req.method, headers }
          if (!['GET', 'HEAD'].includes(req.method)) Object.assign(options, { body: req, duplex: 'half' })
          const response = await handler({ request: new Request(origin + req.url, options), env, clientIp: req.socket.remoteAddress })
          res.statusCode = response.status
          for (const [key, value] of response.headers) res.setHeader(key, value)
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch {
          res.statusCode = 500
          res.end('Local development request failed')
        }
      })
    },
  }],
})
await server.listen()
console.log('SALTUM offline preview: http://127.0.0.1:' + port)
console.log('Offline data only. Production uses EdgeOne Blob; this preview never connects to your cloud account.')
const stop = async () => { await server.close(); process.exit(0) }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)

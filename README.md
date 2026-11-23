# SALTUM · KING — EdgeOne 骨架

产品与搭配工作台：Vue 3 + JavaScript 前端、EdgeOne Cloud Functions JavaScript 后端、EdgeOne Blob 数据存储。图片只预留阿里云 OSS 对象路径，本阶段不上传或生成图片。

## 目录

- cloud-functions/api/v1/[[path]].js：EdgeOne 云函数入口，使用平台 onRequest(context)，不启动独立 HTTP 服务。
- backend/app.js：API 路由、鉴权和统一响应。
- backend/lib/：Blob 数据访问、账号会话、校验和业务记录。
- frontend/src/：Vue 单页应用，全部为 JavaScript，包含登录、商品、搭配、成员、图片任务、个人账号。
- scripts/：明确隔离的离线开发适配器，仅用于本地；云函数不导入本地文件存储。
- tests/：接口与浏览器测试。
- edgeone.json：根目录构建配置；构建产物为 dist。

旧 Python 后端已替换。没有发现旧的业务数据文件，本次没有伪造或导入业务数据。

## 本地启动

在这个 saltum 根目录执行，而不是在 frontend 下单独安装：

~~~powershell
npm ci
Copy-Item .env.example .env.local
~~~

编辑 .env.local，设置自己的 SALTUM_ADMIN_USERNAME 和 SALTUM_ADMIN_PASSWORD（管理员密码 6–128 位）；不要使用示例/测试账号作为正式账号。然后：

~~~powershell
npm run dev:local
~~~

访问 http://127.0.0.1:5180 。初始管理员首次正确登录时写入数据，之后在「成员管理」中创建成员。成员可以在「个人账号」修改密码。

这个命令将离线开发数据写入被忽略的 .local-data/，**不会连接或写入线上 Blob**。它用于不依赖云项目的功能验证。正式云函数始终使用 @edgeone/pages-blob，没有本地存储回退。

npm run dev 是提供给 EdgeOne 本地开发代理的 Vite 前端命令，单独运行它没有后端。已关联云项目后可使用 npm run dev:edgeone；该模式需要 EdgeOne 登录和项目关联，并会使用云端数据。

## EdgeOne 配置

本次只完成代码改造及本地测试，尚未为这个目录创建/关联云项目、设置线上账号或部署。

1. 使用已登录的 EdgeOne 账号，明确选择工作区和云项目，然后关联这个 saltum 根目录。不要选择 frontend 子目录。
2. 在项目的服务端环境变量中设置初始管理员账号和密码；正式站点建议同时设置 SALTUM_APP_ORIGIN 为完整 HTTPS origin。
3. 依赖安装命令为 npm ci，构建命令为 npm run build，输出目录为 dist。根目录保留 cloud-functions/ 和 backend/ 供平台打包，不要只上传前端 dist 目录。
4. 平台负责给 Blob SDK 注入权限，无需向应用前端提供平台凭据。getStore 使用 strong 一致性。
5. 部署后验证登录、创建成员、保存商品、刷新读取、退出登录。云端 Blob 的真实读写需要在关联后完成验收。

配置遵循 [Cloud Functions](https://pages.edgeone.ai/document/node-functions) 和 [edgeone.json](https://pages.edgeone.ai/document/edgeone-json) 文档。Vue/Vite 静态前端不需要额外框架适配器。使用 hash 路由，刷新 /#/catalog 等页面不会覆盖 /api/v1/* 云函数路由。

| 环境变量 | 作用 |
| --- | --- |
| SALTUM_ADMIN_USERNAME | 初始管理员账号，3–64 位字母、数字或 . _ @ + - |
| SALTUM_ADMIN_PASSWORD | 首次登录初始化用密码，6–128 位（成员密码仍要求 10–128 位），不得使用 VITE_ 前缀 |
| SALTUM_ADMIN_NAME | 管理员显示名称，默认「管理员」 |
| SALTUM_BLOB_STORE | Blob 命名空间，默认 saltum-data |
| SALTUM_SESSION_HOURS | 会话有效小时数，默认 12，范围 1–168 |
| SALTUM_APP_ORIGIN | 站点 origin，例如 https://your-domain.example，不含路径 |
| VITE_OSS_BASE_URL | 预留的公开 HTTPS OSS/CDN 根地址，当前留空 |

初始化后账号和密码哈希保存在 Blob。修改密码通过应用完成，旧初始化密码不会覆盖已存在账号。首次设置完成后可移除 SALTUM_ADMIN_PASSWORD；请妥善保管管理员密码。

## 登录与权限

应用使用账号密码 + 服务端会话 + HttpOnly Cookie，不使用 JWT、Bearer、前端凭据存储或浏览器自行拼接鉴权头。密码通过带随机盐的 scrypt 哈希保存，HTTPS 站点的 Cookie 带 Secure，写操作检查同源 Origin。所有业务 API 均检查身份。

| 操作 | 管理员 | 成员 |
| --- | --- | --- |
| 查看商品与搭配 | 可以 | 可以 |
| 维护商品目录 | 可以 | 不可以 |
| 新建搭配、图片任务草稿 | 可以 | 可以 |
| 编辑/删除搭配与任务 | 全部记录 | 自己创建的记录 |
| 创建成员、停用/启用、重置成员密码 | 可以 | 不可以 |
| 修改自己的密码 | 可以 | 可以 |

停用、重新启用或重置密码都会使旧会话失效；修改本人密码后所有设备重新登录。登录按客户端 IP 限制为每 15 分钟最多 20 次尝试，保存在 Blob，不依赖进程内存。反向代理不得将客户端自报的 IP 当成可信 clientIp。

## 数据与图片

每条记录单独保存，不把整张表覆盖写入一个 JSON。示例键：

~~~text
users/<username>/<uuid>.json        账号基础信息与初始密码哈希
user-state/<uuid>.json              启用状态与版本
user-passwords/<uuid>.json          更新后的密码哈希与版本
user-profiles/<uuid>.json           姓名变更
sessions/<session-hash>.json        服务端会话及过期时间
login-attempts/<ip-hash>/<window>/<uuid>.json
catalog/<sku>/<uuid>.json           商品及配色
looks/<uuid>.json                   搭配
image-jobs/<uuid>.json              图片需求草稿
image-products/<uuid>.json          预留图片资产元数据
~~~

Blob 不是事务数据库。SDK 0.0.19 标注 onlyIfNew 不由底层存储执行，代码没有依赖它做锁或唯一性保证。账号和货号创建使用独立 UUID 记录并检查冲突；并发创建时可能都返回冲突，需要刷新重试，不覆盖已有账号。账号状态和密码分开保存，密码重置不会将停用账号重新启用。同一商品或搭配的并发编辑仍为后写覆盖；商品删除的引用检查也不是跨记录事务。当前骨架适合小团队工作台，不承诺事务级并发。

列表由 Blob SDK 自动跨页读取，界面内筛选和分页。数据量增长后应增加服务端分页和检索索引。过期会话不能使用，访问时会清理；管理员也可以调用 POST /api/v1/maintenance/cleanup 清理过期会话。

商品配色和搭配单品的 image 字段只存 OSS 相对对象路径，不接收图片二进制、Base64 或任意外部地址。VITE_OSS_BASE_URL 为空时展示占位图，不发起图片请求。图片任务只能保存为草稿，不执行上传、生成或实际入库。OSS 凭据、上传签名、权限、缩略图与生成服务均未实现。

## 验证

~~~powershell
npm test
npm run build
npm run test:browser
~~~

浏览器测试使用本机 Chrome（Windows）；其他系统使用 Playwright Chromium。测试账号及数据隔离在临时目录，结束后清理，不写入真实账号或云项目。浏览器测试覆盖管理员/成员登录、商品和搭配保存、刷新、草稿、权限和移动端布局。截图保存在 test-results/browser/。

更多接口见 backend/README.md，前端约定见 frontend/README.md。

# Vue 3 + JavaScript 骨架

前端使用 Vue 3、Pinia、Vue Router、Vite。EdgeOne 直接托管构建后的 HTML/CSS/JavaScript，无需改成另一种专用前端语言。已移除 TypeScript 配置和 Python 后端代理。

## 页面

- /#/login：账号密码登录。
- /#/：货号、颜色、叙事、参与关系、复核与关键词筛选；新建、编辑、删除搭配；分页。
- /#/catalog：商品目录，管理员维护货号和配色。
- /#/image：图片需求草稿，不执行图片上传或生成。
- /#/members：管理员创建成员、停用/启用、重置密码。
- /#/account：修改本人密码。
- 未知路由显示应用内 404。

页面使用简洁骨架布局；加载时显示 Skeleton，另有明确的空状态、错误提示与重试。桌面和移动端共用组件。

## 数据约定

所有请求集中于 src/api/，使用同源 /api/v1 和 credentials: same-origin。没有浏览器持久化登录凭据或手工鉴权头。前端路由守卫用于页面体验，真正的权限判断始终由服务端完成。

src/stores/auth.js 管理当前用户；src/stores/look.js 管理商品与搭配。退出登录和账号切换会清空前端业务状态。请求身份过期时回到登录页。

src/utils/filters.js 处理主款/被搭配/全部参与筛选和颜色；分页总数为完整筛选结果数。

src/utils/image.js 只将受限制的 OSS 相对路径拼接到 VITE_OSS_BASE_URL。配置为空时 ProductImage 显示占位图，不请求本地旧图片目录或不存在的 URL。此处只预留读取地址，不代表 OSS 上传服务已经接通。

## 构建

依赖统一在项目根目录安装。根目录 npm run build 输出 dist/，可被 EdgeOne 静态托管；API 另由根目录 cloud-functions/ 提供。

本地完整预览：根目录 npm run dev:local。已关联云项目后：npm run dev:edgeone。前端本身的 npm run dev 供 EdgeOne 开发代理调用，单独使用时不带业务 API。

根目录 .env.local 中的 VITE_OSS_BASE_URL 属于公开构建配置。管理员密码与其他服务端配置不得添加 VITE_ 前缀。

浏览器验证：根目录 npm run test:browser。

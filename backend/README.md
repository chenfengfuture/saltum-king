# JavaScript Cloud Functions 后端

入口是根目录 cloud-functions/api/v1/[[path]].js，业务实现放在 backend/。所有生产配置从 context.env 读取；平台 SDK 自行取得 Blob 权限。生产数据不写本地文件，不依赖 Python、数据库服务器或常驻 Node HTTP 服务。

统一响应：

~~~json
{ "code": 0, "message": "ok", "data": {}, "request_id": "服务端生成的请求编号" }
~~~

错误同时使用正确 HTTP 状态码和非零 code。所有 API 响应带 Cache-Control: no-store；不向客户端返回密码哈希或内部异常细节。

## API

前缀：/api/v1。除 health、登录、退出、当前登录信息外，均要求 Cookie 会话。

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | /health | 应用存活信息，不验证 Blob 连接 |
| POST | /auth/login | username/password 登录 |
| GET | /auth/me | 当前用户；未登录时 user 为 null |
| POST | /auth/logout | 删除当前服务端会话并清除 Cookie |
| POST | /auth/password | currentPassword/newPassword，成功后退出所有会话 |
| GET | /members | 管理员列出账号 |
| POST | /members | 管理员创建成员：username/displayName/password |
| PATCH | /members/:username | 管理员修改成员 active、displayName 或 password；不能修改管理员 |
| GET / POST | /catalog | 查看/创建商品；创建仅管理员 |
| GET / PUT / DELETE | /catalog/:sku | 查看/完整更新/删除商品；写入仅管理员 |
| GET / POST | /looks | 查看/新建搭配 |
| GET / PUT / DELETE | /looks/:id | 查看/完整更新/删除搭配 |
| GET / POST | /image-jobs | 查看/创建图片需求草稿 |
| GET / DELETE | /image-jobs/:id | 查看/删除图片草稿 |
| GET | /image-products | 预留图片资产元数据列表，当前没有写入流程 |
| POST | /maintenance/cleanup | 管理员清理过期会话 |

写操作必须来自同源 Origin，有正文时使用 application/json。登录/账号请求限制 4 KiB，业务正文限制 256 KiB。不开放匿名注册、任意 Blob 键访问或文件上传。

## 商品结构

~~~json
{
  "sku": "J566",
  "name": "网球裙",
  "category": "裙装",
  "kind": "",
  "colors": [{ "color": "奶白", "image": "products/J566/white.jpg", "variant": "", "family": "" }]
}
~~~

商品更新不能修改货号；配色名称不得重复。被搭配引用的商品不能直接删除。

## 搭配结构

~~~json
{
  "title": "周末日常",
  "anchor_sku": "J566",
  "anchor_color": "奶白",
  "narrative": "日常",
  "review_status": "规则候选",
  "items": [{ "sku": "J566", "color": "奶白", "role": "主款", "image": "", "optional": false }],
  "summary": "搭配说明",
  "details": {},
  "scene": [],
  "subscene": "",
  "session": "",
  "selection": "",
  "source": ""
}
~~~

主款与所有单品的货号必须已经存在。id、created_at、updated_at、created_by 由服务端生成；客户端不能借此伪造记录归属。管理员可修改全部，成员仅修改自己创建的记录。

## 会话与数据一致性

密码使用 scrypt；会话使用随机标识，Cookie 由服务器设置且 JavaScript 不可读。Blob 只保存会话标识的 SHA-256 摘要。密码和账号启用状态拥有独立版本，读取会话时重新验证这两个版本，防止停用/重置后旧会话继续使用。

所有 getStore 实例显式使用 strong 一致性。数据模型和 Blob 并发边界见根目录 README。离线测试注入单独的文件适配器，绝不通过生产配置切换到本地存储。

运行接口测试：在根目录 npm test。真实 Blob 验收需要先关联 EdgeOne 项目，不以离线测试结果替代云端读写验证。

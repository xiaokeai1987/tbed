# 部署指南（Cloudflare Pages）

## 必要配置
- Functions 目录：`functions/`（无需构建命令）
- Bindings
  - KV Namespace：Binding 名 `kv`
  - D1 Database：Binding 名 `db`
- Environment Variables
  - `PASSWORD`：管理员后台密码
  - `TGBOT`、`TGGROUP`（可选，用于 Telegram 推送）
  - `SIGHTENGINE_USER`、`SIGHTENGINE_KEY`（可选，支持数组：`["user1","user2"]`、`["secret1","secret2"]`）

## 一次性初始化
- 打开 D1 数据库 → Query → 执行 `d1/schema.sql`

## 路由与接口
- 页面：`/` 首页；`/admin` 管理后台（需 Bearer `PASSWORD`）
- 列表：`GET /api/images?sort=hot|latest&limit=20&cursor=...`
- 上传：`POST /api/upload`（JPG/PNG ≤ 5MB）
- 代理：`GET /api/i/:id?w=...&h=...&q=...`
- 点赞：`POST /api/like`
- 设置：`GET /api/settings`
- 管理：`GET /api/admin/images`、`POST /api/admin/delete`、`GET/POST /api/admin/settings`

## 分页与前端行为
- 移动端每页 10 张；桌面端每页 21 张
- 页码可直接跳转；绑定 D1 可随机访问任意页

## 图片过滤（可选）
- 在后台启用“开启图片过滤”
- 多账号：`SIGHTENGINE_USER=["user1","user2"]`、`SIGHTENGINE_KEY=["secret1","secret2"]`
- 当前账号索引存储：KV `settings:sightengine_index`

## 验证
- `GET /api/env?test=1` 查看绑定状态（脱敏）
- `GET /api/count` 查看总图片数量

## 本地开发
- `npm i`、`npm run dev`
- `.dev.vars` 写入 `PASSWORD`（以及可选 `TGBOT`、`TGGROUP`）

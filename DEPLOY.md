# Cloudflare Pages 仪表盘部署与绑定（最简）

## 一次性准备
- 创建 Pages 项目：选择 “Direct Upload” 或 “Connect to Git”
- 上传代码或连接仓库后，Pages 会自动识别 functions/ 作为 Functions
- 本项目无需构建命令；如已设置，请清空 Build command

## 仪表盘绑定
1) 进入 Pages → 你的项目 → Settings → Functions → Bindings
- 添加 KV Namespace
  - Binding: kv
  - 选择或创建一个命名空间
- 添加 D1 Database
  - Binding: db
  - 选择或创建一个 D1 数据库

2) 环境变量
- Pages → 项目 → Settings → Environment Variables
- 添加：
  - TGBOT: Telegram 机器人令牌（形如 123456789:AA...）
  - TGGROUP: 目标群/频道 id（-100 开头的 id 或 @username）

3) 初始化 D1 表（一次性）
- 打开 D1 数据库 → Query
- 复制 d1/schema.sql 内容并执行

## 验证
- 访问 /api/env?test=1 查看状态（脱敏输出）
  - kv_bound=true、d1_bound=true、telegram_token_valid=true 表示绑定与令牌正常
- 上传一张 JPG/PNG（≤ 5MB）
  - 成功后会写入 D1/KV，并向群/频道推送图片

## 说明
- 绑定名需与代码一致：kv、db
- wrangler.toml 只保留基础配置；正式环境的绑定全部在仪表盘完成

# @hxflow/console

hxflow 本地 Web 控制台。实时查看 agent run 的历史记录、事件流、代码 diff 和费用统计，通过 SSE 尾随正在运行的 run。

## 快速启动

```bash
# 通过 hx CLI 启动（推荐）
hx console

# 或直接运行
hx-console
```

启动后终端输出带 token 的访问 URL：

```
hx-console listening on http://0.0.0.0:7878
Open: http://localhost:7878/?token=<token>
```

## 功能

| 视图 | 说明 |
|------|------|
| **Run List** | 所有历史 run，显示状态、耗时、费用 |
| **Overview** | Run 详情：镜像、profile、各 phase 时长 |
| **Events** | 实时事件流（assistant 思考过程、工具调用）|
| **Diff** | 代码变更高亮（语法着色）|

## 命令

```bash
hx console              # 启动，自动打开浏览器
hx console --no-open    # 启动，不打开浏览器
hx console --status     # 查看 server 状态（pid / port / URL）
hx console --stop       # 停止后台 server
```

## 安全说明

- 默认监听 `0.0.0.0:7878`，**局域网内可访问**
- 所有 API 需要 token 鉴权（`?token=` 或 `Authorization: Bearer`）
- Token 存于 `~/.hx/console/token`，权限 `0600`，首次启动自动生成
- 勿在公网环境运行；如需限制本机访问：`--host 127.0.0.1`

## 安装

### Binary（推荐）

```bash
# macOS arm64
curl -L https://github.com/hxflow/console/releases/latest/download/hx-console-darwin-arm64 \
  -o /usr/local/bin/hx-console && chmod +x /usr/local/bin/hx-console
```

### npm

```bash
echo "@hxflow:registry=https://npm.pkg.github.com" >> ~/.npmrc
bun install -g @hxflow/console
```

## 本地开发

```bash
cd ui

# 启动 API server（监听 7878）
bun server/index.ts

# 启动 Vite dev server（监听 5173，自动代理 /api → 7878）
bunx vite web
```

## 技术栈

- **Server**：[Hono](https://hono.dev) + Bun
- **Frontend**：React 19 + Vite
- **实时推送**：SSE（尾随 `trace.jsonl`，fs.watch + 增量读）
- **分发**：`bun build --compile` 单二进制

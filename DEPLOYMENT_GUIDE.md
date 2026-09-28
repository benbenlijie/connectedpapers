# 本地部署与运行指南

本项目为本地优先应用：单个 Bun 进程同时提供 API 与前端静态文件，数据保存在本地 SQLite（`data/app.db`）。本文说明如何在本机初始化、构建并常驻运行。

## 环境要求

- **Bun** ≥ 1.3
- **pnpm** 9

## 1. 初始化

```bash
git clone <repo> && cd connectedpapers
bash scripts/setup.sh
```

脚本会：检查 Bun/pnpm、创建 `data/` 目录、在缺失时从 `server/.env.example` 复制出 `server/.env`、安装前端依赖。

如需使用 Semantic Scholar API key，编辑 `server/.env`：

```env
SEMANTIC_SCHOLAR_API_KEY=your_key_here   # 可选
CONTACT_EMAIL=you@example.com
PORT=8787
```

## 2. 构建前端

```bash
bun run build:web
```

产物输出到 `academic-paper-explorer/dist/`，由后端进程托管。

## 3. 启动服务

```bash
bun run server
```

默认监听 `http://127.0.0.1:8787`。换端口：

```bash
PORT=9000 bun run server
```

## 4. 常驻运行（可选）

### nohup

```bash
nohup bun run server > server.log 2>&1 &
```

### systemd（用户级服务示例）

创建 `~/.config/systemd/user/connectedpapers.service`：

```ini
[Unit]
Description=ConnectedPapers local server
After=network.target

[Service]
WorkingDirectory=%h/Documents/projects/connectedpapers
ExecStart=/usr/bin/env bun run server
Restart=on-failure

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now connectedpapers.service
```

## 注意事项

- **默认只监听 `127.0.0.1`**：服务仅本机可访问。不要绑定 `0.0.0.0`，除非你明确需要并已配置防火墙/反向代理来保护它。
- 数据保存在 `data/app.db`；备份/迁移时连同该文件一起处理。
- 更新代码后需要重新执行 `bun run build:web` 再重启服务。
- 前端未构建时，根路径会返回提示 JSON，提示先运行 `bun run build:web`。

## 验证

启动后访问 `http://127.0.0.1:8787`，确认：页面正常加载、搜索可用、论文详情正常、网络图可生成。

## 帮助

遇到问题先查看 [README](README.md) 与 [QUICK_START](QUICK_START.md) 的故障排除部分，或在项目仓库提交 Issue。

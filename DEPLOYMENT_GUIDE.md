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

## 5. 公网部署（nginx + 域名 watchdeep.net）

> ⚠️ 本应用**无内置账号体系**。直接暴露公网会让任何人都能消耗你的 LLM/S2 额度。务必：**开 `ACCESS_TOKEN`**（口令）并**只经 HTTPS 反向代理**访问。

### 5.1 DNS
在域名服务商为 `watchdeep.net`（及 `www`）添加 **A 记录**指向你的服务器公网 IP。

### 5.2 服务器准备
```bash
# 安装 Bun / pnpm（见官方文档），然后：
git clone <repo> && cd connectedpapers
bash scripts/setup.sh
bun run build:web
```

编辑 `server/.env`：
```env
ACCESS_TOKEN=换成一段足够长的随机口令
TRUST_PROXY=1
HOST=127.0.0.1
PORT=8787
CONTACT_EMAIL=你的邮箱
SEMANTIC_SCHOLAR_API_KEY=...        # 可选，更稳
OPENALEX_API_KEY=...               # 可选，摆脱匿名限流
LLM_PROVIDERS=[...]                # 翻译/AI 需要
```

### 5.3 systemd 常驻（系统级）
`/etc/systemd/system/connectedpapers.service`：
```ini
[Unit]
Description=ConnectedPapers
After=network.target

[Service]
User=www-data
WorkingDirectory=/srv/connectedpapers
ExecStart=/home/www-data/.bun/bin/bun run server
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload && sudo systemctl enable --now connectedpapers
```

### 5.4 nginx 反向代理
`/etc/nginx/sites-available/watchdeep.net`：
```nginx
server {
    listen 80;
    server_name watchdeep.net www.watchdeep.net;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # 建图任务最长约 45s，轮询期间保持连接
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/watchdeep.net /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 5.5 HTTPS 证书（Let's Encrypt）
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d watchdeep.net -d www.watchdeep.net
```
certbot 会自动改写为 443 并启用跳转与自动续期。

### 5.6 防火墙
```bash
sudo ufw allow 80,443/tcp
sudo ufw deny 8787/tcp   # 应用端口不对外
```

### 5.7 访问
浏览器打开 `https://watchdeep.net/?token=你的口令` 一次，服务端写入 Cookie 后会跳转到 `https://watchdeep.net/`，之后正常使用。

### 5.8 备份与更新
```bash
cp data/app.db data/app.db.bak        # 备份
git pull && bun run build:web && sudo systemctl restart connectedpapers
```

## 6. 子路径挂载（例如 https://watchdeep.net/papers/）

若不想占用域名根（根已被其他站点使用），可挂到子路径：

1. 构建时指定 base：`VITE_BASE=/papers/ bun run build:web`（前端资源与 API 会走 `/papers/...`）
2. `server/.env` 增加：`BASE_PATH=/papers`（用于 `?token=` 登录后重定向回子路径）
3. 反向代理（nginx，注意 `proxy_pass` 末尾的 `/` 会剥离前缀）：

```nginx
location /papers/ {
    proxy_pass http://127.0.0.1:8787/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300s;
}
```

访问 `https://你的域名/papers/?token=口令` 即可。

## 7. 快速更新（本地改完一键发布）

线上已按 §6 部署在 `https://watchdeep.net/papers/`（systemd `connectedpapers`，目录 `/opt/connectedpapers`）。日常改代码后：

```bash
bun run deploy          # = bash scripts/deploy.sh
```

脚本会：按 `VITE_BASE=/papers/` 构建前端 → `rsync` 同步（排除 .git/node_modules/data/server/.env）→ `systemctl restart connectedpapers` → 健康检查。

常用变体：

```bash
SKIP_WEB=1 bun run deploy      # 只改了后端/配置，跳过前端构建
SKIP_RESTART=1 bun run deploy  # 只同步，不重启
REMOTE=other-host DIR=/srv/app VITE_BASE=/base/ bun run deploy
```

参数见 `scripts/deploy.sh` 头部。查看访问口令：`ssh webserver "grep ^ACCESS_TOKEN= /opt/connectedpapers/server/.env"`。

## 验证

启动后访问 `http://127.0.0.1:8787`，确认：页面正常加载、搜索可用、论文详情正常、网络图可生成。

## 帮助

遇到问题先查看 [README](README.md) 与 [QUICK_START](QUICK_START.md) 的故障排除部分，或在项目仓库提交 Issue。

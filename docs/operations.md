# 📦 生产部署与运维手册

本文整合了原先分散在 `DEPLOYMENT.md`、`PRODUCTION_DEPLOYMENT*.md`、`PM2_GUIDE.md` 与 `UBUNTU-DEPLOYMENT.md` 中的核心内容，作为后端服务的唯一部署/运维指南。其余历史文档已归档或删除，后续更新请只维护本文件。

---

## 1. 环境要求与准备

- 操作系统：建议使用 Ubuntu 20.04+（Windows 亦可，但说明以 Linux 为主）  
- Node.js：≥ 18（推荐 20 LTS）  
- MongoDB：≥ 7.0，提供 `smartmatch` 与 `smartmatch_prod` 等数据库  
- Redis：用于缓存、任务队列等，可在生产环境启用  
- PM2：负责 Node 进程管理  
- Nginx（可选）：作为反向代理与静态资源服务

**域名与端口**

- 反向代理域名可设置为 `www.yssh.cc`（或你的目标域名）  
- 后端默认监听 `8080` 端口；请在 Nginx 中将 `/api` 等路径转发到该端口  
- 若使用 HTTPS，确保证书放置在 Nginx 可访问的目录，例如 `/etc/nginx/ssl/`

**必要文件与目录**

- `.env.production`：生产环境变量，使用 `npm run setup:env` 生成模板
- `ecosystem.config.js`：PM2 配置文件，仓库已提供
- `scripts/`：包含初始化、备份、清理等辅助脚本

---

## 2. 首次部署流程

1. **准备代码与依赖**
   ```bash
   git clone <repo>
   cd ysbd-test
   npm install
   ```
2. **生成环境变量文件**
   ```bash
   npm run setup:env
   # 按需填写 .env.production
   ```
3. **初始化数据库（可选）**
   ```bash
   npm run init-db
   ```
4. **使用 PM2 启动生产服务**
   ```bash
   npm run pm2:start
   ```
5. **配置 Nginx（可选）**
   - 将仓库中的 `nginx.conf` 作为模板，放入服务器的 `/etc/nginx/conf.d/`
   - 核对 `proxy_pass` 与证书路径
   - 运行 `nginx -t` 验证配置后重载：`sudo nginx -s reload`

> 如需部署前端，请参考前端仓库的部署说明，或将静态文件目录指向构建产物（例：`/var/www/<project>/current`）。

---

## 3. 日常运维命令（PM2）

```bash
npm run pm2:start      # 启动（默认 production 环境）
npm run pm2:stop       # 停止
npm run pm2:restart    # 普通重启
npm run pm2:reload     # 零停机重载
npm run pm2:delete     # 移除进程
npm run pm2:logs       # 查看实时日志
npm run pm2:monit      # PM2 监控面板
```

PM2 配置亮点（已写入 `ecosystem.config.js`）：

- `instances: "max"` 与 `exec_mode: "cluster"`：自动利用多核 CPU  
- `max_memory_restart: "2G"`：超出内存限制会自动重启  
- 指定 `NODE_ENV=production`、`PORT=8080`，避免手动设置环境变量  
- 日志输出集中于 `logs/` 目录，可配合日志轮转脚本使用

---

## 4. 更新、回滚与清理

**常规更新**

```bash
git pull
npm install
npm run pm2:reload
```

或使用封装脚本：

```bash
npm run deploy:update
```

**回滚**  
切换到上一版本后重新启动：

```bash
git checkout <previous-commit>
npm install
npm run pm2:restart
```

**定期清理与备份**

- 清理临时/日志：`npm run cleanup`、`npm run cleanup:report`  
- 生成备份：`node scripts/backup-data.js`  
- 生产数据清空（慎用）：`node scripts/production-cleanup.js`

---

## 5. 服务器建议（Ubuntu 示例）

1. **系统初始化**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y curl git build-essential nginx
   ```
2. **安装 Node.js 20**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```
3. **安装 MongoDB 7.x**
   ```bash
   curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc \
     | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
   UBUNTU_CODENAME=$(lsb_release -cs)
   echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
     https://repo.mongodb.org/apt/ubuntu ${UBUNTU_CODENAME}/mongodb-org/7.0 multiverse" \
     | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
   sudo apt update && sudo apt install -y mongodb-org
   sudo systemctl enable --now mongod
   ```
4. **可选：Redis、Certbot 等根据需求安装配置**

---

## 6. 故障排查速查表

| 问题 | 排查命令 | 处理思路 |
| ---- | -------- | -------- |
| 服务无法访问 | `pm2 status` / `pm2 logs` | 确认进程是否运行、查看报错 |
| 端口占用 | `sudo lsof -i :8080` / `netstat -tulpn` | 找出冲突进程并释放端口 |
| MongoDB 连接失败 | `sudo systemctl status mongod` | 检查服务状态、网络、防火墙 |
| Redis 异常 | `systemctl status redis` | 核对密码、网络或重启服务 |
| 证书或 HTTPS 问题 | `sudo nginx -t` / 查看 `nginx` 日志 | 检查证书路径、域名配置 |
| 日志/临时文件过多 | `npm run cleanup` | 启动自动清理脚本 |

---

## 7. 文档与维护

- 若部署流程有变化，请**同步更新本文件**并在仓库 README 指向这里  
- 需要详细环境变量说明，参考 `docs/environment.md`  
- 文件/日志策略详见 `docs/file-management.md`

> 任何历史文档若还需保留，请移至团队知识库或在本文件添加链接，不再在仓库根目录散落多个 markdown。


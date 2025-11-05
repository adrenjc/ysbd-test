# Ubuntu 服务器部署指南

本文档提供从零开始在 Ubuntu 服务器上部署智能商品匹配系统的完整指南。

## 🚀 部署概览

### 系统要求
- **操作系统**: Ubuntu 20.04 LTS 或更高版本
- **内存**: 至少 2GB RAM（推荐 4GB+）
- **存储**: 至少 20GB 可用空间
- **网络**: 稳定的互联网连接

### 部署架构
```
Ubuntu Server
├── Node.js 20.x (LTS)
├── MongoDB 7.x
├── Redis 7.x (可选)
├── PM2 (进程管理)
├── Nginx (反向代理，可选)
└── Smart Match API
```

## 📋 部署步骤

### 1. 服务器初始化

#### 1.1 连接服务器
```bash
# 使用 SSH 连接到您的 Ubuntu 服务器
ssh root@your-server-ip

# 创建部署用户（推荐）
adduser deploy
usermod -aG sudo deploy
su - deploy
```

#### 1.2 更新系统
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip htop vim
```

### 2. 安装 Node.js

#### 2.1 使用 NodeSource 仓库安装 Node.js 20.x (LTS)
```bash
# 添加 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# 安装 Node.js
sudo apt install -y nodejs

# 验证安装
node --version  # 应显示 v20.x.x
npm --version   # 应显示 10.x.x 或更高
```

#### 2.2 备选方案：使用 NVM 管理 Node.js 版本
```bash
# 安装 NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# 安装并使用 Node.js 20 LTS
nvm install 20
nvm use 20
nvm alias default 20

# 验证版本
node --version
npm --version
```

#### 2.3 配置 npm
```bash
# 配置 npm 全局目录（可选）
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### 3. 安装 MongoDB

#### 3.1 检查Ubuntu版本并添加对应仓库
```bash
# 首先检查您的Ubuntu版本
lsb_release -a

# 根据版本选择对应的仓库配置：

# Ubuntu 20.04 (focal) - 使用以下命令：
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
   https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Ubuntu 22.04 (jammy) - 使用以下命令：
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
   https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Ubuntu 24.04 (noble) - 使用以下命令：
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
   https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# 导入 MongoDB 公钥（所有版本通用）
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

# 更新包列表
sudo apt update
```

#### 3.1.1 快速脚本自动检测版本
```bash
# 自动检测Ubuntu版本并添加正确的仓库
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

# 自动获取版本代号
UBUNTU_CODENAME=$(lsb_release -cs)
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
   https://repo.mongodb.org/apt/ubuntu ${UBUNTU_CODENAME}/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
```

#### 3.2 安装和配置 MongoDB
```bash
# 安装 MongoDB
sudo apt install -y mongodb-org

# 启动 MongoDB 服务
sudo systemctl start mongod
sudo systemctl enable mongod

# 验证安装
sudo systemctl status mongod

# 测试连接
mongosh --eval 'db.runCommand({ connectionStatus: 1 })'
```

#### 3.3 国内友好的MongoDB安装方案

##### 方案1: Docker + 国内镜像加速器（推荐）
```bash
# 1. 安装Docker（使用阿里云镜像）
curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun

# 2. 配置Docker国内镜像加速器
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com",
    "https://ccr.ccs.tencentyun.com"
  ]
}
EOF

# 3. 重启Docker
sudo systemctl daemon-reload
sudo systemctl restart docker
sudo usermod -aG docker $USER

# 4. 重新登录以应用Docker权限
exit
# 重新SSH登录服务器

# 5. 启动MongoDB容器
docker run -d \
  --name mongodb \
  --restart unless-stopped \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=your-secure-password \
  mongo:7.0

# 6. 验证安装
docker ps
mongosh --username admin --password your-secure-password --authenticationDatabase admin --eval 'db.runCommand({ connectionStatus: 1 })'
```

##### 方案2: 使用国内镜像源安装
```bash
# 清理之前的配置
sudo rm -f /etc/apt/sources.list.d/mongodb-org-7.0.list

# 使用清华大学镜像源
curl -fsSL https://mirrors.tuna.tsinghua.edu.cn/mongodb/apt/ubuntu/gpg | sudo apt-key add -

# 根据Ubuntu版本添加对应源
UBUNTU_CODENAME=$(lsb_release -cs)
echo "deb https://mirrors.tuna.tsinghua.edu.cn/mongodb/apt/ubuntu ${UBUNTU_CODENAME}/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# 更新并安装
sudo apt update
sudo apt install -y mongodb-org
```

##### 方案3: 手动下载安装包（最稳定）
```bash
# 下载MongoDB 7.0 Debian包（使用国内CDN）
wget https://mirrors.tuna.tsinghua.edu.cn/mongodb/apt/ubuntu/pool/main/m/mongodb-org/mongodb-org_7.0.14_amd64.deb

# 安装依赖
sudo apt update
sudo apt install -y libcurl4 libssl1.1

# 安装MongoDB
sudo dpkg -i mongodb-org_7.0.14_amd64.deb

# 修复依赖问题（如果有的话）
sudo apt install -f

# 启动服务
sudo systemctl start mongod
sudo systemctl enable mongod
```

##### 方案4: 使用Snap安装（Ubuntu官方支持）
```bash
# 使用snap安装MongoDB
sudo snap install mongodb

# 启动MongoDB
sudo snap start mongodb

# 验证安装
mongosh --eval 'db.runCommand({ connectionStatus: 1 })'
```

#### 3.4 故障排除
如果 MongoDB 安装失败：

```bash
# 清理并重试
sudo apt remove mongodb-org
sudo rm -f /usr/share/keyrings/mongodb-server-7.0.gpg
sudo rm -f /etc/apt/sources.list.d/mongodb-org-7.0.list

# 重新执行步骤 3.1 和 3.2
```

#### 3.5 MongoDB 安全配置（可选，推荐生产环境）
```bash
# 创建管理员用户
mongosh
> use admin
> db.createUser({
    user: "admin",
    pwd: "your-secure-password",
    roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
  })
> exit

# 启用认证（编辑配置文件）
sudo vim /etc/mongod.conf
```

在配置文件中添加：
```yaml
security:
  authorization: enabled
```

```bash
# 重启 MongoDB
sudo systemctl restart mongod
```

### 4. 安装 Redis（可选）

```bash
# 安装 Redis
sudo apt install -y redis-server

# 配置 Redis
sudo vim /etc/redis/redis.conf
```

修改以下配置：
```
# 设置密码（可选）
requirepass your-redis-password

# 绑定到本地地址
bind 127.0.0.1
```

```bash
# 启动 Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# 验证安装
redis-cli ping
```

### 5. 安装 PM2

```bash
# 全局安装 PM2
sudo npm install -g pm2

# 验证安装
pm2 --version

# 设置 PM2 开机自启
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy
```

### 6. 部署应用代码

#### 6.1 克隆项目
```bash
# 创建项目目录
mkdir ~/smart-match-api
cd ~/smart-match-api

# 克隆您的 GitHub 仓库
git clone https://github.com/your-username/smart-match-api.git .

# 或者如果您已有代码，可以通过其他方式上传
```

#### 6.2 安装依赖
```bash
# 安装项目依赖
npm install

# 验证安装
npm list --depth=0
```

### 7. 配置环境变量

#### 7.1 生成环境配置文件
```bash
# 运行环境配置脚本
npm run setup:env
```

#### 7.2 编辑生产环境配置
```bash
# 编辑生产环境配置文件
vim .env.production
```

**重要配置项：**
```env
# 应用配置
NODE_ENV=production
PORT=8080

# 数据库配置
MONGODB_URI=mongodb://admin:your-secure-password@localhost:27017/smartmatch_prod?authSource=admin

# Redis 配置（如果启用）
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT 安全配置（确保使用强密钥）
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRES_IN=8h

# 日志配置
LOG_LEVEL=info
LOG_DIR=logs

# 匹配算法配置
DEFAULT_MATCH_THRESHOLD=75
AUTO_CONFIRM_THRESHOLD=90
```

#### 7.3 设置文件权限
```bash
# 设置环境变量文件权限（仅所有者可读写）
chmod 600 .env.production
```

### 8. 初始化数据库

#### 8.1 创建数据库
```bash
# 连接到 MongoDB
mongosh --username admin --password your-secure-password --authenticationDatabase admin

# 创建应用数据库
> use smartmatch_prod
> db.createCollection("users")
> exit
```

#### 8.2 初始化应用数据库
```bash
# 运行数据库初始化脚本
npm run init-db

# 可选：添加测试数据
npm run seed
```

### 9. 启动应用

#### 9.1 使用 PM2 启动
```bash
# 启动应用
npm run pm2:start

# 查看应用状态
pm2 status

# 查看日志
pm2 logs smart-match-api

# 监控应用
pm2 monit
```

#### 9.2 验证应用运行
```bash
# 测试健康检查端点
curl http://localhost:8080/health

# 测试 API 端点
curl http://localhost:8080/api
```

### 10. 配置 Nginx 反向代理（可选）

#### 10.1 安装 Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 10.2 配置 Nginx
```bash
# 创建站点配置文件
sudo vim /etc/nginx/sites-available/smart-match-api
```

添加以下配置：
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为您的域名或 IP

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # 文件上传大小限制
    client_max_body_size 10M;

    # 日志配置
    access_log /var/log/nginx/smart-match-api.access.log;
    error_log /var/log/nginx/smart-match-api.error.log;
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/smart-match-api /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 11. 配置 SSL 证书（可选，推荐）

#### 11.1 使用 Let's Encrypt
```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com

# 设置自动续期
sudo crontab -e
```

添加以下行：
```
0 12 * * * /usr/bin/certbot renew --quiet
```

### 12. 配置防火墙

```bash
# 启用 UFW 防火墙
sudo ufw enable

# 允许 SSH
sudo ufw allow ssh

# 允许 HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# 如果直接暴露 API 端口（不推荐）
# sudo ufw allow 8080

# 查看防火墙状态
sudo ufw status
```

## 🔧 运维管理

### 应用管理命令

```bash
# 查看应用状态
pm2 status

# 重启应用
pm2 restart smart-match-api

# 停止应用
pm2 stop smart-match-api

# 查看日志
pm2 logs smart-match-api

# 查看特定时间的日志
pm2 logs smart-match-api --lines 100

# 监控应用
pm2 monit

# 重新加载应用（零停机）
pm2 reload smart-match-api
```

### 日志管理

```bash
# 应用日志位置
~/smart-match-api/logs/

# PM2 日志
pm2 logs smart-match-api

# Nginx 日志（如果使用）
sudo tail -f /var/log/nginx/smart-match-api.access.log
sudo tail -f /var/log/nginx/smart-match-api.error.log

# MongoDB 日志
sudo tail -f /var/log/mongodb/mongod.log

# Redis 日志
sudo tail -f /var/log/redis/redis-server.log
```

### 数据库管理

```bash
# 备份数据库
mongodump --username admin --password your-password --authenticationDatabase admin --db smartmatch_prod --out ~/backup/

# 恢复数据库
mongorestore --username admin --password your-password --authenticationDatabase admin --db smartmatch_prod ~/backup/smartmatch_prod/

# 查看数据库状态
mongosh --username admin --password your-password --authenticationDatabase admin
> use smartmatch_prod
> db.stats()
```

### 更新部署

```bash
# 拉取最新代码
git pull origin main

# 安装新依赖
npm install

# 重新部署
npm run deploy:update
```

## 🔍 故障排除

### 常见问题

#### 1. 应用无法启动
```bash
# 检查 PM2 状态
pm2 status

# 查看错误日志
pm2 logs smart-match-api --err

# 检查端口占用
sudo netstat -tlnp | grep 8080

# 手动启动调试
NODE_ENV=production node src/app.js
```

#### 2. 数据库连接失败
```bash
# 检查 MongoDB 状态
sudo systemctl status mongod

# 测试数据库连接
mongosh --username admin --password your-password --authenticationDatabase admin

# 检查防火墙
sudo ufw status
```

#### 3. 内存不足
```bash
# 查看系统资源
htop

# 查看内存使用
free -h

# 重启应用释放内存
pm2 restart smart-match-api
```

#### 4. 文件权限问题
```bash
# 检查文件权限
ls -la .env.production

# 修复权限
chmod 600 .env.production
chown deploy:deploy .env.production
```

## 📊 监控和告警

### 系统监控

```bash
# 安装系统监控工具
sudo apt install -y htop iotop nethogs

# 查看系统负载
htop

# 查看磁盘使用
df -h

# 查看网络连接
sudo netstat -tlnp
```

### 应用监控

```bash
# PM2 监控
pm2 monit

# 设置 PM2 监控（可选）
pm2 install pm2-server-monit
```

## 🚨 生产环境安全检查清单

- [ ] 修改所有默认密码（MongoDB、Redis、JWT 密钥）
- [ ] 配置防火墙，只开放必要端口
- [ ] 启用 SSL/TLS 证书
- [ ] 设置环境变量文件权限为 600
- [ ] 定期备份数据库
- [ ] 监控系统日志和应用日志
- [ ] 设置自动安全更新
- [ ] 配置入侵检测系统（可选）
- [ ] 定期更新系统和依赖包

## 📞 支持

如果在部署过程中遇到问题，请：

1. 查看相关日志文件
2. 检查系统资源使用情况
3. 确认配置文件正确性
4. 查阅项目文档和 GitHub Issues
5. 联系开发团队获取支持

---

**注意**: 本指南基于 Ubuntu 20.04+ 和项目的当前配置。根据您的具体环境和需求，可能需要调整某些步骤。
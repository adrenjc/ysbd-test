# 🔧 环境变量配置指南

> 原 `ENVIRONMENT_SETUP.md` 内容迁移至此，保留原有结构，方便后续维护。

## 📋 概述

后端项目根据 `NODE_ENV` 自动加载对应的 `.env.*` 文件：

- 开发环境：`.env.development`
- 生产环境：`.env.production`
- 兜底配置：`.env`（若环境特定文件缺失）

## 🚀 快速设置

### 1️⃣ 创建环境变量文件

```bash
# 自动生成开发/生产模板
npm run setup:env

# 或手动创建
cp .env.example .env.development
cp .env.example .env.production
```

### 2️⃣ 配置环境变量

根据运行环境修改对应文件。

---

## 📁 模板示例

### `.env.development`

```env
NODE_ENV=development
PORT=8080
APP_NAME=智能商品匹配系统

MONGODB_URI=mongodb://localhost:27017/smartmatch
MONGODB_TEST_URI=mongodb://localhost:27017/smartmatch_test

REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

JWT_SECRET=dev-jwt-secret-key-for-development-only
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.xlsx,.xls,.csv

LOG_LEVEL=debug
LOG_DIR=logs

DEFAULT_MATCH_THRESHOLD=65
AUTO_CONFIRM_THRESHOLD=90
LEARNING_RATE=0.1

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

SCHEDULER_ENABLED=false
SCHEDULER_TIMEZONE=Asia/Shanghai

LOG_RETENTION_DAYS=7
TEMP_FILE_RETENTION_HOURS=24
UPLOAD_RETENTION_DAYS=3
```

> 默认关闭定时任务；若需启用，请在开发环境确认脚本行为。

### `.env.production`

```env
NODE_ENV=production
PORT=8080
APP_NAME=智能商品匹配系统

MONGODB_URI=mongodb://localhost:27017/smartmatch_prod
MONGODB_TEST_URI=mongodb://localhost:27017/smartmatch_test

REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

JWT_SECRET=请替换为安全随机字符串
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d

UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.xlsx,.xls,.csv

LOG_LEVEL=info
LOG_DIR=logs

DEFAULT_MATCH_THRESHOLD=75
AUTO_CONFIRM_THRESHOLD=90
LEARNING_RATE=0.1

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

SCHEDULER_ENABLED=false
SCHEDULER_TIMEZONE=Asia/Shanghai

LOG_RETENTION_DAYS=30
TEMP_FILE_RETENTION_HOURS=24
UPLOAD_RETENTION_DAYS=7
```

---

## 🔐 安全注意事项

1. **JWT_SECRET 必须随机且足够复杂**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
2. 生产数据库、Redis 连接信息不可与开发共享  
3. `.env.*` 已在 `.gitignore` 中，严禁提交到仓库  
4. 建议生产环境限制文件权限：
   ```bash
   chmod 600 .env.production
   ```

---

## 🛠️ 加载机制

项目在启动时按以下优先级加载配置：

1. `.env.production`（当 `NODE_ENV=production`）
2. `.env.development`（当 `NODE_ENV=development`）
3. `.env`

`src/config/env.js` 负责解析这些文件，如需扩展新的环境（如测试/预发布），请在此处补充逻辑。

---

## 📊 关键配置对照

| 配置项                  | 开发环境 | 生产环境 |
| ----------------------- | -------- | -------- |
| `LOG_LEVEL`             | debug    | info     |
| `JWT_EXPIRES_IN`        | 24h      | 8h       |
| `RATE_LIMIT_MAX_REQUESTS` | 1000  | 100      |
| `REDIS_ENABLED`         | false    | true     |
| `LOG_RETENTION_DAYS`    | 7        | 30       |

---

## 🔍 调试与验证

- 启动开发：`npm run dev`（默认加载 `.env.development`）  
- 启动生产：`NODE_ENV=production npm start` 或 `npm run pm2:start`  
- 打印当前配置：
  ```javascript
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log(require("./src/config/env"));
  ```

如遇加载问题，可运行：

```bash
ls -la .env*
head .env.development
```

---

## ✅ 最佳实践

1. `.env.*` 不入库，统一用模板脚本生成  
2. 生产环境配置请妥善备份（线下或密码管理工具）  
3. 定期轮换 JWT 密钥与第三方凭证  
4. 各环境使用独立的数据库与缓存实例  
5. 启动时对关键配置进行校验，避免空值


# 📁 文件与日志管理方案

> 原 `FILE_MANAGEMENT.md` 内容迁移并保留关键说明，描述自动清理脚本、定时任务与 API。

---

## 1. 问题背景

- 日志文件按日生成但长期保留，导致磁盘压力  
- 上传失败或任务中断会遗留临时文件  
- 长期堆积会拖慢 I/O、增加备份成本并带来潜在安全风险

---

## 2. 核心解决方案

### 2.1 自动清理脚本

- 位置：`scripts/cleanup-files.js`
- 功能：清理过期日志、临时文件、上传文件，并输出统计
- 默认保留策略：
  ```javascript
  LOG_RETENTION_DAYS = 30
  TEMP_FILE_RETENTION_HOURS = 24
  UPLOAD_RETENTION_DAYS = 7
  ```
- 支持 `--dry-run`、`--report` 等模式

### 2.2 定时任务服务

- 文件：`src/services/scheduler.service.js`
- 调度：使用 `node-cron`，默认任务示例  
  - 文件清理：每天 03:00  
  - 系统健康检查：每天 08:00  
  - 容量告警：文件大小超阈值时记录告警
- 环境变量可控制启用（`SCHEDULER_ENABLED`、`SCHEDULER_TIMEZONE` 等）

### 2.3 管理接口

路由前缀：`/api/system/`

| 接口 | 描述 |
| ---- | ---- |
| `GET /api/system/status` | 系统状态 |
| `POST /api/system/cleanup` | 立即执行清理（需管理员权限） |
| `GET /api/system/storage-report` | 存储使用统计 |
| `GET /api/system/scheduler` | 查看定时任务状态 |

### 2.4 NPM 脚本

```bash
npm run cleanup          # 执行清理
npm run cleanup:report   # 打印存储报告
npm run cleanup:dry-run  # 模拟清理
```

---

## 3. 部署要求

1. 安装依赖（在仓库 `package.json` 中已列出 `node-cron`, `cron`）  
2. 配置环境变量调整保留策略（可选）：
   ```env
   LOG_RETENTION_DAYS=30
   TEMP_FILE_RETENTION_HOURS=24
   UPLOAD_RETENTION_DAYS=7
   ```
3. PM2 启动后服务会自动加载调度任务

---

## 4. 监控与维护

- 定期执行 `npm run cleanup:report` 获取当前磁盘使用情况  
- 查看日志：`npm run pm2:logs`，可过滤关键字 `cleanup`  
- API 监控：可在管理端或使用 `curl` 调用查看状态

日志示例：

```
[2025-01-xx] [INFO] 定时文件清理任务完成 {"logsDeleted":5,"uploadsDeleted":3,"totalSizeMB":123.45}
```

---

## 5. 注意事项

1. **文件权限**：确保 Node 进程对 `uploads/`、`logs/` 具有读写权限
2. **备份策略**：重要文件在自动清理前应已有备份  
3. **监控告警**：建议配合监控系统对磁盘使用率、清理失败等情况报警
4. **自定义清理**：可在 `cleanup-files.js` 中扩展规则，例如针对特定前缀的文件
5. **调度调整**：如需变更执行频率，请修改 `scheduler.service.js` 的 cron 表达式

---

## 6. 预期收益

- 磁盘使用更可控，避免爆满  
- 防止临时文件泄露敏感信息  
- 运维工作量下降，流程自动化

---

## 7. 常见问题

| 问题 | 建议处理 |
| ---- | -------- |
| 清理失败 | 检查权限、磁盘空间、文件是否被占用 |
| 定时任务不执行 | 查看 `scheduler.service.js` 日志，确认 `SCHEDULER_ENABLED=true` |
| 需要手动清理 | `npm run cleanup`，或调用 `/api/system/cleanup` |

如需进一步定制，请在仓库中维护脚本与任务配置，并同步更新本文件。


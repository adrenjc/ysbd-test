/**
 * 初始化数据库中的所有角色账号
 * usage: node scripts/seed-users.js [--force]
 */

const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const path = require("path")
const dotenv = require("dotenv")

dotenv.config({ path: path.join(__dirname, "..", ".env.development") })

const { manifestSummary } = require("../src/config/permissions")
const User = require("../src/models/User")

const PASSWORDS = {
  admin: "admin123",
  reviewer: "reviewer123",
  operator: "operator123",
  viewer: "viewer123",
}

const FORCE_UPDATE = process.argv.includes("--force")

const roleConfigs = Object.entries(manifestSummary.roles).map(
  ([role, permissions]) => {
    const usernameMap = {
      admin: "admin",
      reviewer: "reviewer1",
      operator: "operator1",
      viewer: "viewer1",
    }
    const nameMap = {
      admin: "系统管理员",
      reviewer: "审核专员",
      operator: "运营专员",
      viewer: "访客账号",
    }

    const username = usernameMap[role] || `${role}_seed`

    return {
      role,
      permissions,
      username,
      name: nameMap[role] || `${role} 默认账号`,
      email: `${username}@example.com`,
      phone: `138${Math.floor(Math.random() * 90000000 + 10000000)}`,
      password: PASSWORDS[role] || `${role}123`,
    }
  }
)

async function upsertUser(config) {
  const existing = await User.findOne({ username: config.username }).select(
    "+password"
  )
  const payload = {
    name: config.name,
    role: config.role,
    email: config.email,
    phone: config.phone,
    permissions: config.permissions,
    isActive: true,
  }

  if (FORCE_UPDATE || !existing) {
    const salt = await bcrypt.genSalt(12)
    payload.password = await bcrypt.hash(config.password, salt)
  }

  if (!existing) {
    await new User({ username: config.username, ...payload }).save()
    console.log(
      `创建账号：${config.username}（角色：${config.role}，密码：${config.password}）`
    )
  } else {
    await User.findByIdAndUpdate(existing._id, payload)
    console.log(
      `更新账号：${config.username}${FORCE_UPDATE ? "（密码已重置）" : ""}`
    )
  }
}

async function bootstrap() {
  const uri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/smartmatch"
  await mongoose.connect(uri)
  console.log(`已连接数据库 ${uri}`)

  for (const config of roleConfigs) {
    try {
      await upsertUser(config)
    } catch (error) {
      console.error(`账号 ${config.username} 处理失败`, error)
    }
  }

  await mongoose.disconnect()
  console.log("角色账号初始化完成")
}

bootstrap().catch(error => {
  console.error("初始化失败", error)
  process.exit(1)
})

/**
 * 用户管理控制器
 */
const mongoose = require("mongoose")
const User = require("../models/User")
const {
  asyncHandler,
  BusinessError,
} = require("../middleware/error.middleware")
const {
  ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
  getRolePermissions,
} = require("../config/permissions")
const { logger } = require("../utils/logger")

const PROTECTED_USERNAMES = ["admin", "system"]

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  username: user.username,
  email: user.email || "",
  phone: user.phone || "",
  role: user.role,
  permissions: [
    ...new Set([
      ...(user.permissions || []),
      ...getRolePermissions(user.role),
    ]),
  ],
  status: user.isActive ? "active" : "inactive",
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  isProtected: PROTECTED_USERNAMES.includes(user.username),
})

/**
 * 用户列表
 */
const listUsers = asyncHandler(async (req, res) => {
  const { status, role, search } = req.query

  const filter = {}

  if (status === "active") {
    filter.isActive = true
  } else if (status === "inactive") {
    filter.isActive = false
  }

  if (role) {
    filter.role = role
  }

  if (search) {
    filter.$or = [
      { username: new RegExp(search, "i") },
      { name: new RegExp(search, "i") },
      { email: new RegExp(search, "i") },
      { phone: new RegExp(search, "i") },
    ]
  }

  const users = await User.find(filter)
    .select(
      "username name email phone role permissions isActive lastLoginAt createdAt"
    )
    .sort({ createdAt: -1 })
    .lean()

  res.json({
    success: true,
    data: {
      items: users.map(serializeUser),
      total: users.length,
    },
  })
})

/**
 * 新建用户
 */
const createUser = asyncHandler(async (req, res) => {
  const { username, name, password, role, email, phone, permissions } = req.body

  const existingUser = await User.findByUsername(username)
  if (existingUser) {
    throw new BusinessError("用户名已存在", 409)
  }

  const user = new User({
    username,
    name,
    password,
    role: role || "operator",
    email,
    phone,
    permissions: Array.isArray(permissions) ? permissions : [],
    isActive: true,
  })

  await user.save()

  logger.info("创建新用户成功", {
    userId: user._id,
    role: user.role,
    email: user.email,
  })

  res.status(201).json({
    success: true,
    message: "用户创建成功",
    data: serializeUser(user.toObject()),
  })
})

/**
 * 更新用户信息
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { name, email, phone, role, permissions, password } = req.body

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BusinessError("用户ID不合法", 400)
  }

  const user = await User.findById(id).select("+password")

  if (!user) {
    throw new BusinessError("用户不存在", 404)
  }

  if (name) {
    user.name = name
  }

  if (typeof email === "string") {
    user.email = email
  }

  if (typeof phone === "string") {
    user.phone = phone
  }

  if (role) {
    if (!ROLE_PERMISSIONS[role]) {
      throw new BusinessError("角色不受支持", 400)
    }
    user.role = role
  }

  if (permissions !== undefined) {
    if (!Array.isArray(permissions)) {
      throw new BusinessError("权限格式无效", 400)
    }

    const invalidPermissions = permissions.filter(
      (permission) => !ALL_PERMISSIONS.includes(permission)
    )

    if (invalidPermissions.length > 0) {
      throw new BusinessError(
        `权限无效: ${invalidPermissions.join(", ")}`,
        400
      )
    }

    user.permissions = permissions
  }

  if (password) {
    user.password = password
  }

  await user.save()

  logger.info("用户信息已更新", {
    userId: user._id,
    role: user.role,
  })

  res.json({
    success: true,
    message: "用户已更新",
    data: serializeUser(user.toObject()),
  })
})

/**
 * 更新用户启用状态
 */
const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { isActive } = req.body

  if (typeof isActive !== "boolean") {
    throw new BusinessError("状态值无效", 400)
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BusinessError("用户ID不合法", 400)
  }

  const user = await User.findById(id)

  if (!user) {
    throw new BusinessError("用户不存在", 404)
  }

  user.isActive = isActive

  if (isActive) {
    user.lockUntil = undefined
    user.loginAttempts = 0
  }

  await user.save()

  logger.info("用户状态已更新", {
    userId: user._id,
    isActive: user.isActive,
  })

  res.json({
    success: true,
    message: "用户状态已更新",
    data: serializeUser(user.toObject()),
  })
})


/**
 * 删除用户
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BusinessError("用户ID不合法", 400)
  }

  const user = await User.findById(id)

  if (!user) {
    throw new BusinessError("用户不存在", 404)
  }

  if (user.role === "admin") {
    const adminCount = await User.countDocuments({ role: "admin" })
    if (adminCount <= 1) {
      throw new BusinessError("系统至少保留一个管理员账号", 400)
    }
  }

  if (PROTECTED_USERNAMES.includes(user.username)) {
    throw new BusinessError("系统初始化账号不允许删除", 400)
  }

  await user.deleteOne()

  logger.info("用户已删除", {
    userId: user._id,
    role: user.role,
  })

  res.json({
    success: true,
    message: "用户已删除",
    data: { id: user._id },
  })
})

module.exports = {
  listUsers,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser,
}

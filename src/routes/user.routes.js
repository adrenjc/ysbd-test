/**
 * 用户管理路由
 */
const express = require("express")
const Joi = require("joi")
const {
  authenticateToken,
  authorize,
} = require("../middleware/auth.middleware")
const { validateRequest } = require("../middleware/validation.middleware")
const {
  ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
} = require("../config/permissions")
const {
  listUsers,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser,
} = require("../controllers/user.controller")

const router = express.Router()

const roleKeys = Object.keys(ROLE_PERMISSIONS)
const permissionKeys = ALL_PERMISSIONS

const createUserSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  name: Joi.string().min(1).max(50).required(),
  password: Joi.string().min(6).max(100).required(),
  role: Joi.string()
    .valid(...roleKeys)
    .default("operator"),
  email: Joi.string().email().allow("", null),
  phone: Joi.string().max(30).allow("", null),
  permissions: Joi.array()
    .items(Joi.string().valid(...permissionKeys))
    .optional(),
})

const updateUserSchema = Joi.object({
  name: Joi.string().min(1).max(50),
  email: Joi.string().email().allow("", null),
  phone: Joi.string().max(30).allow("", null),
  role: Joi.string().valid(...roleKeys),
  permissions: Joi.array()
    .items(Joi.string().valid(...permissionKeys))
    .optional(),
  password: Joi.string().min(6).max(100),
}).min(1)

router.get(
  "/",
  authenticateToken,
  authorize("user.manage"),
  validateRequest({
    query: Joi.object({
      status: Joi.string().valid("active", "inactive"),
      role: Joi.string()
        .valid(...roleKeys)
        .optional(),
      search: Joi.string().allow("").max(100),
    }),
  }),
  listUsers
)

router.post(
  "/",
  authenticateToken,
  authorize("user.manage"),
  validateRequest({ body: createUserSchema }),
  createUser
)

router.put(
  "/:id",
  authenticateToken,
  authorize("user.manage"),
  validateRequest({
    params: Joi.object({ id: Joi.string().required() }),
    body: updateUserSchema,
  }),
  updateUser
)

router.patch(
  "/:id/status",
  authenticateToken,
  authorize("user.manage"),
  validateRequest({
    params: Joi.object({
      id: Joi.string().required(),
    }),
    body: Joi.object({
      isActive: Joi.boolean().required(),
    }),
  }),
  updateUserStatus
)

router.delete(
  "/:id",
  authenticateToken,
  authorize("user.manage"),
  validateRequest({
    params: Joi.object({
      id: Joi.string().required(),
    }),
  }),
  deleteUser
)

module.exports = router

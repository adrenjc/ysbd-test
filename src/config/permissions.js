const path = require("path")

const manifestPath = path.join(__dirname, "../..", "config", "permissions.json")
// eslint-disable-next-line @typescript-eslint/no-var-requires
const manifest = require(manifestPath)

const PERMISSIONS = Object.freeze({
  ...Object.fromEntries(
    Object.keys(manifest.permissions).map((key) => [key, key])
  ),
})

const ALL_PERMISSIONS = Object.freeze(Object.keys(manifest.permissions))

const ROLE_PERMISSIONS = Object.freeze(
  Object.fromEntries(
    Object.entries(manifest.roles).map(([role, permissions]) => [
      role,
      Object.freeze([...permissions]),
    ])
  )
)

const getRolePermissions = (role) => ROLE_PERMISSIONS[role] || []

const manifestSummary = Object.freeze({
  permissions: manifest.permissions,
  roles: ROLE_PERMISSIONS,
})

module.exports = {
  PERMISSIONS,
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  getRolePermissions,
  manifestSummary,
}

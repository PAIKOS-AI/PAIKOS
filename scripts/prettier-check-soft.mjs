import { spawnSync } from "node:child_process"

const files = process.argv.slice(2)
const result = spawnSync("pnpm", ["exec", "prettier", "--check", ...files], {
  stdio: "inherit",
  shell: process.platform === "win32",
})

if (result.error) {
  console.warn(
    "[prettier-soft-check] Unable to run Prettier check:",
    result.error.message
  )
}

process.exit(0)

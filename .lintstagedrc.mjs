export default {
  "*.{ts,tsx,js,jsx}": ["pnpm exec eslint --fix", "pnpm exec prettier --check"],
  "*.{json,json5}": ["pnpm exec prettier --check"],
  "*.{css,scss}": ["pnpm exec prettier --check"],
  "*.md": ["pnpm exec prettier --check"],
}

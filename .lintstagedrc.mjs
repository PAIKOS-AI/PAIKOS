export default {
  "*.{ts,tsx,js,jsx}": [
    "pnpm exec eslint --fix",
    "node scripts/prettier-check-soft.mjs",
  ],
  "*.{json,json5}": ["node scripts/prettier-check-soft.mjs"],
  "*.{css,scss}": ["node scripts/prettier-check-soft.mjs"],
  "*.md": ["node scripts/prettier-check-soft.mjs"],
}

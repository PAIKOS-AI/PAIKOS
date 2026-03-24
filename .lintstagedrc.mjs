export default {
  "*.{ts,tsx,js,jsx}": ["pnpm exec eslint --fix", "pnpm exec prettier --write"],
  "*.{json,json5}": ["pnpm exec prettier --write"],
  "*.{css,scss}": ["pnpm exec prettier --write"],
  "*.md": ["pnpm exec prettier --write"],
};

export default {
  "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
  "*.{json,json5}": ["prettier --write"],
  "*.{css,scss}": ["prettier --write"],
  "*.md": ["prettier --write"],
};

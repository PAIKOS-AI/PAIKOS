#!/bin/bash

case "$1" in
  clean)
    echo "🧹 Cleaning build artifacts..."
    rm -rf dist/ build/ .next/ .turbo/
    ;;
  
  reset)
    echo "🔄 Resetting dependencies..."
    rm -rf node_modules pnpm-lock.yaml
    pnpm install
    ;;
  
  format)
    echo "✨ Formatting code..."
    pnpm format
    ;;
  
  lint)
    echo "🔍 Linting..."
    pnpm lint
    ;;
  
  test)
    echo "✅ Running tests..."
    pnpm test
    ;;
  
  dev)
    echo "🚀 Starting development..."
    pnpm dev
    ;;
  
  build)
    echo "📦 Building..."
    pnpm build
    ;;
  
  help)
    echo "Available commands:"
    echo "  clean     - Remove build artifacts"
    echo "  reset     - Reinstall dependencies"
    echo "  format    - Format code"
    echo "  lint      - Lint code"
    echo "  test      - Run tests"
    echo "  dev       - Start development"
    echo "  build     - Build for production"
    ;;
  
  *)
    echo "Unknown command: $1"
    echo "Run '$0 help' for available commands"
    exit 1
    ;;
esac

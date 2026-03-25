#!/bin/bash
set -e

echo "🚀 PAIKOS Setup"
echo "━━━━━━━━━━━━━━━━━━"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Setup environment
echo "⚙️  Setting up environment files..."
cp apps/web/.env.example apps/web/.env 2>/dev/null || true
cp apps/api/.env.example apps/api/.env 2>/dev/null || true

# Setup Husky
echo "🔧 Installing Git hooks..."
pnpm prepare || true

echo ""
echo "✨ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Update .env files:"
echo "     - apps/web/.env"
echo "     - apps/api/.env"
echo ""
echo "  2. Create database:"
echo "     cd apps/api && pnpm db:push"
echo ""
echo "  3. Start development:"
echo "     pnpm dev"
echo ""

#!/bin/bash
# Deployment script for Catsky Club
# Run this on your DigitalOcean server after cloning/pulling the repository

set -e  # Exit on error

echo "🚀 Starting deployment for Catsky Club..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the project root?"
    exit 1
fi

# Pull latest changes from git (if this is a git repo)
if [ -d ".git" ]; then
    echo "📥 Pulling latest changes from git..."
    git pull || echo "⚠️  Warning: git pull failed (this is okay if not using git)"
fi

# Load server-only environment variables (not committed to git)
# Create /opt/catsky-club/.env.server on the server with lines like:
# GHOST_URL="https://catsky.club"
# GHOST_ADMIN_API_KEY="id:secret"
# SIGNUPS_API_TOKEN="..."
if [ -f ".env.server" ]; then
    echo "🔐 Loading server environment from .env.server"
    set -a
    # shellcheck disable=SC1091
    . ".env.server"
    set +a
else
    echo "ℹ️  .env.server not found (ok if Ghost signups not enabled yet)"
fi

# Set Ghost Portal environment variables for build
# These are required for the Ghost Portal embed in index.html
export VITE_GHOST_URL="${VITE_GHOST_URL:-https://catsky.club}"
export VITE_GHOST_CONTENT_API_KEY="${VITE_GHOST_CONTENT_API_KEY:-f6dd5a28bd25bdc6e849457dd2}"

echo "🔑 Using Ghost URL: $VITE_GHOST_URL"

# Check Node.js version (Vite requires Node 18+, but 20+ is recommended)
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18+ is required (20+ recommended). Current version: $(node -v)"
    echo "📦 To install Node.js 20 (LTS):"
    echo "   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "   sudo apt-get install -y nodejs"
    exit 1
fi

# Install/update dependencies (including devDependencies needed for build)
echo "📦 Installing dependencies..."
# Remove node_modules if it exists to ensure clean install with devDependencies
if [ -d "node_modules" ]; then
    echo "🧹 Cleaning existing node_modules for fresh install..."
    rm -rf node_modules
fi
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Error: Build failed - dist directory not found"
    exit 1
fi

echo "✅ Build completed successfully!"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Restart the application with PM2
echo "🔄 Restarting application with PM2..."
if [ -f "ecosystem.config.cjs" ]; then
    pm2 delete catsky-club 2>/dev/null || true
    pm2 start ecosystem.config.cjs
else
    pm2 delete catsky-club 2>/dev/null || true
    pm2 start server.js --name "catsky-club" --env PORT=3001
fi

# Save PM2 configuration
pm2 save

echo "✅ Deployment complete!"
echo ""
echo "📊 Check status with: pm2 status"
echo "📋 View logs with: pm2 logs catsky-club"
echo "🌐 Your app should be running on http://localhost:3001"

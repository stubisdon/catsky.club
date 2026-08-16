#!/bin/bash
# Deployment script for Catsky Club
# Run this on your DigitalOcean server after cloning/pulling the repository

set -e  # Exit on error

# Use the directory containing this script as project root (so .env.server is found even if you run from elsewhere)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

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
# Create .env.server in the same directory as this script with lines like:
# GHOST_URL="https://your-ghost-domain.com"
# GHOST_ADMIN_API_KEY="id:secret"
# VITE_GHOST_CONTENT_API_KEY="your_content_api_key"
# SIGNUPS_API_TOKEN="..."
if [ -f ".env.server" ]; then
    echo "🔐 Loading server environment from .env.server"
    set -a
    # shellcheck disable=SC1091
    . "./.env.server"
    set +a
else
    echo "ℹ️  .env.server not found (ok if Ghost signups not enabled yet)"
fi

# Set Ghost Portal environment variables for production build
# (Dev uses .env.development when you run `npm run dev`.)
# These are required for the Ghost Portal embed in index.html.
# Prefer VITE_GHOST_URL; fall back to GHOST_URL — same as server.js (many servers only set GHOST_URL).
# Content API key: set in .env.server (from Ghost Admin → Settings → Integrations). If missing, Portal will get 401 on settings and show "invite-only".
effective_ghost="${VITE_GHOST_URL:-${GHOST_URL:-}}"
if [ -z "$effective_ghost" ]; then
    echo "❌ ERROR: Set VITE_GHOST_URL or GHOST_URL in .env.server (your Ghost CMS URL)."
    exit 1
fi
export VITE_GHOST_URL="$effective_ghost"
export VITE_GHOST_CONTENT_API_KEY="${VITE_GHOST_CONTENT_API_KEY:-}"

echo "🔑 Using Ghost URL: $VITE_GHOST_URL"
if [ -z "$VITE_GHOST_CONTENT_API_KEY" ]; then
    echo "⚠️  VITE_GHOST_CONTENT_API_KEY is empty; add it to .env.server or Portal may show invite-only (401 on settings)."
fi

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
ASSET_RETENTION_DIR=".deploy-cache/assets"
if [ -d "dist/assets" ] && [ "$(find "dist/assets" -type f -print -quit)" ]; then
    echo "🗃️  Retaining previous asset bundles..."
    mkdir -p "$ASSET_RETENTION_DIR" || true
    # Do not refresh files already retained: their age controls the 90-day expiry.
    cp -Rn "dist/assets/." "$ASSET_RETENTION_DIR/" || true
else
    echo "ℹ️  No previous asset bundles to retain."
fi

echo "🔨 Building application..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Error: Build failed - dist directory not found"
    exit 1
fi

if [ -d "$ASSET_RETENTION_DIR" ]; then
    echo "♻️  Restoring retained asset bundles without overwriting the new build..."
    mkdir -p "dist/assets" || true
    cp -Rn "$ASSET_RETENTION_DIR/." "dist/assets/" || true

    pruned_entries="$(find "$ASSET_RETENTION_DIR" -depth -mindepth 1 -mtime +90 -print -delete 2>/dev/null | wc -l | tr -d ' ' || true)"
    echo "🧹 Pruned ${pruned_entries:-0} retained asset entries older than 90 days."
else
    echo "ℹ️  No retained asset bundles to restore or prune."
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

# Quick Deployment Guide for catsky.club

This is a quick reference for deploying the Catsky Club frontend to your DigitalOcean server where Ghost is already running.

## Prerequisites

- ✅ Ghost is already running on your DigitalOcean server at catsky.club
- ✅ You have SSH access to your server
- ✅ Node.js 18+ installed (or we'll install it)
- ✅ Nginx is installed and configured for Ghost

## Quick Deploy Steps

### 1. Deploy Code to Server

**Option A: Via Git (Recommended)**
```bash
# On your server
cd /opt
git clone YOUR_REPO_URL catsky-club
cd catsky-club
chmod +x deploy.sh
```

**Option B: Via SCP**
```bash
# From your local machine
scp -r . root@YOUR_SERVER_IP:/opt/catsky-club

# Then SSH in
ssh root@YOUR_SERVER_IP
cd /opt/catsky-club
chmod +x deploy.sh
```

### 2. Install Node.js 20+ (Required)

**Important:** This project requires Node.js 18 or higher (Node.js 20 LTS is recommended). Check your version:

```bash
node -v
```

If you have Node.js 16 or lower, install Node.js 20 (LTS):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node -v  # Should show v20.x.x or higher
npm -v
```

### 3. Run Deployment Script

```bash
cd /opt/catsky-club
./deploy.sh
```

This will:
- Install dependencies
- Build the application
- Start/restart with PM2

**Note:** CI / automated tests are currently disabled and deployments do not run tests.

### 4. Configure Nginx

**Important:** Since Ghost is already running, you may need to update your existing nginx config rather than replacing it.

```bash
# Backup your current config
sudo cp /etc/nginx/sites-available/catsky.club /etc/nginx/sites-available/catsky.club.backup

# Copy the new config template
sudo cp /opt/catsky-club/nginx.conf.example /etc/nginx/sites-available/catsky.club.new

# Review and merge with your existing config
sudo nano /etc/nginx/sites-available/catsky.club
```

**Key points:**
- Frontend app runs on port **3001** (not 3000)
- Root location (`/`) should proxy to `http://127.0.0.1:3001`
- Keep all Ghost routes (`/ghost/`, `/members/`, `/webhooks/`) as they are
- Add `/api/` location for your frontend API endpoints

**Test and reload:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Verify Everything Works

1. **Frontend:** Visit `https://catsky.club` - should show your React app
2. **Ghost Admin:** Visit `https://catsky.club/ghost/` - should still work
3. **Check logs:** `pm2 logs catsky-club`

## Updating After Changes

```bash
cd /opt/catsky-club
git pull  # if using git
./deploy.sh
```

## Troubleshooting

### App not loading
```bash
# Check if app is running
pm2 status
pm2 logs catsky-club

# Check if dist directory exists
ls -la dist/

# Check nginx
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### Port conflicts
```bash
# Check what's using port 3001
sudo lsof -i :3001
```

### Ghost routes not working
- Make sure your nginx config still has all the Ghost location blocks
- Check that Ghost is running: `ghost status`

## File Structure on Server

```
/opt/catsky-club/
├── dist/              # Built files (created by npm run build)
├── public/            # Static assets (audio, docs)
├── src/               # Source code
├── server.js          # Express server (runs on port 3001)
├── deploy.sh          # Deployment script
└── nginx.conf.example # Nginx config template
```

## Environment Variables (Optional)

You can set a custom port:
```bash
export PORT=3001
pm2 restart catsky-club
```

Or create a `.env` file (requires dotenv package).

## Next Steps

- Set up automated deployments (GitHub Actions, etc.)
- Configure CDN for static assets (optional)
- Set up monitoring and alerts

For detailed documentation, see `public/docs/tech/DEPLOYMENT.md`

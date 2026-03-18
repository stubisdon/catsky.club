# Deployment Guide: Ghost Headless Frontend

This guide will help you deploy your React + Vite frontend to your DigitalOcean server.

## Prerequisites

- ✅ Ghost is running on your DigitalOcean server
- ✅ Ghost Content API is working (you've tested it)
- ✅ You have SSH access to your server
- ✅ Node.js 18+ installed on server (Node.js 20 LTS recommended)

---

## Step 1: Prepare Your Local Environment

1. **Test locally first:**
   ```bash
   cd /Users/stub/coding/catsky.club
   npm install
   npm run dev
   ```
   Visit `http://localhost:3000` to verify everything works.

2. **Configure your experience:**
   - Edit `src/App.tsx` to customize the experience timeline
   - Add your audio file to `public/audio/knock-knock.mp3`

---

## Step 2: Deploy to DigitalOcean Server

### Option A: Deploy via Git (Recommended)

1. **Initialize git and push to a repository:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   # Push to GitHub/GitLab/Bitbucket
   ```

2. **On your server, clone and set up:**
   ```bash
   ssh root@YOUR_SERVER_IP
   cd /opt
   git clone YOUR_REPO_URL catsky-club
   cd catsky-club
   chmod +x deploy.sh  # Make deployment script executable
   ```

### Option B: Deploy via SCP (Quick)

1. **Build locally:**
   ```bash
   npm run build
   ```

2. **Copy to server:**
   ```bash
   scp -r . root@YOUR_SERVER_IP:/opt/catsky-club
   ```

3. **SSH into server:**
   ```bash
   ssh root@YOUR_SERVER_IP
   cd /opt/catsky-club
   chmod +x deploy.sh  # Make deployment script executable
   ```

---

## Step 3: Install Dependencies on Server

```bash
# Install Node.js 20 (LTS) if not already installed
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version

# Install project dependencies
cd /opt/catsky-club
npm install --production
```

---

## Step 4: Build the Application

```bash
# Build the React + Vite app
npm run build
```

The built files will be in the `dist` directory.

---

## Step 5: Run with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start the server with PM2
# The server runs on port 3001 by default (configurable via PORT env var)
pm2 start npm --name "catsky-club" -- start

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions it prints
```

**Verify it's running:**
```bash
pm2 status
pm2 logs catsky-club
```

Your frontend should now be running on `http://localhost:3001` (internal).

---

## Step 6: Configure Nginx Reverse Proxy

We need to configure nginx to:
- Serve your React frontend at the root (`/`)
- Proxy API requests to the Express server
- Keep Ghost-owned routes (`/ghost/`, `/ghost/api/`, `/members/`, `/webhooks/`, `/unsubscribe`, `/unsubscribe/`, `/content/images/`, `/r/`) on Ghost
- Preserve Ghost’s public request context on admin/image/redirect routes so Ghost never generates localhost/internal branding or redirect URLs
- Handle static files from the `dist` directory

### Create Nginx Configuration

**Option 1: Copy the example config (recommended)**
```bash
sudo cp /opt/catsky-club/nginx.conf.example /etc/nginx/sites-available/catsky.club
sudo nano /etc/nginx/sites-available/catsky.club  # Review and adjust if needed
```

**Option 2: Create manually**
```bash
sudo nano /etc/nginx/sites-available/catsky.club
```

**Add this configuration:**

```nginx
server {
    listen 80;
    server_name catsky.club www.catsky.club;
    
    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;
    
    # For now, allow HTTP (remove after SSL setup)
    
    # Frontend (React + Vite - served by Express on port 3001)
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Ghost Admin Panel
    location /ghost/ {
        proxy_pass http://127.0.0.1:2368/ghost/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_redirect http://127.0.0.1:2368/ https://$host/;
        proxy_redirect http://localhost:2368/ https://$host/;
        proxy_redirect http://localhost/ https://$host/;
    }
    
    # Ghost Content API (for frontend)
    location /ghost/api/ {
        proxy_pass http://127.0.0.1:2368/ghost/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_redirect http://127.0.0.1:2368/ https://$host/;
        proxy_redirect http://localhost:2368/ https://$host/;
        proxy_redirect http://localhost/ https://$host/;
    }
    
    # Ghost content images (used by Ghost Admin + email assets)
    location /content/images/ {
        proxy_pass http://127.0.0.1:2368/content/images/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_redirect http://127.0.0.1:2368/ https://$host/;
        proxy_redirect http://localhost:2368/ https://$host/;
        proxy_redirect http://localhost/ https://$host/;
    }

    # Ghost email click/open tracking redirects
    location /r/ {
        proxy_pass http://127.0.0.1:2368/r/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_redirect http://127.0.0.1:2368/ https://$host/;
        proxy_redirect http://localhost:2368/ https://$host/;
        proxy_redirect http://localhost/ https://$host/;
    }

    # Ghost Members (subscriptions, sign-in, etc.)
    location /members/ {
        proxy_pass http://127.0.0.1:2368/members/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Ghost newsletter unsubscribe links
    location = /unsubscribe {
        proxy_pass http://127.0.0.1:2368/unsubscribe/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /unsubscribe/ {
        proxy_pass http://127.0.0.1:2368/unsubscribe/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Ghost Webhooks
    location /webhooks/ {
        proxy_pass http://127.0.0.1:2368/webhooks/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable the site:**
```bash
sudo ln -s /etc/nginx/sites-available/catsky.club /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

---

## Step 7: Set Up SSL with Let's Encrypt

```bash
# Install certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d catsky.club -d www.catsky.club

# Certbot will automatically update your nginx config for HTTPS
```

**After SSL is set up, update nginx config to redirect HTTP to HTTPS** (uncomment the redirect line in the config).

---

## Step 8: Update Ghost Configuration

Make sure Ghost knows about the new URL structure:

```bash
cd /var/www/ghost  # or wherever Ghost is installed
ghost config get url
ghost config set url https://catsky.club
ghost restart
```

---

## Step 9: Verify Everything Works

1. **Frontend:** Visit `https://catsky.club` - should show your custom frontend
2. **Ghost Admin:** Visit `https://catsky.club/ghost/` - should show Ghost admin
3. **API:** Test `https://catsky.club/ghost/api/content/settings/?key=YOUR_KEY`
4. **Members:** Test member signup/login at `https://catsky.club/members/`
5. **Unsubscribe links:** open a real newsletter unsubscribe URL (all newsletter links, including `/unsubscribe?...` and `/unsubscribe/?...` formats) and confirm it shows a Catsky unsubscribe confirmation message (instead of silently redirecting to `/`) and never redirects to a localhost/127.0.0.1 address
6. **Ghost image asset:** Test a known Ghost image URL under `https://catsky.club/content/images/...`
7. **Email redirect:** Test a known Ghost redirect URL under `https://catsky.club/r/...`

Note: the Express app includes a defensive pass-through for `/content/images/*` and `/r/*` if nginx route blocks are stale, but production should still treat nginx as the canonical owner of those prefixes. Admin/logo correctness at `/ghost/` and `/ghost/api/` depends on the same forwarded-host contract. The Express fallback must forward `X-Forwarded-Host`, `X-Forwarded-Proto`, and `X-Forwarded-Port` so Ghost serves the asset/redirect directly instead of emitting a canonical redirect back to the same public URL.
Also keep `X-Forwarded-Host`, `X-Forwarded-Proto`, `X-Forwarded-Port`, and `proxy_redirect` rewrite rules in those nginx blocks so Ghost absolute redirects never leak internal `localhost/127.0.0.1` hosts.

---

## Troubleshooting

### Frontend not loading
```bash
pm2 logs catsky-club
pm2 restart catsky-club
# Check if dist directory exists and has files
ls -la dist/
```

### Nginx errors
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### Ghost not accessible
```bash
ghost status
ghost doctor
```

### Port conflicts
```bash
# Check what's using port 3001
sudo lsof -i :3001
```

---

## Updating Your Frontend

When you make changes, you can use the deployment script:

```bash
# On server
cd /opt/ghost-frontend  # or wherever you deployed
git pull  # if using git
./deploy.sh
```

Or manually:

```bash
# On server
cd /opt/ghost-frontend
git pull  # if using git
npm install
npm run build
pm2 restart catsky-club
```

---

## Monitoring

```bash
# View logs
pm2 logs catsky-club

# Monitor resources
pm2 monit

# View status
pm2 status
```

---

## Next Steps

- Customize the design in `src/index.css`
- Add more pages/components as needed
- Set up automated deployments (GitHub Actions, etc.)
- Configure CDN for static assets (optional)

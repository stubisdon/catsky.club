# Deployment Guide: Ghost Headless Frontend

This guide will help you deploy your React + Vite frontend to your DigitalOcean server.

## Prerequisites

- ✅ Ghost is running on your DigitalOcean server
- ✅ Ghost Content API is working (you've tested it)
- ✅ You have SSH access to your server
- ✅ Node.js 18+ installed on server (or we'll install it)

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
   git clone YOUR_REPO_URL ghost-frontend
   cd ghost-frontend
   ```

### Option B: Deploy via SCP (Quick)

1. **Build locally:**
   ```bash
   npm run build
   ```

2. **Copy to server:**
   ```bash
   scp -r . root@YOUR_SERVER_IP:/opt/ghost-frontend
   ```

3. **SSH into server:**
   ```bash
   ssh root@YOUR_SERVER_IP
   cd /opt/ghost-frontend
   ```

---

## Step 3: Install Dependencies on Server

```bash
# Install Node.js 18+ if not already installed
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version

# Install project dependencies
cd /opt/ghost-frontend
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
pm2 start npm --name "ghost-frontend" -- start

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions it prints
```

**Verify it's running:**
```bash
pm2 status
pm2 logs ghost-frontend
```

Your frontend should now be running on `http://localhost:3000` (internal).

---

## Step 6: Configure Nginx Reverse Proxy

We need to configure nginx to:
- Serve your React frontend at the root (`/`)
- Proxy API requests to the Express server
- Handle static files from the `dist` directory

### Create Nginx Configuration

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
    
    # Frontend (React + Vite)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Ghost Admin Panel
    location /ghost/ {
        proxy_pass http://127.0.0.1:2368/ghost/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Ghost Content API (for frontend)
    location /ghost/api/ {
        proxy_pass http://127.0.0.1:2368/ghost/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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

---

## Troubleshooting

### Frontend not loading
```bash
pm2 logs ghost-frontend
pm2 restart ghost-frontend
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
# Check what's using port 3000
sudo lsof -i :3000
```

---

## Updating Your Frontend

When you make changes:

```bash
# On server
cd /opt/ghost-frontend
git pull  # if using git
npm install
npm run build
pm2 restart ghost-frontend
```

---

## Monitoring

```bash
# View logs
pm2 logs ghost-frontend

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


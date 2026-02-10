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

### Debugging Ghost (members, magic link, email)

The **Portal** (sign up / log in) and **magic link** emails are handled by **Ghost**, not by this app. A 500 on `POST /members/api/send-magic-link/` means Ghost is failing when sending the login email.

**1. Where Ghost lives and how it runs**

SSH to your server, then:

```bash
# Common Ghost install path (adjust if you installed elsewhere)
cd /var/www/ghost   # or wherever Ghost is (e.g. ghost install listed it)

# See how Ghost is running
ghost status
```

**2. Where email is configured (no UI in Admin)**

Ghost does **not** expose SMTP in the Admin UI. Mail is set in the **Ghost install** config:

- **File:** `config.production.json` in the Ghost root (e.g. `/var/www/ghost/config.production.json`).
- **Section:** `mail` with `transport` and `options` (host, port, auth, etc.).

Example (add or edit the `mail` block):

```json
"mail": {
  "transport": "SMTP",
  "options": {
    "host": "smtp.example.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "your-email@example.com",
      "pass": "your-app-password"
    }
  }
}
```

If `mail` is missing or wrong, magic links (and other transactional emails) will fail, often with 500.

After editing: `ghost restart` (from the Ghost root).

**3. See why send-magic-link returns 500**

Reproduce the error (click “Sign in” and submit email), then on the server:

```bash
# Ghost logs (path may vary; check ghost status or your install)
# Common locations:
tail -100 /var/www/ghost/content/logs/*.log

# If Ghost runs under PM2:
pm2 logs ghost --lines 100
```

Look for the stack trace or error message at the time of the POST to `send-magic-link`.

**4. Test email from Ghost**

In **Ghost Admin** go to **Settings → Labs** and use the “Send test email” (or similar) button. If that fails, the same mail config is the cause.

**Summary:** Fix the 500 by configuring `mail` in Ghost’s `config.production.json` on the prod server and restarting Ghost; there is no email setup screen in Ghost Admin.

**Automated check from CI:** A script runs on the server and reports Ghost path, mail config, process status, and recent log errors. From the repo:

- **Script:** `scripts/check-ghost.sh` (run on the server, or via CI).
- **GitHub Actions:** workflow **“Ghost diagnostics”** (Actions tab → run manually). It SSHs to production, runs the script, and posts the report to the job summary. Uses the same secrets as deploy: `PROD_HOST`, `PROD_USER`, `PROD_SSH_KEY`.

Optional: install `jq` on the server for a more detailed mail config report.

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

### Ghost integration (recommended)

To store signups in Ghost Members via the Ghost Admin API, set these on the **server** (recommended via a server-only `.env.server` file):

```bash
cd /opt/catsky-club
nano .env.server
```

Example `.env.server`:

```bash
GHOST_URL="https://catsky.club"
GHOST_ADMIN_API_KEY="YOUR_ADMIN_API_KEY_ID:YOUR_ADMIN_API_KEY_SECRET"
GHOST_ADMIN_API_VERSION="v5.0"
SIGNUPS_API_TOKEN="some-long-random-string"
```

**Security note:** never paste your Admin API key into chat, commits, or issues. If it leaks, revoke it in Ghost and create a new one.

Then re-run `./deploy.sh` (it will auto-load `.env.server`) or restart PM2.

**If you see "Failed to create member in Ghost" in production:**

1. **Check server logs** – The app logs the real Ghost response. Run `pm2 logs catsky-club` (or your app name) and reproduce the error; you’ll see `[Ghost member create failed]` with `status`, `body`, and `ghostUrl`.
2. **GHOST_URL** – Must be the full public URL Ghost is reachable at (e.g. `https://catsky.club`). If the Node app runs on the same host as Ghost, this still must be the public URL so the Admin API request goes through the same origin/SSL as Ghost.
3. **GHOST_ADMIN_API_KEY** – From Ghost Admin → Settings → Integrations → “Admin API” key. Format is `id:hex_secret` (e.g. `abc123:deadbeef...`). If the key was recreated or is for another site, creation will fail (often 401/403).
4. **Ghost 6.x** – If you’re on Ghost 6, try `GHOST_ADMIN_API_VERSION=v6.0` in `.env.server` (default is `v5.0`). Then restart the app.
5. **Network** – The server must be able to reach `GHOST_URL` (e.g. `https://catsky.club`). If you see `ECONNREFUSED` or `fetch failed` in logs, fix DNS/firewall or use the correct `GHOST_URL`.

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

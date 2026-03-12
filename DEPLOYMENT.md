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

### Private repository authentication (GitHub Actions)

If the repo is **private**, the deploy job must be able to run `git pull` on the production server. Use one of these:

**Option 1: GitHub Personal Access Token (recommended)**

1. Create a [Personal Access Token](https://github.com/settings/tokens) with **repo** scope.
2. In the repo: **Settings → Secrets and variables → Actions**.
3. Click **New repository secret**.
4. Name: `GIT_PAT_2` (preferred), Value: paste your token.
5. (Optional fallback) keep `GIT_PAT` as well during transition.
6. Re-run the failed workflow (or push to `main` again).

The workflow prefers `GIT_PAT_2` and falls back to `GIT_PAT` to configure HTTPS auth for `git pull` when the server’s remote is `https://github.com/...`.

**Option 2: SSH deploy key on the server**

1. On the production server, ensure the clone uses SSH:
   ```bash
   cd /opt/catsky-club
   git remote get-url origin   # should be git@github.com:USER/REPO.git
   ```
   If it shows `https://github.com/...`, switch it:
   ```bash
   git remote set-url origin git@github.com:stubisdon/catsky.club.git
   ```
2. Add the server’s SSH public key as a **Deploy key** in the repo (**Settings → Deploy keys**). Grant write access only if you need to push from the server.

After applying one of these, the deployment job should authenticate successfully.

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
- Keep all Ghost routes (`/ghost/`, `/members/`, `/webhooks/`, `/content/images/`, `/r/`) as they are
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

## Multi-tab workflow (Cursor)

When multiple Cursor agent tabs are working on different features or bugs, follow this so committing in one tab doesn’t overwrite another tab’s work.

### One branch per tab

- Each tab should use its **own branch** (e.g. `feature/auth-modal`, `fix/login-redirect`).
- Committing in Tab A only affects that branch; other tabs on other branches are unaffected.
- Don’t have two tabs on the same branch when both have uncommitted or unpushed work.

### Before you commit in this tab

1. **Check branch:** `git branch --show-current` — confirm you’re on this tab’s branch, not `main` or another tab’s branch.
2. **Check scope:** `git status` — only stage and commit files this tab was supposed to change. If you see files another tab was editing, don’t add them in this commit; let the other tab commit them on its branch.

### Avoid destructive Git in any tab

- **No `git push --force`** on branches other tabs might be using (or that `main` is based on).
- **No `git reset --hard`** on a branch another tab is using, or on `main` if other branches depend on it.

### If two tabs used the same branch

- Have one tab create a **new branch** from the current state and continue there; the other keeps the original branch. From then on, use one branch per tab.
- Or one tab **stashes** its work (`git stash push -m "tab B WIP"`), the other commits and pushes; then the first tab can apply the stash and commit (preferably on its own new branch).

### Safe-to-commit checklist

1. `git branch --show-current` → this tab’s branch?
2. `git status` → only this tab’s files changed?
3. If yes → `git add` only those files, commit, and push that branch (no force).

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
- Make sure your nginx config still has all the Ghost location blocks, including `/content/images/` (admin/email assets) and `/r/` (email tracking redirects)
- Check that Ghost is running: `ghost status`

### Portal still shows "This site is invite-only" after enabling sign-up

If **Settings → Membership → Access** is set to **"Anyone can sign up"** but the Portal still shows the invite-only message after a hard refresh:

**1. Check tier-level settings**

Ghost can have **invite-only per tier**. If every tier (including the free tier) is set to invite-only, Portal will still show "invite only".

- In Ghost Admin go to **Settings** → **Membership** (or **Tiers** / **Plans**).
- Open each tier (Free and any Paid tiers). Ensure **at least one tier** allows open sign-up (e.g. the Free tier should **not** be "Invite only" or "Private"). If you only have one tier and it’s invite-only, create or edit a tier so that it’s publicly signable.

**2. Restart Ghost (clear cache)**

Settings are sometimes cached. On the server:

```bash
cd /var/www/ghost   # or your Ghost install path
ghost restart
```

If Ghost runs under PM2: `pm2 restart ghost` (or the process name you use).

**3. Retest**

Use an incognito/private window and open `https://catsky.club/connect`, then click **Sign up**. If it still shows invite-only, double-check that no tier is set to invite-only and that you saved the Access setting.

**4. 401 on `/ghost/api/content/settings/` (Network tab)**

If the Network tab shows the settings request returning **401 Unauthorized**, Ghost is rejecting the **Content API key**. The Portal then has no valid settings and shows "invite-only".

- In **Ghost Admin** go to **Settings** → **Integrations** (or **Apps & integrations**). Find the integration that has the **Content API key** (the public key used for Portal). Copy the key, or create a new custom integration and copy its Content API key.
- On the **server**, set the key in `.env.server`:  
  `VITE_GHOST_CONTENT_API_KEY=your_full_key_here`  
  (The key is the long hex string; do not add `key=` or quotes around the value.)
- **Redeploy** so the build runs with the new key (e.g. run `./deploy.sh` on the server again). The key is baked into the built `index.html` at build time.

Do not commit the key to the repo; keep it only in `.env.server` on the server.

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

**If logs show `535 Authentication failed` / `EAUTH`:** The `mail` section exists but the SMTP **username or password is wrong** (or not allowed). Use an **app password** for Gmail; fix typos; or switch to a provider that allows SMTP (Mailgun, SendGrid, etc.).

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

# Deployment Setup Status

Last updated: 2026-01-18

## ✅ Completed

1. **Ghost upgraded to 6.13.1** - Successfully upgraded from 5.8.3
   - Upgraded Node.js from v20 to v22 (required for Ghost 6.0)
   - Fixed systemd configuration
   - All migrations completed successfully

2. **Portal fix implemented** - Comprehensive workaround for Portal bug with undefined `firstpromoter_account`
   - Patches `fetch()`, `XMLHttpRequest`, and `Response.prototype.json()`
   - Located in `index.html` (runs before Portal loads)
   - Ensures `firstpromoter_account` is always a string (empty string if undefined)
   - **Status: Deployed to production**

3. **GitHub Actions workflow created and configured** - `.github/workflows/deploy.yml`
   - Auto-deploys on push to `main` branch
   - Uses SSH to connect to production server (164.92.89.22)
   - **Status: Working and tested successfully**

4. **SSH keys configured**
   - Generated SSH key pair: `~/.ssh/github_actions_deploy`
   - Public key added to server
   - Private key added as GitHub secret `PROD_SSH_KEY`
   - GitHub secrets configured: `PROD_HOST`, `PROD_USER`, `PROD_SSH_KEY`

5. **Private repo auth (if repo is private)**
   - Add GitHub Actions secret **`GIT_PAT`**: a Personal Access Token with **repo** scope (Settings → Secrets and variables → Actions → New repository secret).
   - Alternatively, on the server use an SSH remote (`git@github.com:...`) and add the server’s public key as a Deploy key in the repo.
   - See DEPLOYMENT.md section “Private repository authentication” for details.

6. **Other fixes**
   - Fixed MIME types for static files in `server.js`
   - Added missing `vite.svg` favicon
   - Updated Portal script to use CDN (Ghost 6.0 requirement)
   - (Join page removed; Connect covers sign up / account)

## 🚀 How Auto-Deployment Works

**GitHub Actions automatically deploys on every push to `main` branch.**

The workflow (`.github/workflows/deploy.yml`):
1. Triggers on push to `main` or manual workflow dispatch
2. Connects to production server via SSH using GitHub secrets
3. Runs `git pull` to get latest code
4. Runs `./deploy.sh` which:
   - Sets environment variables
   - Installs dependencies
   - Builds the application
   - Restarts PM2 process

**No manual deployment needed anymore!** Just push to `main` and it auto-deploys.

## 📋 Manual Deployment (if needed)

If you ever need to deploy manually:

```bash
ssh root@164.92.89.22
cd /opt/catsky-club
git pull
./deploy.sh
```

## 🎯 What the Fix Does

The Portal workaround in `index.html`:
- Intercepts all API calls to `/ghost/api/content/settings/`
- Ensures `firstpromoter_account` is always a string (empty string if undefined)
- Prevents Portal from calling `.replace()` on undefined values
- Works with both `fetch()` and `XMLHttpRequest`

## 📝 Files Changed

- `index.html` - Added comprehensive Portal workaround script
- `.github/workflows/deploy.yml` - Auto-deployment workflow
- `server.js` - Fixed MIME types for static files
- `catsky.club-ssl.conf` - Added nginx location for portal.min.js (though we're using CDN now)

## 🔍 Testing

After deployment, test at: https://catsky.club/connect
- Check browser console - should NOT see Portal initialization errors
- Click sign up / log in - should open Portal

**Note:** Portal may still show initialization errors in console due to a known Ghost 6.0 bug, but the workaround ensures Portal functionality still works despite the error message.

## 📝 Summary of Changes

### Files Modified
- `index.html` - Added comprehensive Portal workaround script
- `server.js` - Fixed MIME types for static files
- `src/Join.tsx` - Removed (unused; Connect covers membership)
- `catsky.club-ssl.conf` - Added nginx location for portal.min.js (though using CDN now)
- `.github/workflows/deploy.yml` - Auto-deployment workflow

### Infrastructure
- Ghost upgraded: 5.8.3 → 6.13.1
- Node.js upgraded: v20.19.6 → v22.22.0
- MySQL: 8.0.42 (already compatible)
- Auto-deployment: GitHub Actions → DigitalOcean server

## 🎯 Current Status

✅ **All systems operational**
- Ghost 6.13.1 running
- Portal workaround deployed
- Auto-deployment configured and working
- Production site: https://catsky.club

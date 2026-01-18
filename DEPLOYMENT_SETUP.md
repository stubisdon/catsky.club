# Deployment Setup Status

## ✅ Completed

1. **Ghost upgraded to 6.13.1** - Successfully upgraded from 5.8.3
2. **Portal fix implemented** - Comprehensive workaround for Portal bug with undefined `firstpromoter_account`
   - Patches `fetch()`, `XMLHttpRequest`, and `Response.prototype.json()`
   - Located in `index.html` (runs before Portal loads)
3. **GitHub Actions workflow created** - `.github/workflows/deploy.yml`
   - Auto-deploys on push to `main` branch
   - Uses SSH to connect to production server

## 🔧 Current Issue

**Portal still failing** - Error: `Cannot read properties of undefined (reading 'replace')`
- The fix is in the code but **not yet deployed to production**
- Production still has the old build without the comprehensive fix

## 📋 Next Steps: Manual SSH Key Setup

Since automated SSH key generation isn't working, do this manually:

### Step 1: Generate SSH Key Pair (on your local machine)

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy
# Press Enter when asked for passphrase (leave it empty for GitHub Actions)
```

### Step 2: Add Public Key to Server

```bash
# Copy the public key to your server
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub root@164.92.89.22

# Or manually add it:
cat ~/.ssh/github_actions_deploy.pub | ssh root@164.92.89.22 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### Step 3: Test SSH Connection

```bash
ssh -i ~/.ssh/github_actions_deploy root@164.92.89.22
# Should connect without password
```

### Step 4: Add GitHub Secrets

Go to: https://github.com/stubisdon/catsky.club/settings/secrets/actions

Add these three secrets:

1. **PROD_HOST**: `164.92.89.22`
2. **PROD_USER**: `root` (or `ubuntu` if that's your user)
3. **PROD_SSH_KEY**: 
   ```bash
   cat ~/.ssh/github_actions_deploy
   # Copy the entire output (starts with -----BEGIN OPENSSH PRIVATE KEY-----)
   ```

### Step 5: Deploy Current Fix (One-time manual deploy)

After setting up secrets, you can either:
- Wait for the next push to trigger auto-deploy, OR
- Manually run on server:
  ```bash
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

After deployment, test at: https://catsky.club/join
- Check browser console - should NOT see Portal initialization errors
- Click "enter →" button - should open Portal subscription flow

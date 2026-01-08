# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Step 1: Install & Configure (2 min)

```bash
cd /Users/stub/coding/catsky.club
npm install

# Add your audio file (optional)
# cp /path/to/your/audio.mp3 public/audio/knock-knock.mp3
```

### Step 2: Test Locally (1 min)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) - you should see the interactive experience!

### Step 3: Deploy to Server

Follow the detailed guide in [DEPLOYMENT.md](./DEPLOYMENT.md) or use these quick commands:

```bash
# On your server
cd /opt
git clone YOUR_REPO_URL ghost-frontend  # or scp the files
cd ghost-frontend
npm install --production
npm run build

# No environment variables needed for basic setup

# Run with PM2
npm install -g pm2
pm2 start npm --name "ghost-frontend" -- start
pm2 save
pm2 startup
```

### Step 4: Configure Nginx

Copy `nginx.conf.example` to `/etc/nginx/sites-available/catsky.club` and update it.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full nginx setup.

---

## ✅ What You Have Now

- ✅ Minimalistic React + Vite frontend
- ✅ Interactive experience with JSON-based timeline
- ✅ Audio-synced text and interaction events
- ✅ Timeline debugging tools
- ✅ Responsive design
- ✅ Ready to deploy

## 🎨 Customize

Edit `src/index.css` to change colors, fonts, and layout.
Edit `src/App.tsx` to configure your experience timeline.

## 📚 Next Steps

1. Test locally: `npm run dev`
2. Customize experience in `src/App.tsx`
3. Customize design in `src/index.css`
4. Deploy following [DEPLOYMENT.md](./DEPLOYMENT.md)
5. Enjoy your new interactive experience! 🎉


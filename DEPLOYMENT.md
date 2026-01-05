# Deployment Guide

This guide covers deploying the ThreadCraft application to production. You have several deployment options depending on your needs and budget.

## Table of Contents

- [Deployment Options](#deployment-options)
- [Option 1: Render.com (Recommended for Easy Setup)](#option-1-rendercom-recommended-for-easy-setup)
- [Option 2: Railway](#option-2-railway)
- [Option 3: Fly.io](#option-3-flyio)
- [Option 4: Separate Frontend/Backend (Vercel + Render)](#option-4-separate-frontendbackend-vercel--render)
- [Option 5: Docker + VPS](#option-5-docker--vps)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## Deployment Options

### Quick Comparison

| Platform | Frontend | Backend | Cost | Difficulty | Best For |
|----------|----------|---------|------|------------|----------|
| **Render** | ✅ | ✅ | Free tier | Easy | Quick deployment |
| **Railway** | ✅ | ✅ | Pay-as-you-go | Easy | Modern apps |
| **Fly.io** | ✅ | ✅ | Free tier | Medium | Global distribution |
| **Vercel + Render** | ✅ | ✅ | Free tier | Medium | Performance |
| **Docker + VPS** | ✅ | ✅ | Varies | Hard | Full control |

---

## Option 1: Render.com (Recommended for Easy Setup)

Render is perfect for full-stack apps. Deploy both frontend and backend together.

### Prerequisites

- GitHub account
- Render account (sign up at https://render.com)

### Step 1: Prepare Your Repository

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

### Step 2: Deploy Backend

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `threadcraft-backend`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`
   - **Instance Type**: Free (or upgrade for better performance)

5. **Environment Variables** (add these):
   ```
   FLASK_SECRET_KEY=<generate-a-random-secret-key>
   PORT=10000
   PYTHON_VERSION=3.11.7
   ```
   
   **Important**: Make sure to set `PYTHON_VERSION=3.11.7` to avoid Python 3.13 compatibility issues with tweepy.

6. Click **"Create Web Service"**

7. **Note the URL** (e.g., `https://threadcraft-backend.onrender.com`)

### Step 3: Deploy Frontend

1. Create a **new Web Service** on Render
2. Configure:
   - **Name**: `threadcraft-frontend`
   - **Root Directory**: `frontend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run preview`
   - **Static Site**: ✅ **Enable this** (for better performance)

3. **Environment Variables**:
   ```
   VITE_API_URL=https://threadcraft-backend.onrender.com
   NODE_VERSION=18
   ```

4. Click **"Create Web Service"**

### Step 4: Update Frontend API Configuration

The frontend is already configured to use environment variables. Your API URL will be automatically set.

**Access your app at**: `https://threadcraft-frontend.onrender.com`

---

## Option 2: Railway

Railway offers seamless deployment with automatic HTTPS.

### Step 1: Install Railway CLI

```bash
npm i -g @railway/cli
```

### Step 2: Login and Initialize

```bash
railway login
railway init
```

### Step 3: Deploy Backend

1. Create `railway.json` in the `backend` folder:
   ```json
   {
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "gunicorn app:app --bind 0.0.0.0:$PORT",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

2. Set environment variables in Railway dashboard:
   ```
   FLASK_SECRET_KEY=<your-secret-key>
   PORT=5000
   ```

3. Deploy:
   ```bash
   cd backend
   railway up
   ```

### Step 4: Deploy Frontend

1. Create a new service in Railway
2. Set environment variables:
   ```
   VITE_API_URL=<your-backend-url>
   ```

3. Deploy:
   ```bash
   cd frontend
   railway up
   ```

---

## Option 3: Fly.io

Great for global distribution with edge locations.

### Step 1: Install Fly CLI

```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

### Step 2: Login

```bash
fly auth login
```

### Step 3: Deploy Backend

1. In the `backend` folder, run:
   ```bash
   fly launch
   ```

2. Update the generated `fly.toml`:
   ```toml
   app = "threadcraft-backend"
   primary_region = "iad"

   [build]

   [http_service]
     internal_port = 5000
     force_https = true
     auto_stop_machines = true
     auto_start_machines = true
     min_machines_running = 0
     processes = ["app"]

   [[vm]]
     memory_mb = 256
   ```

3. Set secrets:
   ```bash
   fly secrets set FLASK_SECRET_KEY=<your-secret-key>
   ```

4. Deploy:
   ```bash
   fly deploy
   ```

### Step 4: Deploy Frontend

Similar process, but use the frontend configuration from the Dockerfile section below.

---

## Option 4: Separate Frontend/Backend (Vercel + Render)

Best performance: Vercel for frontend, Render for backend.

### Deploy Backend (Render)

Follow **Option 1, Step 2** above.

### Deploy Frontend (Vercel)

1. Go to [Vercel](https://vercel.com)
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Environment Variables**:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com
   ```

5. Click **"Deploy"**

**Your app will be live at**: `https://your-project.vercel.app`

---

## Option 5: Docker + VPS

For full control, deploy using Docker on any VPS (DigitalOcean, AWS EC2, etc.).

### Step 1: Build Docker Images

Use the provided `Dockerfile` and `docker-compose.yml` (see below).

### Step 2: Deploy to VPS

```bash
# On your VPS
git clone <your-repo>
cd lc-thread-posts
docker-compose up -d
```

### Step 3: Configure Nginx (Optional)

Set up Nginx as a reverse proxy for better performance.

---

## Environment Variables

### Backend Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `FLASK_SECRET_KEY` | Secret key for Flask sessions | Yes | Random 32-char string |
| `PORT` | Port to run server on | No | 5000 (default) |
| `PYTHON_VERSION` | Python version | No | 3.11 |

**Generate a secret key**:
```python
import secrets
print(secrets.token_hex(32))
```

### Frontend Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_API_URL` | Backend API URL | Yes | `http://localhost:5000` |

**Important**: Vite requires the `VITE_` prefix for environment variables to be exposed to the frontend.

---

## Post-Deployment Checklist

- [ ] Backend is accessible and returns health check
- [ ] Frontend can connect to backend API
- [ ] CORS is properly configured
- [ ] HTTPS is enabled (most platforms do this automatically)
- [ ] Environment variables are set correctly
- [ ] Test the full flow: settings → start thread → post solution

---

## Troubleshooting

### Backend Issues

**"Module not found"**
- Ensure `requirements.txt` includes all dependencies
- Check that the build command installs dependencies

**"Port already in use"**
- Use `$PORT` environment variable (Render/Railway provide this)
- Check your start command uses the port from environment

**"CORS errors"**
- Add your frontend URL to allowed origins in `backend/app.py`
- Check `CORS(app, supports_credentials=True)` is configured

### Frontend Issues

**"Cannot connect to API"**
- Verify `VITE_API_URL` is set correctly
- Check backend is running and accessible
- Ensure CORS is configured on backend

**"404 on refresh"**
- Configure redirect rules for SPA (most platforms handle this automatically)
- For Vercel, create `vercel.json`:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```

### Platform-Specific

**Render:**
- Free tier spins down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- Consider upgrading for production use

**Railway:**
- Check usage dashboard to monitor costs
- Set up auto-scaling if needed

**Fly.io:**
- Use `fly logs` to debug issues
- Check machine status with `fly status`

---

## Production Considerations

### Security

1. **Use HTTPS**: All platforms provide this automatically
2. **Set strong `FLASK_SECRET_KEY`**: Never commit secrets
3. **Rate Limiting**: Consider adding rate limiting for production
4. **Session Storage**: Current setup uses in-memory sessions. For production with multiple instances, consider Redis

### Performance

1. **CDN**: Frontend should be served from a CDN (Vercel/Netlify provide this)
2. **Caching**: Set appropriate cache headers for static assets
3. **Database**: Consider migrating from JSON file to a proper database for progress tracking

### Monitoring

- Set up error tracking (Sentry, etc.)
- Monitor API response times
- Set up health check monitoring

---

## Need Help?

- Check the [README.md](README.md) for local setup
- Review platform-specific documentation
- Open an issue on GitHub


# Quick Start Deployment Guide

This is a simplified guide to get you deployed quickly. For detailed options, see [DEPLOYMENT.md](DEPLOYMENT.md).

## 🚀 Fastest Option: Render.com (Free Tier)

### Prerequisites

- GitHub account
- [Render.com](https://render.com) account (free signup)

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Deploy Backend

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `threadcraft-api`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`
5. Add environment variables:
   - `FLASK_SECRET_KEY` = (generate with: `python -c "import secrets; print(secrets.token_hex(32))"`)
   - `PYTHON_VERSION` = `3.11.7` (important: prevents Python 3.13 compatibility issues)
6. Click **"Create Web Service"**
7. **Copy your backend URL** (e.g., `https://threadcraft-api.onrender.com`)

### Step 3: Deploy Frontend

1. Create another **"Web Service"**
2. Configure:
   - **Name**: `threadcraft`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run preview`
3. Add environment variable:
   - `VITE_API_URL` = `https://threadcraft-api.onrender.com` (your backend URL from step 2)
4. Click **"Create Web Service"**

### Step 4: Access Your App

Visit your frontend URL (e.g., `https://threadcraft.onrender.com`) and start using the app!

---

## 📦 Docker Deployment (Single Server)

If you have a VPS or server:

```bash
# Build and run
docker-compose up -d

# Access at http://localhost:5000
```

Make sure to set `FLASK_SECRET_KEY` in `docker-compose.yml` or as an environment variable.

---

## 🔧 Important Notes

### Render Free Tier

- Services spin down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- Perfect for development/testing
- Consider upgrading for production use

### Environment Variables

- **Backend**: Must set `FLASK_SECRET_KEY` (generate a secure random string)
- **Frontend**: Must set `VITE_API_URL` to your backend URL

### Troubleshooting

- Backend not responding? Check logs in Render dashboard
- CORS errors? Ensure `VITE_API_URL` points to the correct backend
- Can't connect? Wait 30-60 seconds after first deploy (Render cold start)

---

## Next Steps

- For more deployment options, see [DEPLOYMENT.md](DEPLOYMENT.md)
- For local development, see [README.md](README.md)

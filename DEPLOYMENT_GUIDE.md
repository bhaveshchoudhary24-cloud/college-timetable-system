# Production Deployment Guide: Render (Backend) & Vercel (Frontend)

This guide walks you through deploying the **MMIT College Timetable Management System** to production for free using:
- **GitHub**: Repository hosting
- **Render**: Backend API Server + Python CP-SAT Solver (Dockerized)
- **Vercel**: Next.js 16 Frontend UI

---

## Architecture Overview

```
                          ┌────────────────────────┐
                          │   GitHub Repository    │
                          └───────────┬────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 │                                         │
                 ▼                                         ▼
   ┌───────────────────────────┐             ┌───────────────────────────┐
   │       RENDER.COM          │             │        VERCEL.COM         │
   │  (Backend Web Service)    │             │    (Frontend Website)     │
   │  - Node.js 20 Express API │             │  - Next.js 16 App Router  │
   │  - Python 3 + OR-Tools    │             │  - Fast Global Edge CDN   │
   │  - SQLite / Prisma Auto-DB│             │  - A4 PDF Export Engine   │
   │  URL: ...onrender.com     │             │  URL: ...vercel.app       │
   └─────────────▲─────────────┘             └─────────────┬─────────────┘
                 │                                         │
                 └──────────────── HTTP REST API ──────────┘
```

---

## Part 1: Push Code to GitHub

If you haven't already pushed this project to your GitHub account:

1. Go to [GitHub.com](https://github.com) and create a **New Repository** (e.g. `college-timetable-system`).
2. Open your terminal in the project root directory:
   ```bash
   git init
   git add .
   git commit -m "feat: complete timetable system ready for Render & Vercel deployment"
   git branch -M main
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/college-timetable-system.git
   git push -u origin main
   ```

---

## Part 2: Deploy Backend on Render

Render will host the Express API and execute the Python Google OR-Tools CP-SAT solver.

### Option A: 1-Click Blueprint Deployment (Recommended)
1. Log in to [Render.com](https://dashboard.render.com).
2. Click **New +** at the top right and select **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically detect the `render.yaml` file in the root directory.
5. Click **Apply**. Render will automatically build the Docker container (installing Node.js, Python 3, and OR-Tools) and start the backend service.

---

### Option B: Manual Web Service Setup
If you prefer setting it up manually in the Render dashboard:
1. In Render Dashboard, click **New +** $\to$ **Web Service**.
2. Select **Build and deploy from a Git repository** and pick your repository.
3. Configure the following fields:
   - **Name**: `mmit-timetable-backend` (or your preferred name)
   - **Region**: Any (e.g., Oregon, Frankfurt, Singapore)
   - **Language / Runtime**: Select **Docker**
   - **Dockerfile Path**: `backend/Dockerfile`
   - **Docker Context**: `backend`
   - **Instance Type**: **Free**
4. Under **Environment Variables**, add:
   | Key | Value |
   | :--- | :--- |
   | `PORT` | `5050` |
   | `DATABASE_URL` | `file:./dev.db` |
   | `JWT_SECRET` | *(Click "Generate" or enter a secure random key)* |
   | `NODE_ENV` | `production` |
5. Click **Create Web Service**.

> **Note on Initial Boot & Seeding**:
> When the container starts for the first time, our built-in `check-and-seed` script will automatically initialize the database and populate all 168+ faculty workload allocations, rooms, subjects, and divisions.
> Once deployed, copy your backend URL (e.g., `https://mmit-timetable-backend.onrender.com`).

---

## Part 3: Deploy Frontend on Vercel

Vercel natively builds and hosts the Next.js 16 frontend with edge CDN caching.

1. Log in to [Vercel.com](https://vercel.com).
2. Click **Add New...** $\to$ **Project**.
3. Import your GitHub repository (`college-timetable-system`).
4. In the **Configure Project** screen:
   - **Project Name**: `mmit-timetable-frontend` (or any name)
   - **Framework Preset**: **Next.js**
   - **Root Directory**: Click **Edit** and choose **`frontend`** (Click **Continue**).
5. Expand the **Environment Variables** section and add:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://<YOUR-RENDER-BACKEND-SERVICE-NAME>.onrender.com`
     *(Make sure there is NO trailing slash at the end)*
6. Click **Deploy**.

Vercel will run `next build --webpack` and publish your site in approximately 1–2 minutes at a URL like `https://mmit-timetable-frontend.vercel.app`.

---

## Part 4: Verification & Live Testing

1. **Verify Backend Health**:
   - Open in your browser: `https://<YOUR-RENDER-APP>.onrender.com/health`
   - You should see:
     ```json
     {"status":"ok","db":"connected"}
     ```
2. **Open Frontend**:
   - Visit your Vercel URL (`https://<YOUR-VERCEL-APP>.vercel.app`).
   - The dashboard should load showing faculty count, room metrics, and department data fetched live from your Render backend.
3. **Login & Timetable Generation**:
   - Log in at `/login` with the institutional administrator account:
     - **Email / Username**: `admin` (or `admin@mmit.edu.in`)
     - **Password**: `Mmit@1234`
   - Navigate to **Timetables Directory** $\to$ Click **Generate Timetable**.
   - Verify that Google OR-Tools solves the matrix and produces the 3 compliant evaluation variants.
   - Test **Print / Export PDF** to confirm high-resolution A4 landscape generation.

---

## Frequently Asked Questions & Troubleshooting

### Q1: The backend takes 30-50 seconds to respond on the first request?
**Explanation**: On Render's Free tier, Web Services spin down into sleep mode after 15 minutes of inactivity. The first request will wake up the instance (cold start). Once awake, subsequent requests respond in milliseconds.

### Q2: How does data persistence work on Render?
**Explanation**:
- The backend image includes an automatic startup checker (`src/check-and-seed.ts`) that guarantees the database is populated with all master allocations on launch.
- If you later want persistent database edits across Render redeployments, you can create a free **Render PostgreSQL** database and point `DATABASE_URL` to it, or attach a Render Persistent Disk.

### Q3: How do I deploy updates after making code changes?
**Explanation**:
Simply push your changes to GitHub:
```bash
git add .
git commit -m "your update message"
git push origin main
```
Both Render and Vercel will automatically detect the new commit, rebuild, and redeploy your live website with zero downtime!

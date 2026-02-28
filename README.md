# RoomCraft

A web-based furniture design platform for creating, editing, and managing room layouts with a modern designer workflow.

## Overview
RoomCraft provides:
- Secure designer authentication
- Project-based room design management
- Design status workflow (`draft`, `in_progress`, `finished`)
- Dashboard analytics + recent project activity
- 2D/3D design editing interface

The project is split into:
- **Frontend**: static HTML/CSS/JS pages
- **Backend**: Node.js + Express REST API
- **Database**: SQLite (`server/roomcraft.db`)

## Project Structure

```text
RoomCraft/
  index.html              # Home page
  login.html              # Login/Register page
  dashboard.html          # Designer dashboard
  designer.html           # Design editor
  js/
    api.js                # Frontend API client
    dashboard.js          # Dashboard logic
    designer.js           # Designer/editor logic
  css/
    style.css             # Shared styles
  nginx.conf              # Nginx config for static frontend container
  Dockerfile              # Frontend Docker image (Nginx)
  server/
    server.js             # Express app entry point
    db.js                 # SQLite init + helpers
    middleware/auth.js    # JWT auth middleware
    routes/
      auth.js             # Auth endpoints
      designs.js          # Design CRUD endpoints
    Dockerfile            # Backend Docker image
    package.json
```

## Tech Stack
- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Backend**: Node.js, Express
- **Auth**: JWT + bcryptjs
- **DB**: sqlite3
- **Containerization**: Docker (frontend + backend)

## Current Flow
1. `index.html` (Home)
2. `login.html` (Sign in / Register)
3. `dashboard.html` (Projects + stats + recent activity)
4. `designer.html?id=<designId>` (Editor)

## Local Development

### 1) Backend

```bash
cd server
npm install
npm run dev
```

Backend runs on:
- `http://localhost:8080`

### 2) Frontend
Serve the project root with any static server, for example:

```bash
# from RoomCraft/
python3 -m http.server 5500
```

Then open:
- `http://127.0.0.1:5500`

## Environment Variables (Backend)
Create `server/.env`:

```env
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d
PORT=8080
```

## API Base URL (Frontend)
Configured in [`js/api.js`](js/api.js):

```js
const BASE = 'https://roomcraftdb-434523840513.europe-west1.run.app/api';
```

For local backend testing, switch to:

```js
const BASE = 'http://localhost:8080/api';
```

## Authentication
- On login/register, JWT token + user session are stored in `localStorage`.
- Protected requests send `Authorization: Bearer <token>`.
- Expired/invalid sessions redirect to `login.html`.

## Core API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (protected)

### Designs (protected)
- `GET /api/designs`
- `GET /api/designs?status=draft|in_progress|finished`
- `GET /api/designs/stats`
- `GET /api/designs/:id`
- `POST /api/designs`
- `PUT /api/designs/:id`
- `PATCH /api/designs/:id/status`
- `POST /api/designs/:id/duplicate`
- `DELETE /api/designs/:id`

## CORS
Current backend CORS in [`server/server.js`](server/server.js):
- `https://roomcraft-434523840513.europe-west1.run.app`
- `http://localhost:8080`
- `http://127.0.0.1:5500`

## Docker

### Frontend Container
Uses root [`Dockerfile`](Dockerfile) + [`nginx.conf`](nginx.conf):

```bash
docker build -t roomcraft-frontend .
docker run -p 8080:8080 roomcraft-frontend
```

### Backend Container
Uses [`server/Dockerfile`](server/Dockerfile):

```bash
cd server
docker build -t roomcraft-backend .
docker run -p 8080:8080 --env-file .env roomcraft-backend
```

## Deployment Notes
- Frontend and backend can be deployed separately (e.g., Cloud Run services).
- Ensure frontend `BASE` in `js/api.js` points to deployed backend URL.
- Ensure backend CORS allows the deployed frontend origin.


## Security Notes
- Passwords are hashed with bcrypt.
- JWT secret must be strong and never committed.
- Use HTTPS in production for frontend/backend endpoints.


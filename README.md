# RoomCraft

RoomCraft is a web-based interior layout platform with 2D planning, 3D visualization, and project management.

## Highlights
- Public landing page with responsive modern UI
- Login/register flow with JWT auth
- Designer dashboard with status counters:
  - `draft`
  - `in_progress` (shown as ongoing)
  - `finished`
- Recent projects + recent activity tracking
- 2D editor + 3D room viewer
- OBJ/MTL furniture model support with fallback procedural models
- Lazy loading for Three.js and 3D loaders (loaded only when entering 3D view)

## Tech Stack
- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Node.js + Express
- Database: SQLite (`server/roomcraft.db`)
- Auth: JWT + bcryptjs
- Deployment: Docker / Cloud Run

## Project Structure
```text
RoomCraft/
  index.html
  login.html
  dashboard.html
  designer.html
  nginx.conf
  Dockerfile
  css/
    style.css
  js/
    api.js
    dashboard.js
    designer.js
    designer/
      catalog.js           # Furniture definitions + groups/subcategories
      library-ui.js        # Sidebar rendering (families/sub-items)
      model-registry.js    # Model mapping + per-item transforms/tint
      three-glb.js         # GLTF/OBJ loading + fit/orientation + material handling
      three-procedural.js  # Procedural 3D fallback shapes
  assets/
    models/
      beds/
      sofa/
      chair/
      coffee_table/
      wardrobe/
  server/
    server.js
    db.js
    middleware/
      auth.js
    routes/
      auth.js
      designs.js
    Dockerfile
    package.json
```

## Local Setup

### 1) Run backend API
```bash
cd server
npm install
npm run dev
```
API default: `http://localhost:8080`

### 2) Run frontend
From project root:
```bash
python3 -m http.server 5500
```
Open: `http://127.0.0.1:5500`

## Backend Environment
Create `server/.env`:
```env
JWT_SECRET=replace-with-a-strong-secret
JWT_EXPIRES_IN=7d
PORT=8080
```

## Frontend API Behavior
Defined in `js/api.js`:
- Local hosts (`localhost`, `127.0.0.1`) try:
  - `http://localhost:4000/api`
  - `http://localhost:8080/api`
- Production uses:
  - `https://roomcraftdb-434523840513.europe-west1.run.app/api`

If the server is unreachable, the client shows the real network error.

## 3D Model Library Notes
- Supported model formats:
  - `.obj`
  - `.mtl` (optional)
  - `.glb`/`.gltf` (supported by loader pipeline)
- Per-model controls are configured in `js/designer/model-registry.js`:
  - `fit`
  - `scale`
  - `rotateX / rotateY / rotateZ`
  - `yOffset`
  - `tintColor`
- Paths with spaces are handled safely.

## API Endpoints

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
Configured in `server/server.js` for:
- `https://roomcraft-434523840513.europe-west1.run.app`
- `http://localhost:8080`
- `http://127.0.0.1:5500`
- `http://localhost:5500`

## Docker

### Frontend
```bash
docker build -t roomcraft-frontend .
docker run -p 8080:8080 roomcraft-frontend
```

### Backend
```bash
cd server
docker build -t roomcraft-backend .
docker run -p 8080:8080 --env-file .env roomcraft-backend
```

## Deployment Notes (Cloud Run)
- Deploy frontend and backend as separate services.
- Ensure frontend API base points to backend Cloud Run URL.
- Ensure backend CORS includes frontend Cloud Run URL.
- Include all `assets/models/**` files in your repo/image; missing model files will fall back to procedural furniture.

## Security Notes
- Passwords are hashed with bcrypt.
- Never commit real JWT secrets.
- Use HTTPS in production.
